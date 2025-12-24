import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  type GetObjectCommandOutput,
  type HeadObjectCommandOutput,
  type PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import minioConfig from '../config/minio.config';
import { STORAGE_S3_CLIENT } from './storage.constants';

export type UploadObjectOptions = {
  key: string;
  body: Readable | Buffer | Uint8Array | string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
};

export type StoredObjectMetadata = {
  bucket: string;
  key: string;
  eTag?: string;
  url: string;
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly legacyPublicHosts = new Set([
    'storage.mahanfile.com',
    'dev-storage.mahanfile.com',
    'mahan-storage.toncloud.observer',
  ]);

  constructor(
    @Inject(STORAGE_S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(minioConfig.KEY) private readonly config: ConfigType<typeof minioConfig>,
  ) {}

  get bucket(): string {
    return this.config.bucket;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      if (error instanceof S3ServiceException && this.isNotFound(error)) {
        await this.createBucket();
        return;
      }

      this.logger.error('Failed to verify MinIO bucket existence', error as Error);
      throw error;
    }
  }

  private isNotFound(error: S3ServiceException): boolean {
    return error.$metadata.httpStatusCode === 404 || error.name === 'NotFound';
  }

  private async createBucket(): Promise<void> {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket ${this.bucket}`);
    } catch (error) {
      if (error instanceof S3ServiceException && this.isBucketAlreadyOwned(error)) {
        this.logger.debug(`Bucket ${this.bucket} already exists`);
        return;
      }

      this.logger.error('Failed to create MinIO bucket', error as Error);
      throw error;
    }
  }

  private isBucketAlreadyOwned(error: S3ServiceException): boolean {
    return error.name === 'BucketAlreadyOwnedByYou' || error.$metadata.httpStatusCode === 409;
  }

  async uploadObject(options: UploadObjectOptions): Promise<StoredObjectMetadata> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      Metadata: options.metadata,
      ...(typeof options.contentLength === 'number'
        ? { ContentLength: options.contentLength }
        : {}),
    });

    const response: PutObjectCommandOutput = await this.s3Client.send(command);
    const eTag = response.ETag ? response.ETag.replace(/"/g, '') : undefined;

    return {
      bucket: this.bucket,
      key: options.key,
      eTag,
      url: this.getPublicUrl(options.key),
    } satisfies StoredObjectMetadata;
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.s3Client.send(command);
  }

  async getObjectMetadata(key: string): Promise<HeadObjectCommandOutput | null> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
      return await this.s3Client.send(command);
    } catch (error) {
      if (error instanceof S3ServiceException && this.isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async healthCheck(): Promise<void> {
    await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
  async getObject(key: string): Promise<GetObjectCommandOutput> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return this.s3Client.send(command);
  }

  async getObjectStream(key: string): Promise<Readable> {
    const response = await this.getObject(key);
    const { Body } = response;

    if (!Body) {
      throw new Error(`Object ${key} does not contain a body.`);
    }

    if (Body instanceof Readable) {
      return Body;
    }

    if (
      typeof (Body as { transformToWebStream?: () => ReadableStream })?.transformToWebStream ===
      'function'
    ) {
      const webStream = (
        Body as { transformToWebStream: () => ReadableStream }
      ).transformToWebStream();
      return Readable.fromWeb(webStream);
    }

    if (
      typeof (Body as { transformToByteArray?: () => Promise<Uint8Array> })
        ?.transformToByteArray === 'function'
    ) {
      const buffer = await (
        Body as { transformToByteArray: () => Promise<Uint8Array> }
      ).transformToByteArray();
      return Readable.from(buffer);
    }

    throw new Error(`Unsupported body type received for object ${key}`);
  }

  getPublicUrl(key: string): string {
    const endpoint = this.config.publicEndpoint ?? this.config.endpoint;
    const useSSL = this.config.publicUseSSL ?? this.config.useSSL;
    const port = this.config.publicPort ?? this.config.port;
    const publicPath = this.config.publicPath ?? '';
    const protocol = useSSL ? 'https' : 'http';
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const normalizedPath = publicPath ? `/${publicPath.replace(/^\/+|\/+$/g, '')}` : '';
    const bucketPath = `${normalizedPath}/${this.bucket}/${encodedKey}`;

    if (this.config.publicEndpoint && this.legacyPublicHosts.has(this.config.publicEndpoint)) {
      return bucketPath;
    }

    const defaultPort = useSSL ? 443 : 80;
    const portSegment = port === defaultPort || typeof port === 'undefined' ? '' : `:${port}`;

    return `${protocol}://${endpoint}${portSegment}${bucketPath}`;
  }
}
