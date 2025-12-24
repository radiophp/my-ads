import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { BlogService } from './blog.service';
import { UpdateBlogSourceDto } from './dto/update-blog-source.dto';

@ApiTags('admin-blog-sources')
@Controller('admin/blog-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminBlogSourcesController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  listSources() {
    return this.blogService.listSources();
  }

  @Patch(':id')
  updateSource(@Param('id') id: string, @Body() dto: UpdateBlogSourceDto) {
    return this.blogService.updateSource(id, dto);
  }
}
