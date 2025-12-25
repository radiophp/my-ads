import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { WebsiteContactDto } from './website-contact.dto';

export class UpdateWebsiteSettingsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebsiteContactDto)
  phoneContacts?: WebsiteContactDto[];

  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  @IsOptional()
  @IsUrl()
  telegramChannelUrl?: string;

  @IsOptional()
  @IsUrl()
  telegramBotUrl?: string;

  @IsOptional()
  @IsString()
  aboutDescription?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
