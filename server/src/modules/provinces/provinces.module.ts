import { Module } from '@nestjs/common';
import { ProvincesService } from './provinces.service';
import { ProvincesController } from './provinces.controller';
import { PrismaModule } from '@app/platform/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProvincesService],
  controllers: [ProvincesController],
  exports: [ProvincesService],
})
export class ProvincesModule {}
