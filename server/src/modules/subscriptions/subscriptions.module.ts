import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { UserSubscriptionsController } from './user-subscriptions.controller';

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionsService, SubscriptionCronService],
  controllers: [UserSubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
