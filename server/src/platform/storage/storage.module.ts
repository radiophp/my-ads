import { Global, Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import minioConfig, { type MinioConfig } from '../config/minio.config';
import { STORAGE_S3_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

const createS3Client = (config: MinioConfig): S3Client => {
  const protocol = config.useSSL ? 'https' : 'http';
  const endpoint = `${protocol}://${config.endpoint}:${config.port}`;

  return new S3Client({
    region: config.region ?? 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
};

@Global()
@Module({
  imports: [ConfigModule.forFeature(minioConfig)],
  providers: [
    {
      provide: STORAGE_S3_CLIENT,
      inject: [minioConfig.KEY],
      useFactory: (config: ConfigType<typeof minioConfig>) => createS3Client(config),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
