import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { NewsService } from './news.service';
import { UpdateNewsSourceDto } from './dto/update-news-source.dto';

@ApiTags('admin-news-sources')
@Controller('admin/news-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminNewsSourcesController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  listSources() {
    return this.newsService.listSources();
  }

  @Patch(':id')
  updateSource(@Param('id') id: string, @Body() dto: UpdateNewsSourceDto) {
    return this.newsService.updateSource(id, dto);
  }
}
