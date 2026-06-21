import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '@app/platform/database/prisma.service';
import { ArkaTransferStatus } from '@prisma/client';

const LOCK_SECONDS = 0.2; // allow up to ~10 req/s when cron loops
const START_FETCH_ID = 383711;
const RATE_LIMIT_BACKOFF_MS = 10_000;
const GENERIC_BACKOFF_MS = 15_000;

type FetchResult =
  | { kind: 'skipped'; reason: string }
  | { kind: 'stored'; arkaId: number; externalId?: string | null }
  | { kind: 'backoff'; until: Date; reason: string }
  | { kind: 'error'; reason: string };

type SearchFetchSummary = {
  processed: number;
  stored: number;
  skipped: number;
  refetched: number;
  errors: number;
};

const parseExternalId = (link?: string | null): string | null => {
  if (!link) return null;
  const match = link.match(/\/v\/([^/?#]+)/i);
  return match ? match[1] : null;
};

const buildHeaders = (headers: Record<string, string> | null): Record<string, string> => {
  if (!headers) return {};
  const result: Record<string, string> = {
    ...headers,
    'Content-Type': headers['Content-Type'] ?? headers['content-type'] ?? 'application/json',
  };
  delete result['Content-Length'];
  delete result['content-length'];
  return result;
};

const normalizeDigits = (value: string): string =>
  value
    .replace(/[۰-۹]/g, (d) => String((d.charCodeAt(0) - '۰'.charCodeAt(0)) % 10))
    .replace(/[٠-٩]/g, (d) => String((d.charCodeAt(0) - '٠'.charCodeAt(0)) % 10));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ArkaPhoneFetchService {
  private readonly logger = new Logger(ArkaPhoneFetchService.name);
  private readonly schedulerEnabled: boolean;
  private readonly arkaFetchCronEnabled: boolean;
  private isRunning = false;
  private runGuardTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<boolean>('scheduler.enabled', { infer: true }) ?? true;
    this.arkaFetchCronEnabled =
      (process.env['ENABLE_ARKA_FETCH_CRON'] ?? 'true').toLowerCase() === 'true';
  }

  async fetchLatestArkaId(): Promise<number | null> {
    const session = await this.prisma.adminArkaSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, headers: true },
    });
    const headers = buildHeaders((session?.headers as Record<string, string> | null) ?? null);
    if (!headers || Object.keys(headers).length === 0) {
      this.logger.warn('No Arka headers available to fetch latest id.');
      return null;
    }

    const effectiveHeaders: Record<string, string> = {
      ...headers,
      'Content-Type': headers['Content-Type'] ?? headers['content-type'] ?? 'application/json',
    };
    delete effectiveHeaders['Content-Length'];
    delete effectiveHeaders['content-length'];

    if (!effectiveHeaders['Authorization'] && !effectiveHeaders['authorization']) {
      this.logger.warn('Arka headers missing Authorization; cannot fetch latest id.');
      return null;
    }

    try {
      const res = await axios.post(
        'https://back.arkafile.info/Search/FullDetails',
        { page: 1 },
        { headers: effectiveHeaders, timeout: 10_000, validateStatus: () => true },
      );
      if (res.status < 200 || res.status >= 300) {
        const snippet =
          typeof res.data === 'string'
            ? res.data.slice(0, 200)
            : JSON.stringify(res.data ?? {}).slice(0, 200);
        this.logger.warn(`Arka latest-id request failed http=${res.status} body=${snippet}`);
        if (session?.id && (res.status === 401 || res.status === 403)) {
          await this.prisma.adminArkaSession.update({
            where: { id: session.id },
            data: {
              active: false,
              lastError: 'auth_failed',
              lastErrorAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
        return null;
      }
      const posts = Array.isArray((res.data as any)?.posts) ? (res.data as any).posts : [];
      const ids = posts
        .map((p: any) => p?.id)
        .filter((id: any) => typeof id === 'number' && Number.isFinite(id));
      if (ids.length === 0) {
        return null;
      }
      return Math.max(...ids);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch latest Arka id: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async fetchFromSearchPages(maxPages: number = 10): Promise<SearchFetchSummary> {
    const startTime = Date.now();
    let processed = 0;
    let stored = 0;
    let skipped = 0;
    let refetched = 0;
    let errors = 0;

    const session = await this.prisma.adminArkaSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, headers: true },
    });
    const headers = buildHeaders((session?.headers as Record<string, string> | null) ?? null);
    if (!headers || Object.keys(headers).length === 0) {
      this.logger.warn('No Arka headers available for search fetch.');
      return { processed: 0, stored: 0, skipped: 0, refetched: 0, errors: 0 };
    }
    if (!headers['Authorization'] && !headers['authorization']) {
      this.logger.warn('Arka headers missing Authorization; cannot search.');
      return { processed: 0, stored: 0, skipped: 0, refetched: 0, errors: 0 };
    }

    for (let page = 1; page <= maxPages; page++) {
      this.logger.log(`Search page ${page}/${maxPages}...`);

      // Throttle: 500ms between page requests
      if (page > 1) {
        await sleep(500);
      }

      let res;
      try {
        res = await axios.post(
          'https://back.arkafile.info/Search/FullDetails',
          { page },
          { headers, timeout: 15_000, validateStatus: () => true },
        );
      } catch (error) {
        this.logger.warn(
          `Search page ${page} request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        errors++;
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        this.logger.warn(`Search page ${page} returned http=${res.status}`);
        if (session?.id && (res.status === 401 || res.status === 403)) {
          await this.prisma.adminArkaSession.update({
            where: { id: session.id },
            data: {
              active: false,
              lastError: 'auth_failed',
              lastErrorAt: new Date(),
              updatedAt: new Date(),
            },
          });
          this.logger.error('Arka auth failed; deactivating session and stopping.');
          break;
        }
        errors++;
        continue;
      }

      const data = res.data as any;
      const posts: any[] = Array.isArray(data?.posts) ? data.posts : [];
      if (posts.length === 0) {
        this.logger.log(`Search page ${page} has no posts; stopping.`);
        break;
      }

      this.logger.log(`Search page ${page}: ${posts.length} posts found`);
      let pageRefetched = 0;
      let pageSkipped = 0;

      for (const post of posts) {
        processed++;
        const arkaId: number | undefined = post?.id;
        const token: string | undefined = post?.token;

        // Throttle: 250ms between individual phone detail requests
        if (processed > 1) {
          await sleep(250);
        }
        if (!arkaId || typeof arkaId !== 'number') {
          this.logger.debug(`Search post missing id; skipping`);
          errors++;
          continue;
        }

        const existing = await this.prisma.arkaPhoneRecord.findUnique({
          where: { arkaId },
          select: { phoneNumber: true },
        });

        if (existing) {
          if (existing.phoneNumber === '09000000000') {
            this.logger.log(
              `[P${page}] id=${arkaId} token=${token ?? '?'} has dummy phone, refetching`,
            );
            refetched++;
            pageRefetched++;
          } else if (existing.phoneNumber == null) {
            this.logger.debug(
              `[P${page}] id=${arkaId} token=${token ?? '?'} no phone (already checked), skipping`,
            );
            skipped++;
            pageSkipped++;
            continue;
          } else {
            this.logger.debug(
              `[P${page}] id=${arkaId} token=${token ?? '?'} already has phone ${existing.phoneNumber}, skipping`,
            );
            skipped++;
            pageSkipped++;
            continue;
          }
        } else {
          this.logger.log(`[P${page}] id=${arkaId} token=${token ?? '?'} new, fetching phone...`);
        }

        const success = await this.fetchAndStorePhoneDetails(arkaId, token ?? null, headers);
        if (success) {
          stored++;
        } else {
          errors++;
        }
      }

      this.logger.log(
        `Search page ${page} done: ${posts.length} posts, ${pageRefetched} refetched, ${pageSkipped} skipped`,
      );

      const pagination = data?.pagination;
      if (pagination && pagination.next_page == null) {
        this.logger.log(`No more pages after page ${page}; stopping.`);
        break;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(
      `Search fetch completed: ${processed} processed, ${stored} stored, ${refetched} refetched, ${skipped} skipped, ${errors} errors in ${duration}s`,
    );

    return { processed, stored, skipped, refetched, errors };
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'arka-phone-fetch' })
  async cronTick() {
    if (this.isRunning) {
      return;
    }
    if (!this.schedulerEnabled || !this.arkaFetchCronEnabled) {
      return;
    }
    this.isRunning = true;
    if (this.runGuardTimer) {
      clearTimeout(this.runGuardTimer);
    }
    this.runGuardTimer = setTimeout(() => {
      this.logger.warn('Fetch cron guard timeout elapsed; releasing running flag.');
      this.isRunning = false;
      this.runGuardTimer = null;
    }, 600_000);
    this.logger.log('Cron tick: starting search-based fetch (maxPages=10)');
    const summary = await this.fetchFromSearchPages(10).catch((error) => {
      this.logger.error(
        `Cron fetchFromSearchPages failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (summary) {
      this.logger.log(
        `Cron tick done: ${summary.processed} processed, ${summary.stored} stored, ${summary.refetched} refetched, ${summary.skipped} skipped, ${summary.errors} errors`,
      );
    }
    if (this.runGuardTimer) {
      clearTimeout(this.runGuardTimer);
      this.runGuardTimer = null;
    }
    this.isRunning = false;
  }

  async fetchNext(force = false): Promise<FetchResult> {
    if (!force && (!this.schedulerEnabled || !this.arkaFetchCronEnabled)) {
      return { kind: 'skipped', reason: 'cron_disabled' };
    }

    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_SECONDS * 1000);
    const cursor = await this.prisma.$transaction(async (tx) => {
      let current = await tx.arkaPhoneCursor.findUnique({ where: { id: 'singleton' } });
      if (!current) {
        current = await tx.arkaPhoneCursor.create({
          data: { id: 'singleton', nextFetchId: START_FETCH_ID, updatedAt: now },
        });
      }

      if (current.nextFetchId < START_FETCH_ID) {
        current = await tx.arkaPhoneCursor.update({
          where: { id: 'singleton' },
          data: { nextFetchId: START_FETCH_ID, updatedAt: now },
        });
      }

      // For forced/script calls, skip locks/backoff and atomically reserve next ID
      if (force) {
        const reservedId = current.nextFetchId;
        const updated = await tx.arkaPhoneCursor.update({
          where: { id: 'singleton' },
          data: {
            nextFetchId: reservedId + 1,
            lockedUntil: null,
            lockedBy: null,
            backoffUntil: null,
            updatedAt: now,
          },
        });
        return { locked: false, backoff: false, cursor: { ...updated, nextFetchId: reservedId } };
      }

      if (current.lockedUntil && current.lockedUntil > now) {
        return { locked: true, cursor: current };
      }
      if (current.backoffUntil && current.backoffUntil > now) {
        return { backoff: true, cursor: current };
      }

      const updated = await tx.arkaPhoneCursor.update({
        where: { id: 'singleton' },
        data: { lockedUntil: lockUntil, lockedBy: 'arka-fetch', updatedAt: now },
      });

      return { locked: false, backoff: false, cursor: updated };
    });

    if (!cursor || cursor.locked || cursor.backoff) {
      if (cursor?.backoff) {
        return {
          kind: 'backoff',
          until: cursor.cursor.backoffUntil ?? new Date(now.getTime() + 1_000),
          reason: 'backoff_active',
        };
      }
      return { kind: 'skipped', reason: 'locked' };
    }

    const arkaId = cursor.cursor.nextFetchId;
    const headers = buildHeaders(
      await this.prisma.adminArkaSession
        .findFirst({
          where: { active: true, locked: false },
          orderBy: { updatedAt: 'desc' },
          select: { headers: true },
        })
        .then((s) => s?.headers as Record<string, string> | null),
    );

    if (!headers || Object.keys(headers).length === 0) {
      await this.releaseCursor('No headers configured', cursor.cursor, undefined, undefined, now);
      return { kind: 'error', reason: 'missing_headers' };
    }

    const url = `https://back.arkafile.info/Search/FullDetails/Phone/${arkaId}`;
    const res = await axios
      .post(
        url,
        {},
        {
          headers,
          timeout: 10_000,
          validateStatus: () => true,
        },
      )
      .catch((error: any) => {
        this.logger.warn(`Arka request failed for id=${arkaId}: ${error?.message ?? error}`);
        return { status: 0, data: null };
      });

    const status = (res as any).status ?? 0;
    const data = (res as any).data as any;

    // Determine backoff/update cursor based on status/message
    if (status === 0) {
      await this.releaseCursor('network_error', cursor.cursor, status, 'network_error', now);
      return { kind: 'error', reason: 'network_error' };
    }

    if (status === 404) {
      // treat as empty slot: advance cursor and continue
      await this.releaseCursor('not_found', cursor.cursor, status, 'not_found', now, {
        nextFetchId: arkaId + 1,
      });
      this.logger.debug(`Arka id=${arkaId} not found; advancing cursor`);
      return { kind: 'skipped', reason: 'not_found' };
    }

    if (status === 429) {
      const until = new Date(now.getTime() + RATE_LIMIT_BACKOFF_MS);
      await this.releaseCursor('rate_limit', cursor.cursor, status, 'rate_limit', now, {
        backoffUntil: until,
        nextFetchId: arkaId,
      });
      return { kind: 'backoff', until, reason: 'rate_limit' };
    }

    if (status === 403 || status === 401 || status === 412) {
      // Auth/forbidden/locked: advance cursor without backoff to avoid throttling other workers
      await this.releaseCursor('forbidden', cursor.cursor, status, `http_${status}`, now, {
        nextFetchId: arkaId + 1,
      });
      this.logger.warn(
        `Arka fetch forbidden/unauthorized id=${arkaId} status=${status} body=${typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200)}`,
      );
      return { kind: 'skipped', reason: `http_${status}` };
    }

    if (status < 200 || status >= 300) {
      const until = new Date(now.getTime() + GENERIC_BACKOFF_MS);
      await this.releaseCursor('http_error', cursor.cursor, status, `http_${status}`, now, {
        backoffUntil: until,
        nextFetchId: arkaId,
      });
      this.logger.warn(
        `Arka fetch failed id=${arkaId} status=${status} body=${typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200)}`,
      );
      return { kind: 'error', reason: `http_${status}` };
    }

    const record = data?.data ?? null;
    const link = typeof record?.link === 'string' ? record.link : null;
    const externalId = parseExternalId(link);
    const phoneRaw = typeof record?.phone === 'string' ? record.phone : null;
    const malkName = typeof record?.malk_name === 'string' ? record.malk_name : null;
    const phoneNormalized = phoneRaw ? normalizeDigits(phoneRaw).replace(/[^0-9]/g, '') : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.arkaPhoneRecord.upsert({
        where: { arkaId },
        update: {
          divarLink: link ?? undefined,
          externalId: externalId ?? undefined,
          phoneNumber: phoneNormalized ?? undefined,
          malkName: malkName ?? undefined,
          payload: record ?? data ?? undefined,
          status: ArkaTransferStatus.NOT_TRANSFERRED,
          transferAttemptCount: 0,
          transferLastError: null,
          nextTransferAttemptAt: null,
        },
        create: {
          arkaId,
          divarLink: link ?? undefined,
          externalId: externalId ?? undefined,
          phoneNumber: phoneNormalized ?? undefined,
          malkName: malkName ?? undefined,
          payload: record ?? data ?? undefined,
        },
      });

      await tx.arkaPhoneCursor.update({
        where: { id: 'singleton' },
        data: {
          nextFetchId: arkaId + 1,
          lockedUntil: null,
          lockedBy: null,
          backoffUntil: null,
          lastStatus: status,
          lastError: null,
          updatedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Arka fetch stored: id=${arkaId} externalId=${externalId ?? 'n/a'} phone=${phoneNormalized ?? 'n/a'}`,
    );
    return { kind: 'stored', arkaId, externalId };
  }

  private async fetchAndStorePhoneDetails(
    arkaId: number,
    token: string | null,
    headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      const res = await axios
        .post(
          `https://back.arkafile.info/Search/FullDetails/Phone/${arkaId}`,
          {},
          { headers, timeout: 10_000, validateStatus: () => true },
        )
        .catch((error: any) => {
          this.logger.warn(
            `Phone details request failed for id=${arkaId}: ${error?.message ?? error}`,
          );
          return { status: 0, data: null };
        });

      const status = (res as any).status ?? 0;
      const data = (res as any).data as any;

      if (status === 0) {
        this.logger.warn(`Phone details network error for id=${arkaId}`);
        return false;
      }

      if (status === 404) {
        this.logger.debug(`Phone details not found for id=${arkaId} — storing with null phone`);
        await this.prisma.arkaPhoneRecord.upsert({
          where: { arkaId },
          update: {
            externalId: token ?? undefined,
            phoneNumber: null,
            malkName: null,
            status: ArkaTransferStatus.NOT_TRANSFERRED,
            transferAttemptCount: 0,
            transferLastError: null,
            nextTransferAttemptAt: null,
          },
          create: {
            arkaId,
            externalId: token ?? undefined,
          },
        });
        return true;
      }

      if (status === 429) {
        this.logger.warn(`Phone details rate limited for id=${arkaId}`);
        return false;
      }

      if (status === 401 || status === 403) {
        this.logger.warn(
          `Phone details auth failed id=${arkaId} status=${status}; deactivating session`,
        );
        await this.prisma.adminArkaSession.updateMany({
          where: { active: true, locked: false },
          data: {
            active: false,
            lastError: 'auth_failed',
            lastErrorAt: new Date(),
            updatedAt: new Date(),
          },
        });
        return false;
      }

      if (status < 200 || status >= 300) {
        this.logger.warn(
          `Phone details failed id=${arkaId} status=${status} body=${typeof data === 'string' ? data : JSON.stringify(data ?? {}).slice(0, 200)}`,
        );
        return false;
      }

      const record = data?.data ?? null;
      const link = typeof record?.link === 'string' ? record.link : null;
      const externalId = token ?? parseExternalId(link);
      const phoneRaw = typeof record?.phone === 'string' ? record.phone : null;
      const malkName = typeof record?.malk_name === 'string' ? record.malk_name : null;
      const phoneNormalized = phoneRaw ? normalizeDigits(phoneRaw).replace(/[^0-9]/g, '') : null;

      await this.prisma.arkaPhoneRecord.upsert({
        where: { arkaId },
        update: {
          divarLink: link ?? undefined,
          externalId: externalId ?? undefined,
          phoneNumber: phoneNormalized ?? undefined,
          malkName: malkName ?? undefined,
          payload: record ?? data ?? undefined,
          status: ArkaTransferStatus.NOT_TRANSFERRED,
          transferAttemptCount: 0,
          transferLastError: null,
          nextTransferAttemptAt: null,
        },
        create: {
          arkaId,
          divarLink: link ?? undefined,
          externalId: externalId ?? undefined,
          phoneNumber: phoneNormalized ?? undefined,
          malkName: malkName ?? undefined,
          payload: record ?? data ?? undefined,
        },
      });

      this.logger.log(
        `Stored phone for arkaId=${arkaId} token=${externalId ?? 'n/a'} phone=${phoneNormalized ?? 'n/a'}`,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Error in fetchAndStorePhoneDetails for arkaId=${arkaId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async releaseCursor(
    reason: string,
    cursor: { id: string },
    status?: number,
    error?: string | null,
    now = new Date(),
    extras?: { backoffUntil?: Date; nextFetchId?: number },
  ) {
    await this.prisma.arkaPhoneCursor.update({
      where: { id: cursor.id },
      data: {
        lockedUntil: null,
        lockedBy: null,
        backoffUntil: extras?.backoffUntil ?? null,
        lastStatus: status ?? null,
        lastError: error ?? null,
        nextFetchId: extras?.nextFetchId ?? undefined,
        updatedAt: now,
      },
    });
    this.logger.debug(`Cursor released (${reason})`);
  }
}
