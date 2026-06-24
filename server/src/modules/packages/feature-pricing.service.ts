import { Injectable } from '@nestjs/common';
import { FeaturePricingType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';

interface FeatureDailyPrice {
  featureKey: string;
  pricingType: FeaturePricingType;
  unitPrice: string;
  limitValue: number;
  limitType: string;
  dailyTotal: string;
}

export interface PackagePricingBreakdown {
  dailyTotal: string;
  totalForDuration: string;
  features: FeatureDailyPrice[];
}

@Injectable()
export class FeaturePricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculatePackagePricing(
    packageId: string,
    durationDays: number,
  ): Promise<PackagePricingBreakdown> {
    const configs = await this.prisma.packageFeatureConfig.findMany({
      where: { packageId },
    });

    const basePrices = await this.prisma.featureBasePrice.findMany({
      where: { isActive: true },
    });

    const basePriceMap = new Map(basePrices.map((bp) => [bp.featureKey, bp]));

    const features: FeatureDailyPrice[] = configs.map((cfg) => {
      const base = basePriceMap.get(cfg.featureKey);
      const pricingType = base?.pricingType ?? FeaturePricingType.PER_UNIT;
      const limitType = base?.limitType ?? 'OVERALL';
      const unitPrice = cfg.unitPriceOverride ?? base?.unitPrice ?? new Prisma.Decimal(0);
      const limitValue = cfg.limitValue;
      const unitPriceNum = new Prisma.Decimal(unitPrice.toString());

      const totalRaw =
        pricingType === FeaturePricingType.FLAT_ACCESS
          ? limitValue > 0
            ? unitPriceNum
            : new Prisma.Decimal(0)
          : unitPriceNum.mul(limitValue);

      const dailyTotal =
        limitType === 'OVERALL' && pricingType === FeaturePricingType.PER_UNIT
          ? totalRaw.div(durationDays)
          : totalRaw;

      return {
        featureKey: cfg.featureKey,
        pricingType,
        unitPrice: unitPriceNum.toString(),
        limitValue,
        limitType,
        dailyTotal: dailyTotal.toString(),
      };
    });

    const dailySum = features.reduce(
      (sum, f) => sum.add(new Prisma.Decimal(f.dailyTotal)),
      new Prisma.Decimal(0),
    );
    const totalForDuration = dailySum.mul(durationDays);

    return {
      dailyTotal: dailySum.toString(),
      totalForDuration: totalForDuration.toString(),
      features,
    };
  }

  async generateSnapshots(packageId: string): Promise<void> {
    const pkg = await this.prisma.subscriptionPackage.findUnique({ where: { id: packageId } });
    if (!pkg) return;
    const durationDays = pkg.durationDays;

    const configs = await this.prisma.packageFeatureConfig.findMany({
      where: { packageId },
    });

    const basePrices = await this.prisma.featureBasePrice.findMany({
      where: { isActive: true },
    });

    const basePriceMap = new Map(basePrices.map((bp) => [bp.featureKey, bp]));

    for (const cfg of configs) {
      const base = basePriceMap.get(cfg.featureKey);
      const pricingType = base?.pricingType ?? FeaturePricingType.PER_UNIT;
      const limitType = base?.limitType ?? 'OVERALL';
      const unitPrice = cfg.unitPriceOverride ?? base?.unitPrice ?? new Prisma.Decimal(0);
      const unitPriceNum = new Prisma.Decimal(unitPrice.toString());
      const limitValue = cfg.limitValue;

      const totalRaw =
        pricingType === FeaturePricingType.FLAT_ACCESS
          ? limitValue > 0
            ? unitPriceNum
            : new Prisma.Decimal(0)
          : unitPriceNum.mul(limitValue);

      const dailyTotal =
        limitType === 'OVERALL' && pricingType === FeaturePricingType.PER_UNIT
          ? totalRaw.div(durationDays)
          : totalRaw;

      await this.prisma.packageFeaturePriceSnapshot.upsert({
        where: { packageId_featureKey: { packageId, featureKey: cfg.featureKey } },
        update: {
          pricingType,
          unitPrice: unitPriceNum,
          limitValue,
          dailyTotal,
        },
        create: {
          packageId,
          featureKey: cfg.featureKey,
          pricingType,
          unitPrice: unitPriceNum,
          limitValue,
          dailyTotal,
        },
      });
    }
  }
}
