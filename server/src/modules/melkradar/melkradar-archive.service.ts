import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import axios from 'axios';

interface ArchiveFolderDto {
  ArchiveFolderId: string;
  Title: string;
  PersianSeason: string;
  PersianYear: string;
  PersianCityZoneTitle: string;
  Count: number;
  Quarter: string;
  CityZoneCode: string | null;
  year: string | null;
  IsShared: boolean | null;
  FolderOwnerId: string | null;
  FolderOwnerName: string | null;
  Price: number | null;
}

interface ArchiveFoldersResponse {
  '@odata.context': string;
  value: ArchiveFolderDto[];
}

@Injectable()
export class MelkradarArchiveService {
  private readonly logger = new Logger(MelkradarArchiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: AdminMelkradarSessionsService,
  ) {}

  async fetchAndStoreArchives(sessionId?: string): Promise<{ stored: number; skipped: number }> {
    const session = sessionId
      ? await this.prisma.adminMelkradarSession.findUniqueOrThrow({ where: { id: sessionId } })
      : await this.sessionsService.getActiveSession();

    if (!session) {
      throw new Error('No active Melkradar session found. Create one in admin panel first.');
    }

    const headers = session.headers as Record<string, string>;
    const cookie = headers['Cookie'];

    this.logger.log(`Fetching archive folders using session: ${session.label}`);

    const response = await axios.post<ArchiveFoldersResponse>(
      'https://realtorpanel.melkradar.com/odata/ClientApp/archiveFolder/getRealtorArchiveFolders',
      {},
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
          Accept: 'application/json;q=0.9, */*;q=0.1',
          'Content-Type': 'application/json;IEEE754Compatible=true',
          Referer: 'https://realtorpanel.melkradar.com/radar-adver/adver-my-archive',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          Origin: 'https://realtorpanel.melkradar.com',
          Cookie: cookie,
        },
        timeout: 30_000,
      },
    );

    const folders = response.data.value;
    this.logger.log(`Received ${folders.length} archive folders from API`);

    let stored = 0;
    let skipped = 0;

    for (const folder of folders) {
      const existing = await this.prisma.adminMelkradarArchive.findUnique({
        where: { archiveFolderId: folder.ArchiveFolderId },
      });

      if (existing) {
        await this.prisma.adminMelkradarArchive.update({
          where: { archiveFolderId: folder.ArchiveFolderId },
          data: {
            title: folder.Title,
            persianSeason: folder.PersianSeason,
            persianYear: folder.PersianYear,
            persianCityZoneTitle: folder.PersianCityZoneTitle,
            count: folder.Count,
            quarter: folder.Quarter,
            cityZoneCode: folder.CityZoneCode,
            year: folder.year,
            isShared: folder.IsShared,
            folderOwnerId: folder.FolderOwnerId,
            folderOwnerName: folder.FolderOwnerName,
            price: folder.Price,
          },
        });
        skipped++;
      } else {
        await this.prisma.adminMelkradarArchive.create({
          data: {
            archiveFolderId: folder.ArchiveFolderId,
            title: folder.Title,
            persianSeason: folder.PersianSeason,
            persianYear: folder.PersianYear,
            persianCityZoneTitle: folder.PersianCityZoneTitle,
            count: folder.Count,
            quarter: folder.Quarter,
            cityZoneCode: folder.CityZoneCode,
            year: folder.year,
            isShared: folder.IsShared,
            folderOwnerId: folder.FolderOwnerId,
            folderOwnerName: folder.FolderOwnerName,
            price: folder.Price,
          },
        });
        stored++;
      }
    }

    this.logger.log(`Done — ${stored} new archives stored, ${skipped} existing updated`);
    return { stored, skipped };
  }
}
