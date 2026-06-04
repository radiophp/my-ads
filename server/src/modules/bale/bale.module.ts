import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaleBotService } from './bale.service';

@Module({
  imports: [ConfigModule],
  providers: [BaleBotService],
  exports: [BaleBotService],
})
export class BaleModule {}
