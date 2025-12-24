import { Module } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { SlidesController } from './slides.controller';
import { AdminSlidesController } from './admin-slides.controller';

@Module({
  controllers: [SlidesController, AdminSlidesController],
  providers: [SlidesService],
  exports: [SlidesService],
})
export class SlidesModule {}
