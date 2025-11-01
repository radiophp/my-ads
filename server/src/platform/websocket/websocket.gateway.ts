import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NotificationProcessor } from '@app/platform/queue/processors/notification.processor';
import type { JsonValue } from '@app/common/types/json.type';

@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(private readonly notificationProcessor: NotificationProcessor) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  @SubscribeMessage('notify')
  async handleNotification(
    @MessageBody() payload: { userId: string; message: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.notificationProcessor.enqueue(payload);
    client.emit('notification:queued', payload);
  }

  broadcast(event: string, data: JsonValue): void {
    this.server.emit(event, data);
  }
}
