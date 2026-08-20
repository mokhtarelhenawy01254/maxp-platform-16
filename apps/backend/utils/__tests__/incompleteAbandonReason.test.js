const {
  detectAbandonReason,
  getMissingShippingFields,
  parseJsonObject,
} = require('../incompleteAbandonReason');

describe('incompleteAbandonReason', () => {
  describe('detectAbandonReason', () => {
    test('returns no_checkout when the cart has no checkout data at all', () => {
      const reason = detectAbandonReason({ checkoutData: null });
      expect(reason).toEqual({ code: 'no_checkout', evidence: [] });
    });

    test('returns no_checkout when checkout data contains only attribution', () => {
      const reason = detectAbandonReason({
        checkoutData: { attribution: { source: 'facebook' } },
      });
      expect(reason).toEqual({ code: 'no_checkout', evidence: [] });
    });

    test('returns no_phone when the customer left a name but no phone', () => {
      const reason = detectAbandonReason({
        checkoutData: { customerName: 'Ahmed', email: 'ahmed@test.local' },
      });
      expect(reason).toEqual({ code: 'no_phone', evidence: [] });
    });

    test('treats empty phone string as missing phone', () => {
      const reason = detectAbandonReason({
        checkoutData: { customerName: 'Ahmed', phone: '', email: 'a@b.c' },
      });
      expect(reason).toEqual({ code: 'no_phone', evidence: [] });
    });

    test('returns partial_shipping with the real missing fields as evidence', () => {
      const reason = detectAbandonReason({
        checkoutData: {
          customerName: 'Ahmed',
          phone: '01012345678',
          governorate: 'Cairo',
        },
      });
      expect(reason.code).toBe('partial_shipping');
      expect(reason.evidence).toContain('address');
      expect(reason.evidence).toContain('city');
      expect(reason.evidence).not.toContain('governorate');
    });

    test('returns no_payment when shipping data is complete but payment method is missing', () => {
      const reason = detectAbandonReason({
        checkoutData: {
          customerName: 'Ahmed',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'Nasr City',
          address: 'Main Street 5',
        },
      });
      expect(reason).toEqual({ code: 'no_payment', evidence: [] });
    });

    test('returns quick_exit when checkout was saved only a few seconds after start', () => {
      const started = new Date('2026-08-17T10:00:00.000Z');
      const updated = new Date('2026-08-17T10:00:30.000Z');
      const reason = detectAbandonReason({
        checkoutStartedAt: started,
        checkoutUpdatedAt: updated,
        checkoutData: {
          customerName: 'Ahmed',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'Nasr City',
          address: 'Main Street 5',
          paymentMethod: 'cod',
        },
      });
      expect(reason.code).toBe('quick_exit');
    });

    test('does not return quick_exit when the cart was active for a long time', () => {
      const started = new Date('2026-08-17T10:00:00.000Z');
      const updated = new Date('2026-08-17T14:00:00.000Z');
      const reason = detectAbandonReason({
        checkoutStartedAt: started,
        checkoutUpdatedAt: updated,
        checkoutData: {
          customerName: 'Ahmed',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'Nasr City',
          address: 'Main Street 5',
          paymentMethod: 'cod',
        },
      });
      expect(reason.code).not.toBe('quick_exit');
    });

    test('returns lost with the configured lost-after hours as evidence', () => {
      const reason = detectAbandonReason(
        {
          status: 'lost',
          checkoutData: {
            customerName: 'Ahmed',
            phone: '01012345678',
            governorate: 'Cairo',
            city: 'Nasr City',
            address: 'Main Street 5',
            paymentMethod: 'cod',
          },
        },
        { lostAfterHours: 48 },
      );
      expect(reason).toEqual({ code: 'lost', evidence: ['48'] });
    });

    test('defaults lost hours to 24 when not provided', () => {
      const reason = detectAbandonReason({
        status: 'lost',
        checkoutData: {
          customerName: 'A',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'Nasr City',
          address: 'Main Street 5',
          paymentMethod: 'cod',
        },
      });
      expect(reason).toEqual({ code: 'lost', evidence: ['24'] });
    });

    test('returns not_submitted when all required data is complete', () => {
      const started = new Date('2026-08-17T10:00:00.000Z');
      const updated = new Date('2026-08-17T10:30:00.000Z');
      const reason = detectAbandonReason({
        status: 'incomplete',
        checkoutStartedAt: started,
        checkoutUpdatedAt: updated,
        checkoutData: {
          customerName: 'Ahmed',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'Nasr City',
          address: 'Main Street 5',
          paymentMethod: 'cod',
        },
      });
      expect(reason).toEqual({ code: 'not_submitted', evidence: [] });
    });

    test('parses checkoutData from a JSON string', () => {
      const reason = detectAbandonReason({
        checkoutData: JSON.stringify({ customerName: 'Ahmed' }),
      });
      expect(reason.code).toBe('no_phone');
    });
  });

  describe('getMissingShippingFields', () => {
    test('detects every missing shipping field', () => {
      expect(getMissingShippingFields({})).toEqual(['address', 'governorate', 'city']);
    });

    test('accepts alternative address keys', () => {
      expect(getMissingShippingFields({ street: 'X', gov: 'Cairo', city: 'Y' })).toEqual([]);
    });
  });

  describe('parseJsonObject', () => {
    test('returns null for invalid JSON strings', () => {
      expect(parseJsonObject('not-json')).toBeNull();
    });

    test('returns the object for a valid JSON string', () => {
      expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    });
  });
});
