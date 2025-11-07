import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(provinceId?: number) {
    return this.prismaService.city.findMany({
      where: provinceId ? { provinceId } : undefined,
      orderBy: { name: 'asc' },
      include: { province: true },
    });
  }

  updateAllowPosting(id: number, allowPosting: boolean) {
    return this.prismaService.city.update({
      where: { id },
      data: { allowPosting },
      include: { province: true },
    });
  }
}
