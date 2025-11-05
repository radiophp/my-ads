import { Controller, Get, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async listUsers() {
    const users = await this.usersService.listUsers();
    return users.map((user) => this.formatUser(user));
  }

  private formatUser(
    user: Prisma.UserGetPayload<{ include: { city: true } }> | null,
  ): Record<string, unknown> | null {
    if (!user) {
      return null;
    }

    const { hashedRefreshToken: _hashedRefreshToken, city, ...rest } = user;
    return {
      ...rest,
      cityId: user.cityId,
      city: city?.name ?? null,
    };
  }
}
