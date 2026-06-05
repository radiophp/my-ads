import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '@app/modules/users/users.service';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { comparePassword, hashPassword } from '@app/common/utils/password.util';
import { Role } from '@app/common/decorators/roles.decorator';
import type { JwtConfig } from '@app/platform/config/jwt.config';
import { OtpService } from '@app/platform/otp/otp.service';
import { BaleBotService } from '@app/modules/bale/bale.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

export type JwtPayload = {
  sub: string;
  phone: string;
  role: Role;
};

type UserWithRelations = Prisma.UserGetPayload<{
  include: { city: { include: { province: true } } };
}>;

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
  ) {}

  async requestOtp(
    phone: string,
    deviceInfo?: string,
  ): Promise<{
    success: true;
    viaBale?: boolean;
    baleLinked?: boolean;
    baleBotUrl?: string;
    baleLinkToken?: string;
  }> {
    const user = await this.usersService.findOrCreateByPhone(phone);

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const baleLink = await this.findBaleLinkByPhone(phone);

    const baleBotUrl = await this.getBaleBotUrl();

    if (baleLink) {
      const code = await this.otpService.generateAndStoreOtp(phone);
      const result = await this.baleBotService.sendOtpToUser(phone, code, deviceInfo);
      if (result.status === 'sent') {
        return {
          success: true,
          viaBale: true,
          baleLinked: true,
          baleBotUrl: baleBotUrl ?? undefined,
        };
      }
      this.logger.warn(
        `Bale OTP delivery failed for ${phone} (${result.error ?? 'unknown'}); removing stale link.`,
      );
      await this.prismaService.baleUserLink
        .delete({ where: { baleId: baleLink.baleId } })
        .catch(() => undefined);
    }

    if (!baleBotUrl) {
      try {
        await this.otpService.sendCode(phone);
      } catch {
        throw new InternalServerErrorException('Failed to send verification code.');
      }
      return { success: true };
    }

    const baleLinkToken = randomBytes(24).toString('hex');
    await this.redisService.pSetEx(`bale-link-token:${baleLinkToken}`, 300_000, phone);
    return { success: true, viaBale: false, baleLinked: false, baleBotUrl, baleLinkToken };
  }

  async baleLogin(phone: string): Promise<AuthResponseDto> {
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

    return this.buildAuthResponse(user);
  }

  private async findBaleLinkByPhone(phone: string) {
    const digits = phone.replace(/\D+/g, '');
    const candidates = new Set<string>([phone]);
    if (digits) {
      candidates.add(digits);
      candidates.add(`+${digits}`);
    }
    return this.prismaService.baleUserLink.findFirst({
      where: { phone: { in: Array.from(candidates) } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async getBaleBotUrl(): Promise<string | null> {
    const setting = await this.prismaService.websiteSetting.findFirst({
      where: { key: 'default' },
    });
    return setting?.baleBotUrl?.trim() || null;
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
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

    return this.buildAuthResponse(user);
  }

  async refreshTokens(userId: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: UserWithRelations): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role as Role,
    };

    const jwtConfig = this.configService.get<JwtConfig>('jwt', { infer: true });
    if (!jwtConfig) {
      throw new Error('JWT configuration is missing.');
    }

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
    } as AuthResponseDto;
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken || !user.isActive) {
      return false;
    }

    return comparePassword(token, user.hashedRefreshToken);
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
