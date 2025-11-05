import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ example: 'user@example.com' })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Alex' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Johnson' })
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
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Identifier of the selected city',
  })
  cityId?: number | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @ApiPropertyOptional({
    example: 'https://cdn.example.com/profile.jpg',
    description: 'Publicly accessible profile image URL',
  })
  profileImageUrl?: string;
}
