import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import type { MultipartFile } from '@fastify/multipart';
import { UploadsService, type UploadResult } from './uploads.service';

type AuthenticatedFastifyRequest = FastifyRequest & {
  user?: {
    sub?: string;
  };
};

class DeleteTemporaryUploadDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  async uploadFile(@Req() request: AuthenticatedFastifyRequest): Promise<UploadResult> {
    const file = await this.extractMultipartFile(request);
    return this.uploadsService.uploadMultipartFile(file, request.user?.sub, 'profile');
  }

  @Post('temp')
  async uploadTemporaryFile(@Req() request: AuthenticatedFastifyRequest): Promise<UploadResult> {
    const file = await this.extractMultipartFile(request);
    return this.uploadsService.uploadMultipartFile(file, request.user?.sub, 'temp');
  }

  @Post('public')
  async uploadPublicFile(@Req() request: AuthenticatedFastifyRequest): Promise<UploadResult> {
    const file = await this.extractMultipartFile(request);
    return this.uploadsService.uploadMultipartFile(file, undefined, 'public');
  }

  @Delete('temp')
  async deleteTemporaryFile(
    @Req() request: AuthenticatedFastifyRequest,
    @Body() body: DeleteTemporaryUploadDto,
  ): Promise<void> {
    await this.uploadsService.deleteTemporaryUpload(body.key, request.user?.sub);
  }

  private async extractMultipartFile(request: AuthenticatedFastifyRequest): Promise<MultipartFile> {
    if (typeof request.isMultipart !== 'function' || !request.isMultipart()) {
      throw new BadRequestException('Expected multipart/form-data content type.');
    }

    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file received in request.');
    }

    return file;
  }
}
