import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' && value.length === 0 ? undefined : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.length === 0 ? undefined : value))
  @IsUrl({
    require_protocol: true,
    require_valid_protocol: true,
  })
  @IsOptional()
  imageUrl?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  includedUsers!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  savedFiltersLimit?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualPrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountedPrice!: number;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allowDiscountCodes?: boolean;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allowInviteCodes?: boolean;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  trialOncePerUser?: boolean;
}
