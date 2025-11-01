import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../..', '.env.test') });

jest.setTimeout(30000);
