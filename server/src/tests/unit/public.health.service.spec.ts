import { PublicHealthService } from '@app/modules/public/health.service';

describe('PublicHealthService', () => {
  const prisma = { $queryRaw: jest.fn() };
  const redis = { ping: jest.fn() };
  const queue = { healthCheck: jest.fn() };
  const storage = { healthCheck: jest.fn() };
  const metrics = { recordHealthCheck: jest.fn() };
  const config = { retryAttempts: 3, baseDelayMs: 100, failureCacheMs: 1000 } as const;

  const createService = (): PublicHealthService => {
    const service = new PublicHealthService(
      prisma as any,
      redis as any,
      queue as any,
      storage as any,
      metrics as any,
      config,
    );
    jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
    return service;
  };

  beforeEach(() => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');
    queue.healthCheck.mockResolvedValue(undefined);
    storage.healthCheck.mockResolvedValue(undefined);
    metrics.recordHealthCheck.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports all dependencies as up when tasks succeed', async () => {
    const service = createService();

    const report = await service.check();

    expect(report.database.status).toBe('up');
    expect(report.redis.status).toBe('up');
    expect(report.rabbitmq.status).toBe('up');
    expect(report.storage.status).toBe('up');
    expect(metrics.recordHealthCheck).toHaveBeenCalledWith('database', 'up', expect.any(Number));
  });

  it('retries transient failures and recovers', async () => {
    const service = createService();
    redis.ping.mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce('PONG');

    const report = await service.check();

    expect(redis.ping).toHaveBeenCalledTimes(2);
    expect(report.redis.status).toBe('up');
    expect(metrics.recordHealthCheck).toHaveBeenCalledWith('redis', 'up', expect.any(Number));
  });

  it('marks dependency as down after repeated failures', async () => {
    const service = createService();
    queue.healthCheck.mockRejectedValue(new Error('broker down'));

    const report = await service.check();

    expect(queue.healthCheck).toHaveBeenCalled();
    expect(report.rabbitmq.status).toBe('down');
    expect(report.rabbitmq.error).toContain('broker down');
    expect(metrics.recordHealthCheck).toHaveBeenCalledWith('rabbitmq', 'down', expect.any(Number));
  });

  it('returns cached failure without rechecking until cache expires', async () => {
    const service = createService();
    queue.healthCheck.mockRejectedValue(new Error('broker down'));

    await service.check();

    queue.healthCheck.mockReset();
    queue.healthCheck.mockResolvedValue(undefined);
    metrics.recordHealthCheck.mockClear();

    const report = await service.check();

    expect(queue.healthCheck).not.toHaveBeenCalled();
    expect(report.rabbitmq.status).toBe('down');
    const rabbitmqCalls = metrics.recordHealthCheck.mock.calls.filter(
      ([component]) => component === 'rabbitmq',
    );
    expect(rabbitmqCalls).toHaveLength(0);
  });

  it('retries after cache window expires', async () => {
    jest.useFakeTimers();
    const service = createService();
    queue.healthCheck.mockRejectedValue(new Error('broker down'));

    await service.check();

    queue.healthCheck.mockReset();
    queue.healthCheck.mockResolvedValue(undefined);
    metrics.recordHealthCheck.mockClear();

    jest.advanceTimersByTime(config.failureCacheMs + 1);

    const report = await service.check();

    expect(queue.healthCheck).toHaveBeenCalledTimes(1);
    expect(report.rabbitmq.status).toBe('up');
    expect(metrics.recordHealthCheck).toHaveBeenCalledWith('rabbitmq', 'up', expect.any(Number));
    jest.useRealTimers();
  });
});
