import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PaginatedNotificationsDto } from './dto/notification.dto';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
}
