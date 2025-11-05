import { Controller, Get } from '@nestjs/common';
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
  async list(): Promise<CityDto[]> {
    const cities = await this.citiesService.findAll();
    return cities.map((city) => ({
      id: city.id,
      name: city.name,
    }));
  }
}
