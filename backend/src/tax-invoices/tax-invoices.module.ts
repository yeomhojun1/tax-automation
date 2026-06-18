import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxInvoicesController } from './tax-invoices.controller';
import { TaxInvoicesService } from './tax-invoices.service';
import { TaxInvoice } from './entities/tax-invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { XmlParserService } from './parsers/xml-parser.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaxInvoice, InvoiceItem]), StorageModule],
  controllers: [TaxInvoicesController],
  providers: [TaxInvoicesService, XmlParserService],
  exports: [TaxInvoicesService],
})
export class TaxInvoicesModule {}
