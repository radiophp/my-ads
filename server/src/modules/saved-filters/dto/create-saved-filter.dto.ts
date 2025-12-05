import { Transform } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateSavedFilterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
