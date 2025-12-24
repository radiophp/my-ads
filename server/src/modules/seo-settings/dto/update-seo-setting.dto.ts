import { IsOptional, IsString } from 'class-validator';

export class UpdateSeoSettingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  keywords?: string;
}
