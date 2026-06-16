import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';
import { DeviceService } from '../device.service';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class DeviceGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly deviceService: DeviceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
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

    const currentTokenVersion = await this.deviceService.getCurrentTokenVersion(userId);

    if (tokenVersion !== currentTokenVersion) {
      const activeDevice = await this.deviceService.getActiveDeviceInfo(userId);
      throw new UnauthorizedException({
        code: 'DEVICE_CHANGED',
        message: 'Logged in from another device.',
        currentDevice: activeDevice
          ? {
              name: activeDevice.name,
              type: activeDevice.type,
              ipAddress: activeDevice.ipAddress,
              lastActiveAt: activeDevice.lastActiveAt,
            }
          : null,
      });
    }

    return true;
  }
}
