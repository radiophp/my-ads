import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
// archiver publishes a CommonJS entrypoint; require() keeps runtime behavior intact.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import archiver = require('archiver');
import { PassThrough } from 'node:stream';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { StorageService } from '@app/platform/storage/storage.service';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import { DivarPostListItemDto, type PaginatedDivarPostsDto } from './dto/divar-post.dto';
import { DivarPostCategoryCountDto } from './dto/divar-post-category-count.dto';
import { DivarContactFetchService } from './divar-contact-fetch.service';
import { RateLimitService } from '@app/common/guards/rate-limit/rate-limit.service';
import { DivarPostStatsService } from './divar-post-stats.service';

type PostWithMedias = NonNullable<Awaited<ReturnType<DivarPostsAdminService['getPostWithMedias']>>>;

type PhotoFileEntry = { filename: string; buffer: Buffer };

@Controller('divar-posts')
@UseGuards(JwtAuthGuard)
@ApiTags('divar-posts')
export class DivarPostsController {
  private readonly logger = new Logger(DivarPostsController.name);

  constructor(
    private readonly divarPostsService: DivarPostsAdminService,
    private readonly storageService: StorageService,
    private readonly contactFetchService: DivarContactFetchService,
    private readonly rateLimitService: RateLimitService,
    private readonly divarPostStatsService: DivarPostStatsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List normalized Divar posts' })
  @ApiOkResponse({
    description: 'Paginated list of normalized Divar posts.',
  })
  async listPosts(
    @Req() request: { user?: { sub?: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limitParam?: string,
    @Query('provinceId') provinceParam?: string,
    @Query('cityIds') cityIdsParam?: string,
    @Query('districtIds') districtIdsParam?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('categoryDepth') categoryDepthParam?: string,
    @Query('filters') filtersParam?: string,
    @Query('ringFolderId') ringFolderId?: string,
    @Query('noteFilter') noteFilter?: string,
  ): Promise<PaginatedDivarPostsDto> {
    const parsedLimit = Number(limitParam);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    const provinceId = provinceParam ? Number(provinceParam) : undefined;
    const parsedDepth = categoryDepthParam ? Number(categoryDepthParam) : undefined;
    const cityIds = cityIdsParam
      ? cityIdsParam
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value))
      : undefined;
    const districtIds = districtIdsParam
      ? districtIdsParam
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value))
      : undefined;

    let parsedFilters: Record<string, unknown> | undefined;
    if (filtersParam && filtersParam.length > 2) {
      try {
        const decoded = JSON.parse(filtersParam) as Record<string, unknown>;
        if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
          parsedFilters = decoded;
        }
      } catch (error) {
        this.logger.warn(`Ignoring invalid filters payload: ${(error as Error).message}`);
      }
    }

    const normalizedNoteFilter =
      noteFilter === 'has' || noteFilter === 'none' ? (noteFilter as 'has' | 'none') : undefined;

    return this.divarPostsService.listNormalizedPosts({
      cursor,
      limit,
      provinceId: Number.isFinite(provinceId) ? provinceId : undefined,
      cityIds: cityIds && cityIds.length > 0 ? cityIds : undefined,
      districtIds: districtIds && districtIds.length > 0 ? districtIds : undefined,
      categorySlug: categorySlug?.trim() ? categorySlug.trim() : undefined,
      categoryDepth: Number.isFinite(parsedDepth) ? parsedDepth : undefined,
      filters: parsedFilters,
      ringFolderId: ringFolderId?.trim() ? ringFolderId.trim() : undefined,
      noteFilter: normalizedNoteFilter,
      userId: request.user?.sub,
    });
  }

  @Get('category-counts')
  @Public()
  @ApiOperation({ summary: 'List leaf category counts' })
  @ApiOkResponse({ type: DivarPostCategoryCountDto, isArray: true })
  async getCategoryCounts(): Promise<DivarPostCategoryCountDto[]> {
    return this.divarPostStatsService.getCategoryCounts();
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get a normalized Divar post by numeric code' })
  @ApiOkResponse({ type: DivarPostListItemDto })
  async getPostByCode(
    @Param('code') codeParam: string,
    @Req() request: FastifyRequest,
  ): Promise<DivarPostListItemDto> {
    const code = Number(codeParam);
    if (!Number.isInteger(code) || code <= 0) {
      throw new BadRequestException('A valid numeric code is required.');
    }

    const rate = await this.rateLimitService.checkRateLimit(
      `code-search:${request.ip ?? 'unknown'}`,
      { limit: 5, ttlSeconds: 60 },
    );
    if (rate.remaining <= 0) {
      throw new HttpException(
        { message: 'Too many code lookups. Try again in a minute.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const post = await this.divarPostsService.getNormalizedPostByCode(code);
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    return post;
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a normalized Divar post by id' })
  @ApiOkResponse({ type: DivarPostListItemDto })
  async getPostById(@Param('id') id: string): Promise<DivarPostListItemDto> {
    return this.fetchPostOrThrow(id);
  }

  @Post(':id/share-phone')
  @ApiOperation({ summary: 'Fetch Divar contact phone for a post (on-demand share)' })
  async fetchSharePhone(@Param('id') id: string): Promise<{ phoneNumber: string | null }> {
    const phone = await this.contactFetchService.fetchForPost(id);
    return { phoneNumber: phone };
  }

  @Post(':id/contact-info')
  @ApiOperation({ summary: 'Fetch Divar contact info with per-user rate limiting' })
  async fetchContactInfo(
    @Param('id') id: string,
    @Req() request: { user?: { sub?: string } },
  ): Promise<{ phoneNumber: string | null; ownerName: string | null }> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new BadRequestException('User is required.');
    }

    const rate = await this.rateLimitService.checkRateLimit(`contact-info:${userId}`, {
      limit: 10,
      ttlSeconds: 300,
    });
    if (rate.remaining <= 0) {
      throw new HttpException(
        {
          message: 'Contact info rate limit exceeded',
          retryAfterSeconds: Math.max(rate.ttl, 1),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const post = await this.divarPostsService.getPostContactInfo(id);
    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    let phoneNumber = post.phoneNumber;
    if (!phoneNumber && post.externalId && post.contactUuid) {
      phoneNumber = await this.contactFetchService.fetchForPost(id);
    }

    const refreshed = phoneNumber ? null : await this.divarPostsService.getPostContactInfo(id);
    return {
      phoneNumber: phoneNumber ?? refreshed?.phoneNumber ?? null,
      ownerName: post.ownerName ?? refreshed?.ownerName ?? null,
    };
  }

  @Get('detail/:id')
  @Public()
  @ApiOperation({ summary: 'Get a normalized Divar post by id (stable path)' })
  @ApiOkResponse({ type: DivarPostListItemDto })
  async getPostByIdDetail(@Param('id') id: string): Promise<DivarPostListItemDto> {
    return this.fetchPostOrThrow(id);
  }

  @Get(':id/photos.zip')
  @Public()
  @ApiOperation({ summary: 'Download a ZIP archive containing all post photos' })
  async downloadPostPhotos(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('A valid post id is required.');
    }

    const post = await this.divarPostsService.getPostWithMedias(id);
    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    const downloadLabel =
      post.code && Number.isFinite(post.code) ? String(post.code) : (post.externalId ?? post.id);
    const downloadName = `${this.sanitizeFileName(downloadLabel) || 'post'}-photos.zip`;
    const objectKey = this.buildPhotoArchiveKey(post.id, downloadName);
    const metadata = await this.ensurePhotoArchiveExists(post, objectKey);
    const method = (request.method ?? 'GET').toUpperCase();

    reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${downloadName}"`);
    if (typeof metadata.contentLength === 'number' && Number.isFinite(metadata.contentLength)) {
      reply.header('Content-Length', metadata.contentLength);
    }

    if (method === 'HEAD') {
      reply.code(200).send();
      return;
    }

    const stream = await this.storageService.getObjectStream(objectKey);
    reply.code(200).send(stream);
  }

  private buildPhotoArchiveKey(postId: string, downloadName: string): string {
    return `divar-posts/${postId}/${downloadName}`;
  }

  private async fetchPostOrThrow(id: string): Promise<DivarPostListItemDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('A valid post id is required.');
    }
    const post = await this.divarPostsService.getNormalizedPostById(id);
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    return post;
  }

  private async ensurePhotoArchiveExists(
    post: PostWithMedias,
    objectKey: string,
  ): Promise<{ contentLength?: number }> {
    const metadata = await this.storageService.getObjectMetadata(objectKey);
    if (metadata) {
      const contentLength =
        typeof metadata.ContentLength === 'number' ? Number(metadata.ContentLength) : undefined;
      return { contentLength };
    }

    const files = await this.collectPostPhotoBuffers(post);
    if (files.length === 0) {
      throw new NotFoundException('No downloadable photos were found for this post.');
    }

    const zipBuffer = await this.createZipBuffer(files);
    const metadataMap: Record<string, string> = {
      post_id: post.id,
      photo_count: String(files.length),
    };
    if (post.externalId) {
      metadataMap['external_id'] = post.externalId;
    }
    await this.storageService.uploadObject({
      key: objectKey,
      body: zipBuffer,
      contentType: 'application/zip',
      contentLength: zipBuffer.length,
      metadata: metadataMap,
    });

    return { contentLength: zipBuffer.length };
  }

  private async collectPostPhotoBuffers(post: PostWithMedias): Promise<PhotoFileEntry[]> {
    const files: PhotoFileEntry[] = [];
    const filenameBase = this.sanitizeFileName(post.externalId ?? post.id) || 'photo';

    for (const [index, media] of post.medias.entries()) {
      const sourceUrl = media.localUrl ?? media.url;
      if (!sourceUrl) {
        continue;
      }
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok || !response.body) {
          this.logger.warn(`Unable to fetch photo from ${sourceUrl}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const extensionMatch = sourceUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
        const extension = extensionMatch ? extensionMatch[0].split('?')[0] : '.jpg';
        const filename = `${filenameBase}-${String(index + 1).padStart(2, '0')}${extension}`;
        files.push({ filename, buffer: Buffer.from(arrayBuffer) });
      } catch (error) {
        this.logger.warn(`Failed to download photo ${sourceUrl}: ${(error as Error).message}`);
      }
    }

    return files;
  }

  private sanitizeFileName(value: string | null): string {
    if (!value) {
      return '';
    }
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private async createZipBuffer(files: { filename: string; buffer: Buffer }[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (error) =>
        reject(new InternalServerErrorException((error as Error).message)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));

      archive.on('error', (error) =>
        reject(new InternalServerErrorException((error as Error).message)),
      );
      archive.pipe(stream);

      files.forEach((file) => {
        archive.append(file.buffer, { name: file.filename });
      });

      try {
        const maybePromise = archive.finalize();
        if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
          (maybePromise as Promise<void>).catch((error) =>
            reject(new InternalServerErrorException((error as Error).message)),
          );
        }
      } catch (error) {
        reject(new InternalServerErrorException((error as Error).message));
      }
    });
  }
}
