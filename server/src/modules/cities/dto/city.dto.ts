import { ApiProperty } from '@nestjs/swagger';

export class CityDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tehran' })
  name!: string;

  @ApiProperty({ example: 5 })
  provinceId!: number;

  @ApiProperty({ example: 'Tehran Province' })
  province!: string;

  @ApiProperty({ example: 'tehran' })
  slug!: string;

  @ApiProperty({ example: 'tehran-province' })
  provinceSlug!: string;
}
