import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './platform/config/app.config';
import dbConfig from './platform/config/db.config';
import redisConfig from './platform/config/redis.config';
import jwtConfig from './platform/config/jwt.config';
import securityConfig from './platform/config/security.config';
import rabbitmqConfig from './platform/config/rabbitmq.config';
import minioConfig from './platform/config/minio.config';
import observabilityConfig from './platform/config/observability.config';
import loggerConfig from './platform/config/logger.config';
import { validateEnvironment } from './platform/config/environment.validation';
import { PrismaModule } from './platform/database/prisma.module';
import { RedisModule } from './platform/cache/redis.module';
import { CacheModule } from './platform/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QueueModule } from './platform/queue/queue.module';
import { WebsocketModule } from './platform/websocket/websocket.module';
import { MetricsModule } from './platform/metrics/metrics.module';
import { PublicModule } from './modules/public/public.module';
import { UserPanelModule } from './modules/user-panel/user-panel.module';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { RateLimitModule } from './common/guards/rate-limit/rate-limit.module';
import { StorageModule } from './platform/storage/storage.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { LoggingModule } from './platform/logging/logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '.env.local',
        '.env.development',
        '../.env',
        '../.env.local',
        '../.env.development',
      ],
      validate: validateEnvironment,
      load: [
        appConfig,
        dbConfig,
        redisConfig,
        jwtConfig,
        securityConfig,
        rabbitmqConfig,
        minioConfig,
        observabilityConfig,
        loggerConfig,
      ],
    }),
    LoggingModule,
    MetricsModule,
    PrismaModule,
    RedisModule,
    CacheModule,
    RateLimitModule,
    QueueModule,
    UsersModule,
    AuthModule,
    PublicModule,
    UserPanelModule,
    AdminPanelModule,
    WebsocketModule,
    StorageModule,
    UploadsModule,
  ],
})
export class AppModule {}
