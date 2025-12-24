import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { CreateSlideDto } from './dto/create-slide.dto';
import type { UpdateSlideDto } from './dto/update-slide.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const slideSelect = {
  id: true,
  title: true,
  description: true,
  linkUrl: true,
  linkLabel: true,
  imageDesktopUrl: true,
  imageTabletUrl: true,
  imageMobileUrl: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

type SlideItem = Prisma.SlideGetPayload<{ select: typeof slideSelect }>;

const isMissingSlideTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const getSlideDelegate = (prisma: PrismaService) => {
  const delegate = (prisma as PrismaService & { slide?: Prisma.SlideDelegate }).slide;
  if (!delegate) {
    return null;
  }
  return delegate;
};

@Injectable()
export class SlidesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicSlides() {
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        return [];
      }
      return await delegate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: slideSelect,
      });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        return [];
      }
      throw error;
    }
  }

  async listAdminSlides(page = 1, pageSize = DEFAULT_PAGE_SIZE, search?: string) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const skip = (safePage - 1) * safeSize;

    const where: Prisma.SlideWhereInput = {};
    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      where.OR = [
        { title: { contains: normalizedSearch, mode: 'insensitive' } },
        { description: { contains: normalizedSearch, mode: 'insensitive' } },
      ];
    }

    let items: SlideItem[] = [];
    let total = 0;
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        return { items, total, page: safePage, pageSize: safeSize };
      }
      [items, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: safeSize,
          select: slideSelect,
        }),
        delegate.count({ where }),
      ]);
    } catch (error) {
      if (!isMissingSlideTable(error)) {
        throw error;
      }
    }

    return {
      items,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  async getAdminSlide(id: string) {
    let slide: SlideItem | null = null;
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new NotFoundException('Slide not found');
      }
      slide = await delegate.findUnique({
        where: { id },
        select: slideSelect,
      });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new NotFoundException('Slide not found');
      }
      throw error;
    }
    if (!slide) {
      throw new NotFoundException('Slide not found');
    }
    return slide;
  }

  async createSlide(dto: CreateSlideDto) {
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      return await delegate.create({
        data: {
          title: dto.title?.trim() || null,
          description: dto.description?.trim() || null,
          linkUrl: dto.linkUrl?.trim() || null,
          linkLabel: dto.linkLabel?.trim() || null,
          imageDesktopUrl: dto.imageDesktopUrl,
          imageTabletUrl: dto.imageTabletUrl ?? null,
          imageMobileUrl: dto.imageMobileUrl ?? null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: slideSelect,
      });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      throw error;
    }
  }

  async updateSlide(id: string, dto: UpdateSlideDto) {
    let existing: { id: string } | null = null;
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      existing = await delegate.findUnique({ where: { id } });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      throw error;
    }
    if (!existing) {
      throw new NotFoundException('Slide not found');
    }

    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      return await delegate.update({
        where: { id },
        data: {
          title: dto.title !== undefined ? dto.title?.trim() || null : undefined,
          description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
          linkUrl: dto.linkUrl !== undefined ? dto.linkUrl?.trim() || null : undefined,
          linkLabel: dto.linkLabel !== undefined ? dto.linkLabel?.trim() || null : undefined,
          imageDesktopUrl: dto.imageDesktopUrl,
          imageTabletUrl: dto.imageTabletUrl ?? undefined,
          imageMobileUrl: dto.imageMobileUrl ?? undefined,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
        select: slideSelect,
      });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      throw error;
    }
  }

  async deleteSlide(id: string) {
    let existing: { id: string } | null = null;
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      existing = await delegate.findUnique({ where: { id } });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      throw error;
    }
    if (!existing) {
      throw new NotFoundException('Slide not found');
    }
    try {
      const delegate = getSlideDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      await delegate.delete({ where: { id } });
    } catch (error) {
      if (isMissingSlideTable(error)) {
        throw new ServiceUnavailableException('Slides are not initialized.');
      }
      throw error;
    }
  }
}
