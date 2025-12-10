import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
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

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueue: NotificationQueueProcessor,
    private readonly pushNotificationService: PushNotificationService,
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
  ): Promise<{ notificationId: string; status: string }> {
    const notification = await this.notificationsService.createTestNotification(dto);
    await this.notificationQueue.enqueue(notification.id);
    return { notificationId: notification.id, status: notification.status };
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
