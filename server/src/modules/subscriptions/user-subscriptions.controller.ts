import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

@Controller('user-panel/subscriptions')
@UseGuards(JwtAuthGuard)
export class UserSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  async getCurrent(@Req() request: { user?: { sub: string } }) {
    return this.subscriptionsService.getActiveSubscription(request.user?.sub ?? '');
  }

  @Get('packages')
  async listPackages() {
    return this.subscriptionsService.listActivePackages();
  }

  @Post('activate')
  async activate(@Req() request: { user?: { sub: string } }, @Body() dto: ActivateSubscriptionDto) {
    return this.subscriptionsService.activateSubscription(request.user?.sub ?? '', dto);
  }
}
