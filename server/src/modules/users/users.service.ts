import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from '@app/common/decorators/roles.decorator';
import { PrismaService } from '@app/platform/database/prisma.service';
import { MetricsService } from '@app/platform/metrics/metrics.service';

type CreateUserInput = {
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cityId?: number | null;
  provinceId?: number | null;
  profileImageUrl?: string | null;
  role?: Role;
  isActive?: boolean;
};

type UpdateUserInput = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cityId?: number | null;
  provinceId?: number | null;
  profileImageUrl?: string | null;
  isActive?: boolean;
  role?: Role;
};

type UpdateProfileInput = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cityId?: number | null;
  provinceId?: number | null;
  profileImageUrl?: string | null;
};

type UserWithRelations = Prisma.UserGetPayload<{
  include: { city: { include: { province: true } } };
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  async createUser(input: CreateUserInput): Promise<UserWithRelations> {
    if (input.cityId !== undefined || input.provinceId !== undefined) {
      await this.validateLocation(input.cityId, input.provinceId);
    }

    const user = await this.prismaService.user.create({
      data: {
        phone: input.phone,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        cityId: input.cityId,
        profileImageUrl: input.profileImageUrl,
        role: input.role ?? Role.USER,
        isActive: input.isActive ?? true,
      },
      include: { city: { include: { province: true } } },
    });

    this.metricsService.incrementUsersCreated();
    return user;
  }

  findByPhone(phone: string): Promise<UserWithRelations | null> {
    return this.prismaService.user.findUnique({
      where: { phone },
      include: { city: { include: { province: true } } },
    });
  }

  async findOrCreateByPhone(phone: string): Promise<UserWithRelations> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return existing;
    }

    try {
      return await this.createUser({ phone });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const user = await this.findByPhone(phone);
        if (user) {
          return user;
        }
      }
      throw error;
    }
  }

  findById(id: string): Promise<UserWithRelations | null> {
    return this.prismaService.user.findUnique({
      where: { id },
      include: { city: { include: { province: true } } },
    });
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async listUsers(): Promise<UserWithRelations[]> {
    return this.prismaService.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { city: { include: { province: true } } },
    });
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<UserWithRelations> {
    await this.validateLocation(data.cityId, data.provinceId);

    const sanitizedData = this.sanitizeUpdateInput(data);
    const { provinceId: _provinceId, ...updateData } = sanitizedData as Prisma.UserUpdateInput & {
      provinceId?: number | null;
    };

    return this.prismaService.user.update({
      where: { id },
      data: updateData,
      include: { city: { include: { province: true } } },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UserWithRelations> {
    await this.validateLocation(data.cityId, data.provinceId);

    const sanitizedData = this.sanitizeUpdateInput(data);
    const { provinceId: _provinceId, ...updateData } = sanitizedData as Prisma.UserUpdateInput & {
      provinceId?: number | null;
    };

    return this.prismaService.user.update({
      where: { id: userId },
      data: updateData,
      include: { city: { include: { province: true } } },
    });
  }

  private async validateLocation(
    cityId: number | null | undefined,
    provinceId: number | null | undefined,
  ): Promise<void> {
    if (cityId === undefined && provinceId === undefined) {
      return;
    }

    if (cityId === undefined && provinceId !== undefined) {
      throw new BadRequestException('City is required when updating province.');
    }

    if (cityId !== undefined && cityId !== null) {
      if (provinceId === undefined || provinceId === null) {
        throw new BadRequestException('Province is required when updating city.');
      }
      await this.ensureCityBelongsToProvince(cityId, provinceId);
      return;
    }

    if (cityId === null && provinceId) {
      throw new BadRequestException('Province should be omitted when city is null.');
    }
  }

  private async ensureCityBelongsToProvince(cityId: number, provinceId: number): Promise<void> {
    const city = await this.prismaService.city.findUnique({
      where: { id: cityId },
      include: { province: true },
    });

    if (!city) {
      throw new BadRequestException('Selected city does not exist.');
    }

    if (city.provinceId !== provinceId) {
      throw new BadRequestException('Selected city does not belong to the provided province.');
    }
  }

  private sanitizeUpdateInput(data: UpdateUserInput | UpdateProfileInput): Prisma.UserUpdateInput {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      sanitized[key] = value;
    }
    return sanitized as Prisma.UserUpdateInput;
  }
}
