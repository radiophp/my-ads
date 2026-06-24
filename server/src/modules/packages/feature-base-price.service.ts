import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeaturePricingType } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PACKAGE_FEATURES } from './package-features.constants';

interface CreateFeatureBasePriceDto {
  featureKey: string;
  title: string;
  titleEn: string;
  pricingType: FeaturePricingType;
  unitPrice: number;
  unitLabel?: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdateFeatureBasePriceDto {
  title?: string;
  titleEn?: string;
  pricingType?: FeaturePricingType;
  unitPrice?: number;
  unitLabel?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

const FEATURE_LABELS: Record<string, { title: string; titleEn: string; unitLabel: string | null }> =
  {
    saved_filters_limit: {
      title: 'تعداد فیلترهای ذخیره شده',
      titleEn: 'Saved Filters Limit',
      unitLabel: 'فیلتر',
    },
    allow_discount_codes: { title: 'کد تخفیف', titleEn: 'Discount Codes', unitLabel: null },
    allow_invite_codes: { title: 'کد دعوت', titleEn: 'Invite Codes', unitLabel: null },
    ring_binders_limit: {
      title: 'تعداد زونکن‌ها',
      titleEn: 'Ring Binders Limit',
      unitLabel: 'زونکن',
    },
    districts_limit: {
      title: 'تعداد مناطق تحت پوشش',
      titleEn: 'Districts Limit',
      unitLabel: 'منطقه',
    },
    notifications_limit: {
      title: 'تعداد اعلان‌ها',
      titleEn: 'Notifications Limit',
      unitLabel: 'اعلان',
    },
    zip_downloads_per_day: {
      title: 'دانلود زیپ روزانه',
      titleEn: 'Zip Downloads Per Day',
      unitLabel: 'دانلود',
    },
    divar_drafts_per_day: {
      title: 'پیش‌نویس دیوار روزانه',
      titleEn: 'Divar Drafts Per Day',
      unitLabel: 'پیش‌نویس',
    },
    ai_edits_limit: {
      title: 'تعداد ویرایش هوشمند',
      titleEn: 'AI Edits Limit',
      unitLabel: 'ویرایش',
    },
    channels_limit: { title: 'تعداد کانال‌ها', titleEn: 'Channels Limit', unitLabel: 'کانال' },
    share_ring_binder: { title: 'اشتراک زونکن', titleEn: 'Share Ring Binder', unitLabel: 'زونکن' },
    builders_archive: { title: 'آرشیو سازندگان', titleEn: 'Builders Archive', unitLabel: 'منطقه' },
    archive_history_quarters: {
      title: 'دسترسی به آرشیو فصلی',
      titleEn: 'Seasonal Archive Access',
      unitLabel: 'فصل',
    },
  };

@Injectable()
export class FeatureBasePriceService {
  constructor(private readonly prisma: PrismaService) {}

  async seedFromConstants(): Promise<void> {
    const entries = Object.entries(PACKAGE_FEATURES);
    for (const [featureKey, featureDef] of entries) {
      const labels = FEATURE_LABELS[featureKey];
      if (!labels) continue;

      const pricingType: FeaturePricingType =
        featureDef.type === 'NUMBER' ? FeaturePricingType.PER_UNIT : FeaturePricingType.FLAT_ACCESS;

      const limitType = featureDef.limitType ?? 'OVERALL';

      await this.prisma.featureBasePrice.upsert({
        where: { featureKey },
        update: {
          title: labels.title,
          titleEn: labels.titleEn,
          pricingType,
          unitLabel: labels.unitLabel,
          limitType,
        },
        create: {
          featureKey,
          title: labels.title,
          titleEn: labels.titleEn,
          pricingType,
          unitPrice: 0,
          unitLabel: labels.unitLabel,
          limitType,
          sortOrder: entries.findIndex(([k]) => k === featureKey),
        },
      });
    }
  }

  async list(): Promise<unknown[]> {
    return this.prisma.featureBasePrice.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findById(id: string): Promise<unknown> {
    const entity = await this.prisma.featureBasePrice.findUnique({ where: { id } });
    if (!entity) throw new NotFoundException('Feature base price not found.');
    return entity;
  }

  async create(dto: CreateFeatureBasePriceDto): Promise<unknown> {
    const existing = await this.prisma.featureBasePrice.findUnique({
      where: { featureKey: dto.featureKey },
    });
    if (existing) throw new BadRequestException('Feature key already exists.');

    return this.prisma.featureBasePrice.create({ data: { ...dto, unitPrice: dto.unitPrice } });
  }

  async update(id: string, dto: UpdateFeatureBasePriceDto): Promise<unknown> {
    await this.findById(id);
    return this.prisma.featureBasePrice.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.featureBasePrice.delete({ where: { id } });
  }
}
