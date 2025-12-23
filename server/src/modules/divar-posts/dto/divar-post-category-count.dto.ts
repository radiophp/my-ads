import { ApiProperty } from '@nestjs/swagger';

export class DivarPostCategoryCountDto {
  @ApiProperty({ description: 'Category slug.' })
  slug!: string;

  @ApiProperty({ description: 'Category display name.' })
  name!: string;

  @ApiProperty({ description: 'Category breadcrumb display path.' })
  displayPath!: string;

  @ApiProperty({ description: 'Number of personal posts mapped to this category.' })
  personalCount!: number;

  @ApiProperty({ description: 'Number of business posts mapped to this category.' })
  businessCount!: number;

  @ApiProperty({ description: 'Number of posts mapped to this category.' })
  count!: number;
}
