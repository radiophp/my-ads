import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdminMelkradarSessionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsNotEmpty()
  @IsString()
  headersRaw!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}
