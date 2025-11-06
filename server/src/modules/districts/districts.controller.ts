import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@app/common/decorators/public.decorator';

import { DistrictsService } from './districts.service';
import { DistrictDto } from './dto/district.dto';

@Controller('districts')
@ApiTags('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List available districts' })
  @ApiOkResponse({ type: DistrictDto, isArray: true })
  async list(
    @Query('cityId') cityId?: string,
    @Query('provinceId') provinceId?: string,
  ): Promise<DistrictDto[]> {
    const parsedCityId = cityId && !Number.isNaN(Number(cityId)) ? Number(cityId) : undefined;
    const parsedProvinceId =
      provinceId && !Number.isNaN(Number(provinceId)) ? Number(provinceId) : undefined;

    const districts = await this.districtsService.findAll({
      cityId: parsedCityId,
      provinceId: parsedProvinceId,
    });

    return districts.map((district) => ({
      id: district.id,
      name: district.name,
      slug: district.slug,
      cityId: district.cityId,
      city: district.city.name,
      citySlug: district.city.slug,
      provinceId: district.city.provinceId,
      province: district.city.province.name,
      provinceSlug: district.city.province.slug,
    }));
  }
}
