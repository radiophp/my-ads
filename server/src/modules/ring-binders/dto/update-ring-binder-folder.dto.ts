import { IsString, MaxLength } from 'class-validator';

export class UpdateRingBinderFolderDto {
  @IsString()
  @MaxLength(64)
  name!: string;
}
