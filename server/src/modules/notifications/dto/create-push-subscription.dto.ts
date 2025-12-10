import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreatePushSubscriptionDto {
  @ApiProperty({ description: 'Push endpoint URL' })
  @IsUrl()
  endpoint!: string;

  @ApiProperty({ description: 'Base64 encoded p256dh key' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Base64 encoded auth key' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}
