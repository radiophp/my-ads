import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '@app/platform/database/prisma.service';
import { StorageService } from '@app/platform/storage/storage.service';

type ParsedItem = {
  id: number;
  title: string;
  link: string;
  summary: string;
};

type ArticleData = {
  publishedAt: Date | null;
  imageUrl: string | null;
  content: string | null;
};

const BASE_URL = 'https://www.eghtesadonline.com';
const SECTION_PATH = '/fa/services/8/84';
const AJAX_PATH = '/fa/ajax/services/8/84';
const MAX_PAGES = 8;
const ARTICLE_ID_PATTERN = /\/fa\/news\/(\d+)/;
const DATE_JSON_PATTERN = /"datePublished"\s*:\s*"([^"]+)"/;
const OG_IMAGE_PATTERN = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i;
const TWITTER_IMAGE_PATTERN = /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i;
const LEAD_IMAGE_PATTERN = /<img[^>]+class="lead_image"[^>]+src="([^"]+)"/i;
const CATEGORY_SLUG = 'eghtesad-housing';
const CATEGORY_NAME = 'اخبار مسکن';
const NEWS_SLUG_PREFIX = 'eghtesad';
const IMAGE_KEY_PREFIX = 'news/eghtesadonline';
const SOURCE_MARKER_PREFIX = '<!-- source: ';
const SOURCE_MARKER_SUFFIX = ' -->';

@Injectable()
export class NewsCrawlerService {
  private readonly logger = new Logger(NewsCrawlerService.name);
  private lastRunAt = new Date(0);
  private lastSeenId = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron('*/10 * * * *')
  async crawlFeed() {
    const startedAt = new Date();
    this.logger.log('Eghtesad Online housing crawl started.');

    try {
      const items = await this.fetchSectionItems();
      const categoryId = await this.ensureCategoryId();
      let newestPublishedAt = this.lastRunAt;
      let newestId = this.lastSeenId;
      for (const item of items) {
        if (item.id > newestId) {
          newestId = item.id;
        }
      }

      for (const item of items) {
        if (item.id <= this.lastSeenId) {
          continue;
        }
        const slug = this.buildSlug(item.id);
        const existing = await this.prisma.news.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (existing) {
          continue;
        }
        const article = await this.fetchArticleData(item.link);
        if (!article.publishedAt) {
          continue;
        }
        if (article.publishedAt > newestPublishedAt) {
          newestPublishedAt = article.publishedAt;
        }
        if (article.publishedAt <= this.lastRunAt) {
          continue;
        }

        this.logger.log(
          `New housing item: ${item.title} | ${article.publishedAt.toISOString()} | ${item.link}`,
        );

        const uploadedImageUrl = await this.downloadAndStoreImage(article.imageUrl, item.id);
        const content = this.buildContent(item, article.content);

        await this.prisma.news.create({
          data: {
            title: item.title,
            slug,
            shortText: item.summary || null,
            content,
            mainImageUrl: uploadedImageUrl,
            categoryId,
            createdAt: article.publishedAt,
          },
        });

        this.logger.log(`Stored housing news ${slug}`);
      }

      this.lastRunAt = newestPublishedAt;
      this.lastSeenId = newestId;
      this.logger.log(
        `Eghtesad Online crawl finished. items=${items.length} lastSeenId=${this.lastSeenId}`,
      );
    } catch (error) {
      this.logger.error('Eghtesad Online housing crawl failed.', error as Error);
    } finally {
      const elapsedMs = Date.now() - startedAt.getTime();
      this.logger.debug(`Eghtesad Online crawl duration ${elapsedMs}ms.`);
    }
  }

  private async fetchSectionItems(): Promise<ParsedItem[]> {
    const items: ParsedItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = page === 1 ? `${BASE_URL}${SECTION_PATH}` : `${BASE_URL}${AJAX_PATH}/${page}`;
      const response = await axios.get<string>(url, { responseType: 'text' });
      const pageItems = this.parseSection(response.data);
      if (pageItems.length === 0) {
        break;
      }
      items.push(...pageItems);
      const hasNewer = pageItems.some((item) => item.id > this.lastSeenId);
      if (!hasNewer) {
        break;
      }
    }
    return items;
  }

  private parseSection(payload: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const articleRegex = /<article\s+class="newsList">([\s\S]*?)<\/article>/g;
    let match: RegExpExecArray | null;
    while ((match = articleRegex.exec(payload))) {
      const block = match[1];
      const link = this.extractLink(block);
      const title = this.extractTitle(block);
      const summary = this.extractSummary(block);
      if (!link || !title) {
        continue;
      }
      const id = this.extractId(link);
      if (!id) {
        continue;
      }
      items.push({
        id,
        title,
        link: this.normalizeLink(link),
        summary,
      });
    }
    return items;
  }

  private extractLink(block: string): string | null {
    const linkMatch = block.match(/href="([^"]+)"/);
    if (!linkMatch) return null;
    return linkMatch[1];
  }

  private extractTitle(block: string): string | null {
    const titleMatch = block.match(/<h2[^>]*class="title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) return null;
    return this.cleanText(titleMatch[1]);
  }

  private extractSummary(block: string): string {
    const summaryMatch = block.match(/<p[^>]*class="summery"[^>]*>([\s\S]*?)<\/p>/);
    if (!summaryMatch) return '';
    return this.cleanText(summaryMatch[1]);
  }

  private normalizeLink(link: string): string {
    if (/^https?:\/\//i.test(link)) {
      return link;
    }
    return `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
  }

  private extractId(link: string): number | null {
    const match = link.match(ARTICLE_ID_PATTERN);
    if (!match) {
      return null;
    }
    const id = Number(match[1]);
    return Number.isNaN(id) ? null : id;
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

  private async fetchArticleData(link: string): Promise<ArticleData> {
    try {
      const response = await axios.get<string>(link, { responseType: 'text' });
      const match = response.data.match(DATE_JSON_PATTERN);
      const publishedAt = match ? new Date(match[1]) : null;
      const parsedDate = publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null;
      const imageUrl = this.extractImageUrl(response.data);
      const content = this.extractArticleBody(response.data);

      return {
        publishedAt: parsedDate,
        imageUrl,
        content,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch article date for ${link}`, error as Error);
      return { publishedAt: null, imageUrl: null, content: null };
    }
  }

  private extractImageUrl(payload: string): string | null {
    const ogMatch = payload.match(OG_IMAGE_PATTERN);
    if (ogMatch?.[1]) {
      return this.normalizeLink(ogMatch[1]);
    }
    const twitterMatch = payload.match(TWITTER_IMAGE_PATTERN);
    if (twitterMatch?.[1]) {
      return this.normalizeLink(twitterMatch[1]);
    }
    const leadMatch = payload.match(LEAD_IMAGE_PATTERN);
    if (leadMatch?.[1]) {
      return this.normalizeLink(leadMatch[1]);
    }
    return null;
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

  private buildSlug(id: number): string {
    return `${NEWS_SLUG_PREFIX}-${id}`;
  }

  private buildContent(item: ParsedItem, articleContent: string | null): string {
    const baseHtml = articleContent?.length
      ? articleContent
      : this.wrapPlainText(item.summary || '');
    const marker = `${SOURCE_MARKER_PREFIX}${item.link}${SOURCE_MARKER_SUFFIX}`;
    if (baseHtml && baseHtml.length > 0) {
      return `${baseHtml}\n${marker}`;
    }
    return marker;
  }

  private extractArticleBody(payload: string): string | null {
    const bodyMatch = payload.match(
      /<div[^>]*class="[^"]*newsMainBody[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    );
    if (!bodyMatch?.[1]) {
      return null;
    }
    let html = bodyMatch[1];
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<!--.*?-->/gs, '');
    const trimmed = html.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private wrapPlainText(value: string): string {
    if (!value) {
      return '';
    }
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p>${escaped}</p>`;
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
      this.logger.warn(`Failed to store image for article ${articleId}`, error as Error);
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
}
