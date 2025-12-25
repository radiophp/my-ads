import { IsOptional, IsString } from 'class-validator';

export class WebsiteContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
