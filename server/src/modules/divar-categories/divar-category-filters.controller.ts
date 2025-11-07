import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { DivarCategoryFiltersService } from './divar-category-filters.service';
import { DivarCategoryFilterDto } from './dto/divar-category-filter.dto';

@Controller('public/divar-categories')
@UseGuards(RateLimitGuard)
@ApiTags('divar-category-filters')
export class DivarCategoryFiltersController {
  constructor(private readonly filtersService: DivarCategoryFiltersService) {}

  @Get(':slug/filters')
  @Public()
  @RateLimit({ limit: 120, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Return Divar filter widgets for the provided category slug.' })
  @ApiParam({ name: 'slug', required: true })
  @ApiOkResponse({ type: DivarCategoryFilterDto })
  @ApiNotFoundResponse({ description: 'Filters for the provided slug do not exist.' })
  async getFilters(@Param('slug') slug: string): Promise<DivarCategoryFilterDto> {
    return this.filtersService.getFiltersBySlug(slug);
  }
}
