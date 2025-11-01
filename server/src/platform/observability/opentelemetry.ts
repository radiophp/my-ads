import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { PrismaInstrumentation } from '@prisma/instrumentation';

type OtelLogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'all';

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

const parseHeaders = (headers: string | undefined): Record<string, string> => {
  if (!headers) {
    return {};
  }

  return headers
    .split(',')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .reduce<Record<string, string>>((acc, pair) => {
      const [key, ...rest] = pair.split('=');
      if (!key || rest.length === 0) {
        return acc;
      }

      const value = rest.join('=').trim();
      if (value.length === 0) {
        return acc;
      }

      acc[key.trim()] = value;
      return acc;
    }, {});
};

const mapDiagLogLevel = (value: OtelLogLevel | undefined): DiagLogLevel => {
  switch (value) {
    case 'all':
      return DiagLogLevel.ALL;
    case 'debug':
      return DiagLogLevel.DEBUG;
    case 'verbose':
      return DiagLogLevel.VERBOSE;
    case 'info':
      return DiagLogLevel.INFO;
    case 'warn':
      return DiagLogLevel.WARN;
    case 'error':
      return DiagLogLevel.ERROR;
    case 'none':
    default:
      return DiagLogLevel.NONE;
  }
};

let sdk: NodeSDK | undefined;
let initialized = false;

const createSdk = (): NodeSDK => {
  const env = process.env ?? {};
  const enabled = parseBoolean(env['OTEL_ENABLED'], false);
  if (!enabled) {
    throw new Error('OTEL_DISABLED');
  }

  const serviceName = env['OTEL_SERVICE_NAME'] ?? 'my-ads-api';
  const endpoint = env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  const headers = parseHeaders(env['OTEL_EXPORTER_OTLP_HEADERS']);
  const logLevel = mapDiagLogLevel((env['OTEL_LOG_LEVEL'] as OtelLogLevel | undefined) ?? 'error');

  diag.setLogger(new DiagConsoleLogger(), logLevel);

  const traceExporter = endpoint ? new OTLPTraceExporter({ url: endpoint, headers }) : new OTLPTraceExporter();

  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: env['npm_package_version'] ?? '0.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env['NODE_ENV'] ?? 'development',
  });

  const ignoredPaths = ['/metrics', '/health', '/favicon.ico'];

  return new NodeSDK({
    traceExporter,
    resource,
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) => {
          const url = request?.url ?? '';
          return ignoredPaths.some((path) => url.startsWith(path));
        },
      }),
      new FastifyInstrumentation(),
      new RedisInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });
};

export const initializeOpenTelemetry = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  try {
    sdk = createSdk();
  } catch (error) {
    if (error instanceof Error && error.message === 'OTEL_DISABLED') {
      initialized = true;
      return;
    }

    throw error;
  }

  await sdk.start();
  initialized = true;

  const shutdown = async () => {
    if (!sdk) {
      return;
    }

    try {
      await sdk.shutdown();
    } catch (error) {
      diag.error('Failed to gracefully shutdown OpenTelemetry SDK', error as Error);
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};
