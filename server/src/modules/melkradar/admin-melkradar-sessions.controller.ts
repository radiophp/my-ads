import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { AdminMelkradarSessionsService } from './admin-melkradar-sessions.service';
import { CreateAdminMelkradarSessionDto } from './dto/create-admin-melkradar-session.dto';
import { UpdateAdminMelkradarSessionDto } from './dto/update-admin-melkradar-session.dto';

@ApiTags('admin-melkradar-sessions')
@Controller('admin/melkradar-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminMelkradarSessionsController {
  constructor(private readonly service: AdminMelkradarSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List MelkRadar API header sessions' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new MelkRadar API session (headers)' })
  create(@Body() dto: CreateAdminMelkradarSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a MelkRadar API session' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminMelkradarSessionDto) {
    return this.service.update(id, dto);
  }
}
