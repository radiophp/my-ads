import { ApiProperty } from '@nestjs/swagger';

export class DistrictDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Narmak' })
  name!: string;

  @ApiProperty({ example: 'narmak' })
  slug!: string;

  @ApiProperty({ example: 2 })
  cityId!: number;

  @ApiProperty({ example: 'Tehran' })
  city!: string;

  @ApiProperty({ example: 'tehran' })
  citySlug!: string;

  @ApiProperty({ example: 5 })
  provinceId!: number;

  @ApiProperty({ example: 'Tehran Province' })
  province!: string;

  @ApiProperty({ example: 'tehran-province' })
  provinceSlug!: string;
}
