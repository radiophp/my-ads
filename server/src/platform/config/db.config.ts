import { registerAs } from '@nestjs/config';

export type DatabaseConfig = {
  url: string;
  directUrl?: string;
  shadowDatabaseUrl?: string;
  logQueries?: boolean;
};

export default registerAs<DatabaseConfig>('database', () => {
  const env = process.env;
  const directUrl = env['DATABASE_DIRECT_URL'];
  const shadowUrl = env['SHADOW_DATABASE_URL'];

  const logQueries = env['PRISMA_LOG_QUERIES'] === 'true';

  return {
    url:
      env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:6201/my_ads?schema=public',
    ...(directUrl ? { directUrl } : {}),
    ...(shadowUrl ? { shadowDatabaseUrl: shadowUrl } : {}),
    ...(logQueries ? { logQueries: true } : {}),
  } satisfies DatabaseConfig;
});
