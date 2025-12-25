import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateFeaturedPostDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
