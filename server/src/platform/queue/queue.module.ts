import { Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';

@Module({
  imports: [ConfigModule],
  providers: [QueueService, EmailProcessor],
  exports: [QueueService, EmailProcessor],
})
export class QueueModule implements OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}

  async onModuleDestroy(): Promise<void> {
    await this.queueService.close();
  }
}
