import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@app/modules/users/users.module';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitModule } from '@app/common/guards/rate-limit/rate-limit.module';
import { OtpModule } from '@app/platform/otp/otp.module';
import type { JwtConfig } from '@app/platform/config/jwt.config';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    RateLimitModule,
    OtpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>('jwt', { infer: true });
        if (!jwtConfig) {
          throw new Error('JWT configuration is missing.');
        }

        return {
          secret: jwtConfig.accessTokenSecret,
          signOptions: {
            expiresIn: jwtConfig.accessTokenTtl,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RefreshJwtGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RefreshJwtGuard, RolesGuard],
})
export class AuthModule {}
