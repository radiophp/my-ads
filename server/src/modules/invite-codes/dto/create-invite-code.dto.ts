import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInviteCodeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsUUID()
  inviterUserId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  bonusDays?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyInviteLimit?: number;

  @Transform(({ value }) =>
    value === '' || typeof value === 'undefined' || value === null ? undefined : value,
  )
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
