import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { QueueModule } from '@app/platform/queue/queue.module';
import { WebsocketModule } from '@app/platform/websocket/websocket.module';
import { DivarPostsModule } from '@app/modules/divar-posts/divar-posts.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NotificationMatcherService } from './notification-matcher.service';
import { NotificationMaintenanceService } from './notification-maintenance.service';

@Module({
  imports: [ConfigModule, PrismaModule, QueueModule, WebsocketModule, DivarPostsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueueProcessor,
    NotificationMatcherService,
    NotificationMaintenanceService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
