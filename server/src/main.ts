import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import helmet, { type FastifyHelmetOptions } from '@fastify/helmet';
import { AppModule } from './app.module';
import { HttpMetricsInterceptor } from './platform/metrics/interceptors/http-metrics.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RedisService } from './platform/cache/redis.service';
import { RedisIoAdapter } from './platform/websocket/redis-io.adapter';
import type { SecurityConfig } from './platform/config/security.config';
import { initializeOpenTelemetry } from './platform/observability/opentelemetry';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  await initializeOpenTelemetry();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);

  app.useLogger(app.get(PinoLogger));
  const logger = new NestLogger('Bootstrap');

  const globalPrefix = configService.get<string>('app.globalPrefix', 'api');
  app.setGlobalPrefix(globalPrefix, { exclude: ['/', 'metrics'] });

  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const httpMetricsInterceptor = app.get(HttpMetricsInterceptor);
  app.useGlobalInterceptors(httpMetricsInterceptor);

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.register(fastifyMultipart, {
    attachFieldsToBody: false,
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(fastifyCookie);

  const securityConfig = configService.get<SecurityConfig>('security', { infer: true });

  await app.register(fastifyCors, {
    origin: securityConfig?.corsOrigin ?? true,
    credentials: true,
  });

  const helmetOptions: FastifyHelmetOptions = {
    crossOriginEmbedderPolicy: false,
  };

  if (typeof securityConfig?.csp !== 'undefined') {
    helmetOptions.contentSecurityPolicy = securityConfig.csp;
  }

  await app.register(helmet, helmetOptions);

  const redisService = app.get(RedisService);
  const redisIoAdapter = new RedisIoAdapter(app, redisService, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableShutdownHooks();

  const port = configService.get<number>('app.port', 6200);
  const host = configService.get<string>('app.host', '0.0.0.0');

  console.log('[Bootstrap] Listening on', { host, port });
  try {
    await app.listen({ port, host });
    console.log('[Bootstrap] Listen resolved');
  } catch (error) {
    console.error('[Bootstrap] Listen failed', error);
    throw error;
  }
  logger.log(`🚀 Application is running on: http://${host}:${port}/${globalPrefix}`);
}

bootstrap().catch((error) => {
  const logger = new NestLogger('Bootstrap');
  logger.error('Failed to bootstrap application', error);
  process.exit(1);
});
