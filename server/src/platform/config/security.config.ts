import { registerAs } from '@nestjs/config';

export type SecurityConfig = {
  corsOrigin: string | boolean | string[];
  csp: Record<string, string[]> | boolean;
  rateLimit: {
    ttlSeconds: number;
    limit: number;
  };
};

export default registerAs<SecurityConfig>('security', () => {
  const env = process.env;
  const corsOriginRaw = env['CORS_ORIGIN'];

  return {
    corsOrigin: corsOriginRaw ? corsOriginRaw.split(',').map((origin) => origin.trim()) : true,
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
    rateLimit: {
      ttlSeconds: Number(env['RATE_LIMIT_TTL'] ?? 60),
      limit: Number(env['RATE_LIMIT_MAX'] ?? 100),
    },
  } satisfies SecurityConfig;
});
