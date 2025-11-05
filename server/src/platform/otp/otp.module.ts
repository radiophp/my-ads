import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import otpConfig from '@app/platform/config/otp.config';
import { OtpService } from './otp.service';

@Module({
  imports: [ConfigModule.forFeature(otpConfig)],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
