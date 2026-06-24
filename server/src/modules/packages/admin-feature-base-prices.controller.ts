import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FeaturePricingType } from '@prisma/client';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { FeatureBasePriceService } from './feature-base-price.service';
import { FeaturePricingService } from './feature-pricing.service';
import { PackagesService } from './packages.service';

class CreateFeatureBasePriceDto {
  @IsString()
  featureKey!: string;

  @IsString()
  title!: string;

  @IsString()
  titleEn!: string;

  @IsEnum(FeaturePricingType)
  pricingType!: FeaturePricingType;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  unitLabel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class UpdateFeatureBasePriceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsEnum(FeaturePricingType)
  pricingType?: FeaturePricingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  unitLabel?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

@Controller('admin/feature-base-prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFeatureBasePricesController {
  constructor(
    private readonly featureBasePriceService: FeatureBasePriceService,
    private readonly featurePricingService: FeaturePricingService,
    private readonly packagesService: PackagesService,
  ) {}

  @Get()
  async list() {
    return this.featureBasePriceService.list();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.featureBasePriceService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateFeatureBasePriceDto) {
    return this.featureBasePriceService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFeatureBasePriceDto,
  ) {
    return this.featureBasePriceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.featureBasePriceService.remove(id);
  }

  @Post('recalculate/:packageId')
  async recalculatePackage(@Param('packageId', new ParseUUIDPipe()) packageId: string) {
    const pkg = await this.packagesService.findById(packageId);
    const breakdown = await this.featurePricingService.calculatePackagePricing(
      packageId,
      pkg.durationDays,
    );
    return breakdown;
  }

  @Post('apply-snapshots/:packageId')
  async applySnapshots(@Param('packageId', new ParseUUIDPipe()) packageId: string) {
    await this.featurePricingService.generateSnapshots(packageId);
    return { success: true };
  }
}
