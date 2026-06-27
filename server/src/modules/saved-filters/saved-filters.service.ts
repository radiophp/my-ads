import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { SavedFilterDto } from './dto/saved-filter.dto';
import { type SavedFilterPayload, normalizeSavedFilterPayload } from './saved-filter-payload.util';
import { SubscriptionsService } from '@app/modules/subscriptions/subscriptions.service';

const FEATURE_KEY = 'saved_filters_limit';

@Injectable()
export class SavedFiltersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async list(userId: string, isAdmin = false) {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const limit = await this.subscriptionsService.resolveFeatureLimit(userId, FEATURE_KEY, isAdmin);

    const [filters, activeCount] = await Promise.all([
      this.prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedFilter.count({ where: { userId, isActive: true } }),
    ]);

    const items = filters.map((filter) =>
      SavedFilterDto.fromEntity(filter, normalizeSavedFilterPayload(filter.payload)),
    );

    return {
      filters: items,
      limit: isAdmin ? -1 : limit,
      activeCount: isAdmin ? -1 : activeCount,
      remaining: isAdmin ? -1 : Math.max(limit - activeCount, 0),
    };
  }

  private validateFilterPayload(payload: SavedFilterPayload): void {
    if (!payload.categorySelection.slug || payload.categorySelection.depth !== 3) {
      throw new BadRequestException(
        'برای ذخیره فیلتر باید یک دسته‌بندی سطح آخر (سطح ۳) را انتخاب کنید.',
      );
    }

    if (
      payload.districtSelection.mode !== 'custom' ||
      payload.districtSelection.districtIds.length < 1 ||
      payload.districtSelection.districtIds.length > 3
    ) {
      throw new BadRequestException(
        'برای ذخیره فیلتر باید حداقل ۱ و حداکثر ۳ منطقه را انتخاب کنید.',
      );
    }
  }

  async create(userId: string, dto: CreateSavedFilterDto, isAdmin = false) {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const limit = await this.subscriptionsService.resolveFeatureLimit(userId, FEATURE_KEY, isAdmin);

    if (limit === 0) {
      throw new BadRequestException(
        'برای ذخیره فیلتر نیاز به اشتراک فعال دارید. برای خرید اشتراک به صفحه اشتراک‌ها مراجعه کنید.',
      );
    }

    if (!isAdmin) {
      const activeCount = await this.prisma.savedFilter.count({
        where: { userId, isActive: true },
      });
      if (activeCount >= limit) {
        throw new BadRequestException(
          'حداکثر تعداد فیلتر فعال را رسیده‌اید. ابتدا یکی از فیلترها را غیرفعال یا حذف کنید.',
        );
      }
    }

    const name = dto.name.trim();
    const existingName = await this.prisma.savedFilter.findFirst({
      where: { userId, name },
    });
    if (existingName) {
      throw new BadRequestException('You already saved a filter with this name.');
    }

    const payload = normalizeSavedFilterPayload(dto.payload);
    this.validateFilterPayload(payload);
    const notificationsEnabled = dto.notificationsEnabled !== false;

    const entity = await this.prisma.savedFilter.create({
      data: {
        userId,
        name,
        payload: payload as Prisma.InputJsonValue,
        notificationsEnabled,
        isActive: true,
      },
    });

    const activeCount = await this.prisma.savedFilter.count({ where: { userId, isActive: true } });

    return {
      filter: SavedFilterDto.fromEntity(entity, payload),
      limit: isAdmin ? -1 : limit,
      activeCount: isAdmin ? -1 : activeCount,
      remaining: isAdmin ? -1 : Math.max(limit - activeCount, 0),
    };
  }

  async update(userId: string, id: string, dto: UpdateSavedFilterDto) {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const existing = await this.prisma.savedFilter.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Saved filter not found.');
    }

    let nextName = existing.name;
    if (typeof dto.name === 'string' && dto.name.trim().length > 0) {
      const trimmed = dto.name.trim();
      if (trimmed !== existing.name) {
        const duplicate = await this.prisma.savedFilter.findFirst({
          where: { userId, name: trimmed, NOT: { id } },
        });
        if (duplicate) {
          throw new BadRequestException('Another saved filter already uses this name.');
        }
        nextName = trimmed;
      }
    }

    const nextPayload: SavedFilterPayload =
      typeof dto.payload === 'undefined'
        ? normalizeSavedFilterPayload(existing.payload)
        : normalizeSavedFilterPayload(dto.payload);

    if (typeof dto.payload !== 'undefined') {
      this.validateFilterPayload(nextPayload);
    }

    const updateData: Prisma.SavedFilterUpdateInput = {
      name: nextName,
      payload: nextPayload as Prisma.InputJsonValue,
    };

    if (typeof dto.notificationsEnabled === 'boolean') {
      if (dto.notificationsEnabled && !existing.isActive) {
        throw new BadRequestException(
          'Cannot enable notifications on an inactive filter. Activate the filter first.',
        );
      }
      updateData.notificationsEnabled = dto.notificationsEnabled;
    }

    const entity = await this.prisma.savedFilter.update({
      where: { id },
      data: updateData,
    });

    return SavedFilterDto.fromEntity(entity, nextPayload);
  }

  async remove(userId: string, id: string, isAdmin = false) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    const existing = await this.prisma.savedFilter.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Saved filter not found.');
    }
    await this.prisma.savedFilter.delete({ where: { id } });

    const limit = await this.subscriptionsService.resolveFeatureLimit(userId, FEATURE_KEY, isAdmin);
    const activeCount = await this.prisma.savedFilter.count({ where: { userId, isActive: true } });

    return {
      success: true,
      limit: isAdmin ? -1 : limit,
      activeCount: isAdmin ? -1 : activeCount,
      remaining: isAdmin ? -1 : Math.max(limit - activeCount, 0),
    };
  }

  async toggleActive(userId: string, id: string, isAdmin = false) {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const filter = await this.prisma.savedFilter.findFirst({
      where: { id, userId },
    });
    if (!filter) {
      throw new NotFoundException('Saved filter not found.');
    }

    const newActive = !filter.isActive;
    const limit = await this.subscriptionsService.resolveFeatureLimit(userId, FEATURE_KEY, isAdmin);

    if (newActive && !isAdmin) {
      const activeCount = await this.prisma.savedFilter.count({
        where: { userId, isActive: true },
      });
      if (activeCount >= limit) {
        const message =
          limit === 0
            ? 'اشتراک شما به پایان رسیده است. برای فعال‌سازی مجموعه، اشتراک خود را تمدید کنید.'
            : 'حداکثر تعداد فیلتر فعال را رسیده‌اید. ابتدا یکی از فیلترها را غیرفعال یا حذف کنید.';
        throw new BadRequestException(message);
      }
    }

    const entity = await this.prisma.savedFilter.update({
      where: { id },
      data: {
        isActive: newActive,
        ...(newActive ? {} : { notificationsEnabled: false }),
      },
    });

    const activeCount = await this.prisma.savedFilter.count({ where: { userId, isActive: true } });

    return {
      filter: SavedFilterDto.fromEntity(entity, normalizeSavedFilterPayload(entity.payload)),
      limit: isAdmin ? -1 : limit,
      activeCount: isAdmin ? -1 : activeCount,
      remaining: isAdmin ? -1 : Math.max(limit - activeCount, 0),
    };
  }
}
