import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue.service';
import type { JsonValue } from '@app/common/types/json.type';

export type EmailJob = {
  to: string;
  subject: string;
  payload: Record<string, JsonValue>;
};

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly queueService: QueueService) {
    void this.queueService.registerConsumer<EmailJob>('email', async (payload) => this.handle(payload));
  }

  async enqueue(job: EmailJob): Promise<void> {
    await this.queueService.publish('email', job);
  }

  private async handle(job: EmailJob): Promise<void> {
    this.logger.debug(`Processing email job for ${job.to}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.logger.log(`Email sent to ${job.to} with subject ${job.subject}`);
  }
}
