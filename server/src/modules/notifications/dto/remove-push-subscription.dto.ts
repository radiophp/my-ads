import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class RemovePushSubscriptionDto {
  @ApiProperty({ description: 'Push endpoint URL' })
  @IsUrl()
  endpoint!: string;
}
