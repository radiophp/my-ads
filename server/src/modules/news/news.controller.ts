import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List public news items' })
  @ApiOkResponse({ description: 'Paginated news list.' })
  list(@Query('page') pageParam?: string, @Query('pageSize') pageSizeParam?: string) {
    const page = Number(pageParam) || 1;
    const pageSize = Number(pageSizeParam) || undefined;
    return this.newsService.listPublic(page, pageSize);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a news item by slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.newsService.getPublicBySlug(slug);
  }
}
