import { IsString, MaxLength } from 'class-validator';

export class CreateRingBinderFolderDto {
  @IsString()
  @MaxLength(64)
  name!: string;
}
