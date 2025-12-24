import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { SlidesService } from './slides.service';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';

@ApiTags('admin-slides')
@Controller('admin/slides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const rawPage = page ? Number(page) : 1;
    const rawSize = pageSize ? Number(pageSize) : undefined;
    const parsedPage = Number.isFinite(rawPage) ? rawPage : 1;
    const parsedSize = Number.isFinite(rawSize) ? rawSize : undefined;
    return this.slidesService.listAdminSlides(parsedPage, parsedSize, search);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.slidesService.getAdminSlide(id);
  }

  @Post()
  create(@Body() dto: CreateSlideDto) {
    return this.slidesService.createSlide(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSlideDto) {
    return this.slidesService.updateSlide(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.slidesService.deleteSlide(id);
  }
}
