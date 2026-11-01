/**
 * Unit tests — حسابات مكونات العينة (Task 83791d03).
 * المرافق: apps/backend/services/sampleComponentMath.js
 */

const {
  computeComponentTotal,
  normalizeQuantity,
  normalizePrice,
  sumTotals,
} = require('../../services/sampleComponentMath');

describe('sample components — line totals (task 83791d03)', () => {
  it('multiplies quantity by unit price', () => {
    expect(computeComponentTotal(2, 3.5)).toBe(7);
    expect(computeComponentTotal(1.5, 10)).toBe(15);
  });

  it('rounds to two decimals', () => {
    expect(computeComponentTotal(3, 0.335)).toBe(1.01);
    expect(computeComponentTotal(0.333, 3)).toBe(1);
  });

  it('returns 0 for non numeric input', () => {
    expect(computeComponentTotal('abc', 5)).toBe(0);
    expect(computeComponentTotal(null, 5)).toBe(0);
    expect(computeComponentTotal(undefined, undefined)).toBe(0);
  });
});

describe('sample components — quantity validation (task 83791d03)', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(normalizeQuantity(2)).toBe(2);
    expect(normalizeQuantity('2.5')).toBe(2.5);
    expect(normalizeQuantity('0.3333')).toBe(0.333);
  });

  it('rejects zero, negatives, empty and garbage', () => {
    expect(normalizeQuantity(0)).toBeNull();
    expect(normalizeQuantity(-1)).toBeNull();
    expect(normalizeQuantity('')).toBeNull();
    expect(normalizeQuantity(null)).toBeNull();
    expect(normalizeQuantity('abc')).toBeNull();
  });
});

describe('sample components — price snapshot validation (task 83791d03)', () => {
  it('accepts zero and positive prices', () => {
    expect(normalizePrice(0)).toBe(0);
    expect(normalizePrice('12.345')).toBe(12.35);
  });

  it('treats empty as free (0) but rejects negatives and garbage', () => {
    expect(normalizePrice('')).toBe(0);
    expect(normalizePrice(null)).toBe(0);
    expect(normalizePrice(undefined)).toBe(0);
    expect(normalizePrice(-5)).toBeNull();
    expect(normalizePrice('abc')).toBeNull();
  });
});

describe('sample components — drawer total (task 83791d03)', () => {
  it('sums stored line totals', () => {
    expect(sumTotals([{ totalCost: 10 }, { totalCost: '5.5' }, { totalCost: 0.25 }])).toBe(15.75);
  });

  it('rounds the aggregate to two decimals', () => {
    expect(sumTotals([{ totalCost: 0.1 }, { totalCost: 0.2 }])).toBe(0.3);
  });

  it('ignores invalid rows and non arrays', () => {
    expect(sumTotals([{ totalCost: 'x' }, { totalCost: null }, { totalCost: 4 }])).toBe(4);
    expect(sumTotals(null)).toBe(0);
    expect(sumTotals(undefined)).toBe(0);
  });
});
