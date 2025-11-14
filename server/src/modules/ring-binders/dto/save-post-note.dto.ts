import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePostNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string | null;
}
