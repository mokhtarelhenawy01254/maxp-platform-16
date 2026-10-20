import { describe, it, expect } from 'vitest';
import { formatCurrency, formatProcurementDate } from '../formatCurrency';

describe('formatCurrency', () => {
  it('formats regular numbers with 2 decimal places and thousands separator in Arabic', () => {
    expect(formatCurrency(1234.5, { locale: 'ar' })).toBe('1,234.50 ج.م');
    expect(formatCurrency(1000000, { locale: 'ar' })).toBe('1,000,000.00 ج.م');
  });

  it('formats numbers with EGP symbol in English locale', () => {
    expect(formatCurrency(1234.5, { locale: 'en' })).toBe('1,234.50 EGP');
    expect(formatCurrency(50, { locale: 'en' })).toBe('50.00 EGP');
  });

  it('handles string numbers correctly', () => {
    expect(formatCurrency('2500.75', { locale: 'ar' })).toBe('2,500.75 ج.م');
    expect(formatCurrency('99.9', { locale: 'en' })).toBe('99.90 EGP');
  });

  it('handles null, undefined, empty string, and NaN safely', () => {
    expect(formatCurrency(null, { locale: 'ar' })).toBe('0.00 ج.م');
    expect(formatCurrency(undefined, { locale: 'en' })).toBe('0.00 EGP');
    expect(formatCurrency('', { locale: 'ar' })).toBe('0.00 ج.م');
    expect(formatCurrency('invalid-number', { locale: 'ar' })).toBe('0.00 ج.م');
  });

  it('omits currency symbol when currency: false', () => {
    expect(formatCurrency(1500.5, { currency: false })).toBe('1,500.50');
  });

  it('formats negative numbers cleanly', () => {
    expect(formatCurrency(-500.25, { locale: 'ar' })).toBe('-500.25 ج.م');
    expect(formatCurrency(-1200, { locale: 'en' })).toBe('-1,200.00 EGP');
  });
});

describe('formatProcurementDate', () => {
  it('formats ISO date strings according to locale', () => {
    const dateStr = '2026-10-20T12:00:00Z';
    const arDate = formatProcurementDate(dateStr, 'ar');
    const enDate = formatProcurementDate(dateStr, 'en');

    expect(arDate).toBeTruthy();
    expect(enDate).toBeTruthy();
    expect(arDate).not.toBe('—');
    expect(enDate).not.toBe('—');
  });

  it('handles null, undefined, and invalid dates gracefully', () => {
    expect(formatProcurementDate(null)).toBe('—');
    expect(formatProcurementDate(undefined)).toBe('—');
    expect(formatProcurementDate('not-a-date')).toBe('—');
  });
});
