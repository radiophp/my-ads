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

  private async assertNameAvailable(userId: string, name: string, excludeId?: string) {
    const existing = await this.prismaService.ringBinderFolder.findFirst({
      where: {
        userId,
        name,
        deletedAt: null,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists.');
    }
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

    await this.assertNameAvailable(userId, sanitizedName);

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
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      throw new BadRequestException('Folder name cannot be empty.');
    }
    const folder = await this.ensureActiveFolder(userId, folderId);
    if (sanitizedName === folder.name) {
      return folder;
    }
    await this.assertNameAvailable(userId, sanitizedName, folderId);
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

  async savePostToFolder(userId: string, folderId: string, postId: string) {
    const folder = await this.ensureActiveFolder(userId, folderId);
    const post = await this.prismaService.divarPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    const existing = await this.prismaService.ringBinderFolderPost.findUnique({
      where: { folderId_postId: { folderId: folder.id, postId } },
    });
    if (existing) {
      throw new ConflictException('This post is already saved in the selected folder.');
    }

    await this.prismaService.ringBinderFolderPost.create({
      data: {
        folderId: folder.id,
        postId,
      },
    });

    return { success: true };
  }

  async removePostFromFolder(userId: string, folderId: string, postId: string) {
    await this.ensureActiveFolder(userId, folderId);
    const link = await this.prismaService.ringBinderFolderPost.findUnique({
      where: { folderId_postId: { folderId, postId } },
    });
    if (!link) {
      throw new NotFoundException('Saved post not found.');
    }
    await this.prismaService.ringBinderFolderPost.delete({
      where: { id: link.id },
    });
    return { success: true };
  }

  async listSavedFolders(userId: string, postId: string) {
    const entries = await this.prismaService.ringBinderFolderPost.findMany({
      where: {
        postId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        folderId: true,
        createdAt: true,
        folder: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return entries.map((entry) => ({
      id: entry.id,
      folderId: entry.folderId,
      createdAt: entry.createdAt.toISOString(),
      folderName: entry.folder.name,
    }));
  }
}
