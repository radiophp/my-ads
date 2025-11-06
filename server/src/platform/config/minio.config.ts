import { registerAs } from '@nestjs/config';

export type MinioConfig = {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  publicEndpoint?: string;
  publicPort?: number;
  publicUseSSL?: boolean;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

export default registerAs<MinioConfig>('minio', () => {
  const env = process.env;
  const useSSL = parseBoolean(env['MINIO_USE_SSL'], false);
  const portSource = env['MINIO_PORT'] ?? '6204';

  const host = env['MINIO_ENDPOINT'] ?? 'minio';
  const publicHost = env['MINIO_PUBLIC_ENDPOINT'];
  const publicUseSSL = parseBoolean(env['MINIO_PUBLIC_USE_SSL'], useSSL);
  const publicPortSource = env['MINIO_PUBLIC_PORT'];

  return {
    endpoint: host,
    port: Number(portSource),
    useSSL,
    accessKey: env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: env['MINIO_SECRET_KEY'] ?? 'minioadmin',
    bucket: env['MINIO_BUCKET'] ?? 'upload',
    region: env['MINIO_REGION'],
    publicEndpoint: publicHost,
    publicPort: publicHost ? (publicPortSource ? Number(publicPortSource) : undefined) : undefined,
    publicUseSSL: publicHost ? publicUseSSL : undefined,
  } satisfies MinioConfig;
});
