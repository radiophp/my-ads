import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TelegramBotService } from '../modules/telegram/telegram.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const botService = app.get(TelegramBotService);
  await botService.start();

  // Keep process alive
  const noop = () => undefined;
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  // Prevent immediate exit
  setInterval(noop, 60_000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
