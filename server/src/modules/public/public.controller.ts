import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';

@Controller('public')
@UseGuards(RateLimitGuard)
export class PublicController {
  @Get('health')
  @Public()
  @RateLimit({ limit: 30, ttlSeconds: 60 })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
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
