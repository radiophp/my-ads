import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [QueueModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
