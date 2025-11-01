import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { UploadsService, type UploadResult } from './uploads.service';

type AuthenticatedFastifyRequest = FastifyRequest & {
  user?: {
    sub?: string;
  };
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  async uploadFile(@Req() request: AuthenticatedFastifyRequest): Promise<UploadResult> {
    if (typeof request.isMultipart !== 'function' || !request.isMultipart()) {
      throw new BadRequestException('Expected multipart/form-data content type.');
    }

    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file received in request.');
    }

    return this.uploadsService.uploadMultipartFile(file, request.user?.sub);
  }
}
