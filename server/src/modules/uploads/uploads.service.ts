import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'node:crypto';
import { StorageService, type StoredObjectMetadata } from '@app/platform/storage/storage.service';

export type UploadResult = StoredObjectMetadata & {
  originalName?: string;
  contentType?: string;
};

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

  async uploadMultipartFile(file: MultipartFile, ownerId?: string): Promise<UploadResult> {
    if (file.file.truncated) {
      throw new PayloadTooLargeException('Uploaded file exceeds the configured size limit.');
    }

    const sanitizedOwnerId = ownerId ? this.sanitizePathSegment(ownerId) : undefined;
    const extension = this.extractExtension(file.filename);
    const key = this.buildObjectKey(sanitizedOwnerId, extension);

    const metadata: Record<string, string> = {};
    if (sanitizedOwnerId) {
      metadata['owner-id'] = sanitizedOwnerId;
    }
    if (file.filename) {
      metadata['original-name'] = this.truncateMetadataValue(file.filename);
    }

    const upload = await this.storageService.uploadObject({
      key,
      body: file.file,
      contentType: file.mimetype,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    return {
      ...upload,
      originalName: file.filename ?? undefined,
      contentType: file.mimetype ?? undefined,
    } satisfies UploadResult;
  }

  private sanitizePathSegment(input: string): string {
    const sanitized = input.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitized.length === 0) {
      throw new BadRequestException('Provided identifier contains no valid characters.');
    }

    return sanitized;
  }

  private extractExtension(filename?: string): string | undefined {
    if (!filename) {
      return undefined;
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return undefined;
    }

    const rawExtension = filename.slice(lastDotIndex + 1).toLowerCase();
    const sanitized = rawExtension.replace(/[^a-z0-9]/g, '');

    return sanitized.length > 0 ? sanitized : undefined;
  }

  private buildObjectKey(ownerId: string | undefined, extension: string | undefined): string {
    const ownerSegment = ownerId ? `users/${ownerId}` : 'public';
    const uniqueName = randomUUID();
    const suffix = extension ? `.${extension}` : '';

    return `${ownerSegment}/${uniqueName}${suffix}`;
  }

  private truncateMetadataValue(value: string): string {
    const maxLength = 255;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}
