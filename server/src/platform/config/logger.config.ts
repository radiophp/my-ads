import { registerAs } from '@nestjs/config';

export type LoggerConfig = {
  enabled: boolean;
};

export default registerAs<LoggerConfig>('logger', () => ({
  enabled: (process.env['LOG_ENABLE'] ?? 'true').toLowerCase() !== 'false',
}));
