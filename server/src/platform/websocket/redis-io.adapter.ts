import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import { RedisService } from '../cache/redis.service';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const [pubClient, subClient] = await Promise.all([
      this.redisService.createScopedClient('socket.io:pub'),
      this.redisService.createScopedClient('socket.io:sub'),
    ]);

    await Promise.all([pubClient.ping(), subClient.ping()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Connected Socket.IO to Redis adapter');
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const corsOrigin = this.configService.get('security.corsOrigin', { infer: true }) ?? true;
    const server: Server = super.createIOServer(port, {
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
      ...options,
    });

    if (!this.adapterConstructor) {
      this.logger.warn('Redis adapter not initialized, falling back to default in-memory adapter.');
    } else {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
