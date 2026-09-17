import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { InvoiceDirection } from '../entities/tax-invoice.entity';

export class InvoiceListQueryDto {
  @IsEnum(InvoiceDirection)
  @IsOptional()
  direction?: InvoiceDirection;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class InvoiceSummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number;
}
