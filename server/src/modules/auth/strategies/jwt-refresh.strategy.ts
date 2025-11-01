import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../auth.service';

const extractRefreshToken = ExtractJwt.fromExtractors([
  (request: Request) => request?.body?.refreshToken,
  (request: Request) => request?.cookies?.refreshToken,
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]);

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshTokenSecret') ?? 'change-me-too',
      passReqToCallback: true,
    });
  }

  validate(_request: Request, payload: JwtPayload): JwtPayload {
    return payload;
  }
}
