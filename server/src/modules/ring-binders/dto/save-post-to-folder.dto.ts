import { IsUUID } from 'class-validator';

export class SavePostToFolderDto {
  @IsUUID()
  postId!: string;
}
