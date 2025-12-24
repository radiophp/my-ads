import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlidesService } from './slides.service';

@ApiTags('slides')
@Controller('slides')
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Get()
  @ApiOperation({ summary: 'List active slides' })
  @ApiOkResponse({ description: 'Active slide list.' })
  list() {
    return this.slidesService.listPublicSlides();
  }
}
