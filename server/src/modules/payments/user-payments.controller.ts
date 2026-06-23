import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { UploadsService } from '@app/modules/uploads/uploads.service';

type AuthedReq = FastifyRequest & { user?: { sub: string } };

@Controller('user-panel/payments')
@UseGuards(JwtAuthGuard)
export class UserPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post('initiate')
  async initiate(@Req() req: AuthedReq, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(req.user?.sub ?? '', dto);
  }

  @Post('validate-code')
  async validateCode(@Req() req: AuthedReq, @Body() dto: ValidateCodeDto) {
    return this.paymentsService.validateCode(req.user?.sub ?? '', dto);
  }

  @Post('upload-receipt/:id')
  async uploadReceipt(@Req() req: AuthedReq, @Param('id') id: string) {
    const file = await this.extractMultipartFile(req);
    const result = await this.uploadsService.uploadMultipartFile(file, req.user?.sub, 'receipts');
    return this.paymentsService.uploadReceipt(id, req.user?.sub ?? '', result.key);
  }

  @Post('re-upload-receipt/:id')
  async reUploadReceipt(@Req() req: AuthedReq, @Param('id') id: string) {
    const file = await this.extractMultipartFile(req);
    const result = await this.uploadsService.uploadMultipartFile(file, req.user?.sub, 'receipts');
    return this.paymentsService.reUploadReceipt(id, req.user?.sub ?? '', result.key);
  }

  @Get()
  async myPayments(
    @Req() req: AuthedReq,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.getUserPayments(
      req.user?.sub ?? '',
      page ? Math.max(1, Number(page)) : 1,
      limit ? Math.min(100, Math.max(1, Number(limit))) : 20,
    );
  }

  @Get(':id')
  async getPayment(@Req() req: AuthedReq, @Param('id') id: string) {
    return this.paymentsService.getPayment(id, req.user?.sub ?? '');
  }

  private async extractMultipartFile(request: AuthedReq): Promise<MultipartFile> {
    if (typeof request.isMultipart !== 'function' || !request.isMultipart()) {
      throw new BadRequestException('Expected multipart/form-data content type.');
    }
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file received in request.');
    }
    return file;
  }
}
