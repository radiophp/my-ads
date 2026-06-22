import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { UploadsModule } from '@app/modules/uploads/uploads.module';
import { BaleModule } from '@app/modules/bale/bale.module';
import { UserPaymentsController } from './user-payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, UploadsModule, BaleModule],
  controllers: [UserPaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
