import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { PhoneFetchService } from './phone-fetch.service';
import { PhoneFetchController } from './phone-fetch.controller';

@Module({
  imports: [PrismaModule],
  providers: [PhoneFetchService],
  controllers: [PhoneFetchController],
  exports: [PhoneFetchService],
})
export class PhoneFetchModule {}
