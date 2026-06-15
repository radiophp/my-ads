import { Prisma } from '@prisma/client';
import type { DivarPostListItemDto } from '@app/modules/divar-posts/dto/divar-post.dto';
import {
  castDecimal,
  resolveMediaFromRelation,
  parseNullableString,
  parseNullableNumber,
  parsePayload,
  computeJitteredDelay,
  resolvePreviewImage,
  buildPayloadSnapshot,
} from '@app/modules/notifications/notifications-utils';

describe('notifications-utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('castDecimal', () => {
    it('returns null for null input', () => {
      expect(castDecimal(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(castDecimal(undefined)).toBeNull();
    });

    it('passes through finite numbers', () => {
      expect(castDecimal(42)).toBe(42);
      expect(castDecimal(0)).toBe(0);
      expect(castDecimal(-3.14)).toBe(-3.14);
    });

    it('returns null for NaN/Infinity numbers', () => {
      expect(castDecimal(NaN)).toBeNull();
      expect(castDecimal(Infinity)).toBeNull();
      expect(castDecimal(-Infinity)).toBeNull();
    });

    it('converts Prisma.Decimal to number', () => {
      const dec = new Prisma.Decimal('42.5');
      expect(castDecimal(dec)).toBe(42.5);
    });

    it('returns null for non-Decimal objects', () => {
      expect(castDecimal({} as any)).toBeNull();
    });
  });

  describe('resolveMediaFromRelation', () => {
    it('returns null for undefined media', () => {
      expect(resolveMediaFromRelation(undefined)).toBeNull();
    });

    it('returns null when media has no urls', () => {
      expect(
        resolveMediaFromRelation({
          url: null,
          thumbnailUrl: null,
          localUrl: null,
          localThumbnailUrl: null,
        }),
      ).toBeNull();
    });

    it('prefers localThumbnailUrl over others', () => {
      expect(
        resolveMediaFromRelation({
          url: 'remote.jpg',
          thumbnailUrl: 'thumb.jpg',
          localUrl: 'local.jpg',
          localThumbnailUrl: 'local-thumb.jpg',
        }),
      ).toBe('local-thumb.jpg');
    });

    it('falls back through the chain', () => {
      expect(
        resolveMediaFromRelation({
          url: 'remote.jpg',
          thumbnailUrl: null,
          localUrl: null,
          localThumbnailUrl: null,
        }),
      ).toBe('remote.jpg');

      expect(
        resolveMediaFromRelation({
          url: 'remote.jpg',
          thumbnailUrl: 'thumb.jpg',
          localUrl: null,
          localThumbnailUrl: null,
        }),
      ).toBe('thumb.jpg');

      expect(
        resolveMediaFromRelation({
          url: 'remote.jpg',
          thumbnailUrl: null,
          localUrl: 'local.jpg',
          localThumbnailUrl: null,
        }),
      ).toBe('local.jpg');
    });
  });

  describe('parseNullableString', () => {
    it('returns null for null/undefined source', () => {
      expect(parseNullableString(null, 'key')).toBeNull();
      expect(parseNullableString(undefined as any, 'key')).toBeNull();
    });

    it('returns null for non-object source', () => {
      expect(parseNullableString('string', 'key')).toBeNull();
      expect(parseNullableString(42, 'key')).toBeNull();
    });

    it('returns null for array source', () => {
      expect(parseNullableString([], 'key')).toBeNull();
    });

    it('extracts string value by key', () => {
      expect(parseNullableString({ name: 'test' }, 'name')).toBe('test');
    });

    it('returns null for empty string', () => {
      expect(parseNullableString({ name: '' }, 'name')).toBeNull();
    });

    it('returns null for non-string value', () => {
      expect(parseNullableString({ age: 30 }, 'age')).toBeNull();
    });

    it('returns null for missing key', () => {
      expect(parseNullableString({ name: 'test' }, 'missing')).toBeNull();
    });
  });

  describe('parseNullableNumber', () => {
    it('returns null for null/undefined source', () => {
      expect(parseNullableNumber(null, 'key')).toBeNull();
    });

    it('returns null for non-object source', () => {
      expect(parseNullableNumber('string', 'key')).toBeNull();
    });

    it('extracts a valid number', () => {
      expect(parseNullableNumber({ price: 1000000 }, 'price')).toBe(1000000);
    });

    it('returns null for NaN number value', () => {
      expect(parseNullableNumber({ price: NaN }, 'price')).toBeNull();
    });

    it('parses string numbers', () => {
      expect(parseNullableNumber({ code: '42' }, 'code')).toBe(42);
    });

    it('returns null for empty string', () => {
      expect(parseNullableNumber({ code: '' }, 'code')).toBeNull();
    });

    it('returns null for unparseable string', () => {
      expect(parseNullableNumber({ code: 'abc' }, 'code')).toBeNull();
    });

    it('returns null for missing key', () => {
      expect(parseNullableNumber({ price: 100 }, 'missing')).toBeNull();
    });
  });

  describe('parsePayload', () => {
    it('returns null for null payload', () => {
      expect(parsePayload(null)).toBeNull();
    });

    it('returns null for non-object payload', () => {
      expect(parsePayload('string' as any)).toBeNull();
    });

    it('returns null when payload has no filter', () => {
      expect(parsePayload({ post: {} })).toBeNull();
    });

    it('returns null when payload has no post', () => {
      expect(parsePayload({ filter: { id: 'f1', name: 'Filter' } })).toBeNull();
    });

    it('parses a valid payload', () => {
      const result = parsePayload({
        filter: { id: 'f1', name: 'My Filter' },
        post: {
          id: 'p1',
          code: 1001,
          title: 'Test Title',
          priceTotal: 500000000,
          cityName: 'تهران',
        },
      });

      expect(result).not.toBeNull();
      expect(result!.filter.id).toBe('f1');
      expect(result!.filter.name).toBe('My Filter');
      expect(result!.post.id).toBe('p1');
      expect(result!.post.code).toBe(1001);
      expect(result!.post.title).toBe('Test Title');
      expect(result!.post.priceTotal).toBe(500000000);
      expect(result!.post.cityName).toBe('تهران');
    });

    it('handles missing optional fields gracefully', () => {
      const result = parsePayload({
        filter: { id: 'f1', name: 'Filter' },
        post: { id: 'p1' },
      });

      expect(result).not.toBeNull();
      expect(result!.post.code).toBeNull();
      expect(result!.post.title).toBeNull();
      expect(result!.post.cityName).toBeNull();
    });

    it('uses empty string for missing filter id/name', () => {
      const result = parsePayload({
        filter: { invalid: true },
        post: { id: 'p1' },
      });

      expect(result).not.toBeNull();
      expect(result!.filter.id).toBe('');
      expect(result!.filter.name).toBe('');
    });
  });

  describe('computeJitteredDelay', () => {
    it('returns 0 for non-positive baseMs', () => {
      expect(computeJitteredDelay(0, 0.2)).toBe(0);
      expect(computeJitteredDelay(-100, 0.2)).toBe(0);
      expect(computeJitteredDelay(NaN, 0.2)).toBe(0);
      expect(computeJitteredDelay(Infinity, 0.2)).toBe(0);
    });

    it('clamps jitterRatio to [0, 1]', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = computeJitteredDelay(1000, 2);
      expect(result).toBe(1000);

      const result2 = computeJitteredDelay(1000, -1);
      expect(result2).toBe(1000);
    });

    it('computes delay with jitter within bounds', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const min = computeJitteredDelay(1000, 0.2);
      expect(min).toBe(800);

      jest.spyOn(Math, 'random').mockReturnValue(1);
      const max = computeJitteredDelay(1000, 0.2);
      expect(max).toBe(1200);

      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const mid = computeJitteredDelay(1000, 0.2);
      expect(mid).toBe(1000);
    });

    it('never returns negative', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const result = computeJitteredDelay(100, 10);
      expect(result).toBe(0);
    });
  });

  describe('resolvePreviewImage', () => {
    const basePost = {
      id: 'p1',
      code: 1001,
      externalId: 'ext1',
      title: 'Test',
      description: null,
      ownerName: null,
      hasContactInfo: false,
      priceTotal: null,
      rentAmount: null,
      depositAmount: null,
      dailyRateNormal: null,
      dailyRateWeekend: null,
      dailyRateHoliday: null,
      extraPersonFee: null,
      pricePerSquare: null,
      area: null,
      areaLabel: null,
      landArea: null,
      landAreaLabel: null,
      rooms: null,
      floor: null,
      totalUnits: null,
      unitNumber: null,
      yearBuilt: null,
      warehouse: null,
      parking: null,
      elevator: null,
      balcony: null,
      direction: null,
      allUnitsPrice: null,
      mortgageFacility: null,
      cityName: null,
      districtName: null,
      provinceName: null,
      permalink: null,
      publishedAt: new Date(),
      shareUrl: null,
      shareTitle: null,
      displayTitle: null,
      medias: [],
      attributes: [],
      businessType: null,
      phoneNumber: null,
      phoneNumbers: null,
    } as unknown as DivarPostListItemDto;

    it('returns null when no medias', () => {
      expect(resolvePreviewImage({ ...basePost, medias: [] })).toBeNull();
    });

    it('prefers localThumbnailUrl from enriched media', () => {
      const post = {
        ...basePost,
        medias: [
          {
            id: 'm1',
            url: 'remote.jpg',
            thumbnailUrl: 'thumb.jpg',
            alt: null,
            localUrl: 'local.jpg',
            localThumbnailUrl: 'local-thumb.jpg',
          },
        ],
      } as unknown as DivarPostListItemDto;

      expect(resolvePreviewImage(post)).toBe('local-thumb.jpg');
    });

    it('falls back through media urls', () => {
      const post = {
        ...basePost,
        medias: [
          {
            id: 'm1',
            url: 'remote.jpg',
            thumbnailUrl: null,
            alt: null,
          },
        ],
      } as unknown as DivarPostListItemDto;

      expect(resolvePreviewImage(post)).toBe('remote.jpg');
    });
  });

  describe('buildPayloadSnapshot', () => {
    it('builds a snapshot from a post and filter', () => {
      const post = {
        id: 'p1',
        code: 1001,
        externalId: 'ext1',
        title: 'آپارتمان فروشی',
        description: 'unit test desc',
        ownerName: null,
        hasContactInfo: false,
        priceTotal: 500000000,
        rentAmount: null,
        depositAmount: null,
        dailyRateNormal: null,
        dailyRateWeekend: null,
        dailyRateHoliday: null,
        extraPersonFee: null,
        pricePerSquare: 25000000,
        area: 80,
        areaLabel: null,
        landArea: null,
        landAreaLabel: null,
        rooms: 2,
        floor: null,
        totalUnits: null,
        unitNumber: null,
        yearBuilt: null,
        warehouse: null,
        parking: null,
        elevator: null,
        balcony: null,
        direction: null,
        allUnitsPrice: null,
        mortgageFacility: null,
        cityName: 'تهران',
        districtName: 'الهیه',
        provinceName: 'تهران',
        permalink: 'https://divar.ir/v/ext1',
        publishedAt: new Date('2026-01-15T10:00:00Z'),
        shareUrl: null,
        shareTitle: null,
        displayTitle: null,
        medias: [],
        attributes: [],
        businessType: null,
        phoneNumber: null,
        phoneNumbers: null,
      } as unknown as DivarPostListItemDto;

      const result = buildPayloadSnapshot(post, {
        id: 'f1',
        name: 'My Filter',
      });

      expect(result.filter).toEqual({ id: 'f1', name: 'My Filter' });
      expect(result.post.id).toBe('p1');
      expect(result.post.code).toBe(1001);
      expect(result.post.title).toBe('آپارتمان فروشی');
      expect(result.post.priceTotal).toBe(500000000);
      expect(result.post.pricePerSquare).toBe(25000000);
      expect(result.post.cityName).toBe('تهران');
      expect(result.post.districtName).toBe('الهیه');
      expect(result.post.provinceName).toBe('تهران');
      expect(result.post.publishedAt).toBe('2026-01-15T10:00:00.000Z');
      expect(result.post.previewImageUrl).toBeNull();
    });

    it('handles null publishedAt', () => {
      const post = {
        id: 'p1',
        code: null as unknown as number,
        externalId: 'ext1',
        title: null,
        description: null,
        ownerName: null,
        hasContactInfo: false,
        priceTotal: null,
        rentAmount: null,
        depositAmount: null,
        dailyRateNormal: null,
        dailyRateWeekend: null,
        dailyRateHoliday: null,
        extraPersonFee: null,
        pricePerSquare: null,
        area: null,
        areaLabel: null,
        landArea: null,
        landAreaLabel: null,
        rooms: null,
        floor: null,
        totalUnits: null,
        unitNumber: null,
        yearBuilt: null,
        warehouse: null,
        parking: null,
        elevator: null,
        balcony: null,
        direction: null,
        allUnitsPrice: null,
        mortgageFacility: null,
        cityName: null,
        districtName: null,
        provinceName: null,
        permalink: null,
        publishedAt: null,
        shareUrl: null,
        shareTitle: null,
        displayTitle: null,
        medias: [],
        attributes: [],
        businessType: null,
        phoneNumber: null,
        phoneNumbers: null,
      } as unknown as DivarPostListItemDto;

      const result = buildPayloadSnapshot(post, { id: 'f1', name: 'F' });
      expect(result.post.publishedAt).toBeNull();
      expect(result.post.code).toBeNull();
    });

    it('resolves preview image from media', () => {
      const post = {
        id: 'p1',
        code: 1001,
        externalId: 'ext1',
        title: null,
        description: null,
        ownerName: null,
        hasContactInfo: false,
        priceTotal: null,
        rentAmount: null,
        depositAmount: null,
        dailyRateNormal: null,
        dailyRateWeekend: null,
        dailyRateHoliday: null,
        extraPersonFee: null,
        pricePerSquare: null,
        area: null,
        areaLabel: null,
        landArea: null,
        landAreaLabel: null,
        rooms: null,
        floor: null,
        totalUnits: null,
        unitNumber: null,
        yearBuilt: null,
        warehouse: null,
        parking: null,
        elevator: null,
        balcony: null,
        direction: null,
        allUnitsPrice: null,
        mortgageFacility: null,
        cityName: null,
        districtName: null,
        provinceName: null,
        permalink: null,
        publishedAt: null,
        shareUrl: null,
        shareTitle: null,
        displayTitle: null,
        medias: [
          {
            id: 'm1',
            url: 'remote.jpg',
            thumbnailUrl: null,
            alt: null,
          },
        ],
        attributes: [],
        businessType: null,
        phoneNumber: null,
        phoneNumbers: null,
      } as unknown as DivarPostListItemDto;

      const result = buildPayloadSnapshot(post, { id: 'f1', name: 'F' });
      expect(result.post.previewImageUrl).toBe('remote.jpg');
    });
  });
});
