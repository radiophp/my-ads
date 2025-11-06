import { Module } from '@nestjs/common';

import { PrismaModule } from '@app/platform/database/prisma.module';

import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';

@Module({
  imports: [PrismaModule],
  providers: [DistrictsService],
  controllers: [DistrictsController],
  exports: [DistrictsService],
})
export class DistrictsModule {}
