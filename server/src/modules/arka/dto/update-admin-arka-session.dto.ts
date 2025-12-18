import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAdminArkaSessionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  headersRaw?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}
