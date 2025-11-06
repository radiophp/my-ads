import { ApiProperty } from '@nestjs/swagger';

export class DivarCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  displayPath!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty({ nullable: true })
  parentName!: string | null;

  @ApiProperty({ nullable: true })
  parentSlug!: string | null;

  @ApiProperty()
  depth!: number;

  @ApiProperty()
  position!: number;

  @ApiProperty({ description: 'Number of direct child categories' })
  childrenCount!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
