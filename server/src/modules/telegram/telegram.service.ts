import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Markup, Telegraf, Telegram, session } from 'telegraf';
import { PrismaService } from '../../platform/database/prisma.service';

type BotSession = { phone?: string };
type BotContext = Context & { session?: BotSession };

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Telegraf<BotContext>;
  private sender?: Telegram;
  private started = false;
  private phoneCache = new Map<number, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    // Optional auto-start when explicitly enabled to avoid running during normal HTTP boot.
    const autoStart = this.configService.get<string>('TELEGRAM_BOT_AUTOSTART') === 'true';
    if (autoStart) {
      void this.start();
    }
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

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

    await this.bot.launch();
    this.started = true;
    this.logger.log('Telegram bot started (polling).');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.started) {
      await this.bot.stop();
      this.logger.log('Telegram bot stopped.');
    }
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

    // If phone is missing, optionally wait 2 minutes and retry once after refetch.
    if (!post.phoneNumber && retryMissingPhone) {
      await this.delay(120_000);
      return this.sendPostInternal({ chatId, postId, retryMissingPhone: false });
    }

    const caption = this.buildCaption(post, customMessage);

    const photos = (post.medias ?? [])
      .map((m) => m.localUrl || m.url || m.thumbnailUrl)
      .filter(Boolean) as string[];

    // Split into batches of 10; only the last batch carries the caption on its first item.
    if (photos.length === 0) {
      await this.sender!.sendMessage(chatId, caption || 'جزئیات آگهی');
      return true;
    }

    const batches: string[][] = [];
    if (photos.length <= 10) {
      batches.push(photos);
    } else {
      const lastBatch = photos.slice(-10);
      const prefix = photos.slice(0, photos.length - 10);
      for (let i = 0; i < prefix.length; i += 10) {
        batches.push(prefix.slice(i, i + 10));
      }
      batches.push(lastBatch);
    }

    for (let b = 0; b < batches.length; b++) {
      const isLastBatch = b === batches.length - 1;
      const batch = batches[b].map((url, idx) => ({
        type: 'photo',
        media: url,
        caption: idx === 0 && isLastBatch ? caption : undefined,
      })) as any[];

      let attempts = 0;
      const maxAttempts = 3;
      let sent = false;
      while (attempts < maxAttempts) {
        attempts += 1;
        try {
          this.logger.log(
            `Sending post ${postId} batch ${b + 1}/${batches.length} to chat ${chatId} (attempt ${attempts})`,
          );
          await this.sender!.sendMediaGroup(chatId, batch);
          sent = true;
          break;
        } catch (err) {
          if (this.isRateLimitError(err) && attempts < maxAttempts) {
            await this.delay(1_000);
            continue;
          }
          const errMsg = `Failed to send batch ${b + 1}/${batches.length} for post ${postId} to chat ${chatId}: ${String(
            (err as any)?.response?.description ?? (err as Error).message,
          )}`;
          this.logger.error(errMsg);
          return false;
        }
      }
      if (!sent) return false;
    }

    return true;
  }

  private isRateLimitError(err: unknown): boolean {
    const anyErr = err as any;
    return Boolean(anyErr?.response?.error_code === 429);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildCaption(post: any, customMessage?: string): string {
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
