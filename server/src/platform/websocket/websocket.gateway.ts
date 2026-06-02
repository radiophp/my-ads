import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '@app/modules/auth/auth.service';
import type { JsonValue } from '@app/common/types/json.type';

@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly socketStore = new Map<string, Socket>();
  private warnedAboutMissingServer = false;

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.authenticateClient(client);
      this.registerClient(userId, client);
      this.logger.log(`Client ${client.id} connected as user ${userId}`);
      client.emit('notifications:connected', { userId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unauthorized';
      this.logger.warn(`Rejecting websocket client ${client.id}: ${reason}`);
      client.emit('notifications:error', { message: 'unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.unregisterClient(client);
    this.logger.log(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  broadcast(event: string, data: JsonValue): void {
    if (!this.server) {
      this.warnMissingServer();
      return;
    }
    this.server.emit(event, data);
  }

  emitToUser(userId: string, event: string, payload: JsonValue): boolean {
    if (!this.server) {
      this.warnMissingServer();
      return false;
    }
    this.server.to(this.buildUserRoom(userId)).emit(event, payload);
    const socketIds = this.socketsByUser.get(userId);
    return !!socketIds && socketIds.size > 0;
  }

  hasActiveConnection(userId: string): boolean {
    const socketIds = this.socketsByUser.get(userId);
    return !!socketIds && socketIds.size > 0;
  }

  private async authenticateClient(client: Socket): Promise<string> {
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing access token.');
    }
    const payload = await this.authService.verifyAccessToken(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid access token.');
    }
    client.data.userId = payload.sub;
    return payload.sub;
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth ?? {};
    if (typeof auth['token'] === 'string' && auth['token'].length > 0) {
      return auth['token'];
    }
    const header = client.handshake.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    const query = client.handshake.query['token'];
    if (typeof query === 'string' && query.length > 0) {
      return query;
    }
    return null;
  }

  private registerClient(userId: string, client: Socket): void {
    this.socketStore.set(client.id, client);
    const socketIds = this.socketsByUser.get(userId) ?? new Set<string>();
    socketIds.add(client.id);
    this.socketsByUser.set(userId, socketIds);
    client.join(this.buildUserRoom(userId));
  }

  private unregisterClient(client: Socket): void {
    this.socketStore.delete(client.id);
    const userId = client.data.userId;
    if (!userId) {
      return;
    }
    client.leave(this.buildUserRoom(userId));
    const socketIds = this.socketsByUser.get(userId);
    if (!socketIds) {
      return;
    }
    socketIds.delete(client.id);
    if (socketIds.size === 0) {
      this.socketsByUser.delete(userId);
    }
  }

  private buildUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private warnMissingServer(): void {
    if (this.warnedAboutMissingServer) {
      return;
    }
    this.warnedAboutMissingServer = true;
    this.logger.warn('Websocket server is not initialized; skipping websocket delivery.');
  }
}
