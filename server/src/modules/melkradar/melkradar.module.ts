import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminMelkradarSessionsController } from './admin-melkradar-sessions.controller';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import { MelkradarArchiveService } from './melkradar-archive.service';
import { MelkradarPostService } from './melkradar-post.service';
import { MelkradarToDivarService } from './melkradar-to-divar.service';
import { MelkradarPhoneFetchService } from './melkradar-phone-fetch.service';
import { MelkradarPhoneTransferService } from './melkradar-phone-transfer.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMelkradarSessionsController],
  providers: [
    AdminMelkradarSessionsService,
    MelkradarArchiveService,
    MelkradarPostService,
    MelkradarToDivarService,
    MelkradarPhoneFetchService,
    MelkradarPhoneTransferService,
  ],
  exports: [
    AdminMelkradarSessionsService,
    MelkradarArchiveService,
    MelkradarPostService,
    MelkradarToDivarService,
    MelkradarPhoneFetchService,
    MelkradarPhoneTransferService,
  ],
})
export class MelkradarModule {}
