import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '@app/modules/users/users.service';
import { comparePassword, hashPassword } from '@app/common/utils/password.util';
import { Role } from '@app/common/decorators/roles.decorator';
import type { JwtConfig } from '@app/platform/config/jwt.config';
import { OtpService } from '@app/platform/otp/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

export type JwtPayload = {
  sub: string;
  phone: string;
  role: Role;
};

type UserWithCity = Prisma.UserGetPayload<{ include: { city: true } }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  async requestOtp(phone: string): Promise<void> {
    const user = await this.usersService.findOrCreateByPhone(phone);

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    try {
      await this.otpService.sendCode(phone);
    } catch {
      throw new InternalServerErrorException('Failed to send verification code.');
    }
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

  private async buildAuthResponse(user: UserWithCity): Promise<AuthResponseDto> {
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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
}
