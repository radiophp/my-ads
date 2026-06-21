import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PostsWithPhonesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  provinceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  districtId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cat3?: string;

  @ApiPropertyOptional({ enum: ['personal', 'business', 'all'] })
  @IsOptional()
  @IsString()
  businessType?: 'personal' | 'business' | 'all';

  @ApiPropertyOptional({ enum: ['has', 'none', 'all'] })
  @IsOptional()
  @IsString()
  phoneFilter?: 'has' | 'none' | 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}

export class PostWithPhoneItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: number;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  title!: string | null;

  @ApiProperty()
  cat3!: string | null;

  @ApiProperty()
  provinceName!: string | null;

  @ApiProperty()
  cityName!: string | null;

  @ApiProperty()
  districtName!: string | null;

  @ApiProperty()
  contactPhone!: string | null;

  @ApiProperty()
  arkaPhone!: string | null;

  @ApiProperty()
  melkradarPhone!: string | null;

  @ApiProperty()
  businessRef!: string | null;
}

class PostsWithPhonesMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasPreviousPage!: boolean;

  @ApiProperty()
  hasNextPage!: boolean;
}

export class PaginatedPostsWithPhonesDto {
  @ApiProperty({ type: [PostWithPhoneItemDto] })
  items!: PostWithPhoneItemDto[];

  @ApiProperty()
  meta!: PostsWithPhonesMetaDto;
}
