import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminMelkradarSessionsController } from './admin-melkradar-sessions.controller';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import { MelkradarArchiveService } from './melkradar-archive.service';
import { MelkradarPostService } from './melkradar-post.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMelkradarSessionsController],
  providers: [AdminMelkradarSessionsService, MelkradarArchiveService, MelkradarPostService],
  exports: [AdminMelkradarSessionsService, MelkradarArchiveService, MelkradarPostService],
})
export class MelkradarModule {}
