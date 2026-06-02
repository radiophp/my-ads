import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PHONE_REGEX = /^\+?\d{10,15}$/;

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(PHONE_REGEX, { message: 'phone must contain 10 to 15 digits and may start with +' })
  @ApiProperty({ example: '+12345678900' })
  phone!: string;
}
