import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { FeatureBasePriceService } from './feature-base-price.service';
import { FeaturePricingService } from './feature-pricing.service';
import { AdminFeatureBasePricesController } from './admin-feature-base-prices.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PackagesController, AdminFeatureBasePricesController],
  providers: [PackagesService, FeatureBasePriceService, FeaturePricingService],
  exports: [PackagesService, FeatureBasePriceService, FeaturePricingService],
})
export class PackagesModule {}
