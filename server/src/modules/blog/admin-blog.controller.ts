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
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('admin-blog')
@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

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
    return this.blogService.listAdminBlog(parsedPage, parsedSize, search);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogService.getAdminBlogById(id);
  }

  @Post()
  create(@Body() dto: CreateBlogDto) {
    return this.blogService.createBlog(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBlogDto) {
    return this.blogService.updateBlog(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.blogService.deleteBlog(id);
  }
}
