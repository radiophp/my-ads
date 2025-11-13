import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';

export const MAX_RING_BINDER_FOLDERS = 30;

@Injectable()
export class RingBindersService {
  constructor(private readonly prismaService: PrismaService) {}

  listFolders(userId: string) {
    return this.prismaService.ringBinderFolder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async ensureActiveFolder(userId: string, folderId: string) {
    const folder = await this.prismaService.ringBinderFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.userId !== userId || folder.deletedAt) {
      throw new NotFoundException('Folder not found.');
    }
    return folder;
  }

  async createFolder(userId: string, name: string) {
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      throw new BadRequestException('Folder name cannot be empty.');
    }

    const folderCount = await this.prismaService.ringBinderFolder.count({
      where: { userId, deletedAt: null },
    });
    if (folderCount >= MAX_RING_BINDER_FOLDERS) {
      throw new BadRequestException(`You can create up to ${MAX_RING_BINDER_FOLDERS} folders.`);
    }

    try {
      return await this.prismaService.ringBinderFolder.create({
        data: {
          userId,
          name: sanitizedName,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A folder with this name already exists.');
      }
      throw error;
    }
  }

  async renameFolder(userId: string, folderId: string, name: string) {
    const folder = await this.ensureActiveFolder(userId, folderId);
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      throw new BadRequestException('Folder name cannot be empty.');
    }
    if (sanitizedName === folder.name) {
      return folder;
    }
    try {
      return await this.prismaService.ringBinderFolder.update({
        where: { id: folderId },
        data: { name: sanitizedName },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A folder with this name already exists.');
      }
      throw error;
    }
  }

  async deleteFolder(userId: string, folderId: string) {
    await this.ensureActiveFolder(userId, folderId);
    return this.prismaService.ringBinderFolder.update({
      where: { id: folderId },
      data: { deletedAt: new Date() },
    });
  }
}
