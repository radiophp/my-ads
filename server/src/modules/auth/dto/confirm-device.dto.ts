import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmDeviceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Pending session token received from verify-otp response' })
  pendingSessionToken!: string;
}
