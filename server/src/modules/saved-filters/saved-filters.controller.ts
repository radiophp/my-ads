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
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';

@Controller('saved-filters')
@UseGuards(JwtAuthGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  async list(@Req() request: { user?: { sub?: string } }) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.savedFiltersService.list(userId);
  }

  @Post()
  async create(@Req() request: { user?: { sub?: string } }, @Body() dto: CreateSavedFilterDto) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.savedFiltersService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @Req() request: { user?: { sub?: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.savedFiltersService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() request: { user?: { sub?: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.savedFiltersService.remove(userId, id);
  }
}
