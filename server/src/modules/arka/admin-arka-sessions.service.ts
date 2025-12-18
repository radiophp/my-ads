import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { AdminArkaSession } from '@prisma/client';

type CreateArkaSessionInput = {
  label?: string;
  headersRaw: string;
  active?: boolean;
  locked?: boolean;
};

type UpdateArkaSessionInput = Partial<CreateArkaSessionInput>;

const parseRawHeaders = (raw: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (!raw) return headers;
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      // drop leading -H and surrounding quotes if pasted from curl
      const cleaned = line.replace(/^(-H|--header)\s+/i, '').replace(/^['"]|['"]$/g, '');
      const separatorIndex = cleaned.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }
      const key = cleaned.slice(0, separatorIndex).trim();
      const value = cleaned.slice(separatorIndex + 1).trim();
      if (!key || !value) {
        return;
      }
      headers[key] = value;
    });

  return headers;
};

@Injectable()
export class AdminArkaSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminArkaSession[]> {
    return this.prisma.adminArkaSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(input: CreateArkaSessionInput): Promise<AdminArkaSession> {
    const headers = parseRawHeaders(input.headersRaw);
    if (Object.keys(headers).length === 0) {
      throw new BadRequestException('Headers are required');
    }
    return this.prisma.adminArkaSession.create({
      data: {
        label: input.label?.trim() || 'default',
        headersRaw: input.headersRaw,
        headers,
        active: input.active ?? true,
        locked: input.locked ?? false,
        lastError: null,
        lastErrorAt: null,
      },
    });
  }

  async update(id: string, input: UpdateArkaSessionInput): Promise<AdminArkaSession> {
    const existing = await this.prisma.adminArkaSession.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Session not found');
    }

    const headersRaw = input.headersRaw ?? existing.headersRaw;
    const headers =
      input.headersRaw !== undefined ? parseRawHeaders(headersRaw) : (existing.headers as any);
    if (input.headersRaw !== undefined && Object.keys(headers).length === 0) {
      throw new BadRequestException('Headers are required');
    }

    return this.prisma.adminArkaSession.update({
      where: { id },
      data: {
        label: input.label?.trim() ?? existing.label,
        headersRaw,
        headers,
        active: input.active ?? existing.active,
        locked: input.locked ?? existing.locked,
        lastError: input.headersRaw !== undefined ? null : existing.lastError,
        lastErrorAt: input.headersRaw !== undefined ? null : existing.lastErrorAt,
      },
    });
  }

  async getActiveHeaders(): Promise<Record<string, string> | null> {
    const session = await this.prisma.adminArkaSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
    });
    return session ? (session.headers as Record<string, string>) : null;
  }
}

export type { CreateArkaSessionInput, UpdateArkaSessionInput };
