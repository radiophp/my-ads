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

export const DEFAULT_MAX_SAVED_FILTERS = 5;

@Injectable()
export class SavedFiltersService {
  private readonly defaultLimit: number;

  constructor(private readonly prisma: PrismaService) {
    const parsed = Number.parseInt(process.env['SAVED_FILTERS_DEFAULT_LIMIT'] ?? '', 10);
    this.defaultLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SAVED_FILTERS;
  }

  async list(userId: string) {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const [limit, filters, total] = await Promise.all([
      this.resolveLimitForUser(userId),
      this.prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedFilter.count({ where: { userId } }),
    ]);

    const items = filters.map((filter) =>
      SavedFilterDto.fromEntity(filter, normalizeSavedFilterPayload(filter.payload)),
    );

    return {
      filters: items,
      limit,
      remaining: Math.max(limit - total, 0),
    };
  }

  async create(userId: string, dto: CreateSavedFilterDto) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    const limit = await this.resolveLimitForUser(userId);
    const total = await this.prisma.savedFilter.count({ where: { userId } });
    if (total >= limit) {
      throw new BadRequestException('You reached the maximum number of saved filters.');
    }

    const name = dto.name.trim();
    const existingName = await this.prisma.savedFilter.findFirst({
      where: { userId, name },
    });
    if (existingName) {
      throw new BadRequestException('You already saved a filter with this name.');
    }

    const payload = normalizeSavedFilterPayload(dto.payload);

    const entity = await this.prisma.savedFilter.create({
      data: {
        userId,
        name,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    return {
      filter: SavedFilterDto.fromEntity(entity, payload),
      limit,
      remaining: Math.max(limit - (total + 1), 0),
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

    const entity = await this.prisma.savedFilter.update({
      where: { id },
      data: {
        name: nextName,
        payload: nextPayload as Prisma.InputJsonValue,
      },
    });

    return SavedFilterDto.fromEntity(entity, nextPayload);
  }

  async remove(userId: string, id: string) {
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
    const limit = await this.resolveLimitForUser(userId);
    const total = await this.prisma.savedFilter.count({ where: { userId } });
    return {
      success: true,
      limit,
      remaining: Math.max(limit - total, 0),
    };
  }

  private async resolveLimitForUser(userId: string): Promise<number> {
    if (!userId) {
      return this.defaultLimit;
    }
    // Placeholder for future credit-package aware logic.
    return this.defaultLimit;
  }
}
