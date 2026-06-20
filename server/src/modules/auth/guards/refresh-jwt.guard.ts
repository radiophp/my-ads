import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, type JwtPayload } from '../auth.service';
import { DeviceService } from '../device.service';

@Injectable()
export class RefreshJwtGuard extends AuthGuard('jwt-refresh') {
  constructor(
    private readonly authService: AuthService,
    private readonly deviceService: DeviceService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) {
      return false;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload; body?: { refreshToken?: string } }>();
    const refreshToken = request.body?.refreshToken;
    if (!refreshToken || !request.user?.sub) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const isValid = await this.authService.validateRefreshToken(request.user.sub, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token invalid.');
    }

    const { sub: userId, deviceId, tokenVersion } = request.user;

    if (deviceId && tokenVersion !== undefined) {
      const currentTokenVersion = await this.deviceService.getDeviceTokenVersion(userId, deviceId);
      if (tokenVersion !== currentTokenVersion) {
        throw new UnauthorizedException({
          code: 'DEVICE_CHANGED',
          message: 'Refresh token is no longer valid because the device was deactivated.',
          currentDevice: null,
        });
      }
    }

    return true;
  }
}
