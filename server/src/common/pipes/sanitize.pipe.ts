import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!value || typeof value !== 'object') {
      return this.sanitizeValue(value);
    }

    if (metadata.type === 'body' || metadata.type === 'query') {
      return this.deepSanitize(value as Record<string, unknown>);
    }

    return value;
  }

  private deepSanitize(input: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = this.sanitizeValue(val);
      return acc;
    }, {});
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(/<\/?script[^>]*>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      return this.deepSanitize(value as Record<string, unknown>);
    }

    return value;
  }
}
