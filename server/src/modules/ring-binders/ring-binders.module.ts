import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { SubscriptionsModule } from '@app/modules/subscriptions/subscriptions.module';
import { RingBindersController } from './ring-binders.controller';
import { RingBindersService } from './ring-binders.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [RingBindersController],
  providers: [RingBindersService],
  exports: [RingBindersService],
})
export class RingBindersModule {}
