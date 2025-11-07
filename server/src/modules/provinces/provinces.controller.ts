import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProvincesService } from './provinces.service';
import { ProvinceDto } from './dto/province.dto';
import { Public } from '@app/common/decorators/public.decorator';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { UpdateAllowPostingDto } from '@app/common/dto/update-allow-posting.dto';

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
      slug: province.slug,
      allowPosting: province.allowPosting,
    }));
  }

  @Patch(':id/allow-posting')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update allowPosting flag for a province' })
  @ApiOkResponse({ type: ProvinceDto })
  async updateAllowPosting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAllowPostingDto,
  ): Promise<ProvinceDto> {
    const province = await this.provincesService.updateAllowPosting(id, dto.allowPosting);
    return {
      id: province.id,
      name: province.name,
      slug: province.slug,
      allowPosting: province.allowPosting,
    };
  }
}
