import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { SubscriptionsModule } from '@app/modules/subscriptions/subscriptions.module';
import { BaleModule } from '@app/modules/bale/bale.module';
import { RingBindersController } from './ring-binders.controller';
import { RingBindersService } from './ring-binders.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule, BaleModule],
  controllers: [RingBindersController],
  providers: [RingBindersService],
  exports: [RingBindersService],
})
export class RingBindersModule {}
