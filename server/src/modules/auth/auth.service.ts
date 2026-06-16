import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { UsersService } from '@app/modules/users/users.service';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { comparePassword, hashPassword } from '@app/common/utils/password.util';
import { Role } from '@app/common/decorators/roles.decorator';
import type { JwtConfig } from '@app/platform/config/jwt.config';
import { OtpService } from '@app/platform/otp/otp.service';
import { BaleBotService } from '@app/modules/bale/bale.service';
import { DeviceService } from './device.service';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

export type JwtPayload = {
  sub: string;
  phone: string;
  role: Role;
  deviceId: string;
  tokenVersion: number;
};

type UserWithRelations = Prisma.UserGetPayload<{
  include: { city: { include: { province: true } } };
}>;

type DeviceInfo = {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
};

type ConfirmDeviceResponse = {
  status: 'confirm_device';
  pendingSessionToken: string;
  currentDevice: {
    name: string | null;
    type: string | null;
    ipAddress: string | null;
    lastActiveAt: Date;
  } | null;
};

type AuthenticatedResponse = {
  status: 'authenticated';
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    provinceId: number | null;
    province: string | null;
    cityId: number | null;
    city: string | null;
    profileImageUrl: string | null;
    role: Role;
    isActive: boolean;
  };
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly baleBotService: BaleBotService,
    private readonly deviceService: DeviceService,
  ) {}

  async requestOtp(
    phone: string,
    deviceInfo?: string,
    turnstileToken?: string,
  ): Promise<{
    success: true;
    viaBale?: boolean;
    baleLinked?: boolean;
    baleBotUrl?: string;
    baleLinkToken?: string;
  }> {
    await this.verifyTurnstile(turnstileToken);

    const user = await this.usersService.findOrCreateByPhone(phone);

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const baleLink = await this.findBaleLinkByPhone(phone);

    const baleBotUrl = await this.getBaleBotUrl();

    if (baleLink) {
      const code = await this.otpService.generateAndStoreOtp(phone);
      const result = await this.baleBotService.sendOtpToUser(phone, code, deviceInfo, user.id);
      if (result.status === 'sent') {
        return {
          success: true,
          viaBale: true,
          baleLinked: true,
          baleBotUrl: baleBotUrl ?? undefined,
        };
      }
      this.logger.warn(
        `Bale OTP delivery failed for ${phone} (${result.error ?? 'unknown'}); falling back to SMS.`,
      );
    }

    if (baleBotUrl && !baleLink) {
      const baleLinkToken = randomBytes(24).toString('hex');
      await this.redisService.pSetEx(`bale-link-token:${baleLinkToken}`, 300_000, phone);
      return { success: true, viaBale: false, baleLinked: false, baleBotUrl, baleLinkToken };
    }

    try {
      await this.otpService.sendCode(phone);
    } catch {
      throw new InternalServerErrorException('Failed to send verification code.');
    }
    return {
      success: true,
      viaBale: false,
      baleLinked: !!baleLink,
      baleBotUrl: baleBotUrl ?? undefined,
    };
  }

  async baleLogin(
    phone: string,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthenticatedResponse | ConfirmDeviceResponse> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const baleLink = await this.findBaleLinkByPhone(phone);
    if (!baleLink) {
      throw new UnauthorizedException('Bale account not linked. Please join our Bale bot first.');
    }

    if (deviceInfo) {
      const result = await this.deviceService.findOrCreatePending(
        user.id,
        deviceInfo.deviceId,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
        deviceInfo.userAgent,
      );

      if (result.isNewDevice) {
        return {
          status: 'confirm_device',
          pendingSessionToken: result.pendingSessionToken!,
          currentDevice: result.currentDevice,
        };
      }
    }

    const tokens = await this.buildAuthResponse(user, deviceInfo?.deviceId ?? '');
    return { status: 'authenticated', ...tokens };
  }

  private async findBaleLinkByPhone(phone: string) {
    const botId = this.configService.get<string>('BALE_BOT_TOKEN')?.split(':')[0] ?? '';
    if (!botId) return null;

    const digits = phone.replace(/\D+/g, '');
    const candidates = new Set<string>([phone]);
    if (digits) {
      candidates.add(digits);
      candidates.add(`+${digits}`);
    }
    return this.prismaService.baleUserLink.findFirst({
      where: { phone: { in: Array.from(candidates) }, botId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async getBaleBotUrl(): Promise<string | null> {
    const setting = await this.prismaService.websiteSetting.findFirst({
      where: { key: 'default' },
    });
    return setting?.baleBotUrl?.trim() || null;
  }

  private async verifyTurnstile(token?: string): Promise<void> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    if (!secretKey) {
      return;
    }

    const setting = await this.prismaService.websiteSetting.findFirst({
      where: { key: 'default' },
    });
    if (!setting?.turnstileEnabled) {
      return;
    }

    if (!token) {
      throw new ForbiddenException('Human verification required.');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });
      const result = (await res.json()) as { success: boolean };
      if (!result.success) {
        throw new ForbiddenException('Human verification failed.');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.warn(`Turnstile verification unreachable, skipping: ${(error as Error).message}`);
    }
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress?: string,
  ): Promise<AuthenticatedResponse | ConfirmDeviceResponse> {
    const isValid = await this.otpService.verifyCode(dto.phone, dto.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    const user =
      (await this.usersService.findByPhone(dto.phone)) ??
      (await this.usersService.createUser({ phone: dto.phone }));

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    if (dto.deviceId) {
      const result = await this.deviceService.findOrCreatePending(
        user.id,
        dto.deviceId,
        dto.deviceName,
        dto.deviceType,
        dto.userAgent,
        ipAddress,
      );

      if (result.isNewDevice) {
        return {
          status: 'confirm_device',
          pendingSessionToken: result.pendingSessionToken!,
          currentDevice: result.currentDevice,
        };
      }
    }

    const tokens = await this.buildAuthResponse(user, dto.deviceId ?? '');
    return { status: 'authenticated', ...tokens };
  }

  async confirmDevice(pendingSessionToken: string): Promise<AuthenticatedResponse> {
    const { userId, deviceId } = await this.deviceService.confirmDevice(pendingSessionToken);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const tokens = await this.buildAuthResponse(user, deviceId);
    return { status: 'authenticated', ...tokens };
  }

  async cancelDevice(pendingSessionToken: string): Promise<void> {
    await this.deviceService.cancelDevice(pendingSessionToken);
  }

  async refreshTokens(userId: string, deviceId: string): Promise<AuthenticatedResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const tokens = await this.buildAuthResponse(user, deviceId);
    return { status: 'authenticated', ...tokens };
  }

  private async buildAuthResponse(
    user: UserWithRelations,
    deviceId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthenticatedResponse['user'];
  }> {
    const jwtConfig = this.configService.get<JwtConfig>('jwt', { infer: true });
    if (!jwtConfig) {
      throw new Error('JWT configuration is missing.');
    }

    const tokenVersion = user.tokenVersion;

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role as Role,
      deviceId,
      tokenVersion,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: jwtConfig.accessTokenTtl,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: jwtConfig.refreshTokenTtl,
      secret: jwtConfig.refreshTokenSecret,
    });

    await this.usersService.updateRefreshToken(user.id, await hashPassword(refreshToken));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        provinceId: user.city?.provinceId ?? null,
        province: user.city?.province?.name ?? null,
        cityId: user.cityId,
        city: user.city?.name ?? null,
        profileImageUrl: user.profileImageUrl,
        role: user.role as Role,
        isActive: user.isActive,
      },
    };
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken || !user.isActive) {
      return false;
    }

    return comparePassword(token, user.hashedRefreshToken);
  }

  async logout(userId: string): Promise<void> {
    await this.deviceService.deactivateAllDevices(userId);
    await this.usersService.updateRefreshToken(userId, null);
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      provinceId: user.city?.provinceId ?? null,
      province: user.city?.province?.name ?? null,
      cityId: user.cityId,
      city: user.city?.name ?? null,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    } satisfies CurrentUserDto;
  }

  async updateCurrentUser(userId: string, dto: UpdateCurrentUserDto): Promise<CurrentUserDto> {
    const user = await this.usersService.updateProfile(userId, dto);
    return this.getCurrentUser(user.id);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new UnauthorizedException('Access token is required.');
    }

    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
