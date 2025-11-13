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
import { CreateRingBinderFolderDto } from './dto/create-ring-binder-folder.dto';
import { UpdateRingBinderFolderDto } from './dto/update-ring-binder-folder.dto';
import { MAX_RING_BINDER_FOLDERS, RingBindersService } from './ring-binders.service';

@Controller('ring-binders')
@UseGuards(JwtAuthGuard)
export class RingBindersController {
  constructor(private readonly ringBindersService: RingBindersService) {}

  @Get('folders')
  async listFolders(@Req() request: { user?: { sub?: string } }) {
    const userId = request.user?.sub;
    if (!userId) {
      return { folders: [], maxFolders: MAX_RING_BINDER_FOLDERS };
    }
    const folders = await this.ringBindersService.listFolders(userId);
    return { folders, maxFolders: MAX_RING_BINDER_FOLDERS };
  }

  @Post('folders')
  async createFolder(
    @Req() request: { user?: { sub?: string } },
    @Body() dto: CreateRingBinderFolderDto,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.createFolder(userId, dto.name);
  }

  @Patch('folders/:id')
  async renameFolder(
    @Req() request: { user?: { sub?: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRingBinderFolderDto,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.renameFolder(userId, id, dto.name);
  }

  @Delete('folders/:id')
  async deleteFolder(
    @Req() request: { user?: { sub?: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    await this.ringBindersService.deleteFolder(userId, id);
    return { success: true };
  }
}
