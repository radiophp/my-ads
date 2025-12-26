import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
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
    makeCounterProvider({
      name: 'notification_retries_total',
      help: 'Total number of notification retry schedules',
    }),
    makeGaugeProvider({
      name: 'health_dependency_status',
      help: 'Health status of dependencies (1 = up, 0 = down)',
      labelNames: ['component'],
    }),
    makeHistogramProvider({
      name: 'health_dependency_latency_seconds',
      help: 'Health check latency in seconds',
      labelNames: ['component'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    }),
    makeGaugeProvider({
      name: 'rabbitmq_queue_messages',
      help: 'RabbitMQ queue message counts',
      labelNames: ['queue', 'state'],
    }),
    makeGaugeProvider({
      name: 'rabbitmq_queue_consumers',
      help: 'RabbitMQ queue consumer count',
      labelNames: ['queue'],
    }),
  ],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
