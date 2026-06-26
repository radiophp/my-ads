import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class FinalizePaymentDto {
  @IsObject()
  featureExtras!: Record<string, number>;

  @IsObject()
  districtAssignments!: Record<string, number[]>;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
