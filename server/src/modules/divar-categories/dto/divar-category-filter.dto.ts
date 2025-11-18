import { ApiProperty } from '@nestjs/swagger';

export class FilterOptionDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;
}

export class DivarCategoryFilterDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categorySlug!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  displayPath!: string;

  @ApiProperty({
    type: Object,
    description: 'Raw filter payload mirrors what Divar returns for this category.',
  })
  payload!: unknown;

  @ApiProperty({
    type: Object,
    required: false,
    description: 'Normalized filter options extracted from the Divar category page.',
  })
  normalizedOptions?: Record<string, FilterOptionDto[]>;

  @ApiProperty()
  updatedAt!: Date;
}
