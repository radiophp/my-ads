import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Redis, { type ChainableCommander, type RedisOptions } from 'ioredis';
import redisConfig, { type RedisConfig } from '@app/platform/config/redis.config';
import loggerConfig from '@app/platform/config/logger.config';

type ScanCommandOptions = {
  MATCH?: string;
  COUNT?: number;
};

export interface RedisMulti {
  set(key: string, value: string): this;
  pSetEx(key: string, ttlMs: number, value: string): this;
  del(key: string): this;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

export interface RedisClient {
  connect(): Promise<void>;
  quit(): Promise<'OK'>;
  disconnect(): void;
  ping(): Promise<string>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string | null>;
  del(key: string): Promise<number>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  pSetEx(key: string, ttlMs: number, value: string): Promise<'OK'>;
  pTTL(key: string): Promise<number>;
  scan(cursor: number, options?: ScanCommandOptions): Promise<{ cursor: number; keys: string[] }>;
  multi(): RedisMulti;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<number>;
  psubscribe(pattern: string): Promise<number>;
  unsubscribe(channel: string): Promise<number>;
  punsubscribe(pattern: string): Promise<number>;
  on(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
}

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
    this.client = createRedisClient(options);
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
          this.log(
            `Scoped client shutdown failed (${scope})`,
            error instanceof Error ? error : undefined,
            'error',
          );
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
    const scopedClient: ScopedClient = { client: createRedisClient(this.options), scope };
    this.registerEventLogging(scopedClient.client, scope);
    this.scopedClients.add(scopedClient);

    scopedClient.client.on('close', () => {
      this.scopedClients.delete(scopedClient);
    });

    try {
      await this.connectClient(scopedClient.client, scope);
    } catch (error) {
      this.scopedClients.delete(scopedClient);
      throw error;
    }
    return scopedClient.client;
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
      const handled = this.handleConnectionError(error, scope);
      if (!handled) {
        throw error;
      }
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

    client.on('close', () => {
      this.log(`Redis connection closed (${scope}) -> ${destination}`);
    });

    client.on('reconnecting', () => {
      this.log(`Redis reconnecting (${scope}) -> ${destination}`);
    });

    client.on('error', (error) => {
      this.log(
        `Redis error (${scope}) -> ${destination}`,
        error instanceof Error ? error : undefined,
        'error',
      );
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

  private handleConnectionError(error: unknown, scope: string): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message ?? '';
    const connectionErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'Connection is closed'];
    const matchesKnownError = connectionErrors.some((token) => message.includes(token));

    if (!matchesKnownError) {
      return false;
    }

    this.log(
      `Redis connection attempt failed for scope ${scope} -> ${this.formatTarget()}`,
      error,
      'error',
    );

    return true;
  }
}

class IORedisMulti implements RedisMulti {
  constructor(private readonly pipeline: ChainableCommander) {}

  set(key: string, value: string): this {
    this.pipeline.set(key, value);
    return this;
  }

  pSetEx(key: string, ttlMs: number, value: string): this {
    this.pipeline.psetex(key, ttlMs, value);
    return this;
  }

  del(key: string): this {
    this.pipeline.del(key);
    return this;
  }

  exec(): Promise<Array<[Error | null, unknown]> | null> {
    return this.pipeline.exec();
  }
}

class IORedisClient implements RedisClient {
  constructor(private readonly client: Redis) {}

  connect(): Promise<void> {
    return this.client.connect();
  }

  quit(): Promise<'OK'> {
    return this.client.quit();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(key: string, value: string): Promise<string | null> {
    return this.client.set(key, value);
  }

  del(key: string): Promise<number> {
    return this.client.del(key);
  }

  mGet(keys: string[]): Promise<Array<string | null>> {
    return this.client.mget(...keys);
  }

  pSetEx(key: string, ttlMs: number, value: string): Promise<'OK'> {
    return this.client.psetex(key, ttlMs, value) as Promise<'OK'>;
  }

  pTTL(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  scan(cursor: number, options: ScanCommandOptions = {}): Promise<{ cursor: number; keys: string[] }> {
    const args: Array<string | number> = [];

    if (options.MATCH) {
      args.push('MATCH', options.MATCH);
    }

    if (typeof options.COUNT === 'number') {
      args.push('COUNT', options.COUNT);
    }

    const promise =
      args.length > 0
        ? (this.client.scan as (...params: any[]) => Promise<[string, string[]]>)(cursor, ...args)
        : this.client.scan(cursor);

    return promise.then(([nextCursor, keys]) => ({
      cursor: Number(nextCursor),
      keys,
    }));
  }

  multi(): RedisMulti {
    return new IORedisMulti(this.client.multi());
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.client.on(event, listener);
    return this;
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    this.client.removeListener(event, listener);
    return this;
  }

  publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message) as Promise<number>;
  }

  subscribe(channel: string): Promise<number> {
    return this.client.subscribe(channel) as Promise<number>;
  }

  psubscribe(pattern: string): Promise<number> {
    return this.client.psubscribe(pattern) as Promise<number>;
  }

  unsubscribe(channel: string): Promise<number> {
    return this.client.unsubscribe(channel) as Promise<number>;
  }

  punsubscribe(pattern: string): Promise<number> {
    return this.client.punsubscribe(pattern) as Promise<number>;
  }
}

function createRedisClient(options: RedisConfig): RedisClient {
  const redisOptions: RedisOptions = {
    host: options.host,
    port: options.port,
    username: options.username,
    password: options.password,
    db: options.db,
    retryStrategy: (times) => Math.min(1000 * times, 5000),
    lazyConnect: true,
  };

  if (options.tls) {
    redisOptions.tls = {};
  }

  return new IORedisClient(new Redis(redisOptions));
}
