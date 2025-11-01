import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_server_request_duration_seconds')
    private readonly httpDurationHistogram: Histogram,
    @InjectMetric('users_created_total')
    private readonly usersCreatedCounter: Counter,
  ) {}

  observeHttp(duration: number, method: string, path: string, statusCode: number): void {
    this.httpDurationHistogram
      .labels({ method, status_code: statusCode.toString(), path })
      .observe(duration);
  }

  incrementUsersCreated(): void {
    this.usersCreatedCounter.inc();
  }
}
