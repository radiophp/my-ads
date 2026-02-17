import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { InviteCodesService } from './invite-codes.service';
import { InviteCodesController } from './invite-codes.controller';

@Module({
  imports: [PrismaModule],
  providers: [InviteCodesService],
  controllers: [InviteCodesController],
})
export class InviteCodesModule {}
