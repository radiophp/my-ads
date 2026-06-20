import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BaleMiniAppAuthDto {
  @IsString()
  @IsNotEmpty()
  initData!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}
