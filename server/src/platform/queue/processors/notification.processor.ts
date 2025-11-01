import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue.service';

export type NotificationJob = {
  userId: string;
  message: string;
};

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly queueService: QueueService) {
    void this.queueService.registerConsumer<NotificationJob>(
      'notification',
      async (payload) => this.handle(payload),
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
