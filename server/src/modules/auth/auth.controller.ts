import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { UsersService } from '@app/modules/users/users.service';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshJwtGuard)
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<AuthResponseDto> {
    const userId = (request.user as { sub: string })?.sub;
    return this.authService.refreshTokens(userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: Request): Promise<{ success: boolean }> {
    const userId = (request.user as { sub: string })?.sub;
    await this.usersService.updateRefreshToken(userId, null);
    return { success: true };
  }
}
