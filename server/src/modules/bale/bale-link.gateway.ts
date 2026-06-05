import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService, type RedisClient } from '@app/platform/cache/redis.service';

const BALE_LINK_TOKEN_PREFIX = 'bale-link-token:';
const BALE_LINK_ROOM_PREFIX = 'bale_phone:';
const BALE_LINK_CHANNEL = 'bale:linked';

@WebSocketGateway({ namespace: '/ws/bale-link', cors: { origin: true, credentials: true } })
export class BaleLinkGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BaleLinkGateway.name);

  private subClient: RedisClient | null = null;
  private pubClient: RedisClient | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    try {
      const [sub, pub] = await Promise.all([
        this.redisService.createScopedClient('bale-link:sub'),
        this.redisService.createScopedClient('bale-link:pub'),
      ]);
      sub.on('message', (_channel: string, phone: string) => {
        this.emitToRooms(phone);
      });
      await sub.subscribe(BALE_LINK_CHANNEL);
      this.subClient = sub;
      this.pubClient = pub;
      this.logger.log(`Subscribed to Redis channel ${BALE_LINK_CHANNEL}`);
    } catch (error) {
      this.logger.warn(
        `Failed to subscribe to Redis channel ${BALE_LINK_CHANNEL}: ${(error as Error).message}`,
      );
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing bale link token.');
      }

      const phone = await this.redisService.get(`${BALE_LINK_TOKEN_PREFIX}${token}`);
      if (!phone) {
        throw new UnauthorizedException('Invalid or expired bale link token.');
      }

      client.data.phone = phone;
      const room = this.buildRoom(phone);
      client.join(room);
      this.logger.log(`Bale link client ${client.id} joined room ${room}`);
      client.emit('bale:connected', { success: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unauthorized';
      this.logger.warn(`Rejecting bale link client ${client.id}: ${reason}`);
      client.emit('bale:error', { message: reason });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Bale link client disconnected ${client.id}`);
  }

  async emitLinked(phone: string): Promise<void> {
    if (!this.pubClient) {
      this.logger.warn('emitLinked called before Redis publisher was ready');
      return;
    }
    await this.pubClient.publish(BALE_LINK_CHANNEL, phone).catch((error) => {
      this.logger.warn(`Failed to publish to Redis: ${(error as Error).message}`);
    });
  }

  private emitToRooms(phone: string): void {
    if (!this.server) {
      return;
    }
    const digits = phone.replace(/\D+/g, '');
    const rooms = [phone];
    if (digits) {
      rooms.push(digits);
      rooms.push(`+${digits}`);
    }
    for (const r of new Set(rooms)) {
      this.server.to(this.buildRoom(r)).emit('bale:linked', { phone });
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth ?? {};
    if (typeof auth['token'] === 'string' && auth['token'].length > 0) {
      return auth['token'];
    }
    const query = client.handshake.query['token'];
    if (typeof query === 'string' && query.length > 0) {
      return query;
    }
    return null;
  }

  private buildRoom(phone: string): string {
    return `${BALE_LINK_ROOM_PREFIX}${phone}`;
  }
}
