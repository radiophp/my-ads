import { Body, Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { SeoSettingsService } from './seo-settings.service';
import { UpdateSeoSettingDto } from './dto/update-seo-setting.dto';

@ApiTags('admin-seo-settings')
@Controller('admin/seo-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSeoSettingsController {
  constructor(private readonly seoSettingsService: SeoSettingsService) {}

  @Get()
  list() {
    return this.seoSettingsService.listAdmin();
  }

  @Put(':pageKey')
  update(@Param('pageKey') pageKey: string, @Body() dto: UpdateSeoSettingDto) {
    return this.seoSettingsService.upsert(pageKey, dto);
  }
}
