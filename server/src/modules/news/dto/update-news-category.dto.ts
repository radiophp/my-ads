import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNewsCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
