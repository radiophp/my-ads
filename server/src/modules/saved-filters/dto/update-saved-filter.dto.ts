import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSavedFilterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;
}
