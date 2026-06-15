import {
  buildDashboardPostUrl,
  formatPriceLine,
  buildCaption,
} from '@app/modules/bale/bale-message-builder';

describe('bale-message-builder', () => {
  describe('buildDashboardPostUrl', () => {
    it('returns a URL with the post ID', () => {
      expect(buildDashboardPostUrl('https://example.com', 'abc123')).toBe(
        'https://example.com/dashboard/posts/abc123',
      );
    });

    it('handles base URL without trailing slash', () => {
      expect(buildDashboardPostUrl('https://example.com/', 'p1')).toBe(
        'https://example.com//dashboard/posts/p1',
      );
    });

    it('returns null for empty base URL', () => {
      expect(buildDashboardPostUrl('', 'abc123')).toBeNull();
    });

    it('returns null for falsy base URL', () => {
      expect(buildDashboardPostUrl('', 'abc123')).toBeNull();
    });
  });

  describe('formatPriceLine', () => {
    it('formats priceTotal as Persian number', () => {
      const result = formatPriceLine({ priceTotal: 500000000 });
      expect(result).toContain('۵۰۰٬۰۰۰٬۰۰۰');
      expect(result).toContain('تومان');
    });

    it('formats deposit and rent together', () => {
      const result = formatPriceLine({ depositAmount: 200000000, rentAmount: 5000000 });
      expect(result).toContain('ودیعه');
      expect(result).toContain('اجاره');
    });

    it('formats only deposit when rent is missing', () => {
      const result = formatPriceLine({ depositAmount: 200000000 });
      expect(result).toContain('ودیعه');
      expect(result).not.toContain('اجاره');
    });

    it('formats only rent when deposit is missing', () => {
      const result = formatPriceLine({ rentAmount: 5000000 });
      expect(result).toContain('اجاره');
      expect(result).not.toContain('ودیعه');
    });

    it('returns null when no price fields are present', () => {
      expect(formatPriceLine({})).toBeNull();
    });

    it('returns null when all price fields are null', () => {
      expect(
        formatPriceLine({ priceTotal: null, depositAmount: null, rentAmount: null }),
      ).toBeNull();
    });

    it('ignores non-finite price values', () => {
      expect(formatPriceLine({ priceTotal: NaN })).toBeNull();
      expect(formatPriceLine({ priceTotal: Infinity })).toBeNull();
    });
  });

  describe('buildCaption', () => {
    it('builds a caption with title and code', () => {
      const result = buildCaption(
        { id: 'p1', title: 'آپارتمان', code: 1001 },
        'https://example.com',
      );
      expect(result).toContain('📌 آپارتمان');
      expect(result).toContain('🆔 کد آگهی: 1001');
      expect(result).toContain('https://example.com/dashboard/posts/p1');
    });

    it('includes location when present', () => {
      const result = buildCaption(
        {
          id: 'p1',
          title: 'Test',
          provinceName: 'تهران',
          cityName: 'شیراز',
          districtName: 'قصردشت',
          code: 1001,
        },
        'https://example.com',
      );
      expect(result).toContain('📍 تهران، شیراز، قصردشت');
    });

    it('matches "تهران" as city when provinceName is missing', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', cityName: 'تهران', districtName: 'الهیه', code: 1001 },
        'https://example.com',
      );
      expect(result).toContain('📍 تهران، الهیه');
    });

    it('includes price line when priceTotal exists', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, priceTotal: 500000000 },
        'https://example.com',
      );
      expect(result).toContain('💰');
    });

    it('includes facts when present', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, area: 80, rooms: 2, floor: 3 },
        'https://example.com',
      );
      expect(result).toContain('ℹ️');
      expect(result).toContain('متراژ 80');
      expect(result).toContain('اتاق 2');
      expect(result).toContain('طبقه 3');
    });

    it('includes phone number', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, phoneNumber: '09121234567' },
        'https://example.com',
      );
      expect(result).toContain('☎️ 09121234567');
    });

    it('includes custom message at the top', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001 },
        'https://example.com',
        'این یک تست است',
      );
      expect(result).toMatch(/^این یک تست است/);
    });

    it('includes permalink when shareUrl is absent', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, permalink: 'https://divar.ir/v/abc' },
        'https://example.com',
      );
      expect(result).toContain('https://divar.ir/v/abc');
    });

    it('builds divar link from externalId as last fallback', () => {
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, externalId: 'abc123' },
        'https://example.com',
      );
      expect(result).toContain('https://divar.ir/v/abc123');
    });

    it('truncates description to 900 chars in caption', () => {
      const longDesc = 'x'.repeat(1000);
      const result = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, description: longDesc },
        'https://example.com',
      );
      const descMatch = result.match(/…$/);
      expect(descMatch).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(1001);
    });

    it('truncates entire caption to at most 1000 chars + ellipsis', () => {
      const longTitle = 'x'.repeat(500);
      const longDesc = 'x'.repeat(500);
      const result = buildCaption(
        { id: 'p1', title: longTitle, code: 1001, description: longDesc },
        'https://example.com',
      );
      expect(result.length).toBeLessThanOrEqual(1001);
      expect(result).toMatch(/…$/);
    });

    it('uses fallback title when title is missing', () => {
      const resultNoTitle = buildCaption(
        { id: 'p1', code: 1001, shareTitle: 'اشتراک' },
        'https://example.com',
      );
      expect(resultNoTitle).toContain('📌 اشتراک');

      const resultDisplay = buildCaption(
        { id: 'p1', code: 1001, displayTitle: 'نمایش' },
        'https://example.com',
      );
      expect(resultDisplay).toContain('📌 نمایش');

      const resultDefault = buildCaption({ id: 'p1', code: 1001 }, 'https://example.com');
      expect(resultDefault).toContain('📌 آگهی');
    });

    it('formats businessType as Persian', () => {
      const resultPersonal = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, businessType: 'personal' },
        'https://example.com',
      );
      expect(resultPersonal).toContain('شخصی');

      const resultAgency = buildCaption(
        { id: 'p1', title: 'Test', code: 1001, businessType: 'agency' },
        'https://example.com',
      );
      expect(resultAgency).toContain('املاک');
    });

    it('prefers shareUrl over permalink and externalId', () => {
      const result = buildCaption(
        {
          id: 'p1',
          title: 'Test',
          code: 1001,
          shareUrl: 'https://divar.ir/s/xyz',
          permalink: 'https://divar.ir/v/abc',
          externalId: 'def456',
        },
        'https://example.com',
      );
      expect(result).toContain('https://divar.ir/s/xyz');
    });
  });
});
