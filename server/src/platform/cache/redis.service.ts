import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  createClient,
  type RedisClientType,
  type RedisDefaultModules,
  type RedisFunctions,
  type RedisModules,
  type RedisScripts,
} from 'redis';
import redisConfig, { type RedisConfig } from '@app/platform/config/redis.config';
import loggerConfig from '@app/platform/config/logger.config';

export type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

type ScopedClient = {
  client: RedisClient;
  scope: string;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClient;
  private readonly scopedClients = new Set<ScopedClient>();
  private readonly keyPrefix?: string;

  constructor(
    @Inject(loggerConfig.KEY) private readonly logConfig: ConfigType<typeof loggerConfig>,
    @Inject(redisConfig.KEY) private readonly options: RedisConfig,
  ) {
    this.keyPrefix = options.keyPrefix;

    this.client = createClient({
      username: options.username,
      password: options.password,
      database: options.db,
      socket: {
        host: options.host,
        port: options.port,
        tls: options.tls,
        reconnectStrategy: (retries) => Math.min(1000 * retries, 5000),
      },
    });

    this.registerEventLogging(this.client, 'primary');
  }

  async onModuleInit(): Promise<void> {
    await this.connectClient(this.client, 'primary');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.scopedClients, async ({ client, scope }) => {
        try {
          await client.quit();
        } catch (error) {
          this.log(`Scoped client shutdown failed (${scope})`, error instanceof Error ? error : undefined, 'error');
        }
      }),
    );
    this.scopedClients.clear();

    await this.client.quit();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(this.applyPrefix(key));
  }

  async expire(key: string, seconds: number): Promise<number> {
    const updated = await this.client.expire(this.applyPrefix(key), seconds);
    return updated ? 1 : 0;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.applyPrefix(key));
  }

  async set(key: string, value: string): Promise<string | null> {
    return this.client.set(this.applyPrefix(key), value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.applyPrefix(key));
  }

  async createScopedClient(scope: string): Promise<RedisClient> {
    const duplicate = this.client.duplicate();
    this.registerEventLogging(duplicate, scope);

    const scopedClient: ScopedClient = { client: duplicate, scope };
    this.scopedClients.add(scopedClient);

    duplicate.on('end', () => {
      this.scopedClients.delete(scopedClient);
    });

    await this.connectClient(duplicate, scope);
    return duplicate;
  }

  private applyPrefix(key: string): string {
    return typeof this.keyPrefix === 'string' && this.keyPrefix.length > 0
      ? `${this.keyPrefix}${key}`
      : key;
  }

  private formatTarget(): string {
    const host = this.options.host ?? 'unknown';
    const port = this.options.port ?? 0;
    const db = this.options.db ?? 0;
    return `${host}:${port} (db: ${db})`;
  }

  private async connectClient(client: RedisClient, scope: string): Promise<void> {
    try {
      await client.connect();
    } catch (error) {
      this.log(`Redis connection attempt failed for scope ${scope} -> ${this.formatTarget()}`, error instanceof Error ? error : undefined, 'error');
      throw error;
    }
  }

  private registerEventLogging(client: RedisClient, scope: string): void {
    const destination = this.formatTarget();

    client.on('connect', () => {
      this.log(`Redis connect (${scope}) -> ${destination}`);
    });

    client.on('ready', () => {
      this.log(`Redis ready (${scope}) -> ${destination}`);
    });

    client.on('end', () => {
      this.log(`Redis connection closed (${scope}) -> ${destination}`);
    });

    client.on('reconnecting', () => {
      this.log(`Redis reconnecting (${scope}) -> ${destination}`);
    });

    client.on('error', (error) => {
      this.log(`Redis error (${scope}) -> ${destination}`, error instanceof Error ? error : undefined, 'error');
    });
  }

  private log(message: string, error?: Error, level: 'log' | 'error' = 'log'): void {
    if (!this.logConfig.enabled) {
      return;
    }

    if (level === 'error' && error) {
      console.error(`[RedisService] ${message}`, error);
      this.logger.error(message, error.stack ?? error.message);
      return;
    }

    if (level === 'error') {
      console.error(`[RedisService] ${message}`);
      this.logger.error(message);
      return;
    }

    console.info(`[RedisService] ${message}`);
    this.logger.log(message);
  }
}
