import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebsiteSettingsService } from './website-settings.service';

@ApiTags('website-settings')
@Controller('website-settings')
export class WebsiteSettingsController {
  constructor(private readonly websiteSettingsService: WebsiteSettingsService) {}

  @Get()
  getPublic() {
    return this.websiteSettingsService.getPublic();
  }
}
