import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DivarCategoriesService } from './divar-categories.service';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { DivarCategoryDto } from './dto/divar-category.dto';

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
}
