import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CityDto } from './dto/city.dto';
import { Public } from '@app/common/decorators/public.decorator';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UpdateAllowPostingDto } from '@app/common/dto/update-allow-posting.dto';

@Controller('cities')
@ApiTags('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List available cities' })
  @ApiOkResponse({ type: CityDto, isArray: true })
  async list(@Query('provinceId') provinceId?: string): Promise<CityDto[]> {
    const parsedProvinceId =
      provinceId && !Number.isNaN(Number(provinceId)) ? Number(provinceId) : undefined;
    const cities = await this.citiesService.findAll(parsedProvinceId);
    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      provinceId: city.provinceId,
      province: city.province.name,
      slug: city.slug,
      provinceSlug: city.province.slug,
      allowPosting: city.allowPosting,
    }));
  }

  @Patch(':id/allow-posting')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update allowPosting flag for a city' })
  @ApiOkResponse({ type: CityDto })
  async updateAllowPosting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAllowPostingDto,
  ): Promise<CityDto> {
    const city = await this.citiesService.updateAllowPosting(id, dto.allowPosting);
    return {
      id: city.id,
      name: city.name,
      provinceId: city.provinceId,
      province: city.province.name,
      slug: city.slug,
      provinceSlug: city.province.slug,
      allowPosting: city.allowPosting,
    };
  }
}
