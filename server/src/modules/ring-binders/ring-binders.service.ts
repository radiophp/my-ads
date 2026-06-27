import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { SubscriptionsService } from '@app/modules/subscriptions/subscriptions.service';
import { BaleBotService } from '@app/modules/bale/bale.service';

const FEATURE_KEY = 'ring_binders_limit';
const SHARE_FEATURE_KEY = 'share_ring_binder';

@Injectable()
export class RingBindersService {
  private readonly logger = new Logger(RingBindersService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly baleBotService: BaleBotService,
  ) {}

  async listFolders(userId: string, isAdmin = false) {
    const folders = await this.prismaService.ringBinderFolder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        shares: {
          select: {
            sharedWithUser: { select: { phone: true } },
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    const limit = await this.subscriptionsService.resolvePermanentFeatureLimit(
      userId,
      FEATURE_KEY,
      isAdmin,
    );

    return {
      folders: folders.map(({ _count, shares, ...folder }) => ({
        ...folder,
        savedPostCount: _count.posts,
        sharedWithPhones: shares.map((s) => s.sharedWithUser.phone),
      })),
      limit,
      remaining: limit === -1 ? -1 : Math.max(limit - folders.length, 0),
    };
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

  private async ensureFolderAccess(folderId: string, userId: string, requireWrite = true) {
    const folder = await this.prismaService.ringBinderFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.deletedAt) {
      throw new NotFoundException('Folder not found.');
    }

    if (folder.userId === userId) {
      return folder;
    }

    if (!requireWrite) {
      const share = await this.prismaService.ringBinderShare.findUnique({
        where: { folderId_sharedWithUserId: { folderId, sharedWithUserId: userId } },
      });
      if (share) return folder;
    }

    throw new NotFoundException('Folder not found.');
  }

  async createFolder(userId: string, name: string, isAdmin = false) {
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      throw new BadRequestException('Folder name cannot be empty.');
    }

    const limit = await this.subscriptionsService.resolvePermanentFeatureLimit(
      userId,
      FEATURE_KEY,
      isAdmin,
    );

    if (limit !== -1) {
      const folderCount = await this.prismaService.ringBinderFolder.count({
        where: { userId, deletedAt: null },
      });
      if (folderCount >= limit) {
        throw new BadRequestException(`حداکثر ${limit} زونکن می‌توانید داشته باشید.`);
      }
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
    const folder = await this.prismaService.ringBinderFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.deletedAt) {
      throw new NotFoundException('Folder not found.');
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('You do not have write access to this folder.');
    }
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
    const folder = await this.prismaService.ringBinderFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.deletedAt) {
      throw new NotFoundException('Folder not found.');
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('You do not have write access to this folder.');
    }
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
    const note = await this.prismaService.divarPostNote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
    return {
      saved: entries.map((entry) => ({
        id: entry.id,
        folderId: entry.folderId,
        createdAt: entry.createdAt.toISOString(),
        folderName: entry.folder.name,
      })),
      note: note
        ? {
            content: note.content,
            updatedAt: note.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async upsertPostNote(userId: string, postId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      await this.deletePostNote(userId, postId);
      return { content: null };
    }
    const post = await this.prismaService.divarPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    const note = await this.prismaService.divarPostNote.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
        content: trimmed,
      },
      update: {
        content: trimmed,
      },
    });
    return {
      content: note.content,
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async deletePostNote(userId: string, postId: string) {
    const note = await this.prismaService.divarPostNote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
    if (!note) {
      return { success: true };
    }
    await this.prismaService.divarPostNote.delete({
      where: { id: note.id },
    });
    return { success: true };
  }

  // --- Share methods ---

  async shareFolderWithUser(ownerUserId: string, folderId: string, phone: string, isAdmin = false) {
    await this.ensureActiveFolder(ownerUserId, folderId);

    const targetUser = await this.prismaService.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundException('کاربر با این شماره تلفن یافت نشد.');
    }

    if (targetUser.id === ownerUserId) {
      throw new BadRequestException('نمی‌توانید زونکن را با خودتان به اشتراک بگذارید.');
    }

    const existingShare = await this.prismaService.ringBinderShare.findUnique({
      where: { folderId_sharedWithUserId: { folderId, sharedWithUserId: targetUser.id } },
    });
    if (existingShare) {
      throw new ConflictException('این کاربر قبلاً به این زونکن دسترسی دارد.');
    }

    const ownerShares = await this.prismaService.ringBinderShare.findMany({
      where: { sharedByUserId: ownerUserId },
      select: { sharedWithUserId: true },
      distinct: ['sharedWithUserId'],
    });
    const existingCount = ownerShares.length;
    const alreadyShared = ownerShares.some((s) => s.sharedWithUserId === targetUser.id);

    const limit = await this.subscriptionsService.resolvePermanentFeatureLimit(
      ownerUserId,
      SHARE_FEATURE_KEY,
      isAdmin,
    );

    if (limit !== -1 && !alreadyShared && existingCount >= limit) {
      throw new BadRequestException(
        `حداکثر ${limit} کاربر می‌توانید به زونکن‌های خود دسترسی دهید.`,
      );
    }

    const share = await this.prismaService.ringBinderShare.create({
      data: {
        folderId,
        sharedWithUserId: targetUser.id,
        sharedByUserId: ownerUserId,
      },
      include: {
        sharedWithUser: { select: { id: true, phone: true } },
        folder: { select: { name: true } },
        sharedByUser: { select: { phone: true } },
      },
    });

    this.baleBotService
      .sendTextToUser(
        targetUser.id,
        `🔔 یک زونکن با شما به اشتراک گذاشته شد.\n\n📁 "${share.folder.name}" توسط ${share.sharedByUser.phone}\n\nبرای مشاهده از قسمت زونکن‌ها اقدام کنید.`,
      )
      .catch((err) =>
        this.logger.error(`Failed to send Bale notification for share: ${(err as Error).message}`),
      );

    return share;
  }

  async removeShareFromFolder(ownerUserId: string, folderId: string, sharedWithUserId: string) {
    await this.ensureActiveFolder(ownerUserId, folderId);
    const share = await this.prismaService.ringBinderShare.findUnique({
      where: { folderId_sharedWithUserId: { folderId, sharedWithUserId } },
    });
    if (!share) {
      throw new NotFoundException('اشتراک‌گذاری یافت نشد.');
    }
    await this.prismaService.ringBinderShare.delete({ where: { id: share.id } });
    return { success: true };
  }

  async removeUserFromAllShares(ownerUserId: string, sharedWithUserId: string) {
    const result = await this.prismaService.ringBinderShare.deleteMany({
      where: {
        sharedByUserId: ownerUserId,
        sharedWithUserId,
      },
    });
    return { deletedCount: result.count };
  }

  async listFolderShares(ownerUserId: string, folderId: string) {
    await this.ensureActiveFolder(ownerUserId, folderId);
    const shares = await this.prismaService.ringBinderShare.findMany({
      where: { folderId },
      include: {
        sharedWithUser: { select: { id: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return shares;
  }

  async listAllSharedUsers(ownerUserId: string) {
    const shares = await this.prismaService.ringBinderShare.findMany({
      where: { sharedByUserId: ownerUserId },
      include: {
        sharedWithUser: { select: { id: true, phone: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const usersMap = new Map<
      string,
      { user: { id: string; phone: string }; folders: Array<{ id: string; name: string }> }
    >();
    for (const s of shares) {
      const entry = usersMap.get(s.sharedWithUserId);
      if (entry) {
        if (!entry.folders.some((f) => f.id === s.folder.id)) {
          entry.folders.push(s.folder);
        }
      } else {
        usersMap.set(s.sharedWithUserId, {
          user: s.sharedWithUser,
          folders: [s.folder],
        });
      }
    }

    const limit = await this.subscriptionsService.resolvePermanentFeatureLimit(
      ownerUserId,
      SHARE_FEATURE_KEY,
    );

    return { users: Array.from(usersMap.values()), limit, used: usersMap.size };
  }

  async listSharedWithMe(userId: string) {
    const shares = await this.prismaService.ringBinderShare.findMany({
      where: { sharedWithUserId: userId },
      include: {
        folder: {
          select: { id: true, name: true },
        },
        sharedByUser: { select: { id: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((s) => ({
      id: s.id,
      folderId: s.folder.id,
      folderName: s.folder.name,
      ownerId: s.sharedByUser.id,
      ownerPhone: s.sharedByUser.phone,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getFolderPosts(folderId: string, userId: string) {
    const folder = await this.ensureFolderAccess(folderId, userId, false);
    const posts = await this.prismaService.ringBinderFolderPost.findMany({
      where: { folderId: folder.id },
      select: { postId: true },
    });
    return posts.map((p) => p.postId);
  }
}
