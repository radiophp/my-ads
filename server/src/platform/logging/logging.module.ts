import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';
import type { ObservabilityConfig } from '@app/platform/config/observability.config';

const LOG_LEVELS: ReadonlyArray<string> = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ObservabilityConfig>('observability', { infer: true });
        const logging = config?.logging ?? { level: 'info', pretty: false };

        const level = LOG_LEVELS.includes(logging.level) ? logging.level : 'info';

        return {
          pinoHttp: {
            level,
            autoLogging: true,
            messageKey: 'message',
            transport: logging.pretty
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
            customProps: () => {
              const span = trace.getSpan(context.active());
              if (!span) {
                return {};
              }

              const spanContext = span.spanContext();
              return {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              };
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
