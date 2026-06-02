import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { MetricsModule } from '@app/platform/metrics/metrics.module';

@Module({
  imports: [PrismaModule, MetricsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
