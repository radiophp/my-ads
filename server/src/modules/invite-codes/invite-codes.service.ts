import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { InviteCodeDto } from './dto/invite-code.dto';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto';
import { UpdateInviteCodeDto } from './dto/update-invite-code.dto';

@Injectable()
export class InviteCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<InviteCodeDto[]> {
    const codes = await this.prisma.inviteCode.findMany({
      orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
    });
    return codes.map(InviteCodeDto.fromEntity);
  }

  async findById(id: string): Promise<InviteCodeDto> {
    const entity = await this.prisma.inviteCode.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Invite code not found.');
    }
    return InviteCodeDto.fromEntity(entity);
  }

  async create(dto: CreateInviteCodeDto): Promise<InviteCodeDto> {
    const code = dto.code.trim().toUpperCase();
    await this.ensureInviterExists(dto.inviterUserId);

    try {
      const entity = await this.prisma.inviteCode.create({
        data: {
          code,
          inviterUserId: dto.inviterUserId,
          bonusDays: dto.bonusDays ?? 0,
          monthlyInviteLimit: dto.monthlyInviteLimit ?? 3,
          isActive: dto.isActive ?? true,
        },
      });
      return InviteCodeDto.fromEntity(entity);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Invite code already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateInviteCodeDto): Promise<InviteCodeDto> {
    const existing = await this.prisma.inviteCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Invite code not found.');
    }

    if (typeof dto.inviterUserId === 'string') {
      await this.ensureInviterExists(dto.inviterUserId);
    }

    try {
      const entity = await this.prisma.inviteCode.update({
        where: { id },
        data: {
          ...(typeof dto.code === 'string' ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(typeof dto.inviterUserId === 'string' ? { inviterUserId: dto.inviterUserId } : {}),
          ...(typeof dto.bonusDays === 'number' ? { bonusDays: dto.bonusDays } : {}),
          ...(typeof dto.monthlyInviteLimit === 'number'
            ? { monthlyInviteLimit: dto.monthlyInviteLimit }
            : {}),
          ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
        },
      });
      return InviteCodeDto.fromEntity(entity);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Invite code already exists.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.inviteCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Invite code not found.');
    }
    await this.prisma.inviteCode.delete({ where: { id } });
  }

  private async ensureInviterExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('Inviter user not found.');
    }
  }
}
