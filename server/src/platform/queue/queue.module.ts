import { Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [ConfigModule],
  providers: [QueueService, EmailProcessor, NotificationProcessor],
  exports: [QueueService, NotificationProcessor, EmailProcessor],
})
export class QueueModule implements OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}

  async onModuleDestroy(): Promise<void> {
    await this.queueService.close();
  }
}
