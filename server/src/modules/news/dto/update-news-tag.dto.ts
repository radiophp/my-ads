import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNewsTagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
