import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'date' })
  expenseDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptFileKey: string | null;

  @Column({ type: 'int', nullable: true })
  taxInvoiceId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
