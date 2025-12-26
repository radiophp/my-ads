import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_server_request_duration_seconds')
    private readonly httpDurationHistogram: Histogram,
    @InjectMetric('users_created_total')
    private readonly usersCreatedCounter: Counter,
    @InjectMetric('notification_retries_total')
    private readonly notificationRetriesCounter: Counter,
    @InjectMetric('health_dependency_status')
    private readonly healthStatusGauge: Gauge,
    @InjectMetric('health_dependency_latency_seconds')
    private readonly healthLatencyHistogram: Histogram,
    @InjectMetric('rabbitmq_queue_messages')
    private readonly rabbitmqQueueMessagesGauge: Gauge,
    @InjectMetric('rabbitmq_queue_consumers')
    private readonly rabbitmqQueueConsumersGauge: Gauge,
  ) {}

  observeHttp(duration: number, method: string, path: string, statusCode: number): void {
    this.httpDurationHistogram
      .labels({ method, status_code: statusCode.toString(), path })
      .observe(duration);
  }

  incrementUsersCreated(): void {
    this.usersCreatedCounter.inc();
  }

  incrementNotificationRetries(): void {
    this.notificationRetriesCounter.inc();
  }

  recordQueueMetrics(params: {
    queue: string;
    messages: number;
    messagesReady: number;
    messagesUnacknowledged: number;
    consumers: number;
  }): void {
    this.rabbitmqQueueMessagesGauge
      .labels({ queue: params.queue, state: 'total' })
      .set(params.messages);
    this.rabbitmqQueueMessagesGauge
      .labels({ queue: params.queue, state: 'ready' })
      .set(params.messagesReady);
    this.rabbitmqQueueMessagesGauge
      .labels({ queue: params.queue, state: 'unacked' })
      .set(params.messagesUnacknowledged);
    this.rabbitmqQueueConsumersGauge.labels({ queue: params.queue }).set(params.consumers);
  }

  recordHealthCheck(component: string, status: 'up' | 'down', latencyMs: number): void {
    const value = status === 'up' ? 1 : 0;
    this.healthStatusGauge.labels({ component }).set(value);
    this.healthLatencyHistogram.labels({ component }).observe(latencyMs / 1000);
  }
}
