import { IsOptional, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  packageId!: string;

  @IsString()
  @IsOptional()
  discountCode?: string;

  @IsString()
  @IsOptional()
  inviteCode?: string;
}
