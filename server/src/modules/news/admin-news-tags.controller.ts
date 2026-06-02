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
import { NewsService } from './news.service';
import { CreateNewsTagDto } from './dto/create-news-tag.dto';
import { UpdateNewsTagDto } from './dto/update-news-tag.dto';

@ApiTags('admin-news-tags')
@Controller('admin/news-tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminNewsTagsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list() {
    return this.newsService.listTags();
  }

  @Post()
  create(@Body() dto: CreateNewsTagDto) {
    return this.newsService.createTag(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateNewsTagDto) {
    return this.newsService.updateTag(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.newsService.deleteTag(id);
  }
}
