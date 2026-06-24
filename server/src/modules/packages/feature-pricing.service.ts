import { Injectable } from '@nestjs/common';
import { FeaturePricingType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';

export interface PricingCalculationInput {
  featureKey: string;
  limitValue: number;
}

interface FeaturePriceLine {
  featureKey: string;
  pricingType: FeaturePricingType;
  unitPrice: string;
  limitValue: number;
  limitType: string;
  dailyTotal: string;
  oneTimeTotal: string;
  isPermanent: boolean;
}

export interface PackagePricingBreakdown {
  subscriptionDailyTotal: string;
  subscriptionTotalForDuration: string;
  oneTimeTotal: string;
  grandTotal: string;
  features: FeaturePriceLine[];
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

    return this.doCalculate(durationDays, configs);
  }

  async calculatePricingFromConfigs(
    durationDays: number,
    inputs: PricingCalculationInput[],
  ): Promise<PackagePricingBreakdown> {
    return this.doCalculate(durationDays, inputs);
  }

  private async doCalculate(
    durationDays: number,
    inputs: { featureKey: string; limitValue: number }[],
  ): Promise<PackagePricingBreakdown> {
    const basePrices = await this.prisma.featureBasePrice.findMany({
      where: { isActive: true },
    });

    const basePriceMap = new Map(basePrices.map((bp) => [bp.featureKey, bp]));

    const features: FeaturePriceLine[] = inputs.map((cfg) => {
      const base = basePriceMap.get(cfg.featureKey);
      const pricingType = base?.pricingType ?? FeaturePricingType.PER_UNIT;
      const limitType = base?.limitType ?? 'OVERALL';
      const isPermanent = base?.isPermanent ?? false;
      const unitPrice = base?.unitPrice ?? new Prisma.Decimal(0);
      const limitValue = cfg.limitValue;
      const unitPriceNum = new Prisma.Decimal(unitPrice.toString());

      const totalRaw =
        pricingType === FeaturePricingType.FLAT_ACCESS
          ? limitValue > 0
            ? unitPriceNum
            : new Prisma.Decimal(0)
          : unitPriceNum.mul(limitValue);

      const dailyTotal =
        isPermanent
          ? new Prisma.Decimal(0)
          : limitType === 'OVERALL' && pricingType === FeaturePricingType.PER_UNIT
            ? totalRaw.div(durationDays)
            : totalRaw;

      const oneTimeTotal = isPermanent ? totalRaw : new Prisma.Decimal(0);

      return {
        featureKey: cfg.featureKey,
        pricingType,
        unitPrice: unitPriceNum.toString(),
        limitValue,
        limitType,
        isPermanent,
        dailyTotal: dailyTotal.toString(),
        oneTimeTotal: oneTimeTotal.toString(),
      };
    });

    const subscriptionFeatures = features.filter((f) => !f.isPermanent);
    const oneTimeFeatures = features.filter((f) => f.isPermanent);

    const subscriptionDailySum = subscriptionFeatures.reduce(
      (sum, f) => sum.add(new Prisma.Decimal(f.dailyTotal)),
      new Prisma.Decimal(0),
    );
    const subscriptionTotalForDuration = subscriptionDailySum.mul(durationDays);

    const oneTimeSum = oneTimeFeatures.reduce(
      (sum, f) => sum.add(new Prisma.Decimal(f.oneTimeTotal)),
      new Prisma.Decimal(0),
    );

    const grandTotal = subscriptionTotalForDuration.add(oneTimeSum);

    return {
      subscriptionDailyTotal: subscriptionDailySum.toString(),
      subscriptionTotalForDuration: subscriptionTotalForDuration.toString(),
      oneTimeTotal: oneTimeSum.toString(),
      grandTotal: grandTotal.toString(),
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
      const isPermanent = base?.isPermanent ?? false;
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
        isPermanent
          ? new Prisma.Decimal(0)
          : limitType === 'OVERALL' && pricingType === FeaturePricingType.PER_UNIT
            ? totalRaw.div(durationDays)
            : totalRaw;

      const oneTimeTotalForSnap = isPermanent ? totalRaw : new Prisma.Decimal(0);

      await this.prisma.packageFeaturePriceSnapshot.upsert({
        where: { packageId_featureKey: { packageId, featureKey: cfg.featureKey } },
        update: {
          pricingType,
          unitPrice: unitPriceNum,
          limitValue,
          dailyTotal,
          oneTimeTotal: oneTimeTotalForSnap.toString(),
          isPermanent,
        },
        create: {
          packageId,
          featureKey: cfg.featureKey,
          pricingType,
          unitPrice: unitPriceNum,
          limitValue,
          dailyTotal,
          oneTimeTotal: oneTimeTotalForSnap.toString(),
          isPermanent,
        },
      });
    }
  }
}
