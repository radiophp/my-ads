import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProvincesService } from './provinces.service';
import { ProvinceDto } from './dto/province.dto';
import { Public } from '@app/common/decorators/public.decorator';

@Controller('provinces')
@ApiTags('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List available provinces' })
  @ApiOkResponse({ type: ProvinceDto, isArray: true })
  async list(): Promise<ProvinceDto[]> {
    const provinces = await this.provincesService.findAll();
    return provinces.map((province) => ({
      id: province.id,
      name: province.name,
    }));
  }
}
