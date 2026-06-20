import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { emitToUser } from '@app/platform/websocket/io-server';

const PENDING_TTL_MS = 300_000;
const TOKEN_VERSION_CACHE_TTL_S = 300;
const MAX_ACTIVE_DEVICES = 2;

type ActiveDeviceInfo = {
  deviceId: string;
  name: string | null;
  type: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
};

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findOrCreatePending(
    userId: string,
    deviceId: string,
    deviceName?: string,
    deviceType?: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    isNewDevice: boolean;
    currentDevice: ActiveDeviceInfo | null;
    activeDevices: ActiveDeviceInfo[];
    requiresDeviceSelection: boolean;
    pendingSessionToken?: string;
  }> {
    const existing = await this.prismaService.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (existing?.isActive) {
      return {
        isNewDevice: false,
        currentDevice: null,
        activeDevices: [],
        requiresDeviceSelection: false,
      };
    }

    const activeDevices = await this.prismaService.userDevice.findMany({
      where: { userId, isActive: true },
      select: { deviceId: true, name: true, type: true, ipAddress: true, lastActiveAt: true },
      orderBy: { lastActiveAt: 'desc' },
    });

    const requiresDeviceSelection = activeDevices.length >= MAX_ACTIVE_DEVICES;

    if (existing) {
      await this.prismaService.userDevice.update({
        where: { id: existing.id },
        data: {
          name: deviceName ?? existing.name,
          type: deviceType ?? existing.type,
          userAgent: userAgent ?? existing.userAgent,
          ipAddress: ipAddress ?? existing.ipAddress,
        },
      });
    } else {
      await this.prismaService.userDevice.create({
        data: { userId, deviceId, name: deviceName, type: deviceType, userAgent, ipAddress },
      });
    }

    const pendingSessionToken = randomUUID();
    const payload = JSON.stringify({ userId, deviceId });
    await this.redisService.pSetEx(
      `device:pending:${pendingSessionToken}`,
      PENDING_TTL_MS,
      payload,
    );

    return {
      isNewDevice: true,
      currentDevice: activeDevices[0] ?? null,
      activeDevices,
      requiresDeviceSelection,
      pendingSessionToken,
    };
  }

  async confirmDevice(
    pendingSessionToken: string,
    deviceToReplace?: string,
  ): Promise<{
    userId: string;
    deviceId: string;
  }> {
    const raw = await this.redisService.get(`device:pending:${pendingSessionToken}`);
    if (!raw) {
      throw new UnauthorizedException('Pending session token is invalid or expired.');
    }

    let parsed: { userId: string; deviceId: string };
    try {
      parsed = JSON.parse(raw) as { userId: string; deviceId: string };
    } catch {
      throw new UnauthorizedException('Invalid pending session data.');
    }

    await this.redisService.del(`device:pending:${pendingSessionToken}`);

    const { userId, deviceId } = parsed;

    await this.prismaService.$transaction(async (tx) => {
      if (deviceToReplace) {
        await tx.userDevice.update({
          where: { userId_deviceId: { userId, deviceId: deviceToReplace } },
          data: { isActive: false, tokenVersion: { increment: 1 } },
        });
      }

      await tx.userDevice.update({
        where: { userId_deviceId: { userId, deviceId } },
        data: { isActive: true, lastActiveAt: new Date() },
      });
    });

    if (deviceToReplace) {
      await this.redisService.del(`device:tv:${userId}:${deviceToReplace}`);
    }

    await this.emitDeviceChallenged(userId, deviceId);

    return { userId, deviceId };
  }

  async cancelDevice(pendingSessionToken: string): Promise<void> {
    const raw = await this.redisService.get(`device:pending:${pendingSessionToken}`);
    if (!raw) {
      throw new UnauthorizedException('Pending session token is invalid or expired.');
    }

    let parsed: { userId: string; deviceId: string };
    try {
      parsed = JSON.parse(raw) as { userId: string; deviceId: string };
    } catch {
      throw new UnauthorizedException('Invalid pending session data.');
    }

    await this.redisService.del(`device:pending:${pendingSessionToken}`);

    await this.prismaService.userDevice.deleteMany({
      where: { userId: parsed.userId, deviceId: parsed.deviceId, isActive: false },
    });
  }

  async getUserDevices(userId: string) {
    return this.prismaService.userDevice.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        name: true,
        type: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        isActive: true,
      },
    });
  }

  async deactivateDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.prismaService.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found.');
    }

    if (!device.isActive) {
      return;
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.userDevice.update({
        where: { id: device.id },
        data: { isActive: false, tokenVersion: { increment: 1 } },
      });
    });

    await this.redisService.del(`device:tv:${userId}:${deviceId}`);
  }

  async deactivateAllDevices(userId: string): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      const devices = await tx.userDevice.findMany({
        where: { userId, isActive: true },
        select: { deviceId: true },
      });

      await tx.userDevice.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, tokenVersion: { increment: 1 } },
      });

      for (const d of devices) {
        await this.redisService.del(`device:tv:${userId}:${d.deviceId}`);
      }
    });
  }

  async getDeviceTokenVersion(userId: string, deviceId: string): Promise<number> {
    const cached = await this.redisService.get(`device:tv:${userId}:${deviceId}`);
    if (cached !== null) {
      const num = Number(cached);
      if (!Number.isNaN(num)) return num;
    }

    const device = await this.prismaService.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
      select: { tokenVersion: true },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found.');
    }

    await this.redisService.set(`device:tv:${userId}:${deviceId}`, String(device.tokenVersion));
    await this.redisService.expire(`device:tv:${userId}:${deviceId}`, TOKEN_VERSION_CACHE_TTL_S);

    return device.tokenVersion;
  }

  async getActiveDeviceInfo(userId: string): Promise<ActiveDeviceInfo | null> {
    const active = await this.prismaService.userDevice.findFirst({
      where: { userId, isActive: true },
      select: { deviceId: true, name: true, type: true, ipAddress: true, lastActiveAt: true },
    });

    return active ?? null;
  }

  async touchDevice(userId: string, deviceId: string): Promise<void> {
    await this.prismaService.userDevice
      .update({
        where: { userId_deviceId: { userId, deviceId } },
        data: { lastActiveAt: new Date() },
      })
      .catch((err) => {
        this.logger.warn(`Failed to touch device ${deviceId}: ${(err as Error).message}`);
      });
  }

  private async emitDeviceChallenged(userId: string, newDeviceId: string): Promise<void> {
    try {
      const challengerDevice = await this.prismaService.userDevice.findUnique({
        where: { userId_deviceId: { userId, deviceId: newDeviceId } },
        select: { name: true, type: true, ipAddress: true },
      });

      emitToUser(userId, 'device:challenged', {
        name: challengerDevice?.name ?? null,
        type: challengerDevice?.type ?? null,
        ipAddress: challengerDevice?.ipAddress ?? null,
        lastActiveAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(`Failed to emit device:challenged via WS: ${(err as Error).message}`);
    }
  }
}
