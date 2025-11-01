import { Module } from '@nestjs/common';
import { AdminPanelController } from './admin-panel.controller';
import { UsersModule } from '@app/modules/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AdminPanelController],
})
export class AdminPanelModule {}
