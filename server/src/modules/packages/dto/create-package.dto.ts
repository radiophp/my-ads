import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';

class FeatureConfigDto {
  @IsString()
  @IsNotEmpty()
  featureKey!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  limitValue!: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allowExtra?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxExtra?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  extraUnitPrice?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allowRollover?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxRolloverCap?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  unitPriceOverride?: number;
}

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
  isTrial?: boolean;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  trialOncePerUser?: boolean;

  @IsObject()
  @IsOptional()
  features?: Record<string, string>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureConfigDto)
  @IsOptional()
  featureConfigs?: FeatureConfigDto[];
}
