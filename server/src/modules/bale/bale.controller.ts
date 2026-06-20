import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { BaleBotService } from './bale.service';

@Controller('bale')
@UseGuards(JwtAuthGuard)
export class BaleController {
  constructor(private readonly baleService: BaleBotService) {}

  @Post('share-post')
  async sharePost(@Req() req: Request, @Body('postId') postId: string) {
    const userId = (req.user as { sub: string })?.sub;
    return this.baleService.sharePostToUser(userId, postId);
  }
}
