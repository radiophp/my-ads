import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LeasePhoneFetchDto {
  @ApiProperty({ required: false, description: 'Worker identifier (for logging/locking)' })
  @IsOptional()
  @IsString()
  workerId?: string;
}
