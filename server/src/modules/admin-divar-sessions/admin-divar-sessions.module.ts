import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { AdminDivarSessionsService } from './admin-divar-sessions.service';
import { AdminDivarSessionsController } from './admin-divar-sessions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDivarSessionsController],
  providers: [AdminDivarSessionsService],
  exports: [AdminDivarSessionsService],
})
export class AdminDivarSessionsModule {}
