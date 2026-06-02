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
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@ApiTags('admin-news')
@Controller('admin/news')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

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
    return this.newsService.listAdminNews(parsedPage, parsedSize, search);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.newsService.getAdminNewsById(id);
  }

  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.newsService.createNews(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.updateNews(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.newsService.deleteNews(id);
  }
}
