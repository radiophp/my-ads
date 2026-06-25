import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { BaleModule } from '@app/modules/bale/bale.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { UserSubscriptionsController } from './user-subscriptions.controller';

@Module({
  imports: [PrismaModule, BaleModule],
  providers: [SubscriptionsService, SubscriptionCronService],
  controllers: [UserSubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
