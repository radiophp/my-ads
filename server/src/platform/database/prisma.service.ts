import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import type { DatabaseConfig } from '@app/platform/config/db.config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseConfig = configService.get<DatabaseConfig>('database', { infer: true });
    if (!databaseConfig) {
      throw new Error('Database configuration is missing.');
    }

    super({
      datasources: {
        db: {
          url: databaseConfig.url,
        },
      },
      ...(databaseConfig.logQueries
        ? {
            log: [
              {
                level: 'query',
                emit: 'event',
              },
            ],
          }
        : {}),
    });

    if (databaseConfig.logQueries) {
      this.$on('query', (event: Prisma.QueryEvent) => {
        this.logger.debug(
          [
            'Prisma Query:',
            event.query,
            event.params && event.params.length > 2 ? `\nParams: ${event.params}` : '',
            `\nDuration: ${event.duration}ms`,
          ].join(' '),
        );
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
