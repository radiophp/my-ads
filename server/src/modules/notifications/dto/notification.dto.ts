import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';

class NotificationFilterDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class NotificationPostDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  priceTotal!: number | null;

  @ApiProperty({ nullable: true })
  rentAmount!: number | null;

  @ApiProperty({ nullable: true })
  depositAmount!: number | null;

  @ApiProperty({ nullable: true })
  cityName!: string | null;

  @ApiProperty({ nullable: true })
  districtName!: string | null;

  @ApiProperty({ nullable: true })
  provinceName!: string | null;

  @ApiProperty({ nullable: true })
  permalink!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ nullable: true })
  previewImageUrl!: string | null;
}

export class NotificationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ nullable: true })
  message!: string | null;

  @ApiProperty({ nullable: true })
  sentAt!: Date | null;

  @ApiProperty({ nullable: true })
  failedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty()
  filter!: NotificationFilterDto;

  @ApiProperty()
  post!: NotificationPostDto;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  items!: NotificationDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
