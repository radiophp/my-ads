import { Module } from '@nestjs/common';
import { UserPanelController } from './user-panel.controller';
import { UsersModule } from '@app/modules/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [UserPanelController],
})
export class UserPanelModule {}
