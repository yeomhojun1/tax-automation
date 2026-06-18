import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TaxInvoice, InvoiceDirection } from './entities/tax-invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { XmlParserService } from './parsers/xml-parser.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../auth/entities/user.entity';
import { InvoiceSummaryDto } from './dtos/tax-invoice-response.dto';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';

export interface UploadedFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface InvoiceQueryFilter {
  direction?: InvoiceDirection;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class TaxInvoicesService {
  constructor(
    @InjectRepository(TaxInvoice)
    private readonly invoiceRepository: Repository<TaxInvoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    private readonly xmlParserService: XmlParserService,
    private readonly storageService: StorageService,
  ) {}

  async uploadAndParse(user: User, file: UploadedFile): Promise<TaxInvoice> {
    if (!file.mimetype.includes('xml') && !file.filename.endsWith('.xml')) {
      throw new BadRequestException('XML 파일만 업로드 가능합니다');
    }

    const fileKey = `invoices/${user.id}/${Date.now()}-${file.filename}`;
    await this.storageService.uploadFile('tax-files', fileKey, file.buffer, file.mimetype);

    const bizNumber = user.businessNumber ?? '';
    const parsed = this.xmlParserService.parseXml(file.buffer, bizNumber);

    const existing = await this.invoiceRepository.findOne({
      where: { invoiceNumber: parsed.invoiceNumber, userId: user.id },
    });
    if (existing) {
      throw new BadRequestException('이미 등록된 세금계산서입니다');
    }

    const invoice = this.invoiceRepository.create({
      userId: user.id,
      invoiceNumber: parsed.invoiceNumber,
      direction: parsed.direction,
      taxType: parsed.taxType,
      counterpartyName: parsed.counterpartyName,
      counterpartyBizNumber: parsed.counterpartyBizNumber,
      supplyAmount: parsed.supplyAmount,
      taxAmount: parsed.taxAmount,
      issueDate: parsed.issueDate,
      rawFileKey: fileKey,
    });

    const saved = await this.invoiceRepository.save(invoice);

    const items = parsed.items.map((item) =>
      this.itemRepository.create({ ...item, taxInvoiceId: saved.id }),
    );
    if (items.length > 0) {
      await this.itemRepository.save(items);
    }

    return this.invoiceRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['items'],
    });
  }

  async createManual(userId: number, dto: CreateInvoiceDto): Promise<TaxInvoice> {
    const invoiceNumber = `MANUAL-${userId}-${Date.now()}`;
    const invoice = this.invoiceRepository.create({
      userId,
      invoiceNumber,
      direction: dto.direction,
      counterpartyName: dto.counterpartyName,
      counterpartyBizNumber: dto.counterpartyBizNumber ?? null,
      supplyAmount: dto.supplyAmount,
      taxAmount: dto.taxAmount,
      issueDate: new Date(dto.issueDate),
      rawFileKey: null,
    });
    const saved = await this.invoiceRepository.save(invoice);
    return this.invoiceRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['items'],
    });
  }

  async findAll(userId: number, filter: InvoiceQueryFilter): Promise<TaxInvoice[]> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.userId = :userId', { userId });

    if (filter.direction) {
      query.andWhere('invoice.direction = :direction', { direction: filter.direction });
    }

    if (filter.startDate && filter.endDate) {
      query.andWhere('invoice.issueDate BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    }

    return query.orderBy('invoice.issueDate', 'DESC').getMany();
  }

  async getSummary(userId: number, year: number, quarter: number): Promise<InvoiceSummaryDto> {
    const { startMonth, endMonth } = this.getQuarterMonths(quarter);
    const startDate = new Date(year, startMonth - 1, 1);
    const endDate = new Date(year, endMonth, 0);

    const invoices = await this.invoiceRepository.find({
      where: {
        userId,
        issueDate: Between(startDate, endDate),
      },
    });

    const salesTaxAmount = this.sumTaxAmount(invoices, InvoiceDirection.SALES);
    const salesSupplyAmount = this.sumSupplyAmount(invoices, InvoiceDirection.SALES);
    const purchaseTaxAmount = this.sumTaxAmount(invoices, InvoiceDirection.PURCHASE);
    const purchaseSupplyAmount = this.sumSupplyAmount(invoices, InvoiceDirection.PURCHASE);

    return {
      salesSupplyAmount,
      salesTaxAmount,
      purchaseSupplyAmount,
      purchaseTaxAmount,
      estimatedVat: salesTaxAmount - purchaseTaxAmount,
      year,
      quarter,
    };
  }

  async remove(userId: number, invoiceId: number): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException('세금계산서를 찾을 수 없습니다');
    }
    if (invoice.userId !== userId) {
      throw new ForbiddenException('삭제 권한이 없습니다');
    }
    await this.invoiceRepository.remove(invoice);
  }

  private getQuarterMonths(quarter: number): { startMonth: number; endMonth: number } {
    const map: Record<number, { startMonth: number; endMonth: number }> = {
      1: { startMonth: 1, endMonth: 3 },
      2: { startMonth: 4, endMonth: 6 },
      3: { startMonth: 7, endMonth: 9 },
      4: { startMonth: 10, endMonth: 12 },
    };
    return map[quarter] ?? { startMonth: 1, endMonth: 3 };
  }

  private sumTaxAmount(invoices: TaxInvoice[], direction: InvoiceDirection): number {
    return invoices
      .filter((inv) => inv.direction === direction)
      .reduce((sum, inv) => sum + Number(inv.taxAmount), 0);
  }

  private sumSupplyAmount(invoices: TaxInvoice[], direction: InvoiceDirection): number {
    return invoices
      .filter((inv) => inv.direction === direction)
      .reduce((sum, inv) => sum + Number(inv.supplyAmount), 0);
  }
}
