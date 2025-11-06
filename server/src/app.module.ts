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
import otpConfig from './platform/config/otp.config';
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
import { HttpModule } from './platform/http/http.module';
import healthConfig from './platform/config/health.config';
import { CitiesModule } from './modules/cities/cities.module';
import { ProvincesModule } from './modules/provinces/provinces.module';
import { PackagesModule } from './modules/packages/packages.module';
import { DivarCategoriesModule } from './modules/divar-categories/divar-categories.module';
import { DistrictsModule } from './modules/districts/districts.module';

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
        healthConfig,
        otpConfig,
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
    CitiesModule,
    AuthModule,
    ProvincesModule,
    DistrictsModule,
    PublicModule,
    UserPanelModule,
    AdminPanelModule,
    WebsocketModule,
    StorageModule,
    UploadsModule,
    HttpModule,
    PackagesModule,
    DivarCategoriesModule,
  ],
})
export class AppModule {}
