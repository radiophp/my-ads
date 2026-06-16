import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PHONE_REGEX = /^\+?\d{10,15}$/;

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(PHONE_REGEX, { message: 'phone must contain 10 to 15 digits and may start with +' })
  @ApiProperty({ example: '+12345678900' })
  phone!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  deviceInfo?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  turnstileToken?: string;
}
