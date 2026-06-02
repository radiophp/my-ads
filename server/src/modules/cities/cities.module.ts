import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { PrismaModule } from '@app/platform/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CitiesService],
  controllers: [CitiesController],
  exports: [CitiesService],
})
export class CitiesModule {}
