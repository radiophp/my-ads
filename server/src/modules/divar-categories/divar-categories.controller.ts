import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DivarCategoriesService } from './divar-categories.service';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { DivarCategoryDto } from './dto/divar-category.dto';
import { UpdateAllowPostingDto } from '@app/common/dto/update-allow-posting.dto';
import { Public } from '@app/common/decorators/public.decorator';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';

@Controller('admin/divar-categories')
@ApiTags('divar-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DivarCategoriesController {
  constructor(private readonly divarCategoriesService: DivarCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List Divar categories' })
  @ApiOkResponse({ type: DivarCategoryDto, isArray: true })
  async list(): Promise<DivarCategoryDto[]> {
    return this.divarCategoriesService.listCategories();
  }

  @Patch(':id/allow-posting')
  @ApiOperation({ summary: 'Update allowPosting flag for a Divar category' })
  @ApiOkResponse({ type: DivarCategoryDto })
  async updateAllowPosting(
    @Param('id') id: string,
    @Body() dto: UpdateAllowPostingDto,
  ): Promise<DivarCategoryDto> {
    return this.divarCategoriesService.updateAllowPosting(id, dto.allowPosting);
  }
}

@Controller('public/divar-categories')
@UseGuards(RateLimitGuard)
@ApiTags('divar-categories')
export class PublicDivarCategoriesController {
  constructor(private readonly divarCategoriesService: DivarCategoriesService) {}

  @Get()
  @Public()
  @RateLimit({ limit: 120, ttlSeconds: 60 })
  @ApiOperation({ summary: 'List public Divar categories' })
  @ApiOkResponse({ type: DivarCategoryDto, isArray: true })
  async list(): Promise<DivarCategoryDto[]> {
    return this.divarCategoriesService.listPublicCategories();
  }
}
