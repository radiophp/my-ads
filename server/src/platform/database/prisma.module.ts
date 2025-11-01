import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type PrismaModuleOptions = {
  isGlobal?: boolean;
};

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {
  static forRoot(_options?: PrismaModuleOptions): typeof PrismaModule {
    return this;
  }
}
