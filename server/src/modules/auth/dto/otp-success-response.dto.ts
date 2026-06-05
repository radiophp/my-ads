import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional()
  viaBale?: boolean;

  @ApiPropertyOptional()
  baleLinked?: boolean;

  @ApiPropertyOptional()
  baleBotUrl?: string;

  @ApiPropertyOptional()
  baleLinkToken?: string;
}
