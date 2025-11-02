import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from '../metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = process.hrtime.bigint();
    const recordMetrics = (explicitStatus?: number) => {
      const reply = context.switchToHttp().getResponse<FastifyReply>();
      const request = context
        .switchToHttp()
        .getRequest<Request & { method: string; url: string }>();
      const durationInSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const path = request?.url?.split('?')[0] ?? 'unknown';
      const method = request?.method ?? 'UNKNOWN';
      const statusCode = explicitStatus ?? reply?.statusCode ?? 500;

      this.metricsService.observeHttp(durationInSeconds, method, path, statusCode);
    };

    return next.handle().pipe(
      tap(() => recordMetrics()),
      catchError((error) => {
        const reply = context.switchToHttp().getResponse<FastifyReply>();
        const status =
          error instanceof HttpException ? error.getStatus() : (reply?.statusCode ?? 500);
        recordMetrics(status);
        return throwError(() => error);
      }),
    );
  }
}
