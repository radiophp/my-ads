import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '@app/app.module';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService, type RedisClient } from '@app/platform/cache/redis.service';
import { StorageService, type StoredObjectMetadata } from '@app/platform/storage/storage.service';

type InMemoryEntry = {
  value: string;
  expiresAt?: number;
};

class InMemoryRedisClient implements Pick<RedisClient, 'get' | 'mGet' | 'set' | 'pSetEx' | 'del' | 'multi' | 'pTTL' | 'scan' | 'quit' | 'ping'> {
  constructor(private readonly store: Map<string, InMemoryEntry>) {}

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }
    if (typeof entry.expiresAt === 'number' && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) {
      return null;
    }
    return this.store.get(key)?.value ?? null;
  }

  async mGet(keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value });
    return 'OK';
  }

  async pSetEx(key: string, ttlMs: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  }

  multi(): ReturnType<RedisClient['multi']> {
    const commands: Array<() => Promise<void>> = [];

    const chain: Partial<ReturnType<RedisClient['multi']>> = {};

    chain.set = ((key: string, value: string) => {
      commands.push(async () => {
        await this.set(key, value);
      });
      return chain as ReturnType<RedisClient['multi']>;
    }) as ReturnType<RedisClient['multi']>['set'];

    chain.pSetEx = ((key: string, ttl: number, value: string) => {
      commands.push(async () => {
        await this.pSetEx(key, ttl, value);
      });
      return chain as ReturnType<RedisClient['multi']>;
    }) as ReturnType<RedisClient['multi']>['pSetEx'];

    chain.del = ((...keys: string[]) => {
      commands.push(async () => {
        await this.del(...keys);
      });
      return chain as ReturnType<RedisClient['multi']>;
    }) as ReturnType<RedisClient['multi']>['del'];

    chain.exec = (async () => {
      await Promise.all(commands.map(async (command) => command()));
      return [];
    }) as ReturnType<RedisClient['multi']>['exec'];

    return chain as ReturnType<RedisClient['multi']>;
  }

  async pTTL(key: string): Promise<number> {
    if (this.isExpired(key)) {
      return -2;
    }
    const entry = this.store.get(key);
    if (!entry || typeof entry.expiresAt !== 'number') {
      return -1;
    }
    return Math.max(entry.expiresAt - Date.now(), 0);
  }

  async scan(cursor: number, options: { MATCH: string; COUNT: number }): Promise<{ cursor: string; keys: string[] }> {
    if (cursor !== 0) {
      return { cursor: '0', keys: [] };
    }

    const prefix = options.MATCH.endsWith('*') ? options.MATCH.slice(0, -1) : options.MATCH;
    const keys = Array.from(this.store.keys()).filter((key) => {
      this.isExpired(key);
      return prefix === '*' || key.startsWith(prefix);
    });

    return { cursor: '0', keys };
  }

  async quit(): Promise<void> {
    return;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
}

class InMemoryRedisService {
  private readonly store = new Map<string, InMemoryEntry>();

  async incr(key: string): Promise<number> {
    const value = Number(this.store.get(key)?.value ?? '0') + 1;
    this.store.set(key, { value: value.toString() });
    return value;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }
    this.store.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 });
    return 1;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async createScopedClient(): Promise<RedisClient> {
    return new InMemoryRedisClient(this.store) as RedisClient;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

const prismaServiceMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

class StorageServiceMock implements Pick<StorageService, 'uploadObject' | 'getPublicUrl'> {
  async uploadObject(): Promise<StoredObjectMetadata> {
    return {
      bucket: 'upload',
      key: 'public/mock-object',
      url: 'http://localhost:6204/upload/mock-object',
    } satisfies StoredObjectMetadata;
  }

  getPublicUrl(key: string): string {
    return `http://localhost:6204/upload/${encodeURIComponent(key)}`;
  }
}

describe('App E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaServiceMock)
      .overrideProvider(RedisService)
      .useValue(new InMemoryRedisService())
      .overrideProvider(StorageService)
      .useValue(new StorageServiceMock())
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/public/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/public/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
