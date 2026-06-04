import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BaleBotService } from '../modules/bale/bale.service';

process.env['NOTIFICATION_QUEUE_CONSUMER_ENABLED'] =
  process.env['NOTIFICATION_QUEUE_CONSUMER_ENABLED'] ?? 'false';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const botService = app.get(BaleBotService);
  await botService.start();

  const noop = () => undefined;
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  setInterval(noop, 60_000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
