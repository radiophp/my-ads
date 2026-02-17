import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountCodeType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { DiscountCodeDto } from './dto/discount-code.dto';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount-code.dto';

@Injectable()
export class DiscountCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<DiscountCodeDto[]> {
    const codes = await this.prisma.discountCode.findMany({
      orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
    });
    return codes.map(DiscountCodeDto.fromEntity);
  }

  async findById(id: string): Promise<DiscountCodeDto> {
    const entity = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Discount code not found.');
    }
    return DiscountCodeDto.fromEntity(entity);
  }

  async create(dto: CreateDiscountCodeDto): Promise<DiscountCodeDto> {
    const code = dto.code.trim().toUpperCase();
    this.ensureValueInRange(dto.type, dto.value);
    this.ensureValidDateRange(dto.validFrom ?? null, dto.validTo ?? null);
    this.ensureLimitConsistency(dto.maxRedemptions ?? null, dto.maxRedemptionsPerUser ?? null);

    if (dto.packageId) {
      await this.ensurePackageExists(dto.packageId);
    }

    try {
      const entity = await this.prisma.discountCode.create({
        data: {
          code,
          description: dto.description ?? null,
          type: dto.type,
          value: new Prisma.Decimal(dto.value),
          maxRedemptions: dto.maxRedemptions ?? null,
          maxRedemptionsPerUser: dto.maxRedemptionsPerUser ?? null,
          validFrom: dto.validFrom ?? null,
          validTo: dto.validTo ?? null,
          isActive: dto.isActive ?? true,
          packageId: dto.packageId ?? null,
        },
      });
      return DiscountCodeDto.fromEntity(entity);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Discount code already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDiscountCodeDto): Promise<DiscountCodeDto> {
    const existing = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Discount code not found.');
    }

    const nextType = dto.type ?? existing.type;
    const nextValue = typeof dto.value === 'number' ? dto.value : existing.value.toNumber();
    this.ensureValueInRange(nextType, nextValue);

    const nextValidFrom = typeof dto.validFrom !== 'undefined' ? dto.validFrom : existing.validFrom;
    const nextValidTo = typeof dto.validTo !== 'undefined' ? dto.validTo : existing.validTo;
    this.ensureValidDateRange(nextValidFrom, nextValidTo);

    const nextMaxRedemptions =
      typeof dto.maxRedemptions !== 'undefined' ? dto.maxRedemptions : existing.maxRedemptions;
    const nextMaxRedemptionsPerUser =
      typeof dto.maxRedemptionsPerUser !== 'undefined'
        ? dto.maxRedemptionsPerUser
        : existing.maxRedemptionsPerUser;
    this.ensureLimitConsistency(nextMaxRedemptions, nextMaxRedemptionsPerUser);

    if (typeof dto.packageId === 'string' && dto.packageId) {
      await this.ensurePackageExists(dto.packageId);
    }

    try {
      const entity = await this.prisma.discountCode.update({
        where: { id },
        data: {
          ...(typeof dto.code === 'string' ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(typeof dto.description !== 'undefined'
            ? { description: dto.description ?? null }
            : {}),
          ...(typeof dto.type !== 'undefined' ? { type: dto.type } : {}),
          ...(typeof dto.value !== 'undefined' ? { value: new Prisma.Decimal(dto.value) } : {}),
          ...(typeof dto.maxRedemptions !== 'undefined'
            ? { maxRedemptions: dto.maxRedemptions ?? null }
            : {}),
          ...(typeof dto.maxRedemptionsPerUser !== 'undefined'
            ? { maxRedemptionsPerUser: dto.maxRedemptionsPerUser ?? null }
            : {}),
          ...(typeof dto.validFrom !== 'undefined' ? { validFrom: dto.validFrom ?? null } : {}),
          ...(typeof dto.validTo !== 'undefined' ? { validTo: dto.validTo ?? null } : {}),
          ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
          ...(typeof dto.packageId !== 'undefined' ? { packageId: dto.packageId ?? null } : {}),
        },
      });
      return DiscountCodeDto.fromEntity(entity);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Discount code already exists.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Discount code not found.');
    }
    await this.prisma.discountCode.delete({ where: { id } });
  }

  private ensureValueInRange(type: DiscountCodeType, value: number) {
    if (type === DiscountCodeType.PERCENT && value > 100) {
      throw new BadRequestException('Percent discount cannot exceed 100.');
    }
    if (value < 0) {
      throw new BadRequestException('Discount value cannot be negative.');
    }
  }

  private ensureValidDateRange(validFrom: Date | null, validTo: Date | null) {
    if (validFrom && validTo && validTo.getTime() < validFrom.getTime()) {
      throw new BadRequestException('Valid to date must be after valid from date.');
    }
  }

  private ensureLimitConsistency(maxTotal: number | null, maxPerUser: number | null) {
    if (maxTotal && maxPerUser && maxPerUser > maxTotal) {
      throw new BadRequestException('Max per user cannot exceed max redemptions.');
    }
  }

  private async ensurePackageExists(id: string) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!pkg) {
      throw new BadRequestException('Subscription package not found.');
    }
  }
}
