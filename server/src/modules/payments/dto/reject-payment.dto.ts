import { IsOptional, IsString } from 'class-validator';

export class RejectPaymentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
