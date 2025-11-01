import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshJwtGuard extends AuthGuard('jwt-refresh') {
  constructor(private readonly authService: AuthService, private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ user?: { sub: string }; body?: { refreshToken?: string } }>();
    const refreshToken = request.body?.refreshToken;
    if (!refreshToken || !request.user?.sub) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const isValid = await this.authService.validateRefreshToken(request.user.sub, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token invalid.');
    }

    return true;
  }
}
