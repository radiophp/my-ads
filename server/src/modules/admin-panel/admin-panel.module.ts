import { Module } from '@nestjs/common';
import { AdminPanelController } from './admin-panel.controller';
import { UsersModule } from '@app/modules/users/users.module';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminPanelService } from './admin-panel.service';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AdminPanelController],
  providers: [AdminPanelService],
})
export class AdminPanelModule {}
