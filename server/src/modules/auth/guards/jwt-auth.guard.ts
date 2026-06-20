import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';
import { DeviceService } from '../device.service';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly deviceService: DeviceService,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      return true;
    }

    const { sub: userId, deviceId, tokenVersion } = user;

    if (!deviceId || tokenVersion === undefined) {
      throw new UnauthorizedException('Device information missing from token.');
    }

    const currentTokenVersion = await this.deviceService.getDeviceTokenVersion(userId, deviceId);

    if (tokenVersion !== currentTokenVersion) {
      throw new UnauthorizedException({
        code: 'DEVICE_CHANGED',
        message: 'This device has been deactivated.',
        currentDevice: null,
      });
    }

    return true;
  }
}
