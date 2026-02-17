import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PackageDto } from './dto/package.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PackageDto[]> {
    const packages = await this.prisma.subscriptionPackage.findMany({
      orderBy: [
        { durationDays: 'asc' },
        { includedUsers: 'asc' },
        { discountedPrice: 'asc' },
        { title: 'asc' },
      ],
    });

    return packages.map(PackageDto.fromEntity);
  }

  async findById(id: string): Promise<PackageDto> {
    const entity = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Subscription package not found.');
    }
    return PackageDto.fromEntity(entity);
  }

  async create(dto: CreatePackageDto): Promise<PackageDto> {
    if (dto.discountedPrice > dto.actualPrice) {
      throw new BadRequestException('Discounted price cannot exceed actual price.');
    }

    const entity = await this.prisma.subscriptionPackage.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        durationDays: dto.durationDays,
        freeDays: dto.freeDays,
        includedUsers: dto.includedUsers,
        savedFiltersLimit: dto.savedFiltersLimit ?? undefined,
        allowDiscountCodes: dto.allowDiscountCodes ?? undefined,
        allowInviteCodes: dto.allowInviteCodes ?? undefined,
        isTrial: dto.isTrial ?? undefined,
        trialOncePerUser: dto.trialOncePerUser ?? undefined,
        actualPrice: new Prisma.Decimal(dto.actualPrice),
        discountedPrice: new Prisma.Decimal(dto.discountedPrice),
        isActive: dto.isActive ?? true,
      },
    });

    return PackageDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageDto> {
    const existing = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription package not found.');
    }

    let nextActualPrice = existing.actualPrice.toNumber();
    if (typeof dto.actualPrice === 'number') {
      nextActualPrice = dto.actualPrice;
    }

    let nextDiscountedPrice = existing.discountedPrice.toNumber();
    if (typeof dto.discountedPrice === 'number') {
      nextDiscountedPrice = dto.discountedPrice;
    }

    if (nextDiscountedPrice > nextActualPrice) {
      throw new BadRequestException('Discounted price cannot exceed actual price.');
    }

    const entity = await this.prisma.subscriptionPackage.update({
      where: { id },
      data: {
        ...(typeof dto.title === 'string' ? { title: dto.title } : {}),
        ...(typeof dto.description !== 'undefined' ? { description: dto.description } : {}),
        ...(typeof dto.imageUrl !== 'undefined' ? { imageUrl: dto.imageUrl } : {}),
        ...(typeof dto.durationDays === 'number' ? { durationDays: dto.durationDays } : {}),
        ...(typeof dto.freeDays === 'number' ? { freeDays: dto.freeDays } : {}),
        ...(typeof dto.includedUsers === 'number' ? { includedUsers: dto.includedUsers } : {}),
        ...(typeof dto.savedFiltersLimit === 'number'
          ? { savedFiltersLimit: dto.savedFiltersLimit }
          : {}),
        ...(typeof dto.allowDiscountCodes === 'boolean'
          ? { allowDiscountCodes: dto.allowDiscountCodes }
          : {}),
        ...(typeof dto.allowInviteCodes === 'boolean'
          ? { allowInviteCodes: dto.allowInviteCodes }
          : {}),
        ...(typeof dto.isTrial === 'boolean' ? { isTrial: dto.isTrial } : {}),
        ...(typeof dto.trialOncePerUser === 'boolean'
          ? { trialOncePerUser: dto.trialOncePerUser }
          : {}),
        ...(typeof dto.actualPrice === 'number'
          ? { actualPrice: new Prisma.Decimal(dto.actualPrice) }
          : {}),
        ...(typeof dto.discountedPrice === 'number'
          ? { discountedPrice: new Prisma.Decimal(dto.discountedPrice) }
          : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      },
    });

    return PackageDto.fromEntity(entity);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription package not found.');
    }
    await this.prisma.subscriptionPackage.delete({ where: { id } });
  }
}
