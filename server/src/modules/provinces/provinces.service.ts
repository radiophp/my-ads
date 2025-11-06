import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

@Injectable()
export class ProvincesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.province.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
