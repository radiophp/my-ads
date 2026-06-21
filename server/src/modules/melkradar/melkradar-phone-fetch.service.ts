import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import { PrismaService } from '@app/platform/database/prisma.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ListingFetchSummary = {
  processed: number;
  stored: number;
  skipped: number;
  errors: number;
};

const buildRequestHeaders = (sessionHeaders: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {
    'Content-Type': 'application/json;IEEE754Compatible=true',
    Accept: 'application/json;q=0.9, */*;q=0.1',
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0',
    'OData-Version': '4.0',
    'OData-MaxVersion': '4.0',
    ...sessionHeaders,
  };
  delete result['Content-Length'];
  delete result['content-length'];
  return result;
};

@Injectable()
export class MelkradarPhoneFetchService {
  private readonly logger = new Logger(MelkradarPhoneFetchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: AdminMelkradarSessionsService,
  ) {}

  async fetchFromListingPages(maxPages: number = 10): Promise<ListingFetchSummary> {
    const startTime = Date.now();
    let processed = 0;
    let stored = 0;
    let skipped = 0;
    let errors = 0;

    const session = await this.sessionsService.getActiveSession();
    if (!session) {
      this.logger.warn('No active MelkRadar session available.');
      return { processed: 0, stored: 0, skipped: 0, errors: 0 };
    }

    const rawHeaders = (session.headers as Record<string, string>) ?? {};
    const headers = buildRequestHeaders(rawHeaders);
    const cookie = headers['Cookie'] ?? headers['cookie'];

    if (!cookie) {
      this.logger.warn('MelkRadar session headers missing Cookie; cannot fetch.');
      return { processed: 0, stored: 0, skipped: 0, errors: 0 };
    }

    for (let page = 1; page <= maxPages; page++) {
      this.logger.log(`Listing page ${page}/${maxPages}...`);

      if (page > 1) {
        await sleep(200);
      }

      let res;
      try {
        res = await axios.post(
          'https://realtorpanel.melkradar.com/odata/ClientApp/realtorEstateMarker/getRealtorEstateMarkers',
          {
            Filter: {
              AdverTypeFilter: [],
              EstateTypeFilter: [],
              FilterMortgageFrom: null,
              FilterMortgageTo: null,
              FilterRentFrom: null,
              FilterRentTo: null,
              FilterSellPriceFrom: null,
              FilterSellPriceTo: null,
              FilterAreaSizeFrom: null,
              FilterAreaSizeTo: null,
              FilterBedroomFrom: null,
              FilterBedroomTo: null,
              IsFullMortgage: false,
              FilterCityAreaGroupIds: [],
              FilterCityAreaGroupCityAreas: [],
              ShouldHaveWarehouse: null,
              ShouldHaveElevator: null,
              ShouldHaveParking: null,
              ShouldHaveBalcony: null,
              GetNoPriceAdvers: null,
              SearchText: null,
              BuildingAgeRanges: [],
              FilterAdverDateFromStr: null,
              FilterAdverDateToStr: null,
              RadarCode: null,
              FileCode: null,
              PhaseByAI: [],
              DeedTypeByAI: [],
              DirectionByAI: [],
              FloorNumberFromByAI: null,
              FloorNumberToByAI: null,
              UnitsPerFloorByAI: [],
              IsLightingGoodByAI: null,
              IsRenovatedByAI: null,
              TotalFloorsByAI: [],
            },
            PageSize: 20,
            PageNumber: page,
            isFromAppSetPhone: false,
            notManChecked: false,
            notPhoneFilled: false,
          },
          {
            headers,
            timeout: 15_000,
            validateStatus: () => true,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Listing page ${page} request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        errors++;
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        this.logger.warn(`Listing page ${page} returned http=${res.status}`);
        if (res.status === 401 || res.status === 403) {
          await this.prisma.adminMelkradarSession.update({
            where: { id: session.id },
            data: {
              active: false,
              lastError: 'auth_failed',
              lastErrorAt: new Date(),
              updatedAt: new Date(),
            },
          });
          this.logger.error('MelkRadar auth failed; deactivating session and stopping.');
          break;
        }
        errors++;
        continue;
      }

      const data = res.data as any;
      const items: any[] = Array.isArray(data?.value) ? data.value : [];

      if (items.length === 0) {
        this.logger.log(`Listing page ${page} has no items; stopping.`);
        break;
      }

      this.logger.log(`Listing page ${page}: ${items.length} items found`);
      const pageStored = 0;
      let pageSkipped = 0;
      let phoneFetchesInPage = 0;

      for (const item of items) {
        processed++;
        const melkradarId: string | undefined = item?.Id;
        if (!melkradarId) {
          this.logger.debug(`Listing item missing Id; skipping`);
          errors++;
          continue;
        }

        const existing = await this.prisma.melkradarPhoneRecord.findUnique({
          where: { melkradarId },
          select: { id: true, phoneNumber: true },
        });

        if (existing) {
          this.logger.debug(
            `[P${page}] melkradarId=${melkradarId} already has phone ${existing.phoneNumber ?? 'null'}, skipping`,
          );
          skipped++;
          pageSkipped++;
          continue;
        }

        if (phoneFetchesInPage > 0) {
          await sleep(100);
        }
        phoneFetchesInPage++;

        const externalId: string | undefined = item?.MelkId;
        const phoneNumber: string | undefined = item?.ContactPhone;
        const radarCode: string | undefined = item?.RadarCode;

        await this.prisma.melkradarPhoneRecord.create({
          data: {
            melkradarId,
            externalId: externalId ?? null,
            phoneNumber: phoneNumber ?? null,
            radarCode: radarCode ?? null,
            payload: item ?? {},
          },
        });

        stored++;
        this.logger.log(
          `[P${page}] Stored melkradarId=${melkradarId} externalId=${externalId ?? 'n/a'} phone=${phoneNumber ?? 'n/a'}`,
        );
      }

      this.logger.log(
        `Listing page ${page} done: ${items.length} items, ${pageStored} stored, ${pageSkipped} skipped`,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(
      `MelkRadar phone fetch completed: ${processed} processed, ${stored} stored, ${skipped} skipped, ${errors} errors in ${duration}s`,
    );

    return { processed, stored, skipped, errors };
  }
}
