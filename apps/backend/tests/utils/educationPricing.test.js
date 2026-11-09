/**
 * تسعير باقات وحدة التعليم — خصم الأخوات 10%
 * (سياسة العميل: أي أخ/أخت إضافي لنفس ولي الأمر)
 */
const { SIBLING_DISCOUNT_RATE, computePackagePrice, round2 } = require('../../utils/educationPricing');

describe('educationPricing — sibling discount', () => {
  test('discount rate is exactly 10%', () => {
    expect(SIBLING_DISCOUNT_RATE).toBe(0.1);
  });

  test('single child pays the full base price and gets no discount', () => {
    const result = computePackagePrice({ basePrice: 900, siblingCount: 1 });
    expect(result.finalPrice).toBe(900);
    expect(result.discountAmount).toBe(0);
    expect(result.discountRate).toBe(0);
    expect(result.reason).toBeNull();
  });

  test('two or more children get 10% off every package', () => {
    for (const count of [2, 3, 5]) {
      const result = computePackagePrice({ basePrice: 900, siblingCount: count });
      expect(result.discountRate).toBe(0.1);
      expect(result.discountAmount).toBe(90);
      expect(result.finalPrice).toBe(810);
      expect(result.reason).toContain('خصم الأخوات');
    }
  });

  test('applies to every price band the client uses', () => {
    expect(computePackagePrice({ basePrice: 800, siblingCount: 2 }).finalPrice).toBe(720);
    expect(computePackagePrice({ basePrice: 900, siblingCount: 2 }).finalPrice).toBe(810);
    expect(computePackagePrice({ basePrice: 1000, siblingCount: 2 }).finalPrice).toBe(900);
  });

  test('rounds to 2 decimals for odd amounts', () => {
    const result = computePackagePrice({ basePrice: 833.33, siblingCount: 2 });
    expect(result.discountAmount).toBe(83.33);
    expect(result.finalPrice).toBe(750);
  });

  test('tolerates missing/invalid input without producing NaN', () => {
    expect(computePackagePrice({ basePrice: undefined, siblingCount: 2 }).finalPrice).toBe(0);
    expect(computePackagePrice({ basePrice: 900, siblingCount: undefined }).finalPrice).toBe(900);
    expect(round2('900.005')).toBe(900.01);
  });
});
