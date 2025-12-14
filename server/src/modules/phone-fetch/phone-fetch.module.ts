import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { PhoneFetchService } from './phone-fetch.service';
import { PhoneFetchController } from './phone-fetch.controller';
import { BusinessTitleRefreshService } from './business-title-refresh.service';

@Module({
  imports: [PrismaModule],
  providers: [PhoneFetchService, BusinessTitleRefreshService],
  controllers: [PhoneFetchController],
  exports: [PhoneFetchService],
})
export class PhoneFetchModule {}
