import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, Length } from 'class-validator';

export class CreateTestNotificationDto {
  @ApiProperty({ description: 'Target user id', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Saved filter id belonging to the user', format: 'uuid' })
  @IsUUID()
  savedFilterId!: string;

  @ApiProperty({ description: 'Divar post id to attach to the notification', format: 'uuid' })
  @IsUUID()
  postId!: string;

  @ApiProperty({
    required: false,
    description: 'Optional custom message (defaults to post title/description)',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  message?: string;
}
