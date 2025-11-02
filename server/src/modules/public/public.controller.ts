import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';
import { PublicHealthService } from './health.service';

@Controller('public')
@UseGuards(RateLimitGuard)
export class PublicController {
  constructor(private readonly healthService: PublicHealthService) {}

  @Get('health')
  @Public()
  @RateLimit({ limit: 30, ttlSeconds: 60 })
  async getHealth() {
    const now = new Date();
    const dependencies = await this.healthService.check();
    const failedComponents = Object.entries(dependencies)
      .filter(([, details]) => details.status === 'down')
      .map(([name]) => name);
    const overallStatus = failedComponents.length === 0 ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      failedComponents,
      dependencies,
      timestamp: now.toISOString(),
      uptimeSeconds: process.uptime(),
      environment: process.env['NODE_ENV'] ?? 'unknown',
      appVersion: process.env['npm_package_version'] ?? '0.0.0',
    };
  }

  @Get('info')
  @Public()
  @RateLimit({ limit: 20, ttlSeconds: 60 })
  getInfo() {
    return {
      name: 'my-ads backend',
      version: '0.1.0',
    };
  }
}
