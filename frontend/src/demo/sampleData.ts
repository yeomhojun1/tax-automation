import { Expense, ExpenseCategory, InvoiceDirection, TaxInvoice, TaxType, User } from '@/types';
import { DEMO_ACCOUNT } from './isDemo';

/** 데모용 가상 데이터. 상호·사업자번호는 모두 지어낸 값이다. */

export interface DemoUser extends User {
  password: string;
}

export interface DemoDb {
  users: DemoUser[];
  invoices: TaxInvoice[];
  expenses: Expense[];
  nextId: number;
}

export const DEMO_BIZ_NUMBER = '123-45-67890';

const SALES_PARTNERS = [
  { name: '(가상) 초록카페', biz: '211-81-00001' },
  { name: '(가상) 해맑은어린이집', biz: '211-81-00002' },
  { name: '(가상) 동네마트 행복점', biz: '211-81-00003' },
];

const PURCHASE_PARTNERS = [
  { name: '(가상) 대한제분유통', biz: '311-81-00001', item: '밀가루 20kg' },
  { name: '(가상) 우유나라', biz: '311-81-00002', item: '우유·버터' },
  { name: '(가상) 포장스토어', biz: '311-81-00003', item: '빵 봉투·상자' },
];

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 오늘 기준: 작년 12개월 + 올해 1월~이번 달. 매번 같은 값이 나오도록 난수 대신 공식을 쓴다. */
function buildMonths(today: Date): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  const currentYear = today.getFullYear();
  for (let m = 1; m <= 12; m += 1) months.push({ year: currentYear - 1, month: m });
  for (let m = 1; m <= today.getMonth() + 1; m += 1) months.push({ year: currentYear, month: m });
  return months;
}

export function createSeedDb(today: Date = new Date()): DemoDb {
  let nextId = 1;
  const now = today.toISOString();
  const userId = 1;

  const user: DemoUser = {
    id: userId,
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
    businessName: '(가상) 하늘빵집',
    businessNumber: DEMO_BIZ_NUMBER,
    isGeneralTaxpayer: true,
    createdAt: now,
    updatedAt: now,
  };

  const invoices: TaxInvoice[] = [];
  const expenses: Expense[] = [];
  const months = buildMonths(today);
  const isThisMonth = (year: number, month: number): boolean =>
    year === today.getFullYear() && month === today.getMonth() + 1;
  const safeDay = (year: number, month: number, day: number): number =>
    isThisMonth(year, month) ? Math.min(day, today.getDate()) : day;

  months.forEach(({ year, month }, index) => {
    // 매출: 거래처 2곳에 납품
    [0, 1].forEach((offset) => {
      const partner = SALES_PARTNERS[(index + offset) % SALES_PARTNERS.length];
      const supply = 1_200_000 + ((index * 7 + offset * 3) % 9) * 150_000;
      const day = safeDay(year, month, offset === 0 ? 10 : 20);
      const id = nextId++;
      invoices.push({
        id,
        userId,
        invoiceNumber: `${year}${pad(month)}${pad(day)}4100000${pad(id, 10)}`,
        direction: InvoiceDirection.SALES,
        taxType: TaxType.TAXABLE,
        counterpartyName: partner.name,
        counterpartyBizNumber: partner.biz.replace(/-/g, ''),
        supplyAmount: supply,
        taxAmount: Math.round(supply * 0.1),
        issueDate: toDateString(year, month, day),
        rawFileKey: null,
        items: [
          {
            id: nextId++,
            itemName: '식빵·모닝빵 납품',
            specification: `${month}월분`,
            quantity: 1,
            unitPrice: supply,
            supplyAmount: supply,
            taxAmount: Math.round(supply * 0.1),
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
    });

    // 매입: 재료·포장재
    const partner = PURCHASE_PARTNERS[index % PURCHASE_PARTNERS.length];
    const supply = 600_000 + ((index * 5) % 7) * 80_000;
    const day = safeDay(year, month, 5);
    const purchaseId = nextId++;
    invoices.push({
      id: purchaseId,
      userId,
      invoiceNumber: `${year}${pad(month)}${pad(day)}4200000${pad(purchaseId, 10)}`,
      direction: InvoiceDirection.PURCHASE,
      taxType: TaxType.TAXABLE,
      counterpartyName: partner.name,
      counterpartyBizNumber: partner.biz.replace(/-/g, ''),
      supplyAmount: supply,
      taxAmount: Math.round(supply * 0.1),
      issueDate: toDateString(year, month, day),
      rawFileKey: null,
      items: [
        {
          id: nextId++,
          itemName: partner.item,
          specification: null,
          quantity: 1,
          unitPrice: supply,
          supplyAmount: supply,
          taxAmount: Math.round(supply * 0.1),
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // 경비
    const monthlyExpenses: Array<[ExpenseCategory, number, string, number]> = [
      [ExpenseCategory.OFFICE_RENT, 1_500_000, '가게 월세', 1],
      [ExpenseCategory.UTILITY, 240_000 + (index % 4) * 30_000, '전기·가스 요금', 15],
      [ExpenseCategory.COMMUNICATION, 55_000, '인터넷·전화 요금', 20],
      [ExpenseCategory.SUPPLIES, 80_000 + (index % 3) * 25_000, '위생장갑·키친타월', 12],
    ];
    if (index % 2 === 0) monthlyExpenses.push([ExpenseCategory.ADVERTISING, 200_000, 'SNS 광고', 8]);
    if (index % 3 === 0) monthlyExpenses.push([ExpenseCategory.TAX_SERVICE, 110_000, '세무사 기장료', 25]);

    monthlyExpenses.forEach(([category, amount, description, expenseDay]) => {
      expenses.push({
        id: nextId++,
        userId,
        category,
        amount,
        description,
        expenseDate: toDateString(year, month, safeDay(year, month, expenseDay)),
        receiptFileKey: null,
        taxInvoiceId: null,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  return { users: [user], invoices, expenses, nextId };
}

/** "샘플로 해 보기"용 KEC XML v3.0 세금계산서. 오늘 날짜로 만든다. */
export interface SampleXml {
  key: string;
  label: string;
  fileName: string;
  build: (today?: Date) => string;
}

function buildXml(options: {
  id: string;
  issueDate: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  items: Array<{ name: string; description: string; quantity: number; unitPrice: number }>;
}): string {
  const lines = options.items.map((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    return { ...item, lineTotal, lineTax: Math.round(lineTotal * 0.1) };
  });
  const supply = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const tax = lines.reduce((sum, line) => sum + line.lineTax, 0);
  const lineXml = lines
    .map(
      (line) => `
    <IncludedSupplyChainTradeLineItem>
      <SpecifiedTradeProduct>
        <Name>${line.name}</Name>
        <Description>${line.description}</Description>
      </SpecifiedTradeProduct>
      <SpecifiedLineTradeAgreement>
        <GrossPriceProductTradePrice>
          <ChargeAmount>${line.unitPrice}</ChargeAmount>
        </GrossPriceProductTradePrice>
      </SpecifiedLineTradeAgreement>
      <SpecifiedLineTradeDelivery>
        <BilledQuantity>${line.quantity}</BilledQuantity>
      </SpecifiedLineTradeDelivery>
      <SpecifiedLineTradeSettlement>
        <ApplicableTradeTax>
          <CalculatedAmount>${line.lineTax}</CalculatedAmount>
        </ApplicableTradeTax>
        <SpecifiedTradeSettlementLineMonetarySummation>
          <LineTotalAmount>${line.lineTotal}</LineTotalAmount>
        </SpecifiedTradeSettlementLineMonetarySummation>
      </SpecifiedLineTradeSettlement>
    </IncludedSupplyChainTradeLineItem>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TaxInvoice>
  <ExchangedDocument>
    <ID>${options.id}</ID>
    <TypeCode>01</TypeCode>
    <IssueDateTime>${options.issueDate}120000</IssueDateTime>
  </ExchangedDocument>
  <SupplyChainTradeTransaction>
    <ApplicableHeaderTradeAgreement>
      <SellerTradeParty>
        <ID>${options.sellerId}</ID>
        <Name>${options.sellerName}</Name>
      </SellerTradeParty>
      <BuyerTradeParty>
        <ID>${options.buyerId}</ID>
        <Name>${options.buyerName}</Name>
      </BuyerTradeParty>
    </ApplicableHeaderTradeAgreement>
    <ApplicableHeaderTradeSettlement>
      <SpecifiedTradeSettlementMonetarySummation>
        <TaxBasisTotalAmount>${supply}</TaxBasisTotalAmount>
        <TaxTotalAmount>${tax}</TaxTotalAmount>
      </SpecifiedTradeSettlementMonetarySummation>
    </ApplicableHeaderTradeSettlement>${lineXml}
  </SupplyChainTradeTransaction>
</TaxInvoice>
`;
}

function compactDate(today: Date): string {
  return `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
}

export const SAMPLE_XMLS: SampleXml[] = [
  {
    key: 'sales',
    label: '매출 세금계산서 샘플',
    fileName: 'sample-sales-invoice.xml',
    build: (today = new Date()) =>
      buildXml({
        id: `${compactDate(today)}41000000SAMPLE01`,
        issueDate: compactDate(today),
        sellerId: DEMO_BIZ_NUMBER,
        sellerName: '(가상) 하늘빵집',
        buyerId: '211-81-00009',
        buyerName: '(가상) 새봄도서관 카페',
        items: [
          { name: '케이크 납품', description: '행사용', quantity: 10, unitPrice: 35_000 },
          { name: '쿠키 세트', description: '선물용', quantity: 40, unitPrice: 8_000 },
        ],
      }),
  },
  {
    key: 'purchase',
    label: '매입 세금계산서 샘플',
    fileName: 'sample-purchase-invoice.xml',
    build: (today = new Date()) =>
      buildXml({
        id: `${compactDate(today)}42000000SAMPLE02`,
        issueDate: compactDate(today),
        sellerId: '311-81-00009',
        sellerName: '(가상) 싱싱과일도매',
        buyerId: DEMO_BIZ_NUMBER,
        buyerName: '(가상) 하늘빵집',
        items: [{ name: '딸기 2kg', description: '케이크용', quantity: 15, unitPrice: 24_000 }],
      }),
  },
];
