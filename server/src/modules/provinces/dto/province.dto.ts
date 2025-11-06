import { ApiProperty } from '@nestjs/swagger';

export class ProvinceDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tehran Province' })
  name!: string;

  @ApiProperty({ example: 'tehran-province' })
  slug!: string;
}
