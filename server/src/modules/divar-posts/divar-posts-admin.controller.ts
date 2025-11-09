import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import type { PaginatedPostsToAnalyzeDto } from './dto/post-to-analyze.dto';

@Controller('admin/divar-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiTags('divar-posts')
export class DivarPostsAdminController {
  constructor(private readonly divarPostsAdminService: DivarPostsAdminService) {}

  @Get('to-analyze')
  @ApiOperation({ summary: 'List posts waiting for normalization' })
  @ApiOkResponse({ description: 'Paginated posts waiting for analysis.' })
  async listPending(@Query('page') pageParam?: string): Promise<PaginatedPostsToAnalyzeDto> {
    const page = Number(pageParam) || 1;
    return this.divarPostsAdminService.listPostsToAnalyze(page);
  }
}
