import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(100)
  businessName: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  businessNumber?: string;

  @IsBoolean()
  @IsOptional()
  isGeneralTaxpayer?: boolean;
}
