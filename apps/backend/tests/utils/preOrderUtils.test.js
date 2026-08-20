const { isPreOrderEligible } = require('../../utils/preOrderUtils');

describe('preOrderUtils.isPreOrderEligible', () => {
  test('returns false when product is null', () => {
    expect(isPreOrderEligible(null)).toBe(false);
  });

  test('returns false when isPreOrder is false', () => {
    expect(isPreOrderEligible({ isPreOrder: false })).toBe(false);
  });

  test('returns false when isPreOrder is missing', () => {
    expect(isPreOrderEligible({ name: 'X' })).toBe(false);
  });

  test('returns true when pre-order enabled and no date', () => {
    expect(isPreOrderEligible({ isPreOrder: true, preOrderDate: null })).toBe(true);
  });

  test('returns true when pre-order enabled and date is in the future', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isPreOrderEligible({ isPreOrder: true, preOrderDate: future })).toBe(true);
  });

  test('returns false when pre-order enabled and date is in the past', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isPreOrderEligible({ isPreOrder: true, preOrderDate: past })).toBe(false);
  });

  test('returns true when date is today (future boundary)', () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    expect(isPreOrderEligible({ isPreOrder: true, preOrderDate: today.toISOString() })).toBe(true);
  });

  test('returns true when pre-order enabled and date is invalid string', () => {
    expect(isPreOrderEligible({ isPreOrder: true, preOrderDate: 'not-a-date' })).toBe(true);
  });
});
