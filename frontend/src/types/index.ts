export interface User {
  id: number;
  email: string;
  businessName: string;
  businessNumber: string | null;
  isGeneralTaxpayer: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum InvoiceDirection {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum TaxType {
  TAXABLE = 'TAXABLE',
  ZERO_RATE = 'ZERO_RATE',
  EXEMPT = 'EXEMPT',
  STATEMENT = 'STATEMENT',
}

export interface InvoiceItem {
  id: number;
  itemName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
}

export interface TaxInvoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  direction: InvoiceDirection;
  taxType: TaxType;
  counterpartyName: string;
  counterpartyBizNumber: string | null;
  supplyAmount: number;
  taxAmount: number;
  issueDate: string;
  rawFileKey: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export enum ExpenseCategory {
  OFFICE_RENT = 'OFFICE_RENT',
  LABOR = 'LABOR',
  COMMUNICATION = 'COMMUNICATION',
  VEHICLE = 'VEHICLE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  ADVERTISING = 'ADVERTISING',
  SUPPLIES = 'SUPPLIES',
  EDUCATION = 'EDUCATION',
  INSURANCE = 'INSURANCE',
  SOFTWARE = 'SOFTWARE',
  MEAL_ALLOWANCE = 'MEAL_ALLOWANCE',
  UTILITY = 'UTILITY',
  TAX_SERVICE = 'TAX_SERVICE',
  MISC = 'MISC',
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  [ExpenseCategory.OFFICE_RENT]: '사무실 임차료',
  [ExpenseCategory.LABOR]: '인건비',
  [ExpenseCategory.COMMUNICATION]: '통신비',
  [ExpenseCategory.VEHICLE]: '차량유지비',
  [ExpenseCategory.ENTERTAINMENT]: '접대비',
  [ExpenseCategory.ADVERTISING]: '광고선전비',
  [ExpenseCategory.SUPPLIES]: '소모품비',
  [ExpenseCategory.EDUCATION]: '교육훈련비',
  [ExpenseCategory.INSURANCE]: '보험료',
  [ExpenseCategory.SOFTWARE]: '소프트웨어',
  [ExpenseCategory.MEAL_ALLOWANCE]: '식대',
  [ExpenseCategory.UTILITY]: '공과금',
  [ExpenseCategory.TAX_SERVICE]: '세무회계',
  [ExpenseCategory.MISC]: '기타',
};

export interface Expense {
  id: number;
  userId: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptFileKey: string | null;
  taxInvoiceId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyTrend {
  month: number;
  salesAmount: number;
  purchaseAmount: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
}

export interface DashboardSummary {
  salesSupplyAmount: number;
  salesTaxAmount: number;
  purchaseSupplyAmount: number;
  purchaseTaxAmount: number;
  estimatedVat: number;
  totalExpenses: number;
  monthlyTrend: MonthlyTrend[];
  categoryBreakdown: CategorySummary[];
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface InvoiceSummary {
  salesSupplyAmount: number;
  salesTaxAmount: number;
  purchaseSupplyAmount: number;
  purchaseTaxAmount: number;
  estimatedVat: number;
  year: number;
  quarter: number;
}
