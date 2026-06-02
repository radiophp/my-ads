import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminMelkradarSessionsController } from './admin-melkradar-sessions.controller';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMelkradarSessionsController],
  providers: [AdminMelkradarSessionsService],
  exports: [AdminMelkradarSessionsService],
})
export class MelkradarModule {}
