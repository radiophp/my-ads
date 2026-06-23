import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsCronService {
  private readonly logger = new Logger(PaymentsCronService.name);
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly paymentsService: PaymentsService,
    configService: ConfigService,
  ) {
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron('0 1 * * *', { name: 'payments-auto-cancel-1am' })
  async autoCancelAt1AM(): Promise<void> {
    if (!this.schedulerEnabled) return;
    await this.runAutoCancel();
  }

  @Cron('0 2 * * *', { name: 'payments-auto-cancel-2am' })
  async autoCancelAt2AM(): Promise<void> {
    if (!this.schedulerEnabled) return;
    await this.runAutoCancel();
  }

  private async runAutoCancel(): Promise<void> {
    try {
      const count = await this.paymentsService.autoCancelExpiredPayments();
      if (count > 0) {
        this.logger.log(`Auto-cancelled ${count} expired payment(s).`);
      }
    } catch (err) {
      this.logger.error(
        `Auto-cancel cron failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
