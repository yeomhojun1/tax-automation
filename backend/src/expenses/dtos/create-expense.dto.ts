import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseCategory } from '../entities/expense.entity';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsDateString()
  expenseDate: string;

  @IsString()
  @IsOptional()
  receiptFileKey?: string;

  @IsNumber()
  @IsOptional()
  taxInvoiceId?: number;
}
