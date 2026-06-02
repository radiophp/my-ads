import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import type { PaginatedPostsToAnalyzeDto } from './dto/post-to-analyze.dto';
import { DivarPostStatsService } from './divar-post-stats.service';
import { DivarDistrictPriceReportRowDto } from './dto/divar-post-district-report.dto';

@Controller('admin/divar-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiTags('divar-posts')
export class DivarPostsAdminController {
  constructor(
    private readonly divarPostsAdminService: DivarPostsAdminService,
    private readonly divarPostStatsService: DivarPostStatsService,
  ) {}

  @Get('to-analyze')
  @ApiOperation({ summary: 'List posts waiting for normalization' })
  @ApiOkResponse({ description: 'Paginated posts waiting for analysis.' })
  async listPending(@Query('page') pageParam?: string): Promise<PaginatedPostsToAnalyzeDto> {
    const page = Number(pageParam) || 1;
    return this.divarPostsAdminService.listPostsToAnalyze(page);
  }

  @Get('district-prices')
  @ApiOperation({ summary: 'Report district price ranges for a Divar category' })
  @ApiOkResponse({ type: DivarDistrictPriceReportRowDto, isArray: true })
  async getDistrictPrices(
    @Query('categorySlug') categorySlug?: string,
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
    @Query('minValue') minValueParam?: string,
    @Query('maxValue') maxValueParam?: string,
  ): Promise<DivarDistrictPriceReportRowDto[]> {
    const slug = categorySlug?.trim();
    if (!slug) {
      throw new BadRequestException('Category slug is required.');
    }

    const createdAfter = this.parseDateParam(fromParam, false);
    const createdBefore = this.parseDateParam(toParam, true);
    const minValue = this.parseMinValue(minValueParam);
    const maxValue = this.parseMaxValue(maxValueParam);
    if (createdAfter >= createdBefore) {
      throw new BadRequestException('Invalid date range.');
    }
    if (maxValue !== null && maxValue < minValue) {
      throw new BadRequestException('Maximum value must be greater than minimum value.');
    }

    return this.divarPostStatsService.getDistrictPriceReport({
      categorySlug: slug,
      createdAfter,
      createdBefore,
      minValue,
      maxValue,
    });
  }

  private parseDateParam(value: string | undefined, endExclusive: boolean): Date {
    if (!value) {
      throw new BadRequestException('Date range is required.');
    }
    const trimmed = value.trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const parsed = dateOnly ? new Date(`${trimmed}T00:00:00.000Z`) : new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date range.');
    }
    if (!dateOnly || !endExclusive) {
      return parsed;
    }
    const shifted = new Date(parsed);
    shifted.setUTCDate(shifted.getUTCDate() + 1);
    return shifted;
  }

  private parseMinValue(value: string | undefined): number {
    if (!value) {
      return 10_000_000;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Minimum value is invalid.');
    }
    return Math.floor(parsed);
  }

  private parseMaxValue(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Maximum value is invalid.');
    }
    return Math.floor(parsed);
  }
}
