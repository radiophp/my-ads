import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { DiscountCodesService } from './discount-codes.service';
import { DiscountCodesController } from './discount-codes.controller';

@Module({
  imports: [PrismaModule],
  providers: [DiscountCodesService],
  controllers: [DiscountCodesController],
})
export class DiscountCodesModule {}
