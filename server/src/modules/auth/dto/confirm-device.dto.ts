import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmDeviceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Pending session token received from verify-otp response' })
  pendingSessionToken!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Device ID to replace when at the device limit' })
  deviceToReplace?: string;
}
