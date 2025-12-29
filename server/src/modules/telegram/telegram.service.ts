import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Markup, Telegraf, Telegram, session, Input } from 'telegraf';
import type { InlineKeyboardMarkup } from '@telegraf/types';
import { PrismaService } from '../../platform/database/prisma.service';

type BotSession = { phone?: string };
type BotContext = Context & { session?: BotSession };
type TelegramSendOptions = {
  cost?: number;
  chatId?: string | number;
  timeoutMs?: number;
  perChatCost?: number;
};

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Telegraf<BotContext>;
  private sender?: Telegram;
  private started = false;
  private starting = false;
  private phoneCache = new Map<number, string>();
  private readonly sendTimeoutMs: number;
  private readonly sendRetryAttempts: number;
  private readonly sendRetryDelayMs: number;
  private readonly sendRateLimitPerSecond: number;
  private readonly sendPerChatLimitPerSecond: number;
  private readonly pollingRetryDelayMs: number;
  private readonly appBaseUrl: string;
  private readonly apiBaseUrl: string;
  private sendRateLimitChain: Promise<void> = Promise.resolve();
  private sendRateLimitTimestamps: number[] = [];
  private sendRateLimitUntil = 0;
  private sendPerChatChains = new Map<string, Promise<void>>();
  private sendPerChatTimestamps = new Map<string, number[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.sendTimeoutMs = this.toNumber(
      this.configService.get<string>('TELEGRAM_SEND_TIMEOUT_MS'),
      8000,
    );
    this.sendRetryAttempts = this.toNumber(
      this.configService.get<string>('TELEGRAM_SEND_RETRY_ATTEMPTS'),
      5,
    );
    this.sendRetryDelayMs = this.toNumber(
      this.configService.get<string>('TELEGRAM_SEND_RETRY_DELAY_MS'),
      5000,
    );
    this.sendRateLimitPerSecond = this.toNumber(
      this.configService.get<string>('TELEGRAM_SEND_RATE_LIMIT_PER_SEC'),
      30,
    );
    this.sendPerChatLimitPerSecond = this.toNumber(
      this.configService.get<string>('TELEGRAM_SEND_PER_CHAT_LIMIT_PER_SEC'),
      1,
    );
    this.pollingRetryDelayMs = this.toNumber(
      this.configService.get<string>('TELEGRAM_POLLING_RETRY_DELAY_MS'),
      60_000,
    );
    this.appBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ??
        this.configService.get<string>('APP_PUBLIC_URL') ??
        '',
    );
    this.apiBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('NEXT_PUBLIC_API_BASE_URL') ??
        (this.appBaseUrl ? `${this.appBaseUrl}/api` : ''),
    );
  }

  onModuleInit(): void {
    // Optional auto-start when explicitly enabled to avoid running during normal HTTP boot.
    const autoStart = this.configService.get<string>('TELEGRAM_BOT_AUTOSTART') === 'true';
    if (autoStart) {
      void this.start();
    }
  }

  async start(): Promise<void> {
    if (this.started || this.starting) {
      return;
    }
    this.starting = true;

    try {
      const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      if (!token) {
        this.logger.warn('TELEGRAM_BOT_TOKEN is not set; telegram bot not started.');
        return;
      }

      // Sender can be used independently of polling to avoid 409 conflicts.
      this.sender = new Telegram(token);

      this.bot = new Telegraf<BotContext>(token);
      this.bot.use(session());
      this.bot.use(async (ctx, next) => {
        const telegramId = ctx.from?.id;
        if (telegramId && ctx.session && !ctx.session.phone) {
          const cached = this.phoneCache.get(telegramId);
          if (cached) {
            ctx.session.phone = cached;
          }
        }
        return next();
      });

      this.bot.start(async (ctx: BotContext) => {
        await ctx.reply(
          'سلام! 👋 لطفاً با دکمه زیر شماره تماس خود را ارسال کنید.',
          Markup.keyboard([Markup.button.contactRequest('📱 ارسال شماره تماس')])
            .oneTime()
            .resize(),
        );
      });

      this.bot.on('contact', async (ctx: BotContext) => {
        const msg: any = ctx.message as any;
        const phone = msg?.contact?.phone_number as string | undefined;
        const contactUserId = msg?.contact?.user_id as number | undefined;
        const senderId = ctx.from?.id;
        const chatId = ctx.chat?.id;

        // Accept only the sender's own number to avoid spoofed contacts.
        if (contactUserId && senderId && contactUserId !== senderId) {
          await ctx.reply(
            'لطفاً شماره خودتان را ارسال کنید (نه شماره شخص دیگر). روی «📱 ارسال شماره تماس» بزنید.',
            Markup.keyboard([Markup.button.contactRequest('📱 ارسال شماره تماس')])
              .oneTime()
              .resize(),
          );
          return;
        }

        if (phone) {
          if (ctx.session) {
            (ctx.session as any).phone = phone;
          }
          if (contactUserId) {
            this.phoneCache.set(contactUserId, phone);
          }

          if (chatId) {
            void this.saveTelegramLink({
              telegramId: String(contactUserId ?? senderId ?? chatId),
              chatId: String(chatId),
              phone,
            });
          }

          await ctx.reply(
            `ممنون! شماره شما دریافت شد: ${phone}`,
            Markup.keyboard([['📂 نمایش فیلترهای ذخیره‌شده']]).resize(),
          );

          return;
        } else {
          await ctx.reply('خطا در خواندن شماره. لطفاً دوباره تلاش کنید.');
        }
      });

      this.bot.command('filters', (ctx: BotContext) => this.handleSavedFilters(ctx));
      this.bot.hears('📂 نمایش فیلترهای ذخیره‌شده', (ctx: BotContext) =>
        this.handleSavedFilters(ctx),
      );
      this.bot.action(/^zip:(.+)/, async (ctx: BotContext) => {
        const data = (ctx.callbackQuery as any)?.data as string | undefined;
        const postId = data?.slice(4).trim();
        const callbackMessage = (ctx.callbackQuery as any)?.message;
        const chatId = callbackMessage?.chat?.id ?? ctx.chat?.id;
        const messageId = callbackMessage?.message_id as number | undefined;

        if (!postId || !chatId) {
          await ctx
            .answerCbQuery('شناسه آگهی نامعتبر است.', { show_alert: true })
            .catch(() => undefined);
          return;
        }

        this.logger.log(
          `Telegram ZIP requested for post ${postId} (chat ${chatId}, message ${messageId ?? 'n/a'}).`,
        );

        await ctx.answerCbQuery('در حال آماده‌سازی فایل…').catch(() => undefined);
        await ctx.telegram.sendChatAction(chatId, 'upload_document').catch(() => undefined);

        const ok = await this.sendPostPhotosZip({
          chatId,
          postId,
          replyToMessageId: messageId,
        });

        if (!ok) {
          await ctx.reply('امکان ارسال فایل زیپ وجود ندارد. دوباره تلاش کنید.');
          this.logger.warn(`Telegram ZIP failed for post ${postId} (chat ${chatId}).`);
        } else {
          this.logger.log(`Telegram ZIP sent for post ${postId} (chat ${chatId}).`);
        }
      });

      this.bot.on('text', async (ctx: BotContext, next) => {
        // If we already have the phone, continue to other handlers (e.g., /filters).
        if (await this.getPhone(ctx)) {
          return next();
        }

        // Otherwise remind to share contact.
        await ctx.reply(
          'لطفاً روی «📱 ارسال شماره تماس» بزنید تا شماره شما دریافت شود.',
          Markup.keyboard([Markup.button.contactRequest('📱 ارسال شماره تماس')])
            .oneTime()
            .resize(),
        );
        return;
      });

      await this.launchWithRetry();
      this.started = true;
      this.logger.log('Telegram bot started (polling).');
    } finally {
      this.starting = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.started) {
      await this.bot.stop();
      this.logger.log('Telegram bot stopped.');
    }
  }

  private async launchWithRetry(): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      throw new Error('Telegram bot is not initialized.');
    }

    while (true) {
      try {
        await bot.launch();
        return;
      } catch (error) {
        if (!this.isPollingConflict(error)) {
          throw error;
        }
        this.logger.warn(
          `Telegram polling conflict detected; retrying in ${this.pollingRetryDelayMs}ms.`,
        );
        await this.delay(this.pollingRetryDelayMs);
      }
    }
  }

  private isPollingConflict(error: unknown): boolean {
    const response = (error as { response?: { error_code?: number; description?: string } })
      ?.response;
    return (
      response?.error_code === 409 &&
      response?.description?.toLowerCase().includes('getupdates') === true
    );
  }

  private async handleSavedFilters(ctx: BotContext): Promise<void> {
    const phone = await this.getPhone(ctx);
    if (!phone) {
      await ctx.reply(
        'ابتدا باید شماره خود را ارسال کنید. روی «📱 ارسال شماره تماس» بزنید.',
        Markup.keyboard([Markup.button.contactRequest('📱 ارسال شماره تماس')])
          .oneTime()
          .resize(),
      );
      return;
    }

    const user = await this.findUserByPhone(phone);
    if (!user) {
      await ctx.reply(
        'کاربری با این شماره پیدا نشد. لطفاً ابتدا در اپ ثبت‌نام کنید.',
        Markup.keyboard([Markup.button.contactRequest('📱 ارسال شماره تماس')])
          .oneTime()
          .resize(),
      );
      return;
    }

    const filters = await this.prisma.savedFilter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, createdAt: true },
    });

    if (!filters.length) {
      await ctx.reply('هیچ فیلتر ذخیره‌شده‌ای ندارید.');
      return;
    }

    const lines = filters.map(
      (f, idx) => `${idx + 1}. ${f.name} (${f.createdAt.toISOString().slice(0, 10)})`,
    );
    await ctx.reply(`فیلترهای ذخیره‌شده:\n${lines.join('\n')}`);
  }

  private async findUserByPhone(phone: string) {
    const digits = phone.replace(/\D+/g, '');
    const candidates = new Set<string>([phone]);
    if (digits) {
      candidates.add(digits);
      candidates.add(`+${digits}`);
    }

    return this.prisma.user.findFirst({
      where: { phone: { in: Array.from(candidates) } },
    });
  }

  private async getPhone(ctx: BotContext): Promise<string | undefined> {
    if (ctx.session?.phone) {
      return ctx.session.phone;
    }
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      return undefined;
    }
    const cached = this.phoneCache.get(telegramId);
    if (cached) {
      if (ctx.session) {
        ctx.session.phone = cached;
      }
      return cached;
    }

    const chatId = ctx.chat?.id;
    const link = await this.prisma.telegramUserLink.findFirst({
      where: {
        OR: [{ telegramId: String(telegramId) }, ...(chatId ? [{ chatId: String(chatId) }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (link?.phone) {
      this.phoneCache.set(telegramId, link.phone);
      if (ctx.session) ctx.session.phone = link.phone;
      return link.phone;
    }
    return undefined;
  }

  private async ensureSender(): Promise<void> {
    if (this.sender) {
      return;
    }
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set; telegram sender not initialized.');
      return;
    }
    this.sender = new Telegram(token);
  }

  private async saveTelegramLink(params: { telegramId: string; chatId: string; phone: string }) {
    const { telegramId, chatId, phone } = params;
    const user = await this.findUserByPhone(phone);
    await this.prisma.telegramUserLink.upsert({
      where: { telegramId },
      update: { chatId, phone, userId: user?.id ?? null },
      create: { telegramId, chatId, phone, userId: user?.id ?? null },
    });
    if (telegramId) {
      this.phoneCache.set(Number(telegramId), phone);
    }
  }

  async sendPostToUser(options: {
    userId?: string;
    phone?: string;
    postId: string;
    retryMissingPhone?: boolean;
    customMessage?: string;
  }): Promise<{ status: 'sent' | 'not_connected' | 'failed'; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      const errMsg = 'Telegram bot sender is not initialized; cannot send message.';
      this.logger.warn(errMsg);
      return { status: 'failed', error: errMsg };
    }

    const chatLink = await this.findChatLink(options);
    if (!chatLink) {
      this.logger.warn(
        `No Telegram link found for user/phone; skipping send. userId=${options.userId ?? 'n/a'} phone=${
          options.phone ?? 'n/a'
        }`,
      );
      return { status: 'not_connected', error: 'no_link' };
    }

    const ok = await this.sendPostInternal({
      chatId: chatLink.chatId,
      postId: options.postId,
      retryMissingPhone: options.retryMissingPhone !== false,
      customMessage: options.customMessage,
    });
    return { status: ok ? 'sent' : 'failed', error: ok ? undefined : 'send_failed' };
  }

  private async findChatLink(options: { userId?: string; phone?: string }) {
    if (options.userId) {
      const byUser = await this.prisma.telegramUserLink.findFirst({
        where: { userId: options.userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (byUser) return byUser;
    }

    if (options.phone) {
      const digits = options.phone.replace(/\D+/g, '');
      const candidates = new Set<string>([options.phone]);
      if (digits) {
        candidates.add(digits);
        candidates.add(`+${digits}`);
      }
      const byPhone = await this.prisma.telegramUserLink.findFirst({
        where: { phone: { in: Array.from(candidates) } },
        orderBy: { updatedAt: 'desc' },
      });
      if (byPhone) return byPhone;
    }

    return null;
  }

  private async sendPostInternal(params: {
    chatId: string;
    postId: string;
    retryMissingPhone: boolean;
    customMessage?: string;
  }): Promise<boolean> {
    await this.ensureSender();
    if (!this.sender) {
      this.logger.warn('Telegram sender is not available.');
      return false;
    }
    const { chatId, postId, retryMissingPhone, customMessage } = params;

    const post = await this.prisma.divarPost.findUnique({
      where: { id: postId },
      include: {
        medias: {
          orderBy: { position: 'asc' },
          select: { url: true, thumbnailUrl: true, localUrl: true, position: true },
        },
      },
    });

    if (!post) {
      this.logger.warn(`Post not found: ${postId}`);
      return false;
    }

    // If phone is missing, optionally wait 30 seconds and retry once after refetch.
    if (!post.phoneNumber && retryMissingPhone) {
      await this.delay(30_000);
      return this.sendPostInternal({ chatId, postId, retryMissingPhone: false });
    }

    const dashboardUrl = this.buildDashboardPostUrl(post.id);
    const caption = this.buildCaption(post, customMessage, dashboardUrl);

    const photos = (post.medias ?? [])
      .map((m) => m.localUrl || m.url || m.thumbnailUrl)
      .filter(Boolean) as string[];
    const limitedPhotos = photos.slice(0, 10);
    const replyMarkup = this.buildPostMetaMarkup(
      post.code,
      dashboardUrl,
      limitedPhotos.length > 0 ? post.id : null,
    );
    const extra = {
      link_preview_options: { is_disabled: true },
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    // Split into batches of 10; only the last batch carries the caption on its first item.
    if (limitedPhotos.length === 0) {
      try {
        await this.sendWithRetry(
          'sendMessage',
          () => this.sender!.sendMessage(chatId, caption || 'جزئیات آگهی', extra),
          { chatId },
        );
        return true;
      } catch (err) {
        this.logger.error(
          `Failed to send message for post ${postId} to chat ${chatId}: ${String(
            (err as any)?.response?.description ?? (err as Error).message,
          )}`,
        );
        return false;
      }
    }

    if (limitedPhotos.length === 1) {
      try {
        await this.sendWithRetry(
          'sendPhoto',
          () =>
            this.sender!.sendPhoto(chatId, limitedPhotos[0], {
              caption: caption || 'جزئیات آگهی',
              reply_markup: replyMarkup,
            }),
          { chatId },
        );
        return true;
      } catch (err) {
        this.logger.error(
          `Failed to send photo for post ${postId} to chat ${chatId}: ${String(
            (err as any)?.response?.description ?? (err as Error).message,
          )}`,
        );
        return false;
      }
    }

    const batches: string[][] = [limitedPhotos];

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b].map((url) => ({
        type: 'photo',
        media: url,
        caption: undefined,
      })) as any[];

      try {
        await this.sendWithRetry(
          `sendMediaGroup(${b + 1}/${batches.length})`,
          () => this.sender!.sendMediaGroup(chatId, batch),
          {
            chatId,
            cost: batch.length,
            timeoutMs: this.mediaGroupTimeoutMs(batch.length),
            perChatCost: 1,
          },
        );
      } catch (err) {
        const errMsg = `Failed to send batch ${b + 1}/${batches.length} for post ${postId} to chat ${chatId}: ${String(
          (err as any)?.response?.description ?? (err as Error).message,
        )}`;
        this.logger.error(errMsg);
        return false;
      }
    }

    try {
      await this.sendWithRetry(
        'sendMessage',
        () => this.sender!.sendMessage(chatId, caption || 'جزئیات آگهی', extra),
        { chatId },
      );
    } catch (err) {
      this.logger.error(
        `Failed to send caption message for post ${postId} to chat ${chatId}: ${String(
          (err as any)?.response?.description ?? (err as Error).message,
        )}`,
      );
      return false;
    }

    return true;
  }

  private async sendPostPhotosZip(params: {
    chatId: number | string;
    postId: string;
    replyToMessageId?: number;
  }): Promise<boolean> {
    await this.ensureSender();
    if (!this.sender) {
      this.logger.warn('Telegram sender is not available.');
      return false;
    }
    const zipUrl = this.buildPostPhotosZipUrl(params.postId);
    if (!zipUrl) {
      this.logger.warn('API base URL is missing; cannot build photo ZIP URL.');
      return false;
    }

    const extra = params.replyToMessageId
      ? ({
          reply_parameters: {
            message_id: params.replyToMessageId,
            allow_sending_without_reply: true,
          },
          reply_to_message_id: params.replyToMessageId,
        } as any)
      : undefined;

    const filename = await this.buildZipFilename(params.postId);

    try {
      await this.sendWithRetry(
        'sendDocument',
        () =>
          this.sender!.sendDocument(params.chatId, Input.fromURLStream(zipUrl, filename), extra),
        { chatId: params.chatId },
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send photo ZIP for post ${params.postId} to chat ${params.chatId}: ${String(
          (err as any)?.response?.description ?? (err as Error).message,
        )}`,
      );
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildPostMetaMarkup(
    code?: number | null,
    url?: string | null,
    postId?: string | null,
  ): InlineKeyboardMarkup | undefined {
    const rows: InlineKeyboardMarkup['inline_keyboard'] = [];
    if (url) {
      rows.push([{ text: 'مشاهده آگهی', url }]);
    }
    if (code) {
      rows.push([{ text: 'کپی کد آگهی', copy_text: { text: String(code) } } as any]);
    }
    if (postId) {
      rows.push([{ text: 'دانلود تصاویر (زیپ)', callback_data: `zip:${postId}` }]);
    }
    return rows.length ? { inline_keyboard: rows } : undefined;
  }

  private buildPostPhotosZipUrl(postId: string): string | null {
    if (!this.apiBaseUrl) {
      return null;
    }
    return `${this.apiBaseUrl}/divar-posts/${postId}/photos.zip`;
  }

  private async buildZipFilename(postId: string): Promise<string> {
    const record = await this.prisma.divarPost.findUnique({
      where: { id: postId },
      select: { code: true, externalId: true },
    });
    const label =
      record?.code && Number.isFinite(record.code)
        ? String(record.code)
        : (record?.externalId ?? postId);
    return `${this.sanitizeFileName(label) || 'post'}-photos.zip`;
  }

  private sanitizeFileName(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`telegram_timeout:${label}`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([task, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async sendWithRetry<T>(
    label: string,
    task: () => Promise<T>,
    options: TelegramSendOptions = {},
  ): Promise<T> {
    const maxAttempts = Math.max(1, this.sendRetryAttempts);
    const cost = options.cost ?? 1;
    const timeoutMs = options.timeoutMs ?? this.sendTimeoutMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        if (attempt > 1) {
          this.logger.warn(`Retrying Telegram ${label} (attempt ${attempt}/${maxAttempts}).`);
        }
        if (options.chatId) {
          await this.throttleChat(options.chatId, options.perChatCost ?? 1);
        }
        await this.throttleSend(cost);
        return await this.withTimeout(task(), timeoutMs, label);
      } catch (error) {
        const message = (error as any)?.response?.description ?? (error as Error).message;
        if (attempt >= maxAttempts) {
          this.logger.error(`Telegram ${label} failed after ${attempt} attempts: ${message}`);
          throw error;
        }
        const delayMs = this.resolveRetryDelayMs(error);
        this.logger.warn(
          `Telegram ${label} failed (attempt ${attempt}/${maxAttempts}): ${message}. Retrying in ${delayMs}ms.`,
        );
        await this.delay(delayMs);
      }
    }
    throw new Error(`Telegram ${label} failed after ${maxAttempts} attempts`);
  }

  private async throttleSend(cost: number): Promise<void> {
    const normalizedCost = Math.max(1, Math.min(Math.floor(cost), this.sendRateLimitPerSecond));
    this.sendRateLimitChain = this.sendRateLimitChain.then(() =>
      this.waitForRateLimitSlot(normalizedCost),
    );
    await this.sendRateLimitChain;
  }

  private async throttleChat(chatId: string | number, cost: number): Promise<void> {
    const normalizedCost = this.normalizeCost(cost, this.sendPerChatLimitPerSecond);
    const key = String(chatId);
    const previous = this.sendPerChatChains.get(key) ?? Promise.resolve();
    const current = previous.then(() => this.waitForChatRateLimitSlot(key, normalizedCost));
    this.sendPerChatChains.set(key, current);
    try {
      await current;
    } finally {
      if (this.sendPerChatChains.get(key) === current) {
        this.sendPerChatChains.delete(key);
      }
    }
  }

  private async waitForRateLimitSlot(cost: number): Promise<void> {
    const windowMs = 1000;
    while (true) {
      const now = Date.now();
      if (now < this.sendRateLimitUntil) {
        await this.delay(this.sendRateLimitUntil - now);
        continue;
      }
      this.sendRateLimitTimestamps = this.sendRateLimitTimestamps.filter(
        (ts) => now - ts < windowMs,
      );
      if (this.sendRateLimitTimestamps.length + cost <= this.sendRateLimitPerSecond) {
        for (let i = 0; i < cost; i += 1) {
          this.sendRateLimitTimestamps.push(now);
        }
        return;
      }
      const oldest = this.sendRateLimitTimestamps[0];
      const waitMs = Math.max(0, windowMs - (now - oldest));
      await this.delay(waitMs);
    }
  }

  private async waitForChatRateLimitSlot(chatId: string, cost: number): Promise<void> {
    const limit = Math.max(1, this.sendPerChatLimitPerSecond);
    const windowMs = 1000;
    while (true) {
      const now = Date.now();
      const timestamps = this.sendPerChatTimestamps.get(chatId) ?? [];
      const recent = timestamps.filter((ts) => now - ts < windowMs);
      if (recent.length + cost <= limit) {
        for (let i = 0; i < cost; i += 1) {
          recent.push(now);
        }
        this.sendPerChatTimestamps.set(chatId, recent);
        return;
      }
      this.sendPerChatTimestamps.set(chatId, recent);
      const oldest = recent[0];
      const waitMs = Math.max(0, windowMs - (now - oldest));
      await this.delay(waitMs);
    }
  }

  private resolveRetryDelayMs(error: unknown): number {
    const retryAfter = (error as any)?.response?.parameters?.retry_after;
    const retryAfterMs = typeof retryAfter === 'number' ? retryAfter * 1000 : 0;
    if (retryAfterMs > 0) {
      const until = Date.now() + retryAfterMs;
      if (until > this.sendRateLimitUntil) {
        this.sendRateLimitUntil = until;
      }
    }
    return Math.max(this.sendRetryDelayMs, retryAfterMs);
  }

  private normalizeCost(cost: number, limit: number): number {
    return Math.max(1, Math.min(Math.floor(cost), Math.max(1, limit)));
  }

  private mediaGroupTimeoutMs(batchSize: number): number {
    const extra = Math.max(1, batchSize) * 1000;
    return this.sendTimeoutMs + extra;
  }

  private toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '').trim();
  }

  private buildDashboardPostUrl(postId: string): string | null {
    if (!this.appBaseUrl) {
      return null;
    }
    return `${this.appBaseUrl}/dashboard/posts/${postId}`;
  }

  private buildCaption(post: any, customMessage?: string, dashboardUrl?: string | null): string {
    const url =
      post.shareUrl ||
      post.permalink ||
      (post.externalId ? `https://divar.ir/v/${post.externalId}` : '');
    const title = post.title || post.shareTitle || post.displayTitle || 'آگهی';
    const lines: string[] = [];
    if (customMessage) lines.push(customMessage);
    lines.push(`📌 ${title}`);
    if (post.code) {
      lines.push(`🆔 کد آگهی: ${post.code}`);
    }
    if (dashboardUrl) {
      lines.push(`🔗 ${dashboardUrl}`);
    }

    if (post.cityName || post.districtName || post.provinceName) {
      const loc = [post.provinceName, post.cityName, post.districtName].filter(Boolean).join('، ');
      if (loc) lines.push(`📍 ${loc}`);
    }

    const priceLine = this.formatPriceLine(post);
    if (priceLine) lines.push(priceLine);

    const facts: string[] = [];
    if (post.area) facts.push(`متراژ ${post.area}`);
    if (post.rooms) facts.push(`اتاق ${post.rooms}`);
    if (post.floor) facts.push(`طبقه ${post.floor}`);
    if (post.yearBuilt) facts.push(`سال ساخت ${post.yearBuilt}`);
    if (post.businessType) {
      const business = post.businessType === 'personal' ? 'شخصی' : 'املاک';
      facts.push(business);
    }
    if (facts.length) lines.push(`ℹ️ ${facts.join(' • ')}`);

    if (post.phoneNumber) lines.push(`☎️ ${post.phoneNumber}`);
    if (url) lines.push(url);

    if (post.description) {
      const desc =
        post.description.length > 900
          ? `${post.description.slice(0, 900).trimEnd()}…`
          : post.description;
      lines.push('');
      lines.push(desc);
    }

    const caption = lines.join('\n');
    return caption.length > 1000 ? `${caption.slice(0, 1000).trimEnd()}…` : caption;
  }

  private formatPriceLine(post: any): string | null {
    const fmt = (value: any) => {
      if (value === null || value === undefined) return null;
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return num.toLocaleString('fa-IR');
    };

    const price = fmt(post.priceTotal);
    const deposit = fmt(post.depositAmount);
    const rent = fmt(post.rentAmount);

    if (price) return `💰 قیمت: ${price} تومان`;
    if (deposit || rent) {
      const parts = [];
      if (deposit) parts.push(`ودیعه ${deposit}`);
      if (rent) parts.push(`اجاره ${rent}`);
      return `💰 ${parts.join(' / ')} تومان`;
    }
    return null;
  }
}
