import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/modules/auth/guards/roles.guard';
import { Roles, Role } from '@app/common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { FinalizePaymentDto } from './dto/finalize-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { BaleBotService } from '@app/modules/bale/bale.service';

type AuthedReq = { user?: { sub: string } };

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly baleBotService: BaleBotService,
  ) {}

  @Get()
  async listPayments(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.adminListPayments({
      status,
      page: page ? Math.max(1, Number(page)) : 1,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 20,
    });
  }

  @Post(':id/finalize')
  async finalizePayment(
    @Param('id') id: string,
    @Req() req: AuthedReq,
    @Body() dto: FinalizePaymentDto,
  ) {
    const result = await this.paymentsService.finalizePayment(id, req.user?.sub ?? '', dto);
    await this.baleBotService.sendPaymentReviewed(id);
    return result;
  }

  @Post(':id/approve')
  async approvePayment(@Param('id') id: string, @Req() req: AuthedReq) {
    const result = await this.paymentsService.approvePayment(id, req.user?.sub ?? '');
    await this.baleBotService.sendPaymentApproved(id);
    return result;
  }

  @Post(':id/reject')
  async rejectPayment(@Param('id') id: string, @Body() dto: RejectPaymentDto) {
    const result = await this.paymentsService.rejectPayment(id, dto.reason);
    await this.baleBotService.sendPaymentRejected(id, dto.reason);
    return result;
  }
}
