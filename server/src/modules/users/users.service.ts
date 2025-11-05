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
  profileImageUrl?: string | null;
  role?: Role;
  isActive?: boolean;
};

type UpdateUserInput = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cityId?: number | null;
  profileImageUrl?: string | null;
  isActive?: boolean;
  role?: Role;
};

type UpdateProfileInput = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  cityId?: number | null;
  profileImageUrl?: string | null;
};

type UserWithCity = Prisma.UserGetPayload<{ include: { city: true } }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  async createUser(input: CreateUserInput): Promise<UserWithCity> {
    if (input.cityId !== undefined && input.cityId !== null) {
      await this.ensureCityExists(input.cityId);
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
      include: { city: true },
    });

    this.metricsService.incrementUsersCreated();
    return user;
  }

  findByPhone(phone: string): Promise<UserWithCity | null> {
    return this.prismaService.user.findUnique({
      where: { phone },
      include: { city: true },
    });
  }

  async findOrCreateByPhone(phone: string): Promise<UserWithCity> {
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

  findById(id: string): Promise<UserWithCity | null> {
    return this.prismaService.user.findUnique({
      where: { id },
      include: { city: true },
    });
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async listUsers(): Promise<UserWithCity[]> {
    return this.prismaService.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { city: true },
    });
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<UserWithCity> {
    if (data.cityId !== undefined && data.cityId !== null) {
      await this.ensureCityExists(data.cityId);
    }

    const sanitizedData = this.sanitizeUpdateInput(data);

    return this.prismaService.user.update({
      where: { id },
      data: sanitizedData,
      include: { city: true },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UserWithCity> {
    if (data.cityId !== undefined && data.cityId !== null) {
      await this.ensureCityExists(data.cityId);
    }

    const sanitizedData = this.sanitizeUpdateInput(data);

    return this.prismaService.user.update({
      where: { id: userId },
      data: sanitizedData,
      include: { city: true },
    });
  }

  private async ensureCityExists(cityId: number): Promise<void> {
    const city = await this.prismaService.city.findUnique({ where: { id: cityId } });
    if (!city) {
      throw new BadRequestException('Selected city does not exist.');
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
