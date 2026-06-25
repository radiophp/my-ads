import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UserFeatureOverrideService } from './user-feature-override.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userFeatureOverrideService: UserFeatureOverrideService,
  ) {}

  @Get()
  @Roles(Role.ADMIN)
  async listUsers() {
    const users = await this.usersService.listUsers();
    return users.map((user) => this.formatUser(user));
  }

  // --- User Feature Overrides (admin) ---

  @Get(':userId/feature-overrides')
  @Roles(Role.ADMIN)
  async listFeatureOverrides(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userFeatureOverrideService.listByUser(userId);
  }

  @Put(':userId/feature-overrides/:featureKey')
  @Roles(Role.ADMIN)
  async upsertFeatureOverride(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('featureKey') featureKey: string,
    @Body('limitValue') limitValue: number,
  ) {
    return this.userFeatureOverrideService.upsert(userId, featureKey, limitValue);
  }

  @Delete(':userId/feature-overrides/:featureKey')
  @Roles(Role.ADMIN)
  async removeFeatureOverride(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('featureKey') featureKey: string,
  ) {
    await this.userFeatureOverrideService.remove(userId, featureKey);
    return { success: true };
  }

  @Delete(':id/dev-delete')
  @HttpCode(204)
  @Roles(Role.ADMIN)
  async devDeleteUser(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.usersService.devDeleteUser(id);
  }

  private formatUser(
    user: Prisma.UserGetPayload<{ include: { city: { include: { province: true } } } }> | null,
  ): Record<string, unknown> | null {
    if (!user) {
      return null;
    }

    const {
      hashedRefreshToken: _hashedRefreshToken,
      city,
      ...rest
    } = user as Prisma.UserGetPayload<{
      include: { city: { include: { province: true } } };
    }>;
    return {
      ...rest,
      cityId: user.cityId,
      city: city?.name ?? null,
      provinceId: city?.provinceId ?? null,
      province: city?.province?.name ?? null,
    };
  }
}
