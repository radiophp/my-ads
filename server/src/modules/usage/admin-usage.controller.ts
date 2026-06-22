import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UsageService } from './usage.service';

@Controller('admin/usage-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async listLogs(
    @Query('userId') userId?: string,
    @Query('feature') feature?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usageService.getUsageReport({
      userId,
      feature,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Math.max(1, Number(page)) : 1,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
    });
  }

  @Get('summary')
  async summary(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usageService.getUsageReport({
      userId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: 1,
      limit: 10000,
    });
  }

  @Get('user/:userId')
  async userUsage(@Param('userId') userId: string) {
    return this.usageService.getUsageSummary(userId);
  }
}
