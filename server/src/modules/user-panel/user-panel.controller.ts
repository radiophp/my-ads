import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '@app/modules/users/users.service';

@Controller('user-panel')
@UseGuards(JwtAuthGuard)
export class UserPanelController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  async getDashboard(@Req() request: { user?: { sub: string } }) {
    const user = await this.usersService.findById(request.user?.sub ?? '');
    return {
      message: `Welcome back, ${user?.email ?? 'user'}!`,
      user,
    };
  }
}
