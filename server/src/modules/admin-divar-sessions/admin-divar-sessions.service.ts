import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { AdminDivarSession } from '@prisma/client';
import { CreateAdminDivarSessionDto } from './dto/create-admin-divar-session.dto';
import { UpdateAdminDivarSessionDto } from './dto/update-admin-divar-session.dto';

@Injectable()
export class AdminDivarSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<AdminDivarSession[]> {
    return this.prisma.adminDivarSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(dto: CreateAdminDivarSessionDto): Promise<AdminDivarSession> {
    return this.prisma.adminDivarSession.create({
      data: {
        phone: dto.phone,
        jwt: dto.jwt,
        active: dto.active ?? true,
        locked: dto.locked ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateAdminDivarSessionDto): Promise<AdminDivarSession> {
    try {
      return await this.prisma.adminDivarSession.update({
        where: { id },
        data: {
          phone: dto.phone,
          jwt: dto.jwt,
          active: dto.active,
          locked: dto.locked,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'P2025'
      ) {
        throw new NotFoundException('Admin Divar session not found');
      }
      throw error;
    }
  }
}
