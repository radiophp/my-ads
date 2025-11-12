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

class DivarPostAttributeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty({ nullable: true })
  label!: string | null;

  @ApiProperty({ nullable: true })
  type!: string | null;

  @ApiProperty({ nullable: true })
  stringValue!: string | null;

  @ApiProperty({ nullable: true })
  numberValue!: number | null;

  @ApiProperty({ nullable: true })
  boolValue!: boolean | null;

  @ApiProperty({ nullable: true })
  unit!: string | null;

  @ApiProperty({ nullable: true })
  rawValue!: unknown;
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
  depositAmount!: number | null;

  @ApiProperty({ nullable: true })
  dailyRateNormal!: number | null;

  @ApiProperty({ nullable: true })
  dailyRateWeekend!: number | null;

  @ApiProperty({ nullable: true })
  dailyRateHoliday!: number | null;

  @ApiProperty({ nullable: true })
  extraPersonFee!: number | null;

  @ApiProperty({ nullable: true })
  pricePerSquare!: number | null;

  @ApiProperty({ nullable: true })
  area!: number | null;

  @ApiProperty({ nullable: true })
  areaLabel!: string | null;

  @ApiProperty({ nullable: true })
  landArea!: number | null;

  @ApiProperty({ nullable: true })
  landAreaLabel!: string | null;

  @ApiProperty({ nullable: true })
  rooms!: number | null;

  @ApiProperty({ nullable: true })
  roomsLabel!: string | null;

  @ApiProperty({ nullable: true })
  floor!: number | null;

  @ApiProperty({ nullable: true })
  floorLabel!: string | null;

  @ApiProperty({ nullable: true })
  floorsCount!: number | null;

  @ApiProperty({ nullable: true })
  unitPerFloor!: number | null;

  @ApiProperty({ nullable: true })
  yearBuilt!: number | null;

  @ApiProperty({ nullable: true })
  yearBuiltLabel!: string | null;

  @ApiProperty({ nullable: true })
  capacity!: number | null;

  @ApiProperty({ nullable: true })
  capacityLabel!: string | null;

  @ApiProperty({ nullable: true })
  hasParking!: boolean | null;

  @ApiProperty({ nullable: true })
  hasElevator!: boolean | null;

  @ApiProperty({ nullable: true })
  hasWarehouse!: boolean | null;

  @ApiProperty({ nullable: true })
  hasBalcony!: boolean | null;

  @ApiProperty({ nullable: true })
  isRebuilt!: boolean | null;

  @ApiProperty({ nullable: true })
  photosVerified!: boolean | null;

  @ApiProperty({ nullable: true })
  cityName!: string | null;

  @ApiProperty({ nullable: true })
  districtName!: string | null;

  @ApiProperty({ nullable: true })
  provinceName!: string | null;

  @ApiProperty()
  categorySlug!: string;

  @ApiProperty({ nullable: true })
  businessType!: string | null;

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

  @ApiProperty({ type: [DivarPostAttributeDto], required: false })
  attributes?: DivarPostAttributeDto[];
}

export class PaginatedDivarPostsDto {
  @ApiProperty({ type: [DivarPostListItemDto] })
  items!: DivarPostListItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
