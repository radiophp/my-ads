import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReportPhoneFetchDto {
  @ApiProperty({ description: 'Lease id returned from the lease endpoint' })
  @IsString()
  leaseId!: string;

  @ApiProperty({ enum: ['ok', 'error'] })
  @IsEnum(['ok', 'error'] as const)
  status!: 'ok' | 'error';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  error?: string;
}
