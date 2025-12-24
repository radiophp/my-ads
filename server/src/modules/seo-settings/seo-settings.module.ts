import { Module } from '@nestjs/common';
import { SeoSettingsService } from './seo-settings.service';
import { SeoSettingsController } from './seo-settings.controller';
import { AdminSeoSettingsController } from './admin-seo-settings.controller';

@Module({
  controllers: [SeoSettingsController, AdminSeoSettingsController],
  providers: [SeoSettingsService],
  exports: [SeoSettingsService],
})
export class SeoSettingsModule {}
