import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { AdminMelkradarSession } from '@prisma/client';

type CreateMelkradarSessionInput = {
  label?: string;
  headersRaw: string;
  active?: boolean;
  locked?: boolean;
};

type UpdateMelkradarSessionInput = Partial<CreateMelkradarSessionInput>;

const parseRawHeaders = (raw: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (!raw) return headers;
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
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
export class AdminMelkradarSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminMelkradarSession[]> {
    return this.prisma.adminMelkradarSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(input: CreateMelkradarSessionInput): Promise<AdminMelkradarSession> {
    const headers = parseRawHeaders(input.headersRaw);
    if (Object.keys(headers).length === 0) {
      throw new BadRequestException('Headers are required');
    }
    return this.prisma.adminMelkradarSession.create({
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

  async update(id: string, input: UpdateMelkradarSessionInput): Promise<AdminMelkradarSession> {
    const existing = await this.prisma.adminMelkradarSession.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Session not found');
    }

    const headersRaw = input.headersRaw ?? existing.headersRaw;
    const headers =
      input.headersRaw !== undefined
        ? parseRawHeaders(headersRaw)
        : (existing.headers as Record<string, string>);
    if (input.headersRaw !== undefined && Object.keys(headers).length === 0) {
      throw new BadRequestException('Headers are required');
    }

    return this.prisma.adminMelkradarSession.update({
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

  async getActiveSession(): Promise<AdminMelkradarSession | null> {
    return this.prisma.adminMelkradarSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
