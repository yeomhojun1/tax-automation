import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { TaxInvoicesService } from './tax-invoices.service';
import { TaxInvoice } from './entities/tax-invoice.entity';
import { InvoiceSummaryDto } from './dtos/tax-invoice-response.dto';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { InvoiceListQueryDto, InvoiceSummaryQueryDto } from './dtos/invoice-query.dto';

interface MultipartFile {
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

@ApiTags('tax-invoices')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tax-invoices')
export class TaxInvoicesController {
  constructor(private readonly taxInvoicesService: TaxInvoicesService) {}

  @Post('upload')
  async upload(
    @CurrentUser() user: User,
    @Req() request: FastifyRequest,
  ): Promise<TaxInvoice> {
    if (typeof request.isMultipart === 'function' && !request.isMultipart()) {
      throw new BadRequestException('multipart/form-data 형식으로 파일을 전송해 주세요');
    }

    let data: MultipartFile | undefined;
    try {
      data = (await request.file()) as MultipartFile | undefined;
    } catch {
      throw new BadRequestException('업로드 요청을 읽을 수 없습니다');
    }
    if (!data) {
      throw new BadRequestException('업로드할 파일이 없습니다');
    }

    const buffer = await data.toBuffer();
    return this.taxInvoicesService.uploadAndParse(user, {
      filename: data.filename,
      mimetype: data.mimetype,
      buffer,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createManual(
    @CurrentUser() user: User,
    @Body() dto: CreateInvoiceDto,
  ): Promise<TaxInvoice> {
    return this.taxInvoicesService.createManual(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query() query: InvoiceListQueryDto,
  ): Promise<TaxInvoice[]> {
    return this.taxInvoicesService.findAll(user.id, {
      direction: query.direction,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: User,
    @Query() query: InvoiceSummaryQueryDto,
  ): Promise<InvoiceSummaryDto> {
    return this.taxInvoicesService.getSummary(user.id, query.year, query.quarter);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.taxInvoicesService.remove(user.id, id);
  }
}
