import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Valid refresh token', example: 'eyJhbGciOi...' })
  refreshToken!: string;
}
