import { registerAs } from '@nestjs/config';

export type JwtConfig = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
};

export default registerAs<JwtConfig>('jwt', () => {
  const env = process.env;

  return {
    accessTokenSecret: env['JWT_ACCESS_TOKEN_SECRET'] ?? 'change-me',
    refreshTokenSecret: env['JWT_REFRESH_TOKEN_SECRET'] ?? 'change-me-too',
    accessTokenTtl: env['JWT_ACCESS_TOKEN_TTL'] ?? '900s',
    refreshTokenTtl: env['JWT_REFRESH_TOKEN_TTL'] ?? '7d',
  } satisfies JwtConfig;
});
