import { registerAs } from '@nestjs/config';

export type ObservabilityConfig = {
  logging: {
    level: string;
    pretty: boolean;
  };
  otel: {
    enabled: boolean;
    serviceName: string;
    endpoint?: string;
    headers: Record<string, string>;
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'all';
  };
};

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

export default registerAs<ObservabilityConfig>('observability', () => {
  const env = process.env;
  const nodeEnv = env['NODE_ENV'] ?? 'development';
  const prettyDefault = nodeEnv !== 'production';

  return {
    logging: {
      level: env['LOG_LEVEL'] ?? 'info',
      pretty: parseBoolean(env['LOG_PRETTY'], prettyDefault),
    },
    otel: {
      enabled: parseBoolean(env['OTEL_ENABLED'], false),
      serviceName: env['OTEL_SERVICE_NAME'] ?? 'my-ads-api',
      endpoint: env['OTEL_EXPORTER_OTLP_ENDPOINT'],
      headers: parseHeaders(env['OTEL_EXPORTER_OTLP_HEADERS']),
      logLevel: (env['OTEL_LOG_LEVEL'] as ObservabilityConfig['otel']['logLevel']) ?? 'error',
    },
  } satisfies ObservabilityConfig;
});
