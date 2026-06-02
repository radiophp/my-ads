import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { AdminDivarSessionsService } from './admin-divar-sessions.service';
import { CreateAdminDivarSessionDto } from './dto/create-admin-divar-session.dto';
import { UpdateAdminDivarSessionDto } from './dto/update-admin-divar-session.dto';

@ApiTags('admin-divar-sessions')
@Controller('admin/divar-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDivarSessionsController {
  constructor(private readonly service: AdminDivarSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List admin Divar sessions (phone + JWT)' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin Divar session' })
  create(@Body() dto: CreateAdminDivarSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing admin Divar session' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminDivarSessionDto) {
    return this.service.update(id, dto);
  }
}
