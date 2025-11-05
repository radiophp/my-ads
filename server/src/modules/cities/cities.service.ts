import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.city.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
