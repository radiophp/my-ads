import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeoSettingsService } from './seo-settings.service';

@ApiTags('seo-settings')
@Controller('seo-settings')
export class SeoSettingsController {
  constructor(private readonly seoSettingsService: SeoSettingsService) {}

  @Get(':pageKey')
  @ApiOperation({ summary: 'Get SEO settings for a page key' })
  getByKey(@Param('pageKey') pageKey: string) {
    return this.seoSettingsService.getPublic(pageKey);
  }
}
