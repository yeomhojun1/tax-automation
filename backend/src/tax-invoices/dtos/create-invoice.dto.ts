import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InvoiceDirection } from '../entities/tax-invoice.entity';

export class CreateInvoiceDto {
  @IsEnum(InvoiceDirection)
  direction: InvoiceDirection;

  @IsString()
  @MaxLength(100)
  counterpartyName: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  counterpartyBizNumber?: string;

  @IsNumber()
  @Min(0)
  supplyAmount: number;

  @IsNumber()
  @Min(0)
  taxAmount: number;

  @IsString()
  issueDate: string;
}
