import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        bankName: true,
        cardNumber: true,
        cardHolderName: true,
        sheba: true,
      },
    });
  }
}
