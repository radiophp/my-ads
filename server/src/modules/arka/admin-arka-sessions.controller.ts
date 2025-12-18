import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { AdminArkaSessionsService } from './admin-arka-sessions.service';
import { CreateAdminArkaSessionDto } from './dto/create-admin-arka-session.dto';
import { UpdateAdminArkaSessionDto } from './dto/update-admin-arka-session.dto';

@ApiTags('admin-arka-sessions')
@Controller('admin/arka-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminArkaSessionsController {
  constructor(private readonly service: AdminArkaSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List Arka API header sessions' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Arka API session (headers)' })
  create(@Body() dto: CreateAdminArkaSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an Arka API session' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminArkaSessionDto) {
    return this.service.update(id, dto);
  }
}
