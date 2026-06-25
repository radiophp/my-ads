import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { CreateRingBinderFolderDto } from './dto/create-ring-binder-folder.dto';
import { UpdateRingBinderFolderDto } from './dto/update-ring-binder-folder.dto';
import { SavePostToFolderDto } from './dto/save-post-to-folder.dto';
import { SavePostNoteDto } from './dto/save-post-note.dto';
import { RingBindersService } from './ring-binders.service';

@Controller('ring-binders')
@UseGuards(JwtAuthGuard)
export class RingBindersController {
  constructor(private readonly ringBindersService: RingBindersService) {}

  @Get('folders')
  async listFolders(@Req() request: { user?: { sub?: string; role?: string } }) {
    const user = request.user;
    if (!user?.sub) {
      return { folders: [], limit: 0, remaining: 0 };
    }
    return this.ringBindersService.listFolders(user.sub, user.role === 'ADMIN');
  }

  @Post('folders')
  async createFolder(
    @Req() request: { user?: { sub?: string; role?: string } },
    @Body() dto: CreateRingBinderFolderDto,
  ) {
    const user = request.user;
    if (!user?.sub) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.createFolder(user.sub, dto.name, user.role === 'ADMIN');
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

  @Post('folders/:id/posts')
  async savePostToFolder(
    @Req() request: { user?: { sub?: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SavePostToFolderDto,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.savePostToFolder(userId, id, dto.postId);
  }

  @Delete('folders/:folderId/posts/:postId')
  async removePostFromFolder(
    @Req() request: { user?: { sub?: string } },
    @Param('folderId', new ParseUUIDPipe()) folderId: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.removePostFromFolder(userId, folderId, postId);
  }

  @Get('posts/:postId')
  async getPostFolders(
    @Req() request: { user?: { sub?: string } },
    @Param('postId', new ParseUUIDPipe()) postId: string,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.listSavedFolders(userId, postId);
  }

  @Put('posts/:postId/note')
  async upsertNote(
    @Req() request: { user?: { sub?: string } },
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() dto: SavePostNoteDto,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.upsertPostNote(userId, postId, dto.content ?? '');
  }

  @Delete('posts/:postId/note')
  async deleteNote(
    @Req() request: { user?: { sub?: string } },
    @Param('postId', new ParseUUIDPipe()) postId: string,
  ) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.ringBindersService.deletePostNote(userId, postId);
  }
}
