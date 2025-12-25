import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { WebsiteSettingsService } from './website-settings.service';
import { UpdateWebsiteSettingsDto } from './dto/update-website-settings.dto';

@ApiTags('admin-website-settings')
@Controller('admin/website-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminWebsiteSettingsController {
  constructor(private readonly websiteSettingsService: WebsiteSettingsService) {}

  @Get()
  get() {
    return this.websiteSettingsService.getAdmin();
  }

  @Put()
  update(@Body() dto: UpdateWebsiteSettingsDto) {
    return this.websiteSettingsService.upsert(dto);
  }
}
