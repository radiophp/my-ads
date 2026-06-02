import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { Role } from '@app/common/decorators/roles.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value === '' ? null : value;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  provinceId?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value === '' ? null : value;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsInt()
  @Min(1)
  cityId?: number | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  profileImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  role?: Role;
}
