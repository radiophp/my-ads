import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { PrismaService } from '@app/platform/database/prisma.service';
import { StorageService } from '@app/platform/storage/storage.service';

type FeedItem = {
  title?: string;
  link?: string;
  description?: string;
  guid?: string | { '#text'?: string };
  pubDate?: string;
  enclosure?: { '@_url'?: string };
};

type ArticleData = {
  html: string | null;
  text: string;
  images: string[];
};

const FEED_URL = 'https://www.khabaronline.ir/rss/tp/21';
const BASE_URL = 'https://www.khabaronline.ir';
const ARTICLE_ID_PATTERN = /\/news\/(\d+)/;
const CATEGORY_SLUG = 'khabaronline-housing';
const CATEGORY_NAME = 'اخبار مسکن خبرآنلاین';
const SOURCE_SLUG = 'khabaronline';
const SOURCE_NAME = 'خبرآنلاین';
const NEWS_SLUG_PREFIX = 'khabar';
const IMAGE_KEY_PREFIX = 'news/khabaronline';
const SOURCE_MARKER_PREFIX = '<!-- source: ';
const SOURCE_MARKER_SUFFIX = ' -->';

@Injectable()
export class KhabarCrawlerService {
  private readonly logger = new Logger(KhabarCrawlerService.name);
  private readonly schedulerEnabled: boolean;
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '#text',
  });
  private lastRunAt = new Date(0);
  private readonly processedGuids = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.schedulerEnabled =
      this.configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron('*/15 * * * *')
  async crawlFeed() {
    if (!this.schedulerEnabled) {
      this.logger.warn('Skipping Khabaronline crawl because scheduler is disabled.');
      return;
    }
    const startedAt = new Date();
    this.logger.log('Khabaronline housing crawl started.');

    try {
      const source = await this.resolveSource();
      if (!source.isActive) {
        this.logger.warn(`Khabaronline source disabled; skipping crawl. source=${source.name}`);
        return;
      }
      const items = await this.fetchFeedItems();
      if (items.length === 0) {
        this.logger.log('Khabaronline feed returned no items.');
        return;
      }

      const categoryId = await this.ensureCategoryId();
      let newestPublishedAt = this.lastRunAt;

      for (const item of items) {
        const guid = this.extractGuid(item);
        if (!guid || this.processedGuids.has(guid)) {
          continue;
        }

        const publishedAt = this.parseDate(item.pubDate);
        if (!publishedAt) {
          continue;
        }

        if (publishedAt > newestPublishedAt) {
          newestPublishedAt = publishedAt;
        }

        if (publishedAt <= this.lastRunAt) {
          continue;
        }

        const link = this.normalizeLink(item.link ?? '');
        if (!link) {
          continue;
        }

        const articleId = this.extractArticleId(link, guid);
        const slug = this.buildSlug(articleId);
        const existing = await this.prisma.news.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (existing) {
          this.processedGuids.add(guid);
          continue;
        }

        const article = await this.fetchArticle(link);
        const mainImageUrl = await this.downloadAndStoreImage(
          item.enclosure?.['@_url'] ?? article.images[0] ?? null,
          articleId,
        );
        const inlineHtml = await this.replaceInlineImages(articleId, article.html);
        const content = this.buildContent(item.description ?? '', inlineHtml, link, article.text);

        await this.prisma.news.create({
          data: {
            title: this.cleanText(item.title ?? ''),
            slug,
            shortText: this.cleanText(item.description ?? '') || null,
            content,
            mainImageUrl,
            categoryId,
            sourceId: source.id,
            createdAt: publishedAt,
          },
        });

        this.processedGuids.add(guid);
        this.logger.log(`Stored housing news ${slug}`);
        await this.sleep(300);
      }

      this.lastRunAt = newestPublishedAt;
      this.logger.log(`Khabaronline crawl finished. items=${items.length}`);
    } catch (error) {
      this.logger.error('Khabaronline housing crawl failed.', error as Error);
    } finally {
      const elapsedMs = Date.now() - startedAt.getTime();
      this.logger.debug(`Khabaronline crawl duration ${elapsedMs}ms.`);
    }
  }

  private async fetchFeedItems(): Promise<FeedItem[]> {
    const response = await axios.get<string>(FEED_URL, {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyAdsBot/1.0)' },
    });
    const parsed = this.parser.parse(response.data);
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];
    if (Array.isArray(items)) {
      return items as FeedItem[];
    }
    return [items as FeedItem];
  }

  private extractGuid(item: FeedItem): string | null {
    if (!item.guid) {
      return item.link ?? null;
    }
    if (typeof item.guid === 'string') {
      return item.guid;
    }
    return item.guid['#text'] ?? item.link ?? null;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeLink(link: string): string {
    if (!link) return '';
    if (/^https?:\/\//i.test(link)) {
      return link;
    }
    return `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
  }

  private extractArticleId(link: string, guid: string): string {
    const match = link.match(ARTICLE_ID_PATTERN);
    if (match?.[1]) {
      return match[1];
    }
    const fallback = guid
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return fallback || String(Date.now());
  }

  private buildSlug(articleId: string): string {
    return `${NEWS_SLUG_PREFIX}-${articleId}`;
  }

  private cleanText(value: string): string {
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&raquo;/g, '»')
      .replace(/&laquo;/g, '«')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async fetchArticle(link: string): Promise<ArticleData> {
    const response = await axios.get<string>(link, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
      },
    });
    const $ = cheerio.load(response.data);
    const body = $('div.item-text[itemprop="articleBody"]').first();
    const html = body.length ? (body.html()?.trim() ?? null) : null;
    const text = this.cleanText(body.text() ?? '');
    const images: string[] = [];
    body.find('img').each((_, element) => {
      const src = $(element).attr('src') ?? $(element).attr('data-src');
      if (src) {
        images.push(this.normalizeLink(src));
      }
    });
    return {
      html,
      text,
      images,
    };
  }

  private buildContent(
    description: string,
    articleHtml: string | null,
    link: string,
    articleText: string,
  ): string {
    const cleanedDescription = this.cleanText(description);
    const baseHtml = articleHtml?.length
      ? articleHtml
      : this.wrapPlainText(cleanedDescription || articleText);
    const marker = `${SOURCE_MARKER_PREFIX}${link}${SOURCE_MARKER_SUFFIX}`;
    if (baseHtml && baseHtml.length > 0) {
      return `${baseHtml}\n${marker}`;
    }
    return marker;
  }

  private wrapPlainText(value: string): string {
    if (!value) {
      return '';
    }
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p>${escaped}</p>`;
  }

  private async replaceInlineImages(
    articleId: string,
    html: string | null,
  ): Promise<string | null> {
    if (!html) {
      return null;
    }

    const matches = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)];
    if (matches.length === 0) {
      return html;
    }

    const replacements = new Map<string, string>();
    let index = 1;
    for (const match of matches) {
      const rawUrl = match[1];
      if (replacements.has(rawUrl)) {
        continue;
      }
      const normalizedUrl = this.normalizeLink(rawUrl);
      const storedUrl = await this.downloadAndStoreInlineImage(normalizedUrl, articleId, index);
      if (storedUrl) {
        replacements.set(rawUrl, storedUrl);
        replacements.set(normalizedUrl, storedUrl);
        index += 1;
      }
    }

    if (replacements.size === 0) {
      return html;
    }

    let updated = html;
    for (const [rawUrl, storedUrl] of replacements) {
      updated = updated.replace(new RegExp(this.escapeRegExp(rawUrl), 'g'), storedUrl);
    }
    return updated;
  }

  private async downloadAndStoreImage(
    imageUrl: string | null,
    articleId: string,
  ): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }
    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
      });
      const contentType = String(response.headers['content-type'] ?? '');
      const extension = this.resolveImageExtension(imageUrl, contentType);
      const key = `${IMAGE_KEY_PREFIX}/${articleId}${extension}`;
      const buffer = Buffer.from(response.data);
      const stored = await this.storage.uploadObject({
        key,
        body: buffer,
        contentType: contentType || undefined,
        contentLength: buffer.length,
      });
      return stored.url;
    } catch (error) {
      this.logger.warn(`Failed to store image for article ${articleId}`, error as Error);
      return null;
    }
  }

  private async downloadAndStoreInlineImage(
    imageUrl: string,
    articleId: string,
    index: number,
  ): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }
    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
      });
      const contentType = String(response.headers['content-type'] ?? '');
      const extension = this.resolveImageExtension(imageUrl, contentType);
      const key = `${IMAGE_KEY_PREFIX}/${articleId}/inline-${index}${extension}`;
      const buffer = Buffer.from(response.data);
      const stored = await this.storage.uploadObject({
        key,
        body: buffer,
        contentType: contentType || undefined,
        contentLength: buffer.length,
      });
      return stored.url;
    } catch (error) {
      this.logger.warn(`Failed to store inline image for article ${articleId}`, error as Error);
      return null;
    }
  }

  private resolveImageExtension(url: string, contentType: string): string {
    const normalizedType = contentType.toLowerCase();
    if (normalizedType.includes('image/webp')) return '.webp';
    if (normalizedType.includes('image/png')) return '.png';
    if (normalizedType.includes('image/jpeg')) return '.jpg';
    if (normalizedType.includes('image/jpg')) return '.jpg';
    if (normalizedType.includes('image/gif')) return '.gif';

    const urlMatch = url.match(/\.(webp|png|jpe?g|gif)(?:\?|$)/i);
    if (urlMatch?.[1]) {
      return `.${urlMatch[1].toLowerCase()}`;
    }
    return '.jpg';
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async ensureCategoryId(): Promise<string> {
    const existing = await this.prisma.newsCategory.findUnique({
      where: { slug: CATEGORY_SLUG },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }
    const created = await this.prisma.newsCategory.create({
      data: { name: CATEGORY_NAME, slug: CATEGORY_SLUG, isActive: true },
      select: { id: true },
    });
    return created.id;
  }

  private async resolveSource(): Promise<{ id: string; isActive: boolean; name: string }> {
    const existing = await this.prisma.newsSource.findUnique({
      where: { slug: SOURCE_SLUG },
      select: { id: true, isActive: true, name: true },
    });
    if (existing) {
      return existing;
    }
    const created = await this.prisma.newsSource.create({
      data: {
        name: SOURCE_NAME,
        slug: SOURCE_SLUG,
        isActive: true,
      },
      select: { id: true, isActive: true, name: true },
    });
    return created;
  }

  private async sleep(ms: number) {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
