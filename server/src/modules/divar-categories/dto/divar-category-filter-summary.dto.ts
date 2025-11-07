import { ApiProperty } from '@nestjs/swagger';

export class DivarCategoryFilterSummaryDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categorySlug!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  displayPath!: string;

  @ApiProperty()
  updatedAt!: Date;
}
