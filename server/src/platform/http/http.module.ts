import { Module } from '@nestjs/common';
import { FaviconController } from './favicon.controller';

@Module({
  controllers: [FaviconController],
})
export class HttpModule {}
