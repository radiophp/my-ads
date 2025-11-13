import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { RingBindersController } from './ring-binders.controller';
import { RingBindersService } from './ring-binders.service';

@Module({
  imports: [PrismaModule],
  controllers: [RingBindersController],
  providers: [RingBindersService],
  exports: [RingBindersService],
})
export class RingBindersModule {}
