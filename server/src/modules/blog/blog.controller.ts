import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogService } from './blog.service';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List public blog items' })
  @ApiOkResponse({ description: 'Paginated blog list.' })
  list(@Query('page') pageParam?: string, @Query('pageSize') pageSizeParam?: string) {
    const page = Number(pageParam) || 1;
    const pageSize = Number(pageSizeParam) || undefined;
    return this.blogService.listPublic(page, pageSize);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a blog item by slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.getPublicBySlug(slug);
  }
}
