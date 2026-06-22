import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { RequestActivationDto } from './dto/request-activation.dto';

@Controller('user-panel/subscriptions')
export class UserSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@Req() request: { user?: { sub: string } }) {
    return this.subscriptionsService.getActiveSubscription(request.user?.sub ?? '');
  }

  @Get('packages')
  async listPackages() {
    return this.subscriptionsService.listActivePackages();
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  async activate(@Req() request: { user?: { sub: string } }, @Body() dto: ActivateSubscriptionDto) {
    return this.subscriptionsService.activateSubscription(request.user?.sub ?? '', dto);
  }

  @Post('request-activation')
  @UseGuards(JwtAuthGuard)
  async requestActivation(
    @Req() request: { user?: { sub: string } },
    @Body() dto: RequestActivationDto,
  ) {
    return this.subscriptionsService.requestActivation(request.user?.sub ?? '', dto);
  }

  @Get('activation-status')
  @UseGuards(JwtAuthGuard)
  async getActivationStatus(@Req() request: { user?: { sub: string } }) {
    return this.subscriptionsService.getActivationStatus(request.user?.sub ?? '');
  }
}
