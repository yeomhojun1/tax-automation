import { InvoiceDirection, TaxType } from '@/types';

/**
 * 백엔드 XmlParserService(KEC XML v3.0)와 같은 규칙을 브라우저 DOMParser로 옮긴 데모용 파서.
 * 접두사 네임스페이스(<tax:TaxInvoice>)는 localName 으로 비교해 지원한다.
 */

export interface ParsedDemoItem {
  itemName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
}

export interface ParsedDemoInvoice {
  invoiceNumber: string;
  direction: InvoiceDirection;
  taxType: TaxType;
  counterpartyName: string;
  counterpartyBizNumber: string | null;
  supplyAmount: number;
  taxAmount: number;
  issueDate: string;
  items: ParsedDemoItem[];
}

export class DemoParseError extends Error {}

const TYPE_CODE_MAP: Record<string, TaxType> = {
  '01': TaxType.TAXABLE,
  '02': TaxType.ZERO_RATE,
  '03': TaxType.EXEMPT,
  '04': TaxType.STATEMENT,
};

function children(parent: Element | null | undefined, name: string): Element[] {
  if (!parent) return [];
  return Array.from(parent.children).filter((child) => child.localName === name);
}

function child(parent: Element | null | undefined, ...path: string[]): Element | null {
  let current: Element | null = parent ?? null;
  for (const name of path) {
    current = children(current, name)[0] ?? null;
    if (!current) return null;
  }
  return current;
}

function text(parent: Element | null | undefined, ...path: string[]): string {
  return child(parent, ...path)?.textContent?.trim() ?? '';
}

function parseAmount(value: string, label: string): number {
  if (value === '') return 0;
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    throw new DemoParseError(`${label} 금액 형식이 올바르지 않습니다: ${value}`);
  }
  return parsed;
}

function parseIssueDate(dateStr: string): string {
  const digits = dateStr.replace(/[^0-9]/g, '');
  if (digits.length < 8) {
    throw new DemoParseError('세금계산서 작성일자(IssueDateTime)가 없습니다');
  }
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new DemoParseError(`세금계산서 작성일자(IssueDateTime)가 올바르지 않습니다: ${dateStr}`);
  }
  return `${year}-${month}-${day}`;
}

export function parseInvoiceXml(xmlString: string, currentUserBizNumber: string): ParsedDemoInvoice {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new DemoParseError('XML 파일 파싱에 실패했습니다');
  }

  const root = doc.documentElement;
  if (!root || root.localName !== 'TaxInvoice') {
    throw new DemoParseError('올바른 세금계산서 XML 형식이 아닙니다');
  }

  const invoiceNumber = text(root, 'ExchangedDocument', 'ID');
  if (!invoiceNumber) {
    throw new DemoParseError('세금계산서 승인번호(ExchangedDocument/ID)가 없습니다');
  }
  const typeCode = text(root, 'ExchangedDocument', 'TypeCode') || '01';
  const issueDate = parseIssueDate(text(root, 'ExchangedDocument', 'IssueDateTime'));

  const transaction = child(root, 'SupplyChainTradeTransaction');
  const agreement = child(transaction, 'ApplicableHeaderTradeAgreement');
  const seller = child(agreement, 'SellerTradeParty');
  const buyer = child(agreement, 'BuyerTradeParty');

  const sellerBiz = text(seller, 'ID').replace(/-/g, '');
  const buyerBiz = text(buyer, 'ID').replace(/-/g, '');
  const isSeller = sellerBiz === currentUserBizNumber.replace(/-/g, '');

  const summation = child(
    transaction,
    'ApplicableHeaderTradeSettlement',
    'SpecifiedTradeSettlementMonetarySummation',
  );

  const items = children(transaction, 'IncludedSupplyChainTradeLineItem').map((line) => ({
    itemName: text(line, 'SpecifiedTradeProduct', 'Name'),
    specification: text(line, 'SpecifiedTradeProduct', 'Description') || null,
    quantity: parseAmount(text(line, 'SpecifiedLineTradeDelivery', 'BilledQuantity'), '품목 수량'),
    unitPrice: parseAmount(
      text(line, 'SpecifiedLineTradeAgreement', 'GrossPriceProductTradePrice', 'ChargeAmount'),
      '품목 단가',
    ),
    supplyAmount: parseAmount(
      text(line, 'SpecifiedLineTradeSettlement', 'SpecifiedTradeSettlementLineMonetarySummation', 'LineTotalAmount'),
      '품목 공급가액',
    ),
    taxAmount: parseAmount(
      text(line, 'SpecifiedLineTradeSettlement', 'ApplicableTradeTax', 'CalculatedAmount'),
      '품목 세액',
    ),
  }));

  return {
    invoiceNumber,
    direction: isSeller ? InvoiceDirection.SALES : InvoiceDirection.PURCHASE,
    taxType: TYPE_CODE_MAP[typeCode] ?? TaxType.TAXABLE,
    counterpartyName: isSeller ? text(buyer, 'Name') : text(seller, 'Name'),
    counterpartyBizNumber: (isSeller ? buyerBiz : sellerBiz) || null,
    supplyAmount: parseAmount(text(summation, 'TaxBasisTotalAmount'), '공급가액'),
    taxAmount: parseAmount(text(summation, 'TaxTotalAmount'), '세액'),
    issueDate,
    items,
  };
}
