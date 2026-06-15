import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { toJalaali } from 'jalaali-js';
import type { AdminMelkradarPost, Prisma } from '@prisma/client';
import type {
  AdverImageEntry,
  CategoryInfo,
  DistrictInfo,
  AttributeDraft,
} from './melkradar-constants';
import {
  CATEGORY_MAP,
  ATTRIBUTE_DEFS,
  SKIP_FIELDS,
  DISTRICT_PREFIXES,
  INT4_MAX,
} from './melkradar-constants';

@Injectable()
export class MelkradarToDivarService {
  private readonly logger = new Logger(MelkradarToDivarService.name);

  private categoryCache: Map<string, CategoryInfo> | null = null;
  private districtsByName: Map<string, DistrictInfo> | null = null;

  private readonly KARAJ_CITY_ID = 2;
  private readonly KARAJ_PROVINCE_ID = 895;

  constructor(private readonly prisma: PrismaService) {}

  async processOne(): Promise<{ processed: boolean; id?: string; title?: string; error?: string }> {
    const batch = await this.processBatch(1);
    if (batch.length === 0) return { processed: false };
    return batch[0];
  }

  async processBatch(
    count: number,
    skipIds?: Set<string>,
  ): Promise<{ processed: boolean; id?: string; title?: string; error?: string }[]> {
    await this.ensureCachesLoaded();

    const sources = await this.prisma.adminMelkradarPost.findMany({
      where: {
        analyzed: false,
        ...(skipIds && skipIds.size > 0 ? { id: { notIn: [...skipIds] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: count,
    });

    if (sources.length === 0) return [];

    const results = await Promise.allSettled(
      sources.map((source) => this.processOneRecord(source)),
    );

    return results.map((r) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        processed: true,
        id: 'unknown',
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    });
  }

  private async processOneRecord(
    source: AdminMelkradarPost,
  ): Promise<{ processed: boolean; id: string; title?: string; error?: string }> {
    try {
      await this.ensureCachesLoaded();

      const data = this.buildDivarPostData(source);

      await this.prisma.$transaction(
        async (tx) => {
          const readQueue = await tx.postToReadQueue.create({
            data: {
              source: 'MELKRAADAR',
              externalId: source.externalId,
              categoryId: data.category.id,
              categorySlug: data.category.slug,
              locationScope: 'CITY',
              provinceId: this.KARAJ_PROVINCE_ID,
              cityId: this.KARAJ_CITY_ID,
              status: 'COMPLETED',
            },
          });

          const post = await tx.divarPost.create({
            data: {
              source: 'MELKRAADAR',
              externalId: source.externalId,
              readQueueId: readQueue.id,
              categoryId: data.category.id,
              categorySlug: data.category.slug,
              cat1: data.category.cat1,
              cat2: data.category.cat2,
              cat3: data.category.cat3,
              title: data.title,
              description: data.description,
              phoneNumber: source.contactPhone,
              permalink: source.url,
              priceTotal: source.sellTotalPrice,
              depositAmount: source.rentMortgagePrice,
              rentAmount: source.rentMonthlyPrice,
              pricePerSquare: source.sellUnitPrice,
              area: this.safeInt(source.areaSize != null ? Math.round(source.areaSize) : null),
              rooms: source.bedroomCount,
              hasParking: source.hasParking === 1,
              hasElevator: source.hasElevator === 1,
              hasWarehouse: source.hasWarehouse === 1,
              hasBalcony: source.hasBalcony === 1,
              floor: source.floorNumber,
              floorLabel: source.floorNumberStr,
              yearBuilt: this.parseYearBuilt(source.builtDate),
              imageCount: source.imageCount,
              latitude: source.latitude,
              longitude: source.longitude,
              provinceId: this.KARAJ_PROVINCE_ID,
              provinceName: 'البرز',
              cityId: this.KARAJ_CITY_ID,
              citySlug: 'karaj',
              cityName: 'کرج',
              districtId: data.district?.id ?? null,
              districtSlug: data.district?.slug ?? null,
              districtName: data.district?.name ?? source.cityAreaTitle,
              publishedAt: source.adverDateTime,
              publishedAtJalali: source.adverDateTime
                ? this.toJalaliDateString(source.adverDateTime)
                : null,
              rawPayload: (source.rawPayload ?? {}) as Prisma.InputJsonValue,
              status: 'COMPLETED',
            },
          });

          const images = source.adverImageUrls as unknown as AdverImageEntry[] | null;
          if (Array.isArray(images)) {
            for (let i = 0; i < images.length; i++) {
              const melkUrl = images[i]?.MelkRadarImageUrl;
              if (melkUrl) {
                await tx.divarPostMedia.create({
                  data: { postId: post.id, position: i, url: melkUrl },
                });
              }
            }
          }

          const attrs = this.buildAttributes(source);
          for (const attr of attrs) {
            await tx.divarPostAttribute.create({
              data: { postId: post.id, ...attr },
            });
          }

          await tx.adminMelkradarPost.update({
            where: { id: source.id },
            data: { analyzed: true },
          });
        },
        { maxWait: 15_000, timeout: 10_000 },
      );

      return { processed: true, id: source.id, title: data.title ?? undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { processed: true, id: source.id, error: message };
    }
  }

  // ---- private helpers ----

  private async ensureCachesLoaded(): Promise<void> {
    if (!this.categoryCache) {
      const cats = await this.prisma.divarCategory.findMany();
      this.categoryCache = new Map();
      for (const cat of cats) {
        const parts = cat.path.split('/');
        this.categoryCache.set(cat.slug, {
          id: cat.id,
          slug: cat.slug,
          cat1: parts[1] ?? null,
          cat2: parts[2] ?? null,
          cat3: parts[3] ?? null,
        });
      }
    }

    if (!this.districtsByName) {
      const districts = await this.prisma.district.findMany({
        where: { cityId: this.KARAJ_CITY_ID },
      });
      this.districtsByName = new Map();
      for (const d of districts) {
        this.districtsByName.set(d.name, { id: d.id, slug: d.slug, name: d.name });
      }
    }
  }

  private buildDivarPostData(source: AdminMelkradarPost): {
    category: CategoryInfo;
    title: string | null;
    description: string | null;
    district: DistrictInfo | null;
  } {
    const lookupKey = `${source.estateTypeGroupTitle ?? ''}|${source.adverTypeTitle ?? ''}|${source.estateTypeTitle ?? ''}`;
    const mapping = CATEGORY_MAP[lookupKey];
    if (!mapping) {
      throw new Error(
        `[CATEGORY_MAP] No mapping for post ${source.id} (${source.externalId}): ` +
          `group="${source.estateTypeGroupTitle}" adverType="${source.adverTypeTitle}" estateType="${source.estateTypeTitle}"`,
      );
    }
    const category = this.categoryCache?.get(mapping.cat3);
    if (!category) {
      throw new Error(
        `[CATEGORY_MAP] DivarCategory slug "${mapping.cat3}" not found in DB for post ${source.id} (${source.externalId})`,
      );
    }

    const district = source.cityAreaTitle ? this.matchDistrict(source.cityAreaTitle) : null;

    if (!district && source.cityAreaTitle) {
      const cityOnly = this.normalizeDistrictName(source.cityAreaTitle) === 'کرج';
      if (!cityOnly) {
        this.logger.warn(
          `[DISTRICT_MAP] No district match in Karaj for post ${source.id} (${source.externalId}): ` +
            `cityAreaTitle="${source.cityAreaTitle}" — continuing without district`,
        );
      }
    }

    const parts: string[] = [];
    if (source.adverTypeTitle) parts.push(source.adverTypeTitle);
    if (source.estateTypeTitle) parts.push(source.estateTypeTitle);
    if (source.areaSize) parts.push(`${source.areaSize} متری`);
    if (source.cityAreaTitle) parts.push(source.cityAreaTitle);
    let title = parts.join(' ');
    const year = this.parseYearBuilt(source.builtDate);
    if (year) title += ` - ${year}`;

    const description =
      source.summary && source.description
        ? `${source.summary}\n\n${source.description}`
        : (source.summary ?? source.description ?? null);

    return { category, title: title || null, description, district };
  }

  private buildAttributes(source: Record<string, unknown>): AttributeDraft[] {
    const attrs: AttributeDraft[] = [];

    for (const [field, def] of Object.entries(ATTRIBUTE_DEFS)) {
      if (SKIP_FIELDS.has(field)) continue;

      const value = source[field];
      if (value == null || value === '') continue;

      switch (def.type) {
        case 'boolean':
          attrs.push({
            key: def.key,
            label: def.label,
            type: null,
            stringValue: null,
            numberValue: null,
            boolValue: Boolean(value),
          });
          break;
        case 'number': {
          const num = Number(value);
          if (num > INT4_MAX) continue;
          attrs.push({
            key: def.key,
            label: def.label,
            type: null,
            stringValue: null,
            numberValue: num,
            boolValue: null,
          });
          break;
        }
        case 'date':
          attrs.push({
            key: def.key,
            label: def.label,
            type: null,
            stringValue: (value as Date).toISOString(),
            numberValue: null,
            boolValue: null,
          });
          break;
        default:
          attrs.push({
            key: def.key,
            label: def.label,
            type: null,
            stringValue: String(value),
            numberValue: null,
            boolValue: null,
          });
      }
    }

    return attrs;
  }

  private safeInt(value: number | null | undefined): number | null {
    if (value == null) return null;
    if (value > INT4_MAX) return null;
    return value;
  }

  private normalizeDistrictName(name: string): string {
    return name
      .replace(/^البرز[،,]\s*/i, '')
      .replace(/^کرج[،,]\s*/, '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[\s‌]+/g, ' ')
      .trim();
  }

  private matchDistrict(rawName: string): DistrictInfo | null {
    const normalized = this.normalizeDistrictName(rawName);
    if (!normalized) return null;

    const normToDistrict = new Map<string, DistrictInfo>();
    for (const d of this.districtsByName!.values()) {
      const key = this.normalizeDistrictName(d.name);
      if (!normToDistrict.has(key)) {
        normToDistrict.set(key, d);
      }
    }

    // 1. Exact match
    const exact = normToDistrict.get(normalized);
    if (exact) return exact;

    // 1b. Strip known prefix from input and retry
    // e.g. "شهرک گلها" -> strip "شهرک" -> prefix-prepend "کوی گلها"
    const stripped = this.tryStripPrefix(normalized, normToDistrict);
    if (stripped) return stripped;

    // 2. Split on " - "
    const parts = normalized.split(/\s*-\s*/);
    const firstPart = parts[0].trim();

    if (parts.length >= 2) {
      const rest = parts.slice(1).join(' ').trim();

      // 2a. Reversed parts (most specific): "مهرشهر - فاز 4" -> "فاز 4 مهرشهر"
      if (rest) {
        const reversed = `${rest} ${firstPart}`.trim();
        const revExact = normToDistrict.get(reversed);
        if (revExact) return revExact;
      }

      // 2b. Combined: "مهرشهر فاز 4"
      const combined = parts.join(' ').trim();
      const combExact = normToDistrict.get(combined);
      if (combExact) return combExact;

      // 2c. First part exact
      const fpExact = normToDistrict.get(firstPart);
      if (fpExact) return fpExact;

      // 2d. Prefix prepend for short first parts: "زنبق" -> "کوی زنبق"
      if (firstPart.length <= 5) {
        const pMatch = this.matchWithPrefix(firstPart, normToDistrict);
        if (pMatch) return pMatch;
      }

      // 2e. First part contained in district name (space-insensitive)
      const firstPartNoSpace = firstPart.replace(/\s+/g, '');
      for (const [nName, info] of normToDistrict) {
        if (nName.includes(firstPart)) return info;
        if (nName.replace(/\s+/g, '').includes(firstPartNoSpace)) return info;
      }
    } else {
      // 3. Single part — prefix prepend
      if (normalized.length <= 5) {
        const pMatch = this.matchWithPrefix(normalized, normToDistrict);
        if (pMatch) return pMatch;
      }

      // 4. Single part contained in district name (space-insensitive)
      const normNoSpace = normalized.replace(/\s+/g, '');
      for (const [nName, info] of normToDistrict) {
        if (nName.includes(normalized)) return info;
        if (nName.replace(/\s+/g, '').includes(normNoSpace)) return info;
      }
    }

    // 5. District name contained in input (longest-first, space-insensitive)
    const sorted = [...normToDistrict.entries()]
      .filter(([n]) => n.length >= 3)
      .sort((a, b) => b[0].length - a[0].length);
    const normalizedNoSpace = normalized.replace(/\s+/g, '');
    for (const [nName, info] of sorted) {
      if (normalized.includes(nName)) return info;
      if (normalizedNoSpace.includes(nName.replace(/\s+/g, ''))) return info;
    }

    return null;
  }

  private matchWithPrefix(
    name: string,
    normToDistrict: Map<string, DistrictInfo>,
  ): DistrictInfo | null {
    for (const prefix of DISTRICT_PREFIXES) {
      const prefixed = `${prefix} ${name}`.trim();
      const match = normToDistrict.get(prefixed);
      if (match) return match;
    }
    return null;
  }

  private tryStripPrefix(
    name: string,
    normToDistrict: Map<string, DistrictInfo>,
  ): DistrictInfo | null {
    for (const prefix of DISTRICT_PREFIXES) {
      const pfx = `${prefix} `;
      if (name.startsWith(pfx)) {
        const remainder = name.slice(pfx.length).trim();
        if (remainder) {
          const exact = normToDistrict.get(remainder);
          if (exact) return exact;
          const pMatch = this.matchWithPrefix(remainder, normToDistrict);
          if (pMatch) return pMatch;
        }
      }
    }
    return null;
  }

  private parseYearBuilt(builtDate: string | null): number | null {
    if (!builtDate || builtDate.trim() === '') return null;
    const d = new Date(builtDate);
    if (isNaN(d.getTime())) return null;
    const { jy } = toJalaali(d);
    return jy;
  }

  private toJalaliDateString(date: Date): string {
    const { jy, jm, jd } = toJalaali(date);
    return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  }
}
