import { InvoiceDirection, TaxType } from '../entities/tax-invoice.entity';

export class InvoiceItemResponseDto {
  id: number;
  itemName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
}

export class TaxInvoiceResponseDto {
  id: number;
  userId: number;
  invoiceNumber: string;
  direction: InvoiceDirection;
  taxType: TaxType;
  counterpartyName: string;
  counterpartyBizNumber: string | null;
  supplyAmount: number;
  taxAmount: number;
  issueDate: Date;
  rawFileKey: string | null;
  items: InvoiceItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class InvoiceSummaryDto {
  salesSupplyAmount: number;
  salesTaxAmount: number;
  purchaseSupplyAmount: number;
  purchaseTaxAmount: number;
  estimatedVat: number;
  year: number;
  quarter: number;
}
