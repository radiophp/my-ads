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
    @InjectMetric('health_dependency_status')
    private readonly healthStatusGauge: Gauge,
    @InjectMetric('health_dependency_latency_seconds')
    private readonly healthLatencyHistogram: Histogram,
  ) {}

  observeHttp(duration: number, method: string, path: string, statusCode: number): void {
    this.httpDurationHistogram
      .labels({ method, status_code: statusCode.toString(), path })
      .observe(duration);
  }

  incrementUsersCreated(): void {
    this.usersCreatedCounter.inc();
  }

  recordHealthCheck(component: string, status: 'up' | 'down', latencyMs: number): void {
    const value = status === 'up' ? 1 : 0;
    this.healthStatusGauge.labels({ component }).set(value);
    this.healthLatencyHistogram.labels({ component }).observe(latencyMs / 1000);
  }
}
