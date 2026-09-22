const { describe, it } = require('node:test');
const assert = require('node:assert');
const { resolveDiscountReason, buildCompositeDiscountReason } = require('../orderDiscountUtils');

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toBeNull: () => assert.strictEqual(actual, null),
});

describe('orderDiscountUtils', () => {
  describe('resolveDiscountReason', () => {
    it('returns null when order is null or has 0 discount', () => {
      expect(resolveDiscountReason(null)).toBeNull();
      expect(resolveDiscountReason({ discount: 0 })).toBeNull();
      expect(resolveDiscountReason({ discountAmount: 0 })).toBeNull();
    });

    it('returns explicit discountReason from metadata if present', () => {
      const order = { discount: 50, metadata: JSON.stringify({ discountReason: 'خصم خاص للعميل' }) };
      expect(resolveDiscountReason(order)).toBe('خصم خاص للعميل');
    });

    it('resolves coupon code from metadata.coupon or metadata.couponCode', () => {
      const order1 = { discount: 30, metadata: JSON.stringify({ coupon: { code: 'SAVE30', name: 'خصم الصيف' } }) };
      expect(resolveDiscountReason(order1)).toBe('كوبون: SAVE30 (خصم الصيف)');

      const order2 = { discount: 20, metadata: JSON.stringify({ couponCode: 'FLASH20' }) };
      expect(resolveDiscountReason(order2)).toBe('كوبون: FLASH20');
    });

    it('resolves storePromotion from metadata', () => {
      const order = { discount: 45, metadata: JSON.stringify({ storePromotion: { label: 'خصم الجمعة البيضاء', discount: 45 } }) };
      expect(resolveDiscountReason(order)).toBe('خصم الجمعة البيضاء');
    });

    it('resolves quantity offers from metadata', () => {
      const order = { discount: 60, metadata: JSON.stringify({ quantityOffers: [{ offerLabel: 'عرض 3 قطع' }] }) };
      expect(resolveDiscountReason(order)).toBe('عرض كمية: عرض 3 قطع');
    });

    it('resolves loyalty tier benefit from metadata', () => {
      const order = { discount: 25, metadata: JSON.stringify({ loyalty: { tierNameAr: 'المستوى البلاتيني', discountPercent: 10 } }) };
      expect(resolveDiscountReason(order)).toBe('مستوى الولاء: المستوى البلاتيني (10%)');
    });

    it('resolves auto-discount voucher', () => {
      const order = { discount: 15, metadata: JSON.stringify({ autoDiscount: { usedVoucherId: 'v-1' } }) };
      expect(resolveDiscountReason(order)).toBe('كوبون خصم تلقائي');
    });

    it('resolves electronic payment / wallet discount', () => {
      const order = { discount: 10, metadata: JSON.stringify({ walletDiscount: { percent: 5, discountAmount: 10 } }) };
      expect(resolveDiscountReason(order)).toBe('خصم الدفع الإلكتروني (5%)');
    });

    it('resolves points redemption', () => {
      const order = { discount: 50, metadata: JSON.stringify({ pointsRedemption: { pointsUsed: 50, value: 50 } }) };
      expect(resolveDiscountReason(order)).toBe('استبدال نقاط الولاء (50 نقطة)');
    });

    it('combines multiple sources if present', () => {
      const order = {
        discount: 75,
        metadata: JSON.stringify({
          coupon: { code: 'VIP20' },
          walletDiscount: { percent: 5, discountAmount: 25 }
        })
      };
      expect(resolveDiscountReason(order)).toBe('كوبون: VIP20 + خصم الدفع الإلكتروني (5%)');
    });

    it('falls back to "خصم خاص" when discount > 0 without identified reason', () => {
      const order = { discount: 100, metadata: '{}' };
      expect(resolveDiscountReason(order)).toBe('خصم خاص');
    });
  });

  describe('buildCompositeDiscountReason', () => {
    it('composes reasons correctly', () => {
      const reason = buildCompositeDiscountReason({
        coupon: { code: 'SUMMER', name: 'الصيف' },
        promoLabel: 'اشتري 2 واحصل على خصم',
        promoDiscount: 50,
        loyaltyTierTitle: 'المستوى الماسي',
        loyaltyDiscount: 20,
        walletDiscountPercent: 5,
        walletDiscount: 15,
        pointsUsed: 100,
        pointsApplied: 100,
        hasAutoDiscount: true,
        totalDiscount: 235
      });

      expect(reason).toBe('كوبون: SUMMER (الصيف) + عرض: اشتري 2 واحصل على خصم + المستوى الماسي + كوبون خصم تلقائي + خصم الدفع الإلكتروني (5%) + استبدال نقاط (100 نقطة)');
    });

    it('returns null if total discount is 0 and no components', () => {
      expect(buildCompositeDiscountReason({ totalDiscount: 0 })).toBeNull();
    });

    it('returns "خصم خاص" if total discount > 0 and no components matched', () => {
      expect(buildCompositeDiscountReason({ totalDiscount: 100 })).toBe('خصم خاص');
    });
  });
});
