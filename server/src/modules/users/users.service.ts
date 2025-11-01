import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { Role } from '@app/common/decorators/roles.decorator';
import { PrismaService } from '@app/platform/database/prisma.service';
import { MetricsService } from '@app/platform/metrics/metrics.service';
import { comparePassword } from '@app/common/utils/password.util';

type CreateUserInput = {
  email: string;
  password: string;
  role?: Role;
  isActive?: boolean;
};

type UpdateUserInput = {
  isActive?: boolean;
  role?: Role;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const user = await this.prismaService.user.create({
      data: {
        email: input.email,
        password: input.password,
        role: input.role ?? Role.USER,
        isActive: input.isActive ?? true,
      },
    });

    this.metricsService.incrementUsersCreated();
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { id } });
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password);
    return isValid ? user : null;
  }

  async listUsers(): Promise<User[]> {
    return this.prismaService.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
