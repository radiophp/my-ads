import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import axios from 'axios';
import type { AdminMelkradarSession, AdminMelkradarArchive, Prisma } from '@prisma/client';

const PAGE_SIZE = 500;
const DELAY_BETWEEN_PAGES_MS = 5_000;

interface EstateMarkerDto {
  Id: string;
  MelkId: string;
  Url: string | null;
  VendorTypeTitle: string | null;
  ContactPhone: string | null;
  RadarCode: string | null;
  SellTotalPrice: number | null;
  RentMonthlyPrice: number | null;
  RentMortgagePrice: number | null;
  SellUnitPrice: number | null;
  PriceTypeStr: string | null;
  AdverTypeTitle: string | null;
  AdverTypeValue: number | null;
  EstateTypeTitle: string | null;
  EstateTypeValue: number | null;
  EstateTypeGroupTitle: string | null;
  AdvertType: string | null;
  AreaSize: number | null;
  BedroomCount: number | null;
  Summary: string | null;
  Description: string | null;
  Latitude: number | null;
  Longitude: number | null;
  IsExactLocation: boolean | null;
  CityAreaId: string | null;
  CityAreaTitle: string | null;
  CityAreaGroupTitle: string | null;
  Parking: number | null;
  Elevator: number | null;
  Warehouse: number | null;
  Balcony: number | null;
  FloorNumber: number | null;
  FloorNumberStr: string | null;
  BuiltDate: string | null;
  CalculatedBuildingAge: number | null;
  IsRenovatedByAI: boolean | null;
  DeedTypeByAI: string | null;
  DirectionByAI: string | null;
  UnitsPerFloorByAI: number | null;
  TotalFloorsByAI: number | null;
  PhaseByAI: number | null;
  IsLightingGoodByAI: boolean | null;
  IsActive: boolean | null;
  AdverDateTime: string | null;
  AnalysisDateTime: string | null;
  RealtorAnalyzeDateTime: string | null;
  VendorImageUrls: string[];
  AdverImageUrls: string[];
  ImageCount: number;
}

@Injectable()
export class MelkradarPostService {
  private readonly logger = new Logger(MelkradarPostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: AdminMelkradarSessionsService,
  ) {}

  async fetchAllArchives(): Promise<{ totalFetched: number; archivesCompleted: number }> {
    const session = await this.sessionsService.getActiveSession();
    if (!session) {
      throw new Error('No active Melkradar session found. Create one in admin panel first.');
    }

    const archives = await this.prisma.adminMelkradarArchive.findMany({
      where: { syncStatus: { not: 'COMPLETED' } },
      orderBy: [{ syncStatus: 'asc' }, { createdAt: 'asc' }],
    });

    this.logger.log(`Found ${archives.length} archive folders to process`);

    let totalFetched = 0;
    let archivesCompleted = 0;

    for (const archive of archives) {
      const result = await this.processArchive(archive, session);
      totalFetched += result.fetched;
      if (result.completed) {
        archivesCompleted++;
      }
    }

    this.logger.log(`Done — fetched ${totalFetched} posts across ${archivesCompleted} archives`);
    return { totalFetched, archivesCompleted };
  }

  private async processArchive(
    archive: AdminMelkradarArchive,
    session: AdminMelkradarSession,
  ): Promise<{ fetched: number; completed: boolean }> {
    const cookie = (session.headers as Record<string, string>)['Cookie'];

    await this.prisma.adminMelkradarArchive.update({
      where: { id: archive.id },
      data: { syncStatus: 'IN_PROGRESS', lastError: null },
    });

    let page = archive.lastPageFetched + 1;
    let fetched = 0;

    this.logger.log(`Processing archive: ${archive.title} (page ${page})`);

    while (true) {
      try {
        const response = await axios.post<{ value: EstateMarkerDto[] }>(
          'https://realtorpanel.melkradar.com/odata/ClientApp/archiveFolder/getArchiveFiles',
          {
            ArchiveFolderId: archive.archiveFolderId,
            PageSize: PAGE_SIZE,
            PageNumber: page,
            Filter: {},
          },
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
              Accept: 'application/json;q=0.9, */*;q=0.1',
              'Content-Type': 'application/json;IEEE754Compatible=true',
              Referer: 'https://realtorpanel.melkradar.com/radar-adver/estate-marker-list',
              'OData-Version': '4.0',
              'OData-MaxVersion': '4.0',
              Origin: 'https://realtorpanel.melkradar.com',
              Cookie: cookie,
            },
            timeout: 5_000,
          },
        );

        const items = response.data.value;
        if (!items || items.length === 0) {
          await this.markCompleted(archive, page - 1, fetched);
          return { fetched, completed: true };
        }

        for (const item of items) {
          await this.upsertPost(archive.archiveFolderId, item);
        }
        fetched += items.length;

        await this.prisma.adminMelkradarArchive.update({
          where: { id: archive.id },
          data: { lastPageFetched: page, lastFetchedAt: new Date() },
        });

        if (items.length < PAGE_SIZE) {
          await this.markCompleted(archive, page, fetched);
          return { fetched, completed: true };
        }

        page++;
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_PAGES_MS));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed page ${page} for archive ${archive.title}: ${message}`);
        await this.prisma.adminMelkradarArchive.update({
          where: { id: archive.id },
          data: { lastError: message, lastPageFetched: page - 1, lastFetchedAt: new Date() },
        });
        return { fetched, completed: false };
      }
    }
  }

  private async markCompleted(
    archive: AdminMelkradarArchive,
    page: number,
    fetched: number,
  ): Promise<void> {
    await this.prisma.adminMelkradarArchive.update({
      where: { id: archive.id },
      data: {
        syncStatus: 'COMPLETED',
        lastPageFetched: page,
        lastFetchedAt: new Date(),
        lastError: null,
      },
    });
    this.logger.log(`Completed archive: ${archive.title} — ${fetched} posts fetched`);
  }

  private async upsertPost(archiveFolderId: string, item: EstateMarkerDto): Promise<void> {
    const source = item.VendorTypeTitle || 'Unknown';

    const adverDateTime = item.AdverDateTime ? new Date(item.AdverDateTime) : null;
    const analysisDateTime = item.AnalysisDateTime ? new Date(item.AnalysisDateTime) : null;
    const realtorAnalyzeDateTime = item.RealtorAnalyzeDateTime
      ? new Date(item.RealtorAnalyzeDateTime)
      : null;

    await this.prisma.adminMelkradarPost.upsert({
      where: {
        source_externalId: { source, externalId: item.MelkId },
      },
      create: {
        archiveFolderId,
        externalId: item.MelkId,
        source,
        melkradarId: item.Id,
        url: item.Url,
        contactPhone: item.ContactPhone,
        radarCode: item.RadarCode,
        sellTotalPrice: item.SellTotalPrice,
        rentMonthlyPrice: item.RentMonthlyPrice,
        rentMortgagePrice: item.RentMortgagePrice,
        sellUnitPrice: item.SellUnitPrice,
        priceTypeStr: item.PriceTypeStr,
        adverTypeTitle: item.AdverTypeTitle,
        estateTypeTitle: item.EstateTypeTitle,
        estateTypeGroupTitle: item.EstateTypeGroupTitle,
        advertType: item.AdvertType,
        areaSize: item.AreaSize,
        bedroomCount: item.BedroomCount,
        summary: item.Summary,
        description: item.Description,
        latitude: item.Latitude,
        longitude: item.Longitude,
        isExactLocation: item.IsExactLocation,
        cityAreaId: item.CityAreaId,
        cityAreaTitle: item.CityAreaTitle,
        cityAreaGroupTitle: item.CityAreaGroupTitle,
        hasParking: item.Parking,
        hasElevator: item.Elevator,
        hasWarehouse: item.Warehouse,
        hasBalcony: item.Balcony,
        floorNumber: item.FloorNumber,
        floorNumberStr: item.FloorNumberStr,
        builtDate: item.BuiltDate,
        calculatedBuildingAge: item.CalculatedBuildingAge,
        isRenovatedByAI: item.IsRenovatedByAI,
        deedTypeByAI: item.DeedTypeByAI,
        directionByAI: item.DirectionByAI,
        unitsPerFloorByAI: item.UnitsPerFloorByAI,
        totalFloorsByAI: item.TotalFloorsByAI,
        phaseByAI: item.PhaseByAI ? String(item.PhaseByAI) : null,
        isLightingGoodByAI: item.IsLightingGoodByAI,
        isActive: item.IsActive,
        adverDateTime,
        analysisDateTime,
        realtorAnalyzeDateTime,
        vendorImageUrls: item.VendorImageUrls,
        adverImageUrls: item.AdverImageUrls,
        imageCount: item.ImageCount,
        rawPayload: item as unknown as Prisma.InputJsonValue,
      },
      update: {
        archiveFolderId,
        melkradarId: item.Id,
        url: item.Url,
        contactPhone: item.ContactPhone,
        radarCode: item.RadarCode,
        sellTotalPrice: item.SellTotalPrice,
        rentMonthlyPrice: item.RentMonthlyPrice,
        rentMortgagePrice: item.RentMortgagePrice,
        sellUnitPrice: item.SellUnitPrice,
        priceTypeStr: item.PriceTypeStr,
        adverTypeTitle: item.AdverTypeTitle,
        estateTypeTitle: item.EstateTypeTitle,
        estateTypeGroupTitle: item.EstateTypeGroupTitle,
        advertType: item.AdvertType,
        areaSize: item.AreaSize,
        bedroomCount: item.BedroomCount,
        summary: item.Summary,
        description: item.Description,
        latitude: item.Latitude,
        longitude: item.Longitude,
        isExactLocation: item.IsExactLocation,
        cityAreaId: item.CityAreaId,
        cityAreaTitle: item.CityAreaTitle,
        cityAreaGroupTitle: item.CityAreaGroupTitle,
        hasParking: item.Parking,
        hasElevator: item.Elevator,
        hasWarehouse: item.Warehouse,
        hasBalcony: item.Balcony,
        floorNumber: item.FloorNumber,
        floorNumberStr: item.FloorNumberStr,
        builtDate: item.BuiltDate,
        calculatedBuildingAge: item.CalculatedBuildingAge,
        isRenovatedByAI: item.IsRenovatedByAI,
        deedTypeByAI: item.DeedTypeByAI,
        directionByAI: item.DirectionByAI,
        unitsPerFloorByAI: item.UnitsPerFloorByAI,
        totalFloorsByAI: item.TotalFloorsByAI,
        phaseByAI: item.PhaseByAI ? String(item.PhaseByAI) : null,
        isLightingGoodByAI: item.IsLightingGoodByAI,
        isActive: item.IsActive,
        adverDateTime,
        analysisDateTime,
        realtorAnalyzeDateTime,
        vendorImageUrls: item.VendorImageUrls,
        adverImageUrls: item.AdverImageUrls,
        imageCount: item.ImageCount,
        rawPayload: item as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
