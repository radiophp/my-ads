import { ApiProperty } from '@nestjs/swagger';

export class DivarDistrictPriceReportRowDto {
  @ApiProperty({ description: 'District id.' })
  districtId!: number;

  @ApiProperty({ description: 'District name.' })
  districtName!: string;

  @ApiProperty({ description: 'District slug.' })
  districtSlug!: string;

  @ApiProperty({ description: 'Number of posts matched in this district.' })
  postCount!: number;

  @ApiProperty({ description: 'Minimum total price.', nullable: true })
  minPriceTotal!: number | null;

  @ApiProperty({ description: 'Average total price.', nullable: true })
  avgPriceTotal!: number | null;

  @ApiProperty({ description: 'Maximum total price.', nullable: true })
  maxPriceTotal!: number | null;

  @ApiProperty({ description: 'Minimum price per square.', nullable: true })
  minPricePerSquare!: number | null;

  @ApiProperty({ description: 'Average price per square.', nullable: true })
  avgPricePerSquare!: number | null;

  @ApiProperty({ description: 'Maximum price per square.', nullable: true })
  maxPricePerSquare!: number | null;

  @ApiProperty({ description: 'Minimum rent amount.', nullable: true })
  minRentAmount!: number | null;

  @ApiProperty({ description: 'Average rent amount.', nullable: true })
  avgRentAmount!: number | null;

  @ApiProperty({ description: 'Maximum rent amount.', nullable: true })
  maxRentAmount!: number | null;

  @ApiProperty({ description: 'Minimum deposit amount.', nullable: true })
  minDepositAmount!: number | null;

  @ApiProperty({ description: 'Average deposit amount.', nullable: true })
  avgDepositAmount!: number | null;

  @ApiProperty({ description: 'Maximum deposit amount.', nullable: true })
  maxDepositAmount!: number | null;
}
