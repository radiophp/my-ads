import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { ReviewActivationDto } from '@app/modules/subscriptions/dto/review-activation.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('activationStatus') activationStatus?: string,
  ) {
    return this.adminUsersService.listUsers({
      page: page ? Math.max(1, Number(page)) : 1,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 20,
      search,
      activationStatus,
    });
  }

  @Get('pending-activation')
  async pendingActivation() {
    return this.adminUsersService.listUsers({
      page: 1,
      limit: 100,
      activationStatus: 'PENDING',
    });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.adminUsersService.getUser(id);
  }

  @Post(':id/approve-activation')
  async approveActivation(@Param('id') id: string, @Req() request: { user?: { sub: string } }) {
    return this.adminUsersService.approveActivation(id, request.user?.sub ?? '');
  }

  @Post(':id/reject-activation')
  async rejectActivation(@Param('id') id: string, @Body() dto: ReviewActivationDto) {
    return this.adminUsersService.rejectActivation(id, dto);
  }
}
