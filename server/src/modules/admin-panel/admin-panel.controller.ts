import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UsersService } from '@app/modules/users/users.service';

@Controller('admin-panel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPanelController {
  constructor(private readonly usersService: UsersService) {}

  @Get('overview')
  async getOverview() {
    const users = await this.usersService.listUsers();
    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.isActive).length,
      users,
    };
  }
}
