import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { UsageService } from './usage.service';

@Controller('user-panel/usage')
@UseGuards(JwtAuthGuard)
export class UserUsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('logs')
  async myLogs(
    @Req() request: { user?: { sub: string } },
    @Query('feature') feature?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usageService.getUsageReport({
      userId: request.user?.sub ?? '',
      feature,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Math.max(1, Number(page)) : 1,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
    });
  }

  @Get('limits')
  async myLimits(@Req() request: { user?: { sub: string } }) {
    return this.usageService.getUsageSummary(request.user?.sub ?? '');
  }
}
