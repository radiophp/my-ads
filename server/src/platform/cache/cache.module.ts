import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisClient } from './redis.service';
import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import type { RedisConfig } from '@app/platform/config/redis.config';
import type { JsonValue } from '@app/common/types/json.type';
import Keyv from 'keyv';
import { KeyvAdapter, type CacheManagerStore } from 'cache-manager';

class RedisCacheStore implements CacheManagerStore {
  readonly name = 'redis';

  constructor(
    private readonly redis: RedisClient,
    private readonly keyPrefix?: string,
  ) {}

  private buildKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }

  private stripPrefix(key: string): string {
    if (!this.keyPrefix || !key.startsWith(this.keyPrefix)) {
      return key;
    }
    return key.slice(this.keyPrefix.length);
  }

  private serialize<T>(value: T): string | null {
    if (value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    return JSON.stringify(value);
  }

  private deserialize<T>(stored: string): T {
    try {
      return JSON.parse(stored) as T;
    } catch {
      return stored as T;
    }
  }

  private normalizeTtl(ttl?: number): number | undefined {
    if (typeof ttl !== 'number' || Number.isNaN(ttl) || ttl <= 0) {
      return undefined;
    }
    return Math.ceil(ttl);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const stored = await this.redis.get(this.buildKey(key));
    if (stored === null) {
      return undefined;
    }
    return this.deserialize<T>(stored);
  }

  async mget<T>(...keys: string[]): Promise<Array<T | undefined>> {
    if (keys.length === 0) {
      return [];
    }
    const values = await this.redis.mGet(keys.map((key) => this.buildKey(key)));
    return values.map((value) => (value === null ? undefined : this.deserialize<T>(value)));
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<T | void> {
    const serialized = this.serialize(value);
    const redisKey = this.buildKey(key);

    if (serialized === null) {
      await this.redis.del(redisKey);
      return value;
    }

    const ttlMs = this.normalizeTtl(ttl);
    if (typeof ttlMs === 'number') {
      await this.redis.pSetEx(redisKey, ttlMs, serialized);
      return value;
    }

    await this.redis.set(redisKey, serialized);
    return value;
  }

  async mset(data: Record<string, JsonValue | undefined>, ttl?: number): Promise<void> {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return;
    }

    const ttlMs = this.normalizeTtl(ttl);
    const multi = this.redis.multi();

    for (const [key, value] of entries) {
      const serialized = this.serialize(value);
      const redisKey = this.buildKey(key);
      if (serialized === null) {
        multi.del(redisKey);
        continue;
      }

      if (typeof ttlMs === 'number') {
        multi.pSetEx(redisKey, ttlMs, serialized);
      } else {
        multi.set(redisKey, serialized);
      }
    }

    await multi.exec();
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  async mdel(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    const targetKeys = keys.map((key) => this.buildKey(key));
    await Promise.all(targetKeys.map((key) => this.redis.del(key)));
  }

  async ttl(key: string): Promise<number> {
    const ttlMs = await this.redis.pTTL(this.buildKey(key));
    return ttlMs;
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;
    const matchPattern = this.keyPrefix ? `${this.keyPrefix}*` : '*';

    do {
      const result = await this.redis.scan(cursor, { MATCH: matchPattern, COUNT: 100 });
      cursor = Number(result.cursor);
      keys.push(...result.keys.map((key) => this.stripPrefix(key)));
    } while (cursor !== 0);

    return keys;
  }

  async reset(): Promise<void> {
    const keys = await this.keys();
    if (keys.length === 0) {
      return;
    }
    const targetKeys = keys.map((key) => this.buildKey(key));
    await Promise.all(targetKeys.map((key) => this.redis.del(key)));
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  isCacheable(value: unknown): boolean {
    return value !== undefined;
  }
}

@Global()
@Module({
  imports: [
    RedisModule,
    NestCacheModule.registerAsync({
      inject: [ConfigService, RedisService],
      isGlobal: true,
      useFactory: async (configService: ConfigService, redisService: RedisService) => {
        const redisConfig = configService.get<RedisConfig>('redis', { infer: true });
        const client = await redisService.createScopedClient('cache');

        const store = new RedisCacheStore(client, redisConfig?.keyPrefix);
        const keyv = new Keyv({
          store: new KeyvAdapter(store),
        });

        return {
          stores: [keyv],
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
