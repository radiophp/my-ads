import { describe, it, expect } from 'vitest';
import {
  sanitizeIranLocalPhone,
  formatPhoneInput,
  isValidIranLocalPhone,
  toInternationalIranPhone,
  formatDisplayIranPhone,
  sanitizeCode,
} from '@/lib/phone-utils';

describe('phone-utils', () => {
  describe('sanitizeIranLocalPhone', () => {
    it('strips non-digit characters', () => {
      expect(sanitizeIranLocalPhone('0912-345-6789')).toBe('9123456789');
    });

    it('removes +98 prefix', () => {
      expect(sanitizeIranLocalPhone('+989123456789')).toBe('9123456789');
    });

    it('removes 0098 prefix', () => {
      expect(sanitizeIranLocalPhone('00989123456789')).toBe('9123456789');
    });

    it('removes 098 prefix', () => {
      expect(sanitizeIranLocalPhone('0989123456789')).toBe('9123456789');
    });

    it('removes 98 prefix (no leading 0)', () => {
      expect(sanitizeIranLocalPhone('989123456789')).toBe('9123456789');
    });

    it('removes leading 0', () => {
      expect(sanitizeIranLocalPhone('09123456789')).toBe('9123456789');
    });

    it('handles empty input', () => {
      expect(sanitizeIranLocalPhone('')).toBe('');
    });

    it('truncates to 10 digits', () => {
      expect(sanitizeIranLocalPhone('091234567890')).toBe('9123456789');
    });
  });

  describe('formatPhoneInput', () => {
    it('preserves leading 0 for display', () => {
      expect(formatPhoneInput('09123456789')).toBe('09123456789');
    });

    it('strips non-digits', () => {
      expect(formatPhoneInput('0912 345 6789')).toBe('09123456789');
    });

    it('removes 0098 prefix (does not add leading 0)', () => {
      expect(formatPhoneInput('00989123456789')).toBe('9123456789');
    });

    it('removes 098 prefix (does not add leading 0)', () => {
      expect(formatPhoneInput('0989123456789')).toBe('9123456789');
    });

    it('removes 98 prefix only when > 11 digits remain', () => {
      expect(formatPhoneInput('989123456789')).toBe('9123456789');
    });

    it('keeps 98 prefix when it is part of a shorter number', () => {
      expect(formatPhoneInput('98')).toBe('98');
    });

    it('truncates to 11 digits', () => {
      expect(formatPhoneInput('091234567890123')).toBe('09123456789');
    });
  });

  describe('isValidIranLocalPhone', () => {
    it('validates a correct phone number', () => {
      expect(isValidIranLocalPhone('9123456789')).toBe(true);
    });

    it('rejects number with leading 0', () => {
      expect(isValidIranLocalPhone('09123456789')).toBe(false);
    });

    it('rejects too short number', () => {
      expect(isValidIranLocalPhone('912345678')).toBe(false);
    });

    it('rejects too long number', () => {
      expect(isValidIranLocalPhone('91234567890')).toBe(false);
    });

    it('rejects number not starting with 9', () => {
      expect(isValidIranLocalPhone('8123456789')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidIranLocalPhone('')).toBe(false);
    });
  });

  describe('toInternationalIranPhone', () => {
    it('formats local digits to international', () => {
      expect(toInternationalIranPhone('9123456789')).toBe('+989123456789');
    });

    it('returns empty string for empty input', () => {
      expect(toInternationalIranPhone('')).toBe('');
    });
  });

  describe('formatDisplayIranPhone', () => {
    it('adds leading 0', () => {
      expect(formatDisplayIranPhone('9123456789')).toBe('09123456789');
    });
  });

  describe('sanitizeCode', () => {
    it('strips non-digits and truncates to 4 chars', () => {
      expect(sanitizeCode('12a45')).toBe('1245');
    });

    it('truncates longer input', () => {
      expect(sanitizeCode('12345')).toBe('1234');
    });

    it('handles empty input', () => {
      expect(sanitizeCode('')).toBe('');
    });
  });
});
