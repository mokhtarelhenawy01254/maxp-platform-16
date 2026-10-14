/**
 * Tests for statusNormalizer utility.
 * Verifies Turbo courier status normalization, substring precedence,
 * and system OrderStatus / PaymentStatus mappings.
 */

const {
  normalizeTurboStatus,
  getSystemStatusFromTurbo,
  getSystemStatusFromTurboWithCustomMapping,
  CANONICAL_TURBO_MAP,
  SYSTEM_STATUS_MAPPING,
} = require('../../utils/statusNormalizer');

describe('statusNormalizer utility', () => {
  describe('normalizeTurboStatus', () => {
    test('normalizes raw numbers and status_ codes 1-20', () => {
      expect(normalizeTurboStatus('1')).toBe('turbo_saved');
      expect(normalizeTurboStatus('status_1')).toBe('turbo_saved');
      expect(normalizeTurboStatus('4')).toBe('out_for_delivery');
      expect(normalizeTurboStatus('status_4')).toBe('out_for_delivery');
      expect(normalizeTurboStatus('13')).toBe('delayed');
      expect(normalizeTurboStatus('status_13')).toBe('delayed');
      expect(normalizeTurboStatus('14')).toBe('returned_to_company');
      expect(normalizeTurboStatus('status_14')).toBe('returned_to_company');
      expect(normalizeTurboStatus('15')).toBe('returned_resent');
      expect(normalizeTurboStatus('status_15')).toBe('returned_resent');
      expect(normalizeTurboStatus('16')).toBe('returned_missing');
      expect(normalizeTurboStatus('status_16')).toBe('returned_missing');
      expect(normalizeTurboStatus('17')).toBe('returned_destroyed');
      expect(normalizeTurboStatus('status_17')).toBe('returned_destroyed');
      expect(normalizeTurboStatus('18')).toBe('incomplete');
      expect(normalizeTurboStatus('status_18')).toBe('incomplete');
      expect(normalizeTurboStatus('19')).toBe('remitted');
      expect(normalizeTurboStatus('status_19')).toBe('remitted');
      expect(normalizeTurboStatus('20')).toBe('returned_received');
      expect(normalizeTurboStatus('status_20')).toBe('returned_received');
    });

    test('(Precedence Fix) specific Arabic substrings are NOT hijacked by generic مرتجع', () => {
      // 1. "مرتجعة للعميل" must map to returned_to_customer, not returned_to_company
      expect(normalizeTurboStatus('شحنة مرتجعة للعميل')).toBe('returned_to_customer');

      // 2. "مرتجع مفقود" must map to returned_missing, not returned_to_company
      expect(normalizeTurboStatus('طرد مرتجع مفقود أثناء النقل')).toBe('returned_missing');

      // 3. "مرتجع معدوم" must map to returned_destroyed, not returned_to_company
      expect(normalizeTurboStatus('طرد مرتجع معدوم')).toBe('returned_destroyed');

      // 4. "مرتجعات وصلتني" must map to returned_received, not returned_to_company
      expect(normalizeTurboStatus('مرتجعات وصلتني للمخزن')).toBe('returned_received');

      // 5. "معاد إرسالها" must map to returned_resent
      expect(normalizeTurboStatus('طلب معاد إرساله مع المندوب')).toBe('returned_resent');

      // 6. Generic "مرتجع" fallback maps to returned_to_company
      expect(normalizeTurboStatus('شحنة مرتجع بالفرع')).toBe('returned_to_company');
      expect(normalizeTurboStatus('مسترجع للشركة')).toBe('returned_to_company');
    });

    test('defaults to turbo_saved when rawStatus is falsy', () => {
      expect(normalizeTurboStatus('')).toBe('turbo_saved');
      expect(normalizeTurboStatus(null)).toBe('turbo_saved');
      expect(normalizeTurboStatus(undefined)).toBe('turbo_saved');
    });
  });

  describe('getSystemStatusFromTurbo (Mapping Semantics)', () => {
    test('(Semantics Fix) returned_resent maps to SHIPPED (not PROCESSING)', () => {
      const result = getSystemStatusFromTurbo('returned_resent');
      expect(result.canonicalTurboStatus).toBe('returned_resent');
      expect(result.orderStatus).toBe('SHIPPED');
      expect(result.paymentStatus).toBeNull();
    });

    test('(Semantics Fix) delayed maps to SHIPPED (not ON_HOLD)', () => {
      const result = getSystemStatusFromTurbo('delayed');
      expect(result.canonicalTurboStatus).toBe('delayed');
      expect(result.orderStatus).toBe('SHIPPED');
      expect(result.paymentStatus).toBeNull();
    });

    test('delivered and remitted map to DELIVERED with COMPLETED payment', () => {
      const del = getSystemStatusFromTurbo('delivered');
      expect(del.orderStatus).toBe('DELIVERED');
      expect(del.paymentStatus).toBe('COMPLETED');

      const rem = getSystemStatusFromTurbo('remitted');
      expect(rem.orderStatus).toBe('DELIVERED');
      expect(rem.paymentStatus).toBe('COMPLETED');
    });

    test('returned statuses map to RETURNED', () => {
      expect(getSystemStatusFromTurbo('returned_to_company').orderStatus).toBe('RETURNED');
      expect(getSystemStatusFromTurbo('returned_received').orderStatus).toBe('RETURNED');
      expect(getSystemStatusFromTurbo('returned_to_customer').orderStatus).toBe('RETURNED');
      expect(getSystemStatusFromTurbo('returned_missing').orderStatus).toBe('RETURNED');
      expect(getSystemStatusFromTurbo('returned_destroyed').orderStatus).toBe('RETURNED');
    });

    test('cancelled maps to CANCELLED', () => {
      expect(getSystemStatusFromTurbo('cancelled').orderStatus).toBe('CANCELLED');
    });

    test('out_for_delivery maps to SHIPPED', () => {
      expect(getSystemStatusFromTurbo('out_for_delivery').orderStatus).toBe('SHIPPED');
    });

    test('processing maps to PROCESSING', () => {
      expect(getSystemStatusFromTurbo('processing').orderStatus).toBe('PROCESSING');
    });
  });

  describe('getSystemStatusFromTurboWithCustomMapping', () => {
    test('overrides default system status when custom mapping is configured', () => {
      const customMapping = {
        delayed: { orderStatus: 'CUSTOM_DELAYED' },
      };
      const result = getSystemStatusFromTurboWithCustomMapping('delayed', customMapping);
      expect(result.canonicalTurboStatus).toBe('delayed');
      expect(result.orderStatus).toBe('CUSTOM_DELAYED');
    });

    test('falls back to default system status when custom mapping is not present', () => {
      const result = getSystemStatusFromTurboWithCustomMapping('delayed', null);
      expect(result.canonicalTurboStatus).toBe('delayed');
      expect(result.orderStatus).toBe('SHIPPED');
    });
  });
});
