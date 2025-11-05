import { Transform } from 'class-transformer';
import { Matches, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestOtpDto } from './request-otp.dto';

const CODE_REGEX = /^\d{4,10}$/;

export class VerifyOtpDto extends RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(CODE_REGEX, { message: 'code must be a numeric value between 4 and 10 digits' })
  @ApiProperty({ example: '1234' })
  code!: string;
}
