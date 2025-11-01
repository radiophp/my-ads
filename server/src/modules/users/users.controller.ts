import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() request: { user?: { sub: string } }) {
    const user = await this.usersService.findById(request.user?.sub ?? '');
    return { user };
  }

  @Get()
  @Roles(Role.ADMIN)
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }
}
