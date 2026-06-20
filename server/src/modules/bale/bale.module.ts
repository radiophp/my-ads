import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaleBotService } from './bale.service';
import { BaleLinkGateway } from './bale-link.gateway';
import { BaleController } from './bale.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BaleController],
  providers: [BaleBotService, BaleLinkGateway],
  exports: [BaleBotService, BaleLinkGateway],
})
export class BaleModule {}
