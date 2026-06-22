import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { SubscriptionsModule } from '@app/modules/subscriptions/subscriptions.module';
import { UsageService } from './usage.service';
import { AdminUsageController } from './admin-usage.controller';
import { UserUsageController } from './user-usage.controller';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [AdminUsageController, UserUsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
