import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { InvoiceDirection, TaxType } from '../entities/tax-invoice.entity';

export interface ParsedInvoiceItem {
  itemName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  direction: InvoiceDirection;
  taxType: TaxType;
  counterpartyName: string;
  counterpartyBizNumber: string | null;
  supplyAmount: number;
  taxAmount: number;
  issueDate: Date;
  items: ParsedInvoiceItem[];
}

const TYPE_CODE_MAP: Record<string, TaxType> = {
  '01': TaxType.TAXABLE,
  '02': TaxType.ZERO_RATE,
  '03': TaxType.EXEMPT,
  '04': TaxType.STATEMENT,
};

@Injectable()
export class XmlParserService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    trimValues: true,
    numberParseOptions: {
      hex: false,
      leadingZeros: false,
      skipLike: /^\d{13,}$/, // 13자리 이상 숫자 문자열은 변환 금지 (invoice ID 정밀도 손실 방지)
    },
  });

  parseXml(buffer: Buffer, currentUserBizNumber: string): ParsedInvoice {
    const xmlString = buffer.toString('utf-8');
    let parsed: Record<string, unknown>;

    try {
      parsed = this.parser.parse(xmlString) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('XML 파일 파싱에 실패했습니다');
    }

    const root = this.extractRoot(parsed);
    return this.buildParsedInvoice(root, currentUserBizNumber);
  }

  private extractRoot(parsed: Record<string, unknown>): Record<string, unknown> {
    const taxInvoice = parsed['TaxInvoice'] as Record<string, unknown> | undefined;
    if (!taxInvoice) {
      throw new BadRequestException('올바른 세금계산서 XML 형식이 아닙니다');
    }
    return taxInvoice;
  }

  private buildParsedInvoice(root: Record<string, unknown>, currentUserBizNumber: string): ParsedInvoice {
    const exchangeDoc = root['ExchangedDocument'] as Record<string, unknown>;
    const supplyChain = root['SupplyChainTradeTransaction'] as Record<string, unknown>;

    const invoiceNumber = String(exchangeDoc?.['ID'] ?? '');
    const typeCode = String(exchangeDoc?.['TypeCode'] ?? '01');
    const issueDateStr = String(exchangeDoc?.['IssueDateTime'] ?? '');

    const headerAgreement = supplyChain?.['ApplicableHeaderTradeAgreement'] as Record<string, unknown>;
    const settlement = supplyChain?.['ApplicableHeaderTradeSettlement'] as Record<string, unknown>;
    const lineItems = supplyChain?.['IncludedSupplyChainTradeLineItem'];

    const sellerInfo = headerAgreement?.['SellerTradeParty'] as Record<string, unknown>;
    const buyerInfo = headerAgreement?.['BuyerTradeParty'] as Record<string, unknown>;

    const sellerBizNumber = String(sellerInfo?.['ID'] ?? '').replace(/-/g, '');
    const buyerBizNumber = String(buyerInfo?.['ID'] ?? '').replace(/-/g, '');
    const normalizedUserBiz = currentUserBizNumber.replace(/-/g, '');

    const isSeller = sellerBizNumber === normalizedUserBiz;
    const direction = isSeller ? InvoiceDirection.SALES : InvoiceDirection.PURCHASE;
    const counterpartyName = isSeller
      ? String(buyerInfo?.['Name'] ?? '')
      : String(sellerInfo?.['Name'] ?? '');
    const counterpartyBizNumber = isSeller ? buyerBizNumber || null : sellerBizNumber || null;

    const taxSummary = settlement?.['SpecifiedTradeSettlementMonetarySummation'] as Record<string, unknown>;
    const supplyAmount = Number(taxSummary?.['TaxBasisTotalAmount'] ?? 0);
    const taxAmount = Number(taxSummary?.['TaxTotalAmount'] ?? 0);

    const items = this.parseLineItems(lineItems);

    return {
      invoiceNumber,
      direction,
      taxType: TYPE_CODE_MAP[typeCode] ?? TaxType.TAXABLE,
      counterpartyName,
      counterpartyBizNumber,
      supplyAmount,
      taxAmount,
      issueDate: this.parseIssueDate(issueDateStr),
      items,
    };
  }

  private parseLineItems(lineItems: unknown): ParsedInvoiceItem[] {
    if (!lineItems) return [];

    const itemArray = Array.isArray(lineItems) ? lineItems : [lineItems];
    return itemArray.map((item: unknown) => {
      const lineItem = item as Record<string, unknown>;
      const product = lineItem['SpecifiedTradeProduct'] as Record<string, unknown>;
      const priceAgreement = lineItem['SpecifiedLineTradeAgreement'] as Record<string, unknown>;
      const delivery = lineItem['SpecifiedLineTradeDelivery'] as Record<string, unknown>;
      const settlement = lineItem['SpecifiedLineTradeSettlement'] as Record<string, unknown>;
      const monetarySummation = settlement?.['SpecifiedTradeSettlementLineMonetarySummation'] as Record<string, unknown>;
      const taxInfo = settlement?.['ApplicableTradeTax'] as Record<string, unknown>;

      return {
        itemName: String(product?.['Name'] ?? ''),
        specification: String(product?.['Description'] ?? '') || null,
        quantity: Number(delivery?.['BilledQuantity'] ?? 0),
        unitPrice: Number((priceAgreement?.['GrossPriceProductTradePrice'] as Record<string, unknown>)?.['ChargeAmount'] ?? 0),
        supplyAmount: Number(monetarySummation?.['LineTotalAmount'] ?? 0),
        taxAmount: Number(taxInfo?.['CalculatedAmount'] ?? 0),
      };
    });
  }

  private parseIssueDate(dateStr: string): Date {
    if (dateStr.length >= 8) {
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date();
  }
}
