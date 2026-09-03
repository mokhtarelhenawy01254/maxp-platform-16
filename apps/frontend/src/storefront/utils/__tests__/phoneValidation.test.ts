import { describe, expect, it } from 'vitest';
import {
  cleanPhoneNumber,
  isValidStorefrontPhone,
  normalizeEgyptianPhone,
  toAsciiDigits,
} from '../phoneValidation';

describe('phoneValidation utility', () => {
  describe('toAsciiDigits', () => {
    it('converts Arabic-Indic digits to standard ASCII', () => {
      expect(toAsciiDigits('٠١٠٦٥٦٤٢٨١٣')).toBe('01065642813');
      expect(toAsciiDigits('+٢٠١٠٦٥٦٤٢٨١٣')).toBe('+201065642813');
    });

    it('converts Eastern Arabic / Persian digits to standard ASCII', () => {
      expect(toAsciiDigits('۰۱۰۶۵۶۴۲۸۱۳')).toBe('01065642813');
    });
  });

  describe('cleanPhoneNumber', () => {
    it('removes spaces, hyphens, and brackets while preserving +', () => {
      expect(cleanPhoneNumber('+20 106 564 2813')).toBe('+201065642813');
      expect(cleanPhoneNumber('+20-106-564-2813')).toBe('+201065642813');
      expect(cleanPhoneNumber('010 6564 2813')).toBe('01065642813');
    });
  });

  describe('isValidStorefrontPhone', () => {
    it('accepts standard local Egyptian mobile numbers (01xxxxxxxxx)', () => {
      expect(isValidStorefrontPhone('01065642813')).toBe(true);
      expect(isValidStorefrontPhone('01123456789')).toBe(true);
      expect(isValidStorefrontPhone('01223456789')).toBe(true);
      expect(isValidStorefrontPhone('01523456789')).toBe(true);
    });

    it('accepts Egyptian mobile numbers with +20 (+201xxxxxxxxx)', () => {
      expect(isValidStorefrontPhone('+201065642813')).toBe(true);
      expect(isValidStorefrontPhone('+201123456789')).toBe(true);
      expect(isValidStorefrontPhone('+201223456789')).toBe(true);
      expect(isValidStorefrontPhone('+201523456789')).toBe(true);
    });

    it('accepts Egyptian mobile numbers with +20 and leading zero (+2001xxxxxxxxx)', () => {
      expect(isValidStorefrontPhone('+2001065642813')).toBe(true);
    });

    it('accepts Egyptian mobile numbers with 0020 or 20 prefix', () => {
      expect(isValidStorefrontPhone('00201065642813')).toBe(true);
      expect(isValidStorefrontPhone('201065642813')).toBe(true);
    });

    it('accepts Egyptian mobile numbers with spaces and formatted strings', () => {
      expect(isValidStorefrontPhone('+20 106 564 2813')).toBe(true);
      expect(isValidStorefrontPhone('010-6564-2813')).toBe(true);
      expect(isValidStorefrontPhone('  +201065642813  ')).toBe(true);
    });

    it('accepts Arabic digits', () => {
      expect(isValidStorefrontPhone('٠١٠٦٥٦٤٢٨١٣')).toBe(true);
      expect(isValidStorefrontPhone('+٢٠١٠٦٥٦٤٢٨١٣')).toBe(true);
    });

    it('accepts valid international numbers in E.164 format', () => {
      expect(isValidStorefrontPhone('+966501234567')).toBe(true);
      expect(isValidStorefrontPhone('+971501234567')).toBe(true);
      expect(isValidStorefrontPhone('00966501234567')).toBe(true);
    });

    it('rejects invalid numbers', () => {
      expect(isValidStorefrontPhone('')).toBe(false);
      expect(isValidStorefrontPhone('   ')).toBe(false);
      expect(isValidStorefrontPhone('12345')).toBe(false);
      expect(isValidStorefrontPhone('0106564281')).toBe(false); // only 10 digits
      expect(isValidStorefrontPhone('0106564281399')).toBe(false); // too long
      expect(isValidStorefrontPhone('abcdefghijk')).toBe(false);
    });
  });

  describe('normalizeEgyptianPhone', () => {
    it('normalizes various Egyptian formats to canonical 11-digit local format', () => {
      expect(normalizeEgyptianPhone('+201065642813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('+2001065642813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('00201065642813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('201065642813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('01065642813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('+20 106 564 2813')).toBe('01065642813');
      expect(normalizeEgyptianPhone('٠١٠٦٥٦٤٢٨١٣')).toBe('01065642813');
    });

    it('returns non-Egyptian international numbers cleaned without modifying prefix', () => {
      expect(normalizeEgyptianPhone('+966501234567')).toBe('+966501234567');
    });
  });
});
