import { ExpenseCategory } from '../entities/expense.entity';

export class ExpenseResponseDto {
  id: number;
  userId: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: Date;
  receiptFileKey: string | null;
  taxInvoiceId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
