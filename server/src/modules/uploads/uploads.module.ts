import { Module } from '@nestjs/common';
import { AuthModule } from '@app/modules/auth/auth.module';
import { StorageModule } from '@app/platform/storage/storage.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
