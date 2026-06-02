import { config as loadEnv } from 'dotenv';
import { join } from 'path';

process.env['DOTENV_CONFIG_SILENT'] = 'true';

loadEnv({ path: join(__dirname, '../../..', '.env.test') });

jest.setTimeout(30000);
