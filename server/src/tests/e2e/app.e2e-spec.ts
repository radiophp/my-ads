import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance } from 'fastify';
import { AppModule } from '@app/app.module';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService, type RedisClient } from '@app/platform/cache/redis.service';
import { StorageService, type StoredObjectMetadata } from '@app/platform/storage/storage.service';
import { QueueService } from '@app/platform/queue/queue.service';
import { MetricsService } from '@app/platform/metrics/metrics.service';
import healthConfig from '@app/platform/config/health.config';

type InMemoryEntry = {
  value: string;
  expiresAt?: number;
};

class InMemoryRedisClient
  implements
    Pick<
      RedisClient,
      'get' | 'mGet' | 'set' | 'pSetEx' | 'del' | 'multi' | 'pTTL' | 'scan' | 'quit' | 'ping'
    >
{
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

  async scan(
    cursor: number,
    options: { MATCH: string; COUNT: number },
  ): Promise<{ cursor: number; keys: string[] }> {
    if (cursor !== 0) {
      return { cursor: 0, keys: [] };
    }

    const prefix = options.MATCH.endsWith('*') ? options.MATCH.slice(0, -1) : options.MATCH;
    const keys = Array.from(this.store.keys()).filter((key) => {
      this.isExpired(key);
      return prefix === '*' || key.startsWith(prefix);
    });

    return { cursor: 0, keys };
  }

  async quit(): Promise<'OK'> {
    return 'OK';
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

  async pTTL(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return -2;
    }
    if (typeof entry.expiresAt !== 'number') {
      return -1;
    }
    return Math.max(entry.expiresAt - Date.now(), 0);
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async createScopedClient(): Promise<RedisClient> {
    return new InMemoryRedisClient(this.store) as unknown as RedisClient;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

const prismaServiceMock = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

class StorageServiceMock
  implements Pick<StorageService, 'uploadObject' | 'getPublicUrl' | 'healthCheck'>
{
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

  async healthCheck(): Promise<void> {
    return;
  }
}

class QueueServiceMock
  implements
    Pick<
      QueueService,
      'publish' | 'registerConsumer' | 'close' | 'healthCheck' | 'getConsumerRetryOptions'
    >
{
  shouldFailHealthCheck = false;

  async publish(): Promise<void> {
    return;
  }

  async registerConsumer(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }

  async healthCheck(): Promise<void> {
    if (this.shouldFailHealthCheck) {
      throw new Error('simulated failure');
    }
    return;
  }

  getConsumerRetryOptions(): { maxAttempts: number; baseDelayMs: number } {
    return { maxAttempts: 3, baseDelayMs: 100 };
  }
}

class MetricsServiceMock
  implements
    Pick<
      MetricsService,
      | 'recordHealthCheck'
      | 'observeHttp'
      | 'incrementUsersCreated'
      | 'incrementNotificationRetries'
      | 'recordQueueMetrics'
    >
{
  recordHealthCheck = jest.fn();
  observeHttp(): void {}
  incrementUsersCreated(): void {}
  incrementNotificationRetries(): void {}
  recordQueueMetrics(): void {}
}

describe('App E2E', () => {
  let app: NestFastifyApplication;
  let fastify: FastifyInstance;
  const queueServiceMock = new QueueServiceMock();
  const metricsServiceMock = new MetricsServiceMock();

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
      .overrideProvider(QueueService)
      .useValue(queueServiceMock)
      .overrideProvider(MetricsService)
      .useValue(metricsServiceMock)
      .overrideProvider(healthConfig.KEY)
      .useValue({ retryAttempts: 1, baseDelayMs: 10, failureCacheMs: 50 })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    queueServiceMock.shouldFailHealthCheck = false;
    metricsServiceMock.recordHealthCheck.mockClear();
  });

  it('/public/health (GET)', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/public/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      status: string;
      dependencies: Record<string, { status: string }>;
      failedComponents: string[];
    };
    expect(body.status).toBe('ok');
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies['redis']?.status).toBe('up');
    expect(body.dependencies['database']?.status).toBe('up');
    expect(body.failedComponents).toEqual([]);
  });

  it('/favicon.ico (GET)', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/favicon.ico',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/x-icon');
    expect(response.payload.length).toBeGreaterThan(0);
  });

  it('records metrics when dependency fails', async () => {
    queueServiceMock.shouldFailHealthCheck = true;
    metricsServiceMock.recordHealthCheck.mockClear();

    const response = await fastify.inject({
      method: 'GET',
      url: '/public/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      status: string;
      dependencies: Record<string, { status: string }>;
      failedComponents: string[];
    };
    expect(body.status).toBe('degraded');
    expect(body.dependencies['rabbitmq']?.status).toBe('down');
    expect(metricsServiceMock.recordHealthCheck).toHaveBeenCalledWith(
      'rabbitmq',
      'down',
      expect.any(Number),
    );
    expect(body.failedComponents).toContain('rabbitmq');

    queueServiceMock.shouldFailHealthCheck = false;
  });
});
