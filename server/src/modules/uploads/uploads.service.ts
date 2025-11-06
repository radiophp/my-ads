import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'node:crypto';
import { StorageService, type StoredObjectMetadata } from '@app/platform/storage/storage.service';

export type UploadResult = StoredObjectMetadata & {
  originalName?: string;
  contentType?: string;
};

export type UploadScope = 'profile' | 'temp' | 'public';

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

  async uploadMultipartFile(
    file: MultipartFile,
    ownerId?: string,
    scope: UploadScope = 'profile',
  ): Promise<UploadResult> {
    if (file.file.truncated) {
      throw new PayloadTooLargeException('Uploaded file exceeds the configured size limit.');
    }

    const sanitizedOwnerId = ownerId ? this.sanitizePathSegment(ownerId) : undefined;
    const extension = this.extractExtension(file.filename);
    const key = this.buildObjectKey({
      ownerId: sanitizedOwnerId,
      extension,
      scope,
    });

    const metadata: Record<string, string> = {};
    if (sanitizedOwnerId) {
      metadata['owner-id'] = sanitizedOwnerId;
    }
    if (file.filename) {
      metadata['original-name'] = this.truncateMetadataValue(file.filename);
    }

    const buffer = await file.toBuffer();
    const upload = await this.storageService.uploadObject({
      key,
      body: buffer,
      contentType: file.mimetype,
      contentLength: buffer.length,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    return {
      ...upload,
      originalName: file.filename ?? undefined,
      contentType: file.mimetype ?? undefined,
    } satisfies UploadResult;
  }

  async deleteTemporaryUpload(key: string, ownerId?: string): Promise<void> {
    if (!ownerId) {
      throw new BadRequestException('Authenticated user information is required for cleanup.');
    }

    const sanitizedOwnerId = this.sanitizePathSegment(ownerId);
    const sanitizedKey = this.sanitizeObjectKey(key);
    const expectedPrefix = `users/${sanitizedOwnerId}/temp/`;

    if (!sanitizedKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('The provided key does not belong to the authenticated user.');
    }

    await this.storageService.deleteObject(sanitizedKey);
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

  private buildObjectKey(options: {
    ownerId?: string;
    extension?: string;
    scope: UploadScope;
  }): string {
    const { ownerId, extension, scope } = options;
    const uniqueName = randomUUID();
    const suffix = extension ? `.${extension}` : '';

    switch (scope) {
      case 'temp':
        if (ownerId) {
          return `users/${ownerId}/temp/${uniqueName}${suffix}`;
        }
        return `temp/public/${uniqueName}${suffix}`;
      case 'public':
        return `public/${uniqueName}${suffix}`;
      case 'profile':
      default:
        if (ownerId) {
          return `users/${ownerId}/${uniqueName}${suffix}`;
        }
        return `public/${uniqueName}${suffix}`;
    }
  }

  private truncateMetadataValue(value: string): string {
    const maxLength = 255;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }

  private sanitizeObjectKey(key: string): string {
    if (!key || key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      throw new BadRequestException('Provided storage key is invalid.');
    }

    return key;
  }
}
