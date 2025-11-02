import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue.service';
import { registerConsumerWithRetry } from '../utils/register-consumer-with-retry.util';

export type NotificationJob = {
  userId: string;
  message: string;
};

@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly queueService: QueueService) {}

  async onModuleInit(): Promise<void> {
    const { maxAttempts, baseDelayMs } = this.queueService.getConsumerRetryOptions();
    await registerConsumerWithRetry<NotificationJob>(
      this.queueService,
      'notification',
      async (payload) => this.handle(payload),
      {
        logger: this.logger,
        label: 'Notification',
        maxAttempts,
        baseDelayMs,
      },
    );
  }

  async enqueue(job: NotificationJob): Promise<void> {
    await this.queueService.publish('notification', job);
  }

  private async handle(job: NotificationJob): Promise<void> {
    this.logger.debug(`Dispatching notification to user ${job.userId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.logger.log(`Notification sent to ${job.userId}: ${job.message}`);
  }
}
