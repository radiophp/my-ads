import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './interceptors/http-metrics.interceptor';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    HttpMetricsInterceptor,
    makeHistogramProvider({
      name: 'http_server_request_duration_seconds',
      help: 'HTTP request duration histogram',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    }),
    makeCounterProvider({
      name: 'users_created_total',
      help: 'Total number of users created',
    }),
  ],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
