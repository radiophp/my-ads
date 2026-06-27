import { IsPhoneNumber } from 'class-validator';

export class ShareFolderDto {
  @IsPhoneNumber('IR', { message: 'شماره تلفن معتبر وارد کنید.' })
  phone!: string;
}
