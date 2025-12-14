import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '@app/platform/database/prisma.service';
import { AdminDivarSessionsService } from '../admin-divar-sessions/admin-divar-sessions.service';

type ContactResponse = {
  widget_list?: Array<{
    widget_type?: string;
    data?: {
      action?: {
        payload?: {
          phone_number?: string;
        };
      };
    };
  }>;
};

@Injectable()
export class DivarContactFetchService {
  private readonly logger = new Logger(DivarContactFetchService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminDivarSessions: AdminDivarSessionsService,
  ) {}

  async tick(): Promise<{ id: string; title?: string | null } | null> {
    if (this.isRunning) {
      return null;
    }
    this.isRunning = true;
    try {
      const session = await this.prisma.adminDivarSession.findFirst({
        where: { active: true, locked: false },
        orderBy: { updatedAt: 'desc' },
      });
      if (!session) {
        this.logger.debug('No active Divar admin session available for contact fetch.');
        return null;
      }

      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const post = await this.prisma.divarPost.findFirst({
        where: { phoneNumber: null, contactUuid: { not: null }, createdAt: { gte: cutoff } },
        orderBy: { updatedAt: 'asc' },
        select: { id: true, externalId: true, contactUuid: true, title: true },
      });

      if (!post) {
        return null;
      }
      const postLabel = `post ${post.id}${post.title ? ` (${post.title})` : ''}`;

      const authHeader = session.jwt.startsWith('Basic ') ? session.jwt : `Basic ${session.jwt}`;
      try {
        const response = await axios.post<ContactResponse>(
          `https://api.divar.ir/v8/postcontact/web/contact_info_v2/${post.externalId}`,
          { contact_uuid: post.contactUuid },
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              Referer: 'https://divar.ir/',
              'X-Screen-Size': '1920x432',
              'X-Render-Type': 'CSR',
              Origin: 'https://divar.ir',
              Authorization: authHeader,
            },
            timeout: 8000,
            validateStatus: () => true,
          },
        );

        if (response.status === 401 || response.status === 403) {
          await this.prisma.adminDivarSession.update({
            where: { id: session.id },
            data: { active: false },
          });
          this.logger.warn(
            `Divar contact fetch unauthorized for ${postLabel} using session ${session.phone}; deactivated session.`,
          );
          return null;
        }

        if (response.status === 429) {
          this.logger.warn(`Divar contact fetch rate limited (429) for ${postLabel}.`);
          return null;
        }

        if (response.status < 200 || response.status >= 300) {
          const headersSnippet = JSON.stringify(response.headers ?? {});
          const bodySnippet =
            typeof response.data === 'string'
              ? (response.data as string).slice(0, 300)
              : JSON.stringify(response.data ?? {}).slice(0, 300);
          this.logger.warn(
            `Divar contact fetch failed for ${postLabel} status=${response.status} headers=${headersSnippet} body=${bodySnippet}`,
          );
          await this.prisma.divarPost.update({
            where: { id: post.id },
            data: { updatedAt: new Date() },
          });
          return null;
        }

        const phone = this.extractPhoneNumber(response.data);
        if (!phone) {
          this.logger.warn(`No phone number found for ${postLabel}`);
          await this.prisma.divarPost.update({
            where: { id: post.id },
            data: { updatedAt: new Date() },
          });
          return null;
        }

        await this.prisma.divarPost.update({
          where: { id: post.id },
          data: { phoneNumber: phone },
        });
        this.logger.debug(`Stored phone number for ${postLabel}`);
        return { id: post.id, title: post.title };
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;
        const headersSnippet = axiosError?.response?.headers
          ? JSON.stringify(axiosError.response.headers)
          : undefined;
        const bodySnippet =
          typeof axiosError?.response?.data === 'string'
            ? (axiosError.response.data as string).slice(0, 300)
            : axiosError?.response?.data
              ? JSON.stringify(axiosError.response.data).slice(0, 300)
              : undefined;
        this.logger.error(
          `Error fetching contact for post ${post.id}${
            status ? ` (status ${status})` : ''
          }: ${String(error)}${headersSnippet ? ` headers=${headersSnippet}` : ''}${
            bodySnippet ? ` body=${bodySnippet}` : ''
          }`,
        );
        await this.prisma.divarPost
          .update({
            where: { id: post.id },
            data: { updatedAt: new Date() },
          })
          .catch(() => undefined);
        return null;
      }
    } finally {
      this.isRunning = false;
    }
    return null;
  }

  async fetchForPost(postId: string): Promise<string | null> {
    const post = await this.prisma.divarPost.findUnique({
      where: { id: postId },
      select: { id: true, externalId: true, contactUuid: true, title: true },
    });
    if (!post || !post.externalId || !post.contactUuid) {
      this.logger.warn(`Cannot fetch contact for post ${postId}: missing externalId/contactUuid`);
      return null;
    }

    const session = await this.prisma.adminDivarSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
    });
    if (!session) {
      this.logger.warn('No active Divar admin session available for contact fetch.');
      return null;
    }
    const authHeader = session.jwt.startsWith('Basic ') ? session.jwt : `Basic ${session.jwt}`;
    const postLabel = `post ${post.id}${post.title ? ` (${post.title})` : ''}`;

    try {
      const response = await axios.post<ContactResponse>(
        `https://api.divar.ir/v8/postcontact/web/contact_info_v2/${post.externalId}`,
        { contact_uuid: post.contactUuid },
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            Referer: 'https://divar.ir/',
            'X-Screen-Size': '1920x432',
            'X-Render-Type': 'CSR',
            Origin: 'https://divar.ir',
            Authorization: authHeader,
          },
          timeout: 8000,
          validateStatus: () => true,
        },
      );

      if (response.status === 401 || response.status === 403) {
        await this.prisma.adminDivarSession.update({
          where: { id: session.id },
          data: { active: false },
        });
        this.logger.warn(
          `Divar contact fetch unauthorized for ${postLabel} using session ${session.phone}; deactivated session.`,
        );
        return null;
      }

      if (response.status === 429) {
        this.logger.warn(`Divar contact fetch rate limited (429) for ${postLabel}.`);
        return null;
      }

      if (response.status < 200 || response.status >= 300) {
        const headersSnippet = JSON.stringify(response.headers ?? {});
        const bodySnippet =
          typeof response.data === 'string'
            ? (response.data as string).slice(0, 300)
            : JSON.stringify(response.data ?? {}).slice(0, 300);
        this.logger.warn(
          `Divar contact fetch failed for ${postLabel} status=${response.status} headers=${headersSnippet} body=${bodySnippet}`,
        );
        await this.prisma.divarPost.update({
          where: { id: post.id },
          data: { updatedAt: new Date() },
        });
        return null;
      }

      const phone = this.extractPhoneNumber(response.data);
      if (!phone) {
        this.logger.warn(`No phone number found for ${postLabel}`);
        await this.prisma.divarPost.update({
          where: { id: post.id },
          data: { updatedAt: new Date() },
        });
        return null;
      }

      await this.prisma.divarPost.update({
        where: { id: post.id },
        data: { phoneNumber: phone },
      });
      this.logger.debug(`Stored phone number for ${postLabel} (on-demand fetch)`);
      return phone;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError?.response?.status;
      const headersSnippet = axiosError?.response?.headers
        ? JSON.stringify(axiosError.response.headers)
        : undefined;
      const bodySnippet =
        typeof axiosError?.response?.data === 'string'
          ? (axiosError.response.data as string).slice(0, 300)
          : axiosError?.response?.data
            ? JSON.stringify(axiosError.response.data).slice(0, 300)
            : undefined;
      this.logger.error(
        `Error fetching contact for ${postLabel}${
          status ? ` (status ${status})` : ''
        }: ${String(error)}${headersSnippet ? ` headers=${headersSnippet}` : ''}${
          bodySnippet ? ` body=${bodySnippet}` : ''
        }`,
      );
      await this.prisma.divarPost
        .update({
          where: { id: post.id },
          data: { updatedAt: new Date() },
        })
        .catch(() => undefined);
      return null;
    }
  }

  private extractPhoneNumber(payload: ContactResponse): string | null {
    const widgets = payload.widget_list ?? [];
    for (const widget of widgets) {
      const phone = widget?.data?.action?.payload?.phone_number;
      if (phone) {
        return this.normalizePhoneDigits(phone);
      }
    }
    return null;
  }

  private normalizePhoneDigits(value: string): string {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const englishDigits = '0123456789';
    return value
      .split('')
      .map((ch) => {
        const idx = persianDigits.indexOf(ch);
        if (idx >= 0) return englishDigits[idx];
        return ch;
      })
      .join('');
  }
}
