import { ApiProperty } from '@nestjs/swagger';

class DivarPostMediaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ nullable: true })
  alt!: string | null;
}

export class DivarPostListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  priceTotal!: number | null;

  @ApiProperty({ nullable: true })
  rentAmount!: number | null;

  @ApiProperty({ nullable: true })
  pricePerSquare!: number | null;

  @ApiProperty({ nullable: true })
  area!: number | null;

  @ApiProperty({ nullable: true })
  cityName!: string | null;

  @ApiProperty({ nullable: true })
  districtName!: string | null;

  @ApiProperty({ nullable: true })
  provinceName!: string | null;

  @ApiProperty()
  categorySlug!: string;

  @ApiProperty({ type: String, nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ nullable: true })
  publishedAtJalali!: string | null;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  permalink!: string | null;

  @ApiProperty({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty()
  mediaCount!: number;

  @ApiProperty({ type: [DivarPostMediaDto] })
  medias!: DivarPostMediaDto[];
}

export class PaginatedDivarPostsDto {
  @ApiProperty({ type: [DivarPostListItemDto] })
  items!: DivarPostListItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
