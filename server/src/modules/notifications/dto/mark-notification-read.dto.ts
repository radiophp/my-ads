import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  notificationId!: string;
}
