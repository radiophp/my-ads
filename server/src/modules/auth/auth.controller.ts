import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import type { FastifyReply } from 'fastify';
import * as QRCode from 'qrcode';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BaleLoginDto } from './dto/bale-login.dto';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '@app/common/guards/rate-limit/rate-limit.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { UsersService } from '@app/modules/users/users.service';
import { PrismaService } from '@app/platform/database/prisma.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SuccessResponseDto } from './dto/otp-success-response.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

const QR_CACHE_TTL_MS = 300_000;

const qrCache = new Map<string, { buffer: Buffer; expiresAt: number }>();

@Controller('auth')
@UseGuards(RateLimitGuard)
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch the currently authenticated user (phone excluded)' })
  @ApiOkResponse({ type: CurrentUserDto })
  async me(@Req() request: Request): Promise<CurrentUserDto> {
    const userId = (request.user as { sub: string })?.sub;
    return this.authService.getCurrentUser(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user profile (phone excluded)' })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiBody({ type: UpdateCurrentUserDto })
  async updateMe(
    @Req() request: Request,
    @Body() dto: UpdateCurrentUserDto,
  ): Promise<CurrentUserDto> {
    const userId = (request.user as { sub: string })?.sub;
    return this.authService.updateCurrentUser(userId, dto);
  }

  @Post('request-otp')
  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Request a one-time passcode for authentication' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiTooManyRequestsResponse({ description: 'OTP requests are rate limited' })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<SuccessResponseDto> {
    return this.authService.requestOtp(dto.phone, dto.deviceInfo) as unknown as SuccessResponseDto;
  }

  @Post('bale-login')
  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Login via linked Bale account (no OTP)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Bale account not linked' })
  async baleLogin(@Body() dto: BaleLoginDto): Promise<AuthResponseDto> {
    return this.authService.baleLogin(dto.phone);
  }

  @Get('bale-qr')
  @Public()
  async getBaleQr(@Res() res: FastifyReply, @Query('start') start?: string): Promise<void> {
    const now = Date.now();
    const cacheKey = start === 'signup' ? 'signup' : 'default';

    const cached = qrCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      res
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'private, max-age=300')
        .send(cached.buffer);
      return;
    }

    const setting = await this.prismaService.websiteSetting.findFirst({
      where: { key: 'default' },
    });
    const baleBotUrl = setting?.baleBotUrl?.trim();
    if (!baleBotUrl) {
      throw new NotFoundException('Bale bot URL is not configured.');
    }

    const qrUrl =
      start === 'signup'
        ? `${baleBotUrl}${baleBotUrl.includes('?') ? '&' : '?'}start=signup`
        : baleBotUrl;
    const buffer = await QRCode.toBuffer(qrUrl, { type: 'png', width: 400, margin: 2 });

    qrCache.set(cacheKey, { buffer, expiresAt: now + QR_CACHE_TTL_MS });

    res
      .header('Content-Type', 'image/png')
      .header('Cache-Control', 'private, max-age=300')
      .send(buffer);
  }

  @Post('verify-otp')
  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Verify the received OTP and obtain JWT tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT tokens using a valid refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid or revoked' })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<AuthResponseDto> {
    const userId = (request.user as { sub: string })?.sub;
    return this.authService.refreshTokens(userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(@Req() request: Request): Promise<SuccessResponseDto> {
    const userId = (request.user as { sub: string })?.sub;
    await this.usersService.updateRefreshToken(userId, null);
    return { success: true };
  }
}
