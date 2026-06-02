import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { PrismaService } from '@app/platform/database/prisma.service';
import { StorageService } from '@app/platform/storage/storage.service';

type TagItem = {
  id: number;
  title: string;
  url: string;
  summary: string;
  info: string;
};

type ArticleData = {
  html: string | null;
  text: string;
  imageUrl: string | null;
  summary: string;
};

const BASE_URL = 'https://www.asriran.com';
const TAG_URLS = [
  `${BASE_URL}/fa/tags/407/1/مسکن`,
  `${BASE_URL}/fa/tags/7630/1/آپارتمان`,
  `${BASE_URL}/fa/tags/2305/1/املاک`,
];
const MAX_PAGES_PER_TAG = 2;
const ARTICLE_ID_PATTERN = /\/news\/(\d+)/;
const CATEGORY_SLUG = 'asriran-housing';
const CATEGORY_NAME = 'اخبار مسکن عصرایران';
const SOURCE_SLUG = 'asriran';
const SOURCE_NAME = 'عصر ایران';
const NEWS_SLUG_PREFIX = 'asriran';
const IMAGE_KEY_PREFIX = 'news/asriran';
const SOURCE_MARKER_PREFIX = '<!-- source: ';
const SOURCE_MARKER_SUFFIX = ' -->';

@Injectable()
export class AsriranCrawlerService {
  private readonly logger = new Logger(AsriranCrawlerService.name);
  private readonly schedulerEnabled: boolean;
  private readonly processedIds = new Set<number>();
  private lastRunAt = new Date(0);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.schedulerEnabled =
      this.configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron('*/15 * * * *')
  async crawlTags() {
    if (!this.schedulerEnabled) {
      this.logger.warn('Skipping Asriran crawl because scheduler is disabled.');
      return;
    }
    const startedAt = new Date();
    this.logger.log('Asriran housing crawl started.');

    try {
      const categoryId = await this.ensureCategoryId();
      const source = await this.resolveSource();
      if (!source.isActive) {
        this.logger.warn(`Asriran source disabled; skipping crawl. source=${source.name}`);
        return;
      }
      const items = await this.fetchTagItems();
      let newestRunAt = this.lastRunAt;

      for (const item of items) {
        if (this.processedIds.has(item.id)) {
          continue;
        }

        const slug = this.buildSlug(item.id);
        const existing = await this.prisma.news.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (existing) {
          this.processedIds.add(item.id);
          continue;
        }

        const article = await this.fetchArticle(item.url);
        const shortText = this.resolveShortText(item, article);
        const uploadedImageUrl = await this.downloadAndStoreImage(article.imageUrl, item.id);
        const inlineHtml = await this.replaceInlineImages(item.id, article.html);
        const content = this.buildContent(shortText, inlineHtml, item.url, article.text, item.info);

        await this.prisma.news.create({
          data: {
            title: item.title,
            slug,
            shortText: shortText || null,
            content,
            mainImageUrl: uploadedImageUrl,
            categoryId,
            sourceId: source.id,
            createdAt: new Date(),
          },
        });

        this.processedIds.add(item.id);
        if (startedAt > newestRunAt) {
          newestRunAt = startedAt;
        }
        this.logger.log(`Stored Asriran housing news ${slug}`);
        await this.sleep(300);
      }

      this.lastRunAt = newestRunAt;
      this.logger.log(`Asriran crawl finished. items=${items.length}`);
    } catch (error) {
      this.logger.error('Asriran housing crawl failed.', error as Error);
    } finally {
      const elapsedMs = Date.now() - startedAt.getTime();
      this.logger.debug(`Asriran crawl duration ${elapsedMs}ms.`);
    }
  }

  private async fetchTagItems(): Promise<TagItem[]> {
    const items = new Map<number, TagItem>();
    for (const tagUrl of TAG_URLS) {
      for (let page = 1; page <= MAX_PAGES_PER_TAG; page += 1) {
        const url = tagUrl.replace(/\/tags\/(\d+)\/\d+\//, `/tags/$1/${page}/`);
        const response = await axios.get<string>(url, {
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
          },
        });
        for (const item of this.parseTagPage(response.data)) {
          if (!items.has(item.id)) {
            items.set(item.id, item);
          }
        }
      }
    }
    return Array.from(items.values());
  }

  private parseTagPage(payload: string): TagItem[] {
    const $ = cheerio.load(payload);
    const results: TagItem[] = [];
    $('h3.Htags').each((_, element) => {
      const titleAnchor = $(element).find('a.tag_title').first();
      const title = this.cleanText(titleAnchor.text());
      const href = titleAnchor.attr('href') ?? '';
      const url = this.normalizeLink(href);
      const id = this.extractId(url);
      if (!id || !title || !url) {
        return;
      }

      const summary = this.cleanText($(element).nextAll('div.tag_summerize').first().text());
      const info = this.cleanText($(element).nextAll('div.tag_info').first().text());

      results.push({
        id,
        title,
        url,
        summary,
        info,
      });
    });
    return results;
  }

  private extractId(link: string): number | null {
    const match = link.match(ARTICLE_ID_PATTERN);
    if (!match) {
      return null;
    }
    const id = Number(match[1]);
    return Number.isNaN(id) ? null : id;
  }

  private normalizeLink(link: string): string {
    if (!link) return '';
    if (/^https?:\/\//i.test(link)) {
      return link;
    }
    return `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
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

  private buildSlug(id: number): string {
    return `${NEWS_SLUG_PREFIX}-${id}`;
  }

  private buildContent(
    shortText: string,
    articleHtml: string | null,
    link: string,
    articleText: string,
    info: string,
  ): string {
    const baseHtml = articleHtml?.length
      ? articleHtml
      : this.wrapPlainText(shortText || articleText || info);
    const infoHtml = info ? `<p>${this.escapeHtml(info)}</p>` : '';
    const marker = `${SOURCE_MARKER_PREFIX}${link}${SOURCE_MARKER_SUFFIX}`;
    if (baseHtml && baseHtml.length > 0) {
      return `${baseHtml}${infoHtml ? `\n${infoHtml}` : ''}\n${marker}`;
    }
    return `${infoHtml}\n${marker}`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private wrapPlainText(value: string): string {
    if (!value) {
      return '';
    }
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p>${escaped}</p>`;
  }

  private resolveShortText(item: TagItem, article: ArticleData): string {
    if (item.summary) {
      return item.summary;
    }
    if (article.summary) {
      return article.summary;
    }
    const trimmed = article.text.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length <= 240) {
      return trimmed;
    }
    return `${trimmed.slice(0, 237).trim()}...`;
  }

  private async fetchArticle(link: string): Promise<ArticleData> {
    try {
      const response = await axios.get<string>(link, {
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
        },
      });
      const $ = cheerio.load(response.data);
      const body = this.selectArticleBody($);
      body.find('div.news_end').remove();
      const afterBody = body.find('#MV_afterBody').first();
      if (afterBody.length) {
        afterBody.nextAll().remove();
        afterBody.remove();
      }
      let html = body.length ? (body.html()?.trim() ?? null) : null;
      if (html) {
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<!--.*?-->/gs, '');
        html = html.trim();
      }
      const text = this.cleanText(body.text() ?? '');
      const images: string[] = [];
      body.find('img').each((_, element) => {
        const src = $(element).attr('data-src') ?? $(element).attr('src');
        if (src) {
          images.push(this.normalizeLink(src));
        }
      });
      const summary = this.cleanText($('.subtitle').first().text() ?? '');
      const imageUrl = this.extractLeadImage($) ?? (images.length > 0 ? images[0] : null);

      return {
        html: html && html.length > 0 ? html : null,
        text,
        imageUrl,
        summary,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch Asriran article ${link}`, error as Error);
      return { html: null, text: '', imageUrl: null, summary: '' };
    }
  }

  private selectArticleBody($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
    const candidates = [
      'div.body',
      'div.item-text[itemprop="articleBody"]',
      'div.item-text',
      'div#item-text',
      'div.newsMainBody',
      'div[itemprop="articleBody"]',
    ];
    for (const selector of candidates) {
      const element = $(selector).first();
      if (element.length && this.cleanText(element.text()).length > 0) {
        return element;
      }
    }
    return $('div.body').first();
  }

  private extractLeadImage($: cheerio.CheerioAPI): string | null {
    const lead = $('img.lead_image').first().attr('src');
    if (lead) {
      return this.normalizeLink(lead);
    }
    const og = $('meta[property="og:image"]').attr('content');
    if (og) {
      return this.normalizeLink(og);
    }
    const twitter = $('meta[name="twitter:image"]').attr('content');
    if (twitter) {
      return this.normalizeLink(twitter);
    }
    return null;
  }

  private async replaceInlineImages(
    articleId: number,
    html: string | null,
  ): Promise<string | null> {
    if (!html) {
      return null;
    }

    const imageMatches = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)];
    if (imageMatches.length === 0) {
      return html;
    }

    const replacements = new Map<string, string>();
    let index = 1;

    for (const match of imageMatches) {
      const rawUrl = match[1];
      if (replacements.has(rawUrl)) {
        continue;
      }
      const normalizedUrl = this.normalizeLink(rawUrl);
      const storedUrl = await this.downloadAndStoreInlineImage(normalizedUrl, articleId, index);
      if (storedUrl) {
        replacements.set(rawUrl, storedUrl);
        index += 1;
      }
    }

    if (replacements.size === 0) {
      return html;
    }

    const $ = cheerio.load(html);
    $('img').each((_, element) => {
      const rawSrc = $(element).attr('src');
      const rawDataSrc = $(element).attr('data-src');
      const storedSrc = rawDataSrc
        ? replacements.get(rawDataSrc)
        : rawSrc
          ? replacements.get(rawSrc)
          : undefined;
      if (storedSrc) {
        $(element).attr('src', storedSrc);
        $(element).removeAttr('data-src');
      }
      const className = ($(element).attr('class') ?? '').trim();
      if (className) {
        const cleaned = className
          .split(/\s+/)
          .filter((value) => value && value !== 'lazyload')
          .join(' ');
        if (cleaned) {
          $(element).attr('class', cleaned);
        } else {
          $(element).removeAttr('class');
        }
      }
    });
    const updated = $.root().html();
    return updated ?? html;
  }

  private async downloadAndStoreImage(
    imageUrl: string | null,
    articleId: number,
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
      this.logger.warn(`Failed to store image for Asriran article ${articleId}`, error as Error);
      return null;
    }
  }

  private async downloadAndStoreInlineImage(
    imageUrl: string,
    articleId: number,
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
      this.logger.warn(
        `Failed to store inline image for Asriran article ${articleId}`,
        error as Error,
      );
      return null;
    }
  }

  private resolveImageExtension(url: string, contentType: string): string {
    const urlMatch = url.match(/\.(webp|png|jpe?g|gif)(?:\?|$)/i);
    if (urlMatch?.[1]) {
      return `.${urlMatch[1].toLowerCase()}`;
    }

    const normalizedType = contentType.toLowerCase();
    if (normalizedType.includes('image/webp')) return '.webp';
    if (normalizedType.includes('image/png')) return '.png';
    if (normalizedType.includes('image/jpeg')) return '.jpg';
    if (normalizedType.includes('image/jpg')) return '.jpg';
    if (normalizedType.includes('image/gif')) return '.gif';

    return '.jpg';
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async sleep(ms: number) {
    if (ms <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
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
}
