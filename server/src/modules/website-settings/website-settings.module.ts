import { Module } from '@nestjs/common';
import { WebsiteSettingsService } from './website-settings.service';
import { WebsiteSettingsController } from './website-settings.controller';
import { AdminWebsiteSettingsController } from './admin-website-settings.controller';

@Module({
  controllers: [WebsiteSettingsController, AdminWebsiteSettingsController],
  providers: [WebsiteSettingsService],
  exports: [WebsiteSettingsService],
})
export class WebsiteSettingsModule {}
