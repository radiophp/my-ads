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

  async updateAllowPosting(id: number, allowPosting: boolean) {
    return this.prismaService.$transaction(async (tx) => {
      const province = await tx.province.update({
        where: { id },
        data: { allowPosting },
      });

      await tx.city.updateMany({
        where: { provinceId: id },
        data: { allowPosting },
      });

      return province;
    });
  }
}
