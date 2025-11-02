import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicHealthService } from './health.service';
import { QueueModule } from '@app/platform/queue/queue.module';
import { MetricsModule } from '@app/platform/metrics/metrics.module';

@Module({
  imports: [QueueModule, MetricsModule],
  controllers: [PublicController],
  providers: [PublicHealthService],
})
export class PublicModule {}
