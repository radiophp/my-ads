import { Controller, Get, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CityDto } from './dto/city.dto';
import { Public } from '@app/common/decorators/public.decorator';

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
    }));
  }
}
