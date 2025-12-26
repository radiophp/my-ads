import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
  Length,
  IsBoolean,
  ValidateIf,
  IsInt,
  Min,
} from 'class-validator';

export class CreateTestNotificationDto {
  @ApiProperty({ description: 'Target user id', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Saved filter id belonging to the user', format: 'uuid' })
  @IsUUID()
  savedFilterId!: string;

  @ApiProperty({
    required: false,
    description: 'Divar post id to attach to the notification (UUID).',
    format: 'uuid',
  })
  @ValidateIf((object) => !object.postCode)
  @IsUUID()
  postId?: string;

  @ApiProperty({
    required: false,
    description: 'Divar post code to attach to the notification (numeric).',
  })
  @ValidateIf((object) => !object.postId)
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1000)
  postCode?: number;

  @ApiProperty({
    required: false,
    description: 'Optional custom message (defaults to post title/description)',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  message?: string;

  @ApiProperty({
    required: false,
    description: 'Also send via Telegram bot if the user has started the bot and shared contact.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  sendTelegram?: boolean;
}
