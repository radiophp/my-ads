import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PhoneFetchService } from './phone-fetch.service';
import { LeasePhoneFetchDto } from './dto/lease-phone-fetch.dto';
import { ReportPhoneFetchDto } from './dto/report-phone-fetch.dto';

@ApiTags('phone-fetch')
@Controller('phone-fetch')
export class PhoneFetchController {
  constructor(private readonly phoneFetchService: PhoneFetchService) {}

  @Post('lease')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lease a post for phone fetch' })
  async lease(@Body() dto: LeasePhoneFetchDto): Promise<
    | {
        leaseId: string;
        postId: string;
        externalId: string;
        contactUuid: string;
        postTitle?: string | null;
        businessRef?: string | null;
        businessType?: string | null;
        businessCacheState?: 'new' | 'update';
      }
    | { status: 'empty' }
  > {
    const lease = await this.phoneFetchService.lease(dto.workerId);
    if (!lease) {
      return { status: 'empty' };
    }
    return lease;
  }

  @Post('report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Report phone fetch result' })
  async report(@Body() dto: ReportPhoneFetchDto): Promise<void> {
    if (dto.status === 'ok' && dto.phoneNumber) {
      await this.phoneFetchService.reportOk(dto.leaseId, dto.phoneNumber, dto.businessTitle);
    } else {
      await this.phoneFetchService.reportError(dto.leaseId, dto.error ?? 'unknown');
    }
  }
}
