import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
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
  @IsUrl()
  baleBotUrl?: string;

  @IsOptional()
  @IsString()
  aboutDescription?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  turnstileEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage?: number;
}
