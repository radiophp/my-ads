import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue.service';
import type { JsonValue } from '@app/common/types/json.type';
import { registerConsumerWithRetry } from '../utils/register-consumer-with-retry.util';

export type EmailJob = {
  to: string;
  subject: string;
  payload: Record<string, JsonValue>;
};

@Injectable()
export class EmailProcessor implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly queueService: QueueService) {}

  async onModuleInit(): Promise<void> {
    const { maxAttempts, baseDelayMs } = this.queueService.getConsumerRetryOptions();
    await registerConsumerWithRetry<EmailJob>(
      this.queueService,
      'email',
      async (payload) => this.handle(payload),
      {
        logger: this.logger,
        label: 'Email',
        maxAttempts,
        baseDelayMs,
      },
    );
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
