import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountCodeType } from '@prisma/client';

export class CreateDiscountCodeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @Transform(({ value }) => (typeof value === 'string' && value.length === 0 ? undefined : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(DiscountCodeType)
  type!: DiscountCodeType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number | null;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptionsPerUser?: number | null;

  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  validFrom?: Date | null;

  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  validTo?: Date | null;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  @IsOptional()
  packageId?: string | null;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
