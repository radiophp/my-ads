import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import type { JwtPayload } from '@app/modules/auth/auth.service';
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';

@Controller('saved-filters')
@UseGuards(JwtAuthGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  async list(@Req() request: { user?: JwtPayload }) {
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    return this.savedFiltersService.list(user.sub, user.role === 'ADMIN');
  }

  @Post()
  async create(@Req() request: { user?: JwtPayload }, @Body() dto: CreateSavedFilterDto) {
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    return this.savedFiltersService.create(user.sub, dto, user.role === 'ADMIN');
  }

  @Patch(':id')
  async update(
    @Req() request: { user?: JwtPayload },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    return this.savedFiltersService.update(user.sub, id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() request: { user?: JwtPayload },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    return this.savedFiltersService.remove(user.sub, id, user.role === 'ADMIN');
  }

  @Patch(':id/toggle')
  async toggleActive(
    @Req() request: { user?: JwtPayload },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = request.user;
    if (!user) throw new UnauthorizedException();
    return this.savedFiltersService.toggleActive(user.sub, id, user.role === 'ADMIN');
  }
}
