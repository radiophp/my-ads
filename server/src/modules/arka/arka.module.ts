import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminArkaSessionsController } from './admin-arka-sessions.controller';
import { AdminArkaSessionsService } from './admin-arka-sessions.service';
import { ArkaPhoneFetchService } from './arka-phone-fetch.service';
import { ArkaPhoneTransferService } from './arka-phone-transfer.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminArkaSessionsController],
  providers: [AdminArkaSessionsService, ArkaPhoneFetchService, ArkaPhoneTransferService],
  exports: [ArkaPhoneFetchService, ArkaPhoneTransferService, AdminArkaSessionsService],
})
export class ArkaModule {}
