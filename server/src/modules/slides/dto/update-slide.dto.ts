import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSlideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsString()
  linkLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  imageDesktopUrl?: string;

  @IsOptional()
  @IsString()
  imageTabletUrl?: string;

  @IsOptional()
  @IsString()
  imageMobileUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
