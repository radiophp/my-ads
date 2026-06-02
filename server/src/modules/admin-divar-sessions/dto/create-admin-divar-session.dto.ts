import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAdminDivarSessionDto {
  @ApiProperty({ description: 'Admin phone number used to authenticate with Divar' })
  @IsString()
  @Matches(/^\+?\d{6,15}$/)
  phone!: string;

  @ApiProperty({ description: 'Divar JWT token for the phone session' })
  @IsString()
  jwt!: string;

  @ApiProperty({ required: false, description: 'Whether this session is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ required: false, description: 'Lock to prevent automated use' })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}
