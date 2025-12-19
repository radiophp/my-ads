import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { PaginatedNotificationsDto } from './dto/notification.dto';
import { CreateTestNotificationDto } from './dto/create-test-notification.dto';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { PushNotificationService } from './push-notification.service';
import { TelegramBotService } from '../telegram/telegram.service';
import { NotificationTelegramStatus } from '@prisma/client';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueue: NotificationQueueProcessor,
    private readonly pushNotificationService: PushNotificationService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notification history for the current user.' })
  @ApiOkResponse({ type: PaginatedNotificationsDto })
  async listNotifications(
    @Req() request: { user?: { sub?: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedNotificationsDto> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.notificationsService.listUserNotifications(userId, {
      cursor: cursor ?? undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Post('admin/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send a manual test notification to a specific user (admin only).' })
  @ApiCreatedResponse({
    description: 'Notification created and enqueued for delivery.',
    schema: {
      properties: {
        notificationId: { type: 'string', format: 'uuid' },
        status: { type: 'string' },
      },
    },
  })
  async sendTestNotification(
    @Body() dto: CreateTestNotificationDto,
  ): Promise<{ notificationId: string; status: string; telegramSent?: boolean }> {
    const sendTelegram = dto.sendTelegram === true || (dto.sendTelegram as any) === 'true';

    const notification = await this.notificationsService.createTestNotification({
      ...dto,
      telegram: sendTelegram,
    });
    await this.notificationQueue.enqueue(notification.id);

    let telegramSent: boolean | undefined;
    if (dto.sendTelegram) {
      const result = await this.telegramBotService.sendPostToUser({
        userId: dto.userId,
        postId: dto.postId,
        retryMissingPhone: false, // send immediately in test mode
        customMessage: dto.message ?? undefined,
      });
      telegramSent = result.status === 'sent';
      const statusForRecord =
        result.status === 'sent'
          ? NotificationTelegramStatus.SENT
          : result.status === 'not_connected'
            ? NotificationTelegramStatus.HAS_NOT_CONNECTED
            : NotificationTelegramStatus.FAILED;
      await this.notificationsService.updateTelegramStatus(notification.id, statusForRecord);
      if (result.error) {
        await this.notificationsService.updateTelegramError(notification.id, result.error);
        Logger.warn(`Telegram send error: ${result.error}`);
      } else {
        await this.notificationsService.updateTelegramError(notification.id, '');
      }
    } else {
      await this.notificationsService.updateTelegramStatus(notification.id, null);
      await this.notificationsService.updateTelegramError(notification.id, '');
    }

    return { notificationId: notification.id, status: notification.status, telegramSent };
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Register a web push subscription (requires auth).' })
  async subscribePush(
    @Req() request: { user?: { sub?: string } },
    @Body() dto: CreatePushSubscriptionDto,
  ): Promise<{ ok: true }> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    await this.pushNotificationService.registerSubscription(userId, {
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
    });
    return { ok: true };
  }
}
