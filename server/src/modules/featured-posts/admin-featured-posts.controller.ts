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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { FeaturedPostsService } from './featured-posts.service';
import { CreateFeaturedPostDto } from './dto/create-featured-post.dto';
import { UpdateFeaturedPostDto } from './dto/update-featured-post.dto';

@ApiTags('admin-featured-posts')
@Controller('admin/featured-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFeaturedPostsController {
  constructor(private readonly featuredPostsService: FeaturedPostsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const rawPage = page ? Number(page) : 1;
    const rawSize = pageSize ? Number(pageSize) : undefined;
    const parsedPage = Number.isFinite(rawPage) ? rawPage : 1;
    const parsedSize = Number.isFinite(rawSize) ? rawSize : undefined;
    return this.featuredPostsService.listAdminFeaturedPosts(parsedPage, parsedSize, search);
  }

  @Get('lookup')
  lookup(@Query('code') code?: string, @Query('externalId') externalId?: string) {
    const parsedCode = code ? Number(code) : undefined;
    const safeCode = parsedCode && Number.isFinite(parsedCode) ? parsedCode : undefined;
    return this.featuredPostsService.lookupPost(safeCode, externalId?.trim());
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.featuredPostsService.getAdminFeaturedPost(id);
  }

  @Post()
  create(@Body() dto: CreateFeaturedPostDto) {
    return this.featuredPostsService.createFeaturedPost(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateFeaturedPostDto) {
    return this.featuredPostsService.updateFeaturedPost(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.featuredPostsService.deleteFeaturedPost(id);
  }
}
