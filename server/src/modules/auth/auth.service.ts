import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '@app/modules/users/users.service';
import { comparePassword, hashPassword } from '@app/common/utils/password.util';
import { Role } from '@app/common/decorators/roles.decorator';
import type { JwtConfig } from '@app/platform/config/jwt.config';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await this.usersService.createUser({
      email: dto.email,
      password: hashedPassword,
      role: dto.role ?? Role.USER,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValid = await comparePassword(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.buildAuthResponse(user);
  }

  async refreshTokens(userId: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
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
        email: user.email,
        role: user.role as Role,
        isActive: user.isActive,
      },
    };
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      return false;
    }

    return comparePassword(token, user.hashedRefreshToken);
  }
}
