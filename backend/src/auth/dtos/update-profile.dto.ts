import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  businessName?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  businessNumber?: string | null;

  @IsBoolean()
  @IsOptional()
  isGeneralTaxpayer?: boolean;
}
