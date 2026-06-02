import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { InviteCodesService } from './invite-codes.service';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto';
import { UpdateInviteCodeDto } from './dto/update-invite-code.dto';

@ApiTags('admin-invite-codes')
@Controller('admin/invite-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InviteCodesController {
  constructor(private readonly inviteCodesService: InviteCodesService) {}

  @Get()
  list() {
    return this.inviteCodesService.list();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inviteCodesService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateInviteCodeDto) {
    return this.inviteCodesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateInviteCodeDto) {
    return this.inviteCodesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.inviteCodesService.remove(id);
  }
}
