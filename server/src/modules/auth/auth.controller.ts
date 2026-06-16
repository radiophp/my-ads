import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as QRCode from 'qrcode';
import { AuthService, type JwtPayload } from './auth.service';
import { DeviceService } from './device.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ConfirmDeviceDto } from './dto/confirm-device.dto';
import { CancelDeviceDto } from './dto/cancel-device.dto';
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
    private readonly deviceService: DeviceService,
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
    return this.authService.requestOtp(
      dto.phone,
      dto.deviceInfo,
      dto.turnstileToken,
    ) as unknown as SuccessResponseDto;
  }

  @Post('bale-login')
  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Login via linked Bale account (no OTP)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Bale account not linked' })
  async baleLogin(@Body() dto: BaleLoginDto): Promise<unknown> {
    return this.authService.baleLogin(
      dto.phone,
      dto.deviceId
        ? {
            deviceId: dto.deviceId,
            deviceName: dto.deviceName,
            deviceType: dto.deviceType,
            userAgent: dto.userAgent,
          }
        : undefined,
    );
  }

  @Get('bale-qr')
  @Public()
  async getBaleQr(
    @Res() res: FastifyReply,
    @Query('start') start?: string,
    @Query('token') token?: string,
  ): Promise<void> {
    const now = Date.now();
    const cacheKey = token ? `token:${token}` : start === 'signup' ? 'signup' : 'default';

    if (!token) {
      const cached = qrCache.get(cacheKey);
      if (cached && now < cached.expiresAt) {
        res
          .header('Content-Type', 'image/png')
          .header('Cache-Control', 'private, max-age=300')
          .send(cached.buffer);
        return;
      }
    }

    const setting = await this.prismaService.websiteSetting.findFirst({
      where: { key: 'default' },
    });
    const baleBotUrl = setting?.baleBotUrl?.trim();
    if (!baleBotUrl) {
      throw new NotFoundException('Bale bot URL is not configured.');
    }

    const startParam = token ? `link_${token}` : start === 'signup' ? 'signup' : undefined;
    const qrUrl = startParam
      ? `${baleBotUrl}${baleBotUrl.includes('?') ? '&' : '?'}start=${startParam}`
      : baleBotUrl;
    const buffer = await QRCode.toBuffer(qrUrl, { type: 'png', width: 400, margin: 2 });

    if (!token) {
      qrCache.set(cacheKey, { buffer, expiresAt: now + QR_CACHE_TTL_MS });
    }

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
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() request: FastifyRequest): Promise<unknown> {
    const ipAddress = request.ip;
    return this.authService.verifyOtp(dto, ipAddress);
  }

  @Post('confirm-device')
  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Confirm login on a new device' })
  async confirmDevice(@Body() dto: ConfirmDeviceDto): Promise<unknown> {
    return this.authService.confirmDevice(dto.pendingSessionToken);
  }

  @Post('cancel-device')
  @Public()
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Cancel login on a new device' })
  async cancelDevice(@Body() dto: CancelDeviceDto): Promise<SuccessResponseDto> {
    await this.authService.cancelDevice(dto.pendingSessionToken);
    return { success: true };
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT tokens using a valid refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid or revoked' })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<unknown> {
    const payload = request.user as JwtPayload;
    return this.authService.refreshTokens(payload.sub, payload.deviceId ?? '');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate all refresh tokens and deactivate all devices' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(@Req() request: Request): Promise<SuccessResponseDto> {
    const userId = (request.user as { sub: string })?.sub;
    await this.authService.logout(userId);
    return { success: true };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all known devices for the current user' })
  async listDevices(@Req() request: Request): Promise<unknown> {
    const userId = (request.user as { sub: string })?.sub;
    return this.deviceService.getUserDevices(userId);
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a specific device' })
  async deleteDevice(
    @Req() request: Request,
    @Param('deviceId') deviceId: string,
  ): Promise<SuccessResponseDto> {
    const userId = (request.user as { sub: string })?.sub;
    await this.deviceService.deactivateDevice(userId, deviceId);
    return { success: true };
  }
}
