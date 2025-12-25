import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeaturedPostDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  code?: number;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
