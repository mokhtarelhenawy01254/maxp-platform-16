import { describe, expect, it } from 'vitest';

import {
  formatSaleCountdownValue,
  getSaleCountdownParts,
  resolveSaleCountdownTimestamp,
} from '../utils/saleCountdown';

describe('saleCountdown helpers', () => {
  it('uses the end of day for date-only sale end values', () => {
    const timestamp = resolveSaleCountdownTimestamp('2026-05-01');
    expect(timestamp).not.toBeNull();

    const resolvedDate = new Date(timestamp as number);
    expect(resolvedDate.getHours()).toBe(23);
    expect(resolvedDate.getMinutes()).toBe(59);
  });

  it('returns countdown parts with live seconds', () => {
    const targetTimestamp = Date.UTC(2026, 3, 30, 12, 0, 0);
    const nowTimestamp = Date.UTC(2026, 3, 29, 10, 58, 57);

    expect(getSaleCountdownParts(targetTimestamp, nowTimestamp)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 3,
    });
  });

  it('pads hour and second values without grouping', () => {
    expect(formatSaleCountdownValue(5, 'en-US', 2)).toBe('05');
    expect(formatSaleCountdownValue(5, 'ar-EG', 2)).toBe('٠٥');
  });
});
