import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  updatedAt!: Date;
}
