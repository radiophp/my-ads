import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Logger } from '@nestjs/common';
import { QueueService } from '@app/platform/queue/queue.service';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe('QueueService requeue handling', () => {
  const loggerMocks = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  const logger = loggerMocks as unknown as Logger;

  const createService = (maxRetries: number) => {
    const service = Object.create(QueueService.prototype) as any;
    service.maxConsumerRetries = maxRetries;
    service.retryHeaderKey = 'x-retry-count';
    service.consumerRetryBaseDelayMs = 500;
    service.deadLetterQueueSuffix = 'dead';
    service.logger = logger;
    return service as QueueService;
  };

  const createMessage = (attempts: number): ConsumeMessage => ({
    content: Buffer.from('payload'),
    fields: {} as any,
    properties: {
      headers: attempts ? { 'x-retry-count': attempts } : {},
      contentType: 'application/json',
    } as Mutable<ConsumeMessage['properties']>,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requeues message with incremented retry count', async () => {
    const service = createService(3);
    const message = createMessage(1);

    const channel: Partial<ConfirmChannel> = {
      sendToQueue: jest.fn().mockReturnValue(true),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    await (service as any).handleProcessingFailure(channel, 'queue.test', message);

    expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
    const [, , options] = (channel.sendToQueue as jest.Mock).mock.calls[0];
    expect(options.headers['x-retry-count']).toBe(2);
    expect(options.persistent).toBe(true);
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
    expect(loggerMocks.warn).toHaveBeenCalledWith('Requeued message from queue.test; attempt 2/3.');
  });

  it('nacks message without requeue when retries exhausted', async () => {
    const service = createService(2);
    const message = createMessage(2);

    const channel: Partial<ConfirmChannel> = {
      sendToQueue: jest.fn().mockReturnValue(true),
      ack: jest.fn(),
      nack: jest.fn(),
      assertQueue: jest.fn(),
    };

    await (service as any).handleProcessingFailure(channel, 'queue.test', message);

    expect(channel.assertQueue).toHaveBeenCalledWith('queue.test.dead', { durable: true });
    expect(channel.sendToQueue).toHaveBeenCalledWith(
      'queue.test.dead',
      message.content,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-original-queue': 'queue.test', 'x-retry-count': 2 }),
        persistent: true,
      }),
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(loggerMocks.error).toHaveBeenCalledWith(
      'Moved message from queue.test to queue.test.dead after 2 attempts.',
    );
  });

  it('nacks when dead-letter publish fails', async () => {
    const service = createService(1);
    const message = createMessage(1);

    const channel: Partial<ConfirmChannel> = {
      sendToQueue: jest.fn().mockReturnValue(false),
      ack: jest.fn(),
      nack: jest.fn(),
      assertQueue: jest.fn(),
    };

    await (service as any).handleProcessingFailure(channel, 'queue.test', message);

    expect(channel.assertQueue).toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
});
