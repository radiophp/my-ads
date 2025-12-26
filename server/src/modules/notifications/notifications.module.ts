import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { QueueModule } from '@app/platform/queue/queue.module';
import { WebsocketModule } from '@app/platform/websocket/websocket.module';
import { MetricsModule } from '@app/platform/metrics/metrics.module';
import { DivarPostsModule } from '@app/modules/divar-posts/divar-posts.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { TelegramNotificationQueueProcessor } from './telegram-notification-queue.processor';
import { NotificationMatcherService } from './notification-matcher.service';
import { NotificationMaintenanceService } from './notification-maintenance.service';
import { NotificationQueueMonitorService } from './notification-queue-monitor.service';
import { PushNotificationService } from './push-notification.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    WebsocketModule,
    MetricsModule,
    DivarPostsModule,
    TelegramModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueueProcessor,
    TelegramNotificationQueueProcessor,
    NotificationMatcherService,
    NotificationMaintenanceService,
    NotificationQueueMonitorService,
    PushNotificationService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
