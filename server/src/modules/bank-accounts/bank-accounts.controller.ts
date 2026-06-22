import { Controller, Get } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';

@Controller('user-panel/payments/bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  async listActive() {
    return this.bankAccountsService.listActive();
  }
}
