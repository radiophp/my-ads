import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Markup, Telegraf, Telegram, session, Input } from 'telegraf';
import type { InlineKeyboardMarkup } from '@telegraf/types';
import { PrismaService } from '../../platform/database/prisma.service';
import { RedisService } from '../../platform/cache/redis.service';
import { BaleLinkGateway } from './bale-link.gateway';
import { buildCaption, buildDashboardPostUrl, buildBaleDeepLink } from './bale-message-builder';

const BALE_API_ROOT = 'https://tapi.bale.ai';

type BotSession = { phone?: string };
type BotContext = Context & { session?: BotSession };
type BaleSendOptions = {
  cost?: number;
  chatId?: string | number;
  timeoutMs?: number;
  perChatCost?: number;
};

@Injectable()
export class BaleBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaleBotService.name);
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
  private readonly sendPhotos: boolean;
  private readonly appBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly baleBotUsername: string;
  private sendRateLimitChain: Promise<void> = Promise.resolve();
  private sendRateLimitTimestamps: number[] = [];
  private sendRateLimitUntil = 0;
  private sendPerChatChains = new Map<string, Promise<void>>();
  private sendPerChatTimestamps = new Map<string, number[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly baleLinkGateway: BaleLinkGateway,
  ) {
    this.sendTimeoutMs = this.toNumber(
      this.configService.get<string>('BALE_SEND_TIMEOUT_MS'),
      8000,
    );
    this.sendRetryAttempts = this.toNumber(
      this.configService.get<string>('BALE_SEND_RETRY_ATTEMPTS'),
      5,
    );
    this.sendRetryDelayMs = this.toNumber(
      this.configService.get<string>('BALE_SEND_RETRY_DELAY_MS'),
      5000,
    );
    this.sendRateLimitPerSecond = this.toNumber(
      this.configService.get<string>('BALE_SEND_RATE_LIMIT_PER_SEC'),
      20,
    );
    this.sendPerChatLimitPerSecond = this.toNumber(
      this.configService.get<string>('BALE_SEND_PER_CHAT_LIMIT_PER_SEC'),
      2,
    );
    this.pollingRetryDelayMs = this.toNumber(
      this.configService.get<string>('BALE_POLLING_RETRY_DELAY_MS'),
      60_000,
    );
    this.sendPhotos = this.configService.get<string>('BALE_SEND_PHOTOS') === 'true';
    this.appBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ??
        this.configService.get<string>('APP_PUBLIC_URL') ??
        '',
    );
    this.apiBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('NEXT_PUBLIC_API_BASE_URL') ??
        (this.appBaseUrl ? `${this.appBaseUrl}/api` : ''),
    );
    this.baleBotUsername = this.configService.get<string>('BALE_BOT_USERNAME') ?? '';
  }

  onModuleInit(): void {
    const autoStart = this.configService.get<string>('BALE_BOT_AUTOSTART') === 'true';
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
      const token = this.configService.get<string>('BALE_BOT_TOKEN');
      if (!token) {
        this.logger.warn('BALE_BOT_TOKEN is not set; bale bot not started.');
        return;
      }

      this.sender = new Telegram(token, { apiRoot: BALE_API_ROOT });

      this.bot = new Telegraf<BotContext>(token, {
        handlerTimeout: 9_000,
        telegram: { apiRoot: BALE_API_ROOT },
      });
      this.bot.use(session());
      this.bot.use(async (ctx, next) => {
        const baleId = ctx.from?.id;
        if (baleId && ctx.session && !ctx.session.phone) {
          const cached = this.phoneCache.get(baleId);
          if (cached) {
            ctx.session.phone = cached;
          }
        }
        return next();
      });

      this.bot.start(async (ctx: BotContext) => {
        const payload = (ctx as any).startPayload ?? '';
        if (payload.startsWith('link_')) {
          const token = payload.slice(5);
          const chatId = ctx.chat?.id;
          if (token && chatId) {
            await this.redisService
              .pSetEx(`bale-chat-token:${chatId}`, 300_000, token)
              .catch((err) =>
                this.logger.error(`Failed to store bale-chat-token: ${(err as Error).message}`),
              );
          }
        }

        await ctx.reply(
          'سلام! \u{1F44B} لطفاً با دکمه زیر شماره تماس خود را ارسال کنید.',
          Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
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

        if (contactUserId && senderId && contactUserId !== senderId) {
          await ctx.reply(
            'لطفاً شماره خودتان را ارسال کنید (نه شماره شخص دیگر). روی \u{1F4F1} ارسال شماره تماس بزنید.',
            Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
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
            const token = await this.redisService
              .get(`bale-chat-token:${chatId}`)
              .catch(() => null);

            if (token) {
              const expectedPhone = await this.redisService
                .get(`bale-link-token:${token}`)
                .catch(() => null);

              if (!expectedPhone) {
                await this.redisService.del(`bale-chat-token:${chatId}`).catch(() => {});
                await ctx.reply(
                  '⏰ لینک منقضی شده است. لطفاً از وب‌سایت دوباره تلاش کنید.',
                  Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
                    .oneTime()
                    .resize(),
                );
                return;
              }

              const normalizedShared = phone.replace(/\D+/g, '');
              const normalizedExpected = expectedPhone.replace(/\D+/g, '');

              if (normalizedShared !== normalizedExpected) {
                await ctx.reply(
                  `⚠️ شما با شماره ${phone} در بله وارد شده‌اید.\nلطفاً با شماره ${expectedPhone} در بله وارد شوید و دوباره تلاش کنید.`,
                  Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
                    .oneTime()
                    .resize(),
                );
                return;
              }

              await this.redisService.del(`bale-chat-token:${chatId}`).catch(() => {});
            }

            void this.saveBaleLink({
              baleId: String(contactUserId ?? senderId ?? chatId),
              chatId: String(chatId),
              phone,
            });
          }

          await ctx.reply(
            `ممنون! شماره شما دریافت شد: ${phone}`,
            Markup.keyboard([['\u{1F4C2} نمایش فیلترهای ذخیره‌شده']]).resize(),
          );

          return;
        } else {
          await ctx.reply('خطا در خواندن شماره. لطفاً دوباره تلاش کنید.');
        }
      });

      this.bot.command('filters', (ctx: BotContext) => this.handleSavedFilters(ctx));
      this.bot.hears('\u{1F4C2} نمایش فیلترهای ذخیره‌شده', (ctx: BotContext) =>
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
          `Bale ZIP requested for post ${postId} (chat ${chatId}, message ${messageId ?? 'n/a'}).`,
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
          this.logger.warn(`Bale ZIP failed for post ${postId} (chat ${chatId}).`);
        } else {
          this.logger.log(`Bale ZIP sent for post ${postId} (chat ${chatId}).`);
        }
      });

      this.bot.on('message', async (ctx: BotContext, next) => {
        const msg = ctx.message as any;
        if (msg?.web_app_data) {
          try {
            const data = JSON.parse(msg.web_app_data.data);
            if (data.action === 'share_post' && data.postId) {
              const chatId = ctx.chat?.id;
              if (chatId) {
                this.sendPostInternal({
                  chatId: String(chatId),
                  postId: data.postId,
                  retryMissingPhone: false,
                  forceSendPhotos: true,
                }).catch((err) =>
                  this.logger.error(`Failed to send shared post: ${(err as Error).message}`),
                );
              }
            }
          } catch (err) {
            this.logger.warn(`Failed to parse web_app_data: ${(err as Error).message}`);
          }
          return;
        }
        return next();
      });

      this.bot.on('text', async (ctx: BotContext, next) => {
        if (await this.getPhone(ctx)) {
          return next();
        }
        await ctx.reply(
          'لطفاً روی \u{1F4F1} ارسال شماره تماس بزنید تا شماره شما دریافت شود.',
          Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
            .oneTime()
            .resize(),
        );
        return;
      });

      await this.launchWithRetry();
      this.started = true;
      this.logger.log('Bale bot started (polling).');
    } finally {
      this.starting = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.started) {
      await this.bot.stop();
      this.logger.log('Bale bot stopped.');
    }
  }

  private async launchWithRetry(): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      throw new Error('Bale bot is not initialized.');
    }

    while (true) {
      try {
        await bot.launch();
        return;
      } catch (error) {
        if (this.isPollingConflict(error)) {
          this.logger.warn(
            `Bale polling conflict detected; retrying in ${this.pollingRetryDelayMs}ms.`,
          );
          await this.delay(this.pollingRetryDelayMs);
          continue;
        }
        if (this.isTransientNetworkError(error)) {
          this.logger.warn(`Bale launch network error; retrying in ${this.pollingRetryDelayMs}ms.`);
          await this.delay(this.pollingRetryDelayMs);
          continue;
        }
        throw error;
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

  private isTransientNetworkError(error: unknown): boolean {
    const errorCode =
      (error as { code?: string; errno?: string })?.code ??
      (error as { code?: string; errno?: string })?.errno ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (errorCode) {
      return ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(
        errorCode,
      );
    }
    const message = (error as Error)?.message?.toLowerCase() ?? '';
    return (
      message.includes('econnreset') ||
      message.includes('timeout') ||
      message.includes('temporarily') ||
      message.includes('network')
    );
  }

  private async handleSavedFilters(ctx: BotContext): Promise<void> {
    const phone = await this.getPhone(ctx);
    if (!phone) {
      await ctx.reply(
        'ابتدا باید شماره خود را ارسال کنید. روی \u{1F4F1} ارسال شماره تماس بزنید.',
        Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
          .oneTime()
          .resize(),
      );
      return;
    }

    const user = await this.findUserByPhone(phone);
    if (!user) {
      await ctx.reply(
        'کاربری با این شماره پیدا نشد. لطفاً ابتدا در اپ ثبت‌نام کنید.',
        Markup.keyboard([Markup.button.contactRequest('\u{1F4F1} ارسال شماره تماس')])
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
    const baleId = ctx.from?.id;
    if (!baleId) {
      return undefined;
    }
    const cached = this.phoneCache.get(baleId);
    if (cached) {
      if (ctx.session) {
        ctx.session.phone = cached;
      }
      return cached;
    }

    const chatId = ctx.chat?.id;
    const link = await this.prisma.baleUserLink.findFirst({
      where: {
        OR: [{ baleId: String(baleId) }, ...(chatId ? [{ chatId: String(chatId) }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (link?.phone) {
      this.phoneCache.set(baleId, link.phone);
      if (ctx.session) ctx.session.phone = link.phone;
      return link.phone;
    }
    return undefined;
  }

  private getBotId(): string {
    const token = this.configService.get<string>('BALE_BOT_TOKEN');
    return token?.split(':')[0] ?? '';
  }

  private async ensureSender(): Promise<void> {
    if (this.sender) {
      return;
    }
    const token = this.configService.get<string>('BALE_BOT_TOKEN');
    if (!token) {
      this.logger.warn('BALE_BOT_TOKEN is not set; bale sender not initialized.');
      return;
    }
    this.sender = new Telegram(token, { apiRoot: BALE_API_ROOT });
  }

  private async saveBaleLink(params: { baleId: string; chatId: string; phone: string }) {
    const { baleId, chatId, phone } = params;
    const botId = this.getBotId();
    const user = await this.findUserByPhone(phone);
    await this.prisma.baleUserLink.upsert({
      where: { baleId },
      update: { chatId, phone, botId, userId: user?.id ?? null },
      create: { baleId, chatId, phone, botId, userId: user?.id ?? null },
    });
    if (baleId) {
      this.phoneCache.set(Number(baleId), phone);
    }
    await this.baleLinkGateway.emitLinked(phone);
  }

  async sendOtpToUser(
    phone: string,
    otpCode: string,
    deviceInfo?: string,
    userId?: string,
  ): Promise<{ status: 'sent' | 'not_connected' | 'failed'; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { status: 'failed', error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ phone, userId });
    if (!chatLink) {
      return { status: 'not_connected', error: 'no_link' };
    }

    const deviceSuffix = deviceInfo ? `\n\n${deviceInfo}` : '';
    try {
      await this.sendWithRetry(
        'sendOtp',
        () =>
          this.sender!.sendMessage(
            chatLink.chatId,
            `<b>کد ورود شما: <code>${otpCode}</code></b>\n\nاین کد تا ۵ دقیقه معتبر است.${deviceSuffix}`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [[{ text: 'کپی کد تأیید', copy_text: { text: otpCode } } as any]],
              },
            },
          ),
        { chatId: chatLink.chatId },
      );
      this.logger.log(`OTP sent to ${phone} via Bale (chat ${chatLink.chatId})`);
      return { status: 'sent' };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(`Failed to send OTP to ${phone} via Bale: ${errMsg}`);
      return { status: 'failed', error: errMsg };
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
      const errMsg = 'Bale bot sender is not initialized; cannot send message.';
      this.logger.warn(errMsg);
      return { status: 'failed', error: errMsg };
    }

    const chatLink = await this.findChatLink(options);
    if (!chatLink) {
      this.logger.warn(
        `No Bale link found for user/phone; skipping send. userId=${options.userId ?? 'n/a'} phone=${
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
    const botId = this.getBotId();

    if (options.userId) {
      const byUser = await this.prisma.baleUserLink.findFirst({
        where: { userId: options.userId, botId },
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
      const byPhone = await this.prisma.baleUserLink.findFirst({
        where: { phone: { in: Array.from(candidates) }, botId },
        orderBy: { updatedAt: 'desc' },
      });
      if (byPhone) return byPhone;
    }

    return null;
  }

  async sendActivationApproved(userId: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { success: false, error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat link not found' };
    }

    try {
      await this.sendWithRetry(
        'activationApproved',
        () =>
          this.sender!.sendMessage(
            chatLink.chatId,
            '✅ درخواست فعال‌سازی حساب شما تأیید شد.\nهم‌اکنون می‌توانید از <a href="https://ble.ir">سامانه ماهان فایل</a> یکی از برنامه‌های اشتراک را فعال کنید.',
            { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
          ),
        { chatId: chatLink.chatId },
      );
      return { success: true };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(`Failed to send activation approved to user ${userId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  async sendPaymentReviewed(paymentId: string): Promise<{ success: boolean; error?: string }> {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { package: { select: { title: true } } },
    });
    if (!payment) return { success: false, error: 'Payment not found' };

    const formattedAmount = Number(payment.amount).toLocaleString('fa-IR');

    let districtLines = '';
    const assignments = payment.districtAssignments as Record<
      string,
      { id: number; name: string; cityName: string }[]
    >;
    if (assignments) {
      for (const [featureKey, districts] of Object.entries(assignments)) {
        if (districts.length > 0) {
          const names = districts.map((d) => `${d.name} (${d.cityName})`).join('، ');
          const featureLabel =
            {
              districts_limit: 'مناطق تحت پوشش',
              builders_archive: 'آرشیو سازندگان',
              archive_history_quarters: 'آرشیو فصلی',
            }[featureKey] ?? featureKey;
          districtLines += `\n🏘 ${featureLabel}: ${names}`;
        }
      }
    }

    const msg = `🟡 صورتحساب اشتراک «${payment.package.title}» توسط مدیر بررسی و تأیید شد.\nمبلغ نهایی: ${formattedAmount} ریال${districtLines}\nلطفاً رسید پرداخت را در پنل کاربری بارگذاری کنید.`;
    return this.sendPaymentMessage(payment.userId, msg);
  }

  async sendPaymentApproved(paymentId: string): Promise<{ success: boolean; error?: string }> {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { package: { select: { title: true } } },
    });
    if (!payment) return { success: false, error: 'Payment not found' };

    return this.sendPaymentMessage(
      payment.userId,
      `✅ پرداخت شما تأیید شد.\nاشتراک «${payment.package.title}» با موفقیت فعال شد.\nاز <a href="https://ble.ir">سامانه ماهان فایل</a> می‌توانید از امکانات اشتراک خود استفاده کنید.`,
    );
  }

  async sendPaymentRejected(
    paymentId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { package: { select: { title: true } } },
    });
    if (!payment) return { success: false, error: 'Payment not found' };

    const reasonText = reason ? `\nدلیل: ${reason}` : '';
    return this.sendPaymentMessage(
      payment.userId,
      `❌ پرداخت شما برای اشتراک «${payment.package.title}» رد شد.${reasonText}\nبرای اطلاعات بیشتر به <a href="https://ble.ir">سامانه ماهان فایل</a> مراجعه کنید.`,
    );
  }

  async sendPaymentAutoCancelled(paymentId: string): Promise<{ success: boolean; error?: string }> {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { package: { select: { title: true } } },
    });
    if (!payment) return { success: false, error: 'Payment not found' };

    return this.sendPaymentMessage(
      payment.userId,
      `⏰ پرداخت شما برای اشتراک «${payment.package.title}» به دلیل گذشت مهلت زمانی توسط سیستم لغو شد.\nدر صورت تمایل می‌توانید مجدداً فرایند خرید را از <a href="https://ble.ir">سامانه ماهان فایل</a> آغاز کنید.`,
    );
  }

  async sendSubscriptionExpired(
    userId: string,
    packageTitle: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { success: false, error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat link not found' };
    }

    try {
      await this.sendWithRetry(
        'subscriptionExpired',
        () =>
          this.sender!.sendMessage(
            chatLink.chatId,
            `⏰ اشتراک شما برای پکیج «${packageTitle}» به پایان رسیده است.\nدر نتیجه مجموعه‌های فیلتر شما غیرفعال شدند.\nبرای تمدید اشتراک و فعال‌سازی مجدد امکانات به <a href="https://ble.ir">سامانه ماهان فایل</a> مراجعه کنید.`,
            { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
          ),
        { chatId: chatLink.chatId },
      );
      return { success: true };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(
        `Failed to send subscription expired notification to user ${userId}: ${errMsg}`,
      );
      return { success: false, error: errMsg };
    }
  }

  async sendNotificationLimitWarning(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { success: false, error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat link not found' };
    }

    try {
      await this.sendWithRetry(
        'notificationLimitWarning',
        () =>
          this.sender!.sendMessage(
            chatLink.chatId,
            '⚠️ شما به محدودیت تعداد اعلان‌های روزانه خود رسیده‌اید.\nارسال اعلان‌های جدید از ساعت ۰۰:۰۰ بامداد فردا از سر گرفته خواهد شد.',
            { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
          ),
        { chatId: chatLink.chatId },
      );
      return { success: true };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(`Failed to send notification limit warning to user ${userId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  private async sendPaymentMessage(
    userId: string,
    message: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { success: false, error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat link not found' };
    }

    try {
      await this.sendWithRetry(
        'paymentNotification',
        () =>
          this.sender!.sendMessage(chatLink.chatId, message, {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
        { chatId: chatLink.chatId },
      );
      return { success: true };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(`Failed to send payment notification to user ${userId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  async sendTextToUser(
    userId: string,
    text: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureSender();
    if (!this.sender) {
      return { success: false, error: 'Bale sender is not initialized' };
    }

    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat link not found' };
    }

    try {
      await this.sendWithRetry(
        'sendText',
        () =>
          this.sender!.sendMessage(chatLink.chatId, text, {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          }),
        { chatId: chatLink.chatId },
      );
      return { success: true };
    } catch (err) {
      const errMsg = (err as any)?.response?.description ?? (err as Error).message;
      this.logger.error(`Failed to send text to user ${userId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  async sharePostToUser(
    userId: string,
    postId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const chatLink = await this.findChatLink({ userId });
    if (!chatLink) {
      return { success: false, error: 'Bale chat not found' };
    }
    try {
      const ok = await this.sendPostInternal({
        chatId: chatLink.chatId,
        postId,
        retryMissingPhone: false,
        forceSendPhotos: true,
      });
      return { success: ok };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  private async sendPostInternal(params: {
    chatId: string;
    postId: string;
    retryMissingPhone: boolean;
    customMessage?: string;
    forceSendPhotos?: boolean;
  }): Promise<boolean> {
    await this.ensureSender();
    if (!this.sender) {
      this.logger.warn('Bale sender is not available.');
      return false;
    }
    const { chatId, postId, retryMissingPhone, customMessage, forceSendPhotos } = params;

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

    if (!post.phoneNumber && retryMissingPhone) {
      await this.delay(30_000);
      return this.sendPostInternal({ chatId, postId, retryMissingPhone: false });
    }

    const dashboardUrl = buildDashboardPostUrl(this.appBaseUrl, post.id);
    const caption = buildCaption(post, this.appBaseUrl, customMessage, this.baleBotUsername);

    const photos = (post.medias ?? [])
      .map((m) => m.localUrl || m.url || m.thumbnailUrl)
      .filter(Boolean) as string[];
    const shouldSendPhotos = this.sendPhotos || forceSendPhotos;
    const limitedPhotos = shouldSendPhotos ? photos.slice(0, 10) : [];
    const replyMarkup = this.buildPostMetaMarkup(
      post.code,
      dashboardUrl,
      photos.length > 0 ? post.id : null,
      this.baleBotUsername,
    );
    const extra = {
      link_preview_options: { is_disabled: true },
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

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

    const batch = limitedPhotos.map((url, i) => ({
      type: 'photo',
      media: url,
      ...(i === 0 ? { caption: caption || 'جزئیات آگهی' } : {}),
    })) as any[];

    try {
      await this.sendWithRetry('sendMediaGroup', () => this.sender!.sendMediaGroup(chatId, batch), {
        chatId,
        cost: batch.length,
        timeoutMs: this.mediaGroupTimeoutMs(batch.length),
        perChatCost: 1,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send media group for post ${postId} to chat ${chatId}: ${String(
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
      this.logger.warn('Bale sender is not available.');
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
    baleBotUsername?: string,
  ): InlineKeyboardMarkup | undefined {
    const rows: InlineKeyboardMarkup['inline_keyboard'] = [];
    if (url && baleBotUsername) {
      rows.push([{ text: 'مشاهده آگهی', url: buildBaleDeepLink(baleBotUsername, postId ?? '') }]);
    } else if (url) {
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
        reject(new Error(`bale_timeout:${label}`));
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
    options: BaleSendOptions = {},
  ): Promise<T> {
    const maxAttempts = Math.max(1, this.sendRetryAttempts);
    const cost = options.cost ?? 1;
    const timeoutMs = options.timeoutMs ?? this.sendTimeoutMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        if (attempt > 1) {
          this.logger.warn(`Retrying Bale ${label} (attempt ${attempt}/${maxAttempts}).`);
        }
        if (options.chatId) {
          await this.throttleChat(options.chatId, options.perChatCost ?? 1);
        }
        await this.throttleSend(cost);
        return await this.withTimeout(task(), timeoutMs, label);
      } catch (error) {
        const message = (error as any)?.response?.description ?? (error as Error).message;
        if (attempt >= maxAttempts) {
          this.logger.error(`Bale ${label} failed after ${attempt} attempts: ${message}`);
          throw error;
        }
        const delayMs = this.resolveRetryDelayMs(error);
        this.logger.warn(
          `Bale ${label} failed (attempt ${attempt}/${maxAttempts}): ${message}. Retrying in ${delayMs}ms.`,
        );
        await this.delay(delayMs);
      }
    }
    throw new Error(`Bale ${label} failed after ${maxAttempts} attempts`);
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
}
