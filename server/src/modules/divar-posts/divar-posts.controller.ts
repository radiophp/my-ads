import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import type { PaginatedDivarPostsDto } from './dto/divar-post.dto';

@Controller('divar-posts')
@UseGuards(JwtAuthGuard)
@ApiTags('divar-posts')
export class DivarPostsController {
  constructor(private readonly divarPostsService: DivarPostsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List normalized Divar posts' })
  @ApiOkResponse({
    description: 'Paginated list of normalized Divar posts.',
  })
  async listPosts(
    @Query('cursor') cursor?: string,
    @Query('limit') limitParam?: string,
    @Query('provinceId') provinceParam?: string,
    @Query('cityIds') cityIdsParam?: string,
    @Query('districtIds') districtIdsParam?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('categoryDepth') categoryDepthParam?: string,
  ): Promise<PaginatedDivarPostsDto> {
    const parsedLimit = Number(limitParam);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    const provinceId = provinceParam ? Number(provinceParam) : undefined;
    const parsedDepth = categoryDepthParam ? Number(categoryDepthParam) : undefined;
    const cityIds = cityIdsParam
      ? cityIdsParam
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value))
      : undefined;
    const districtIds = districtIdsParam
      ? districtIdsParam
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value))
      : undefined;

    return this.divarPostsService.listNormalizedPosts({
      cursor,
      limit,
      provinceId: Number.isFinite(provinceId) ? provinceId : undefined,
      cityIds: cityIds && cityIds.length > 0 ? cityIds : undefined,
      districtIds: districtIds && districtIds.length > 0 ? districtIds : undefined,
      categorySlug: categorySlug?.trim() ? categorySlug.trim() : undefined,
      categoryDepth: Number.isFinite(parsedDepth) ? parsedDepth : undefined,
    });
  }
}
