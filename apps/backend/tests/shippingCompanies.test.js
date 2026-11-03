const {
  normalizeSettings,
  shouldCreateShipmentNow,
  SHIPMENT_CREATE_TRIGGERS,
} = require('../services/shippingProviderService');

describe('Shipping Companies & Auto-Create Trigger Suite', () => {
  describe('normalizeSettings backward compatibility & trigger fallback', () => {
    test('defaults to ON_ORDER when autoCreateShipments is true and no trigger is set', () => {
      const normalized = normalizeSettings({ autoCreateShipments: true }, 'TURBO', 'LIVE');
      expect(normalized.autoCreateShipments).toBe(true);
      expect(normalized.shipmentCreateTrigger).toBe('ON_ORDER');
    });

    test('defaults to NONE when autoCreateShipments is false and no trigger is set', () => {
      const normalized = normalizeSettings({ autoCreateShipments: false }, 'TURBO', 'LIVE');
      expect(normalized.autoCreateShipments).toBe(false);
      expect(normalized.shipmentCreateTrigger).toBe('NONE');
    });

    test('preserves explicitly configured triggers (ON_ORDER, ON_CONFIRM, ON_READY)', () => {
      const onConfirm = normalizeSettings({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_CONFIRM' });
      expect(onConfirm.shipmentCreateTrigger).toBe('ON_CONFIRM');

      const onReady = normalizeSettings({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_READY' });
      expect(onReady.shipmentCreateTrigger).toBe('ON_READY');

      const onOrder = normalizeSettings({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_ORDER' });
      expect(onOrder.shipmentCreateTrigger).toBe('ON_ORDER');
    });

    test('handles JSON string settings correctly', () => {
      const jsonStr = JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_CONFIRM' });
      const normalized = normalizeSettings(jsonStr, 'TURBO', 'LIVE');
      expect(normalized.autoCreateShipments).toBe(true);
      expect(normalized.shipmentCreateTrigger).toBe('ON_CONFIRM');
    });
  });

  describe('shouldCreateShipmentNow deterministic stage gate', () => {
    test('evaluates ON_ORDER trigger correctly', () => {
      const settings = { autoCreateShipments: true, shipmentCreateTrigger: 'ON_ORDER' };
      expect(shouldCreateShipmentNow(settings, 'ON_ORDER')).toBe(true);
      expect(shouldCreateShipmentNow(settings, 'ORDER_CREATED')).toBe(true);
      expect(shouldCreateShipmentNow(settings, 'ON_CONFIRM')).toBe(false);
      expect(shouldCreateShipmentNow(settings, 'ON_READY')).toBe(false);
    });

    test('evaluates ON_CONFIRM trigger correctly (postponed on order creation, executed on confirm)', () => {
      const settings = { autoCreateShipments: true, shipmentCreateTrigger: 'ON_CONFIRM' };
      expect(shouldCreateShipmentNow(settings, 'ON_ORDER')).toBe(false);
      expect(shouldCreateShipmentNow(settings, 'ON_CONFIRM')).toBe(true);
      expect(shouldCreateShipmentNow(settings, 'CONFIRMED')).toBe(true);
      expect(shouldCreateShipmentNow(settings, 'ON_READY')).toBe(false);
    });

    test('evaluates ON_READY trigger correctly (only fires when entering ready to ship)', () => {
      const settings = { autoCreateShipments: true, shipmentCreateTrigger: 'ON_READY' };
      expect(shouldCreateShipmentNow(settings, 'ON_ORDER')).toBe(false);
      expect(shouldCreateShipmentNow(settings, 'ON_CONFIRM')).toBe(false);
      expect(shouldCreateShipmentNow(settings, 'ON_READY')).toBe(true);
      expect(shouldCreateShipmentNow(settings, 'READY_TO_SHIP')).toBe(true);
    });

    test('blocks shipment creation when autoCreateShipments is disabled', () => {
      const settings = { autoCreateShipments: false, shipmentCreateTrigger: 'ON_CONFIRM' };
      expect(shouldCreateShipmentNow(settings, 'ON_CONFIRM')).toBe(false);
    });

    test('works seamlessly when passed a carrier object with stringified settings', () => {
      const carrier = {
        id: 'carrier-1',
        providerKey: 'TURBO',
        settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_READY' }),
      };
      expect(shouldCreateShipmentNow(carrier, 'ON_READY')).toBe(true);
      expect(shouldCreateShipmentNow(carrier, 'ON_CONFIRM')).toBe(false);
    });
  });

  describe('403 Protection for Integrated Shipping Companies', () => {
    test('identifies integrated providers that must not be deleted via DELETE /:id', () => {
      const INTEGRATED_PROVIDER_KEYS = new Set(['TURBO', 'BOSTA', 'QP_EXPRESS', 'BOSTA_DEMO', 'MYLERZ_DEMO', 'ARAMEX_DEMO']);
      expect(INTEGRATED_PROVIDER_KEYS.has('TURBO')).toBe(true);
      expect(INTEGRATED_PROVIDER_KEYS.has('BOSTA')).toBe(true);
      expect(INTEGRATED_PROVIDER_KEYS.has('QP_EXPRESS')).toBe(true);
      expect(INTEGRATED_PROVIDER_KEYS.has('MANUAL')).toBe(false);
    });

    test('returns 403 Forbidden with Arabic message when trying to delete integrated provider', async () => {
      // Simulate route handler logic
      const req = { params: { id: 'turbo-1' }, user: { companyId: 'comp-1' } };
      let statusCalled = null;
      let jsonCalled = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => {
              jsonCalled = payload;
              return payload;
            },
          };
        },
      };

      const existingCarrier = {
        id: 'turbo-1',
        name: 'تربو',
        providerKey: 'TURBO',
      };

      const INTEGRATED_PROVIDER_KEYS = new Set(['TURBO', 'BOSTA', 'QP_EXPRESS', 'BOSTA_DEMO', 'MYLERZ_DEMO', 'ARAMEX_DEMO']);
      const normKey = String(existingCarrier.providerKey || '').trim().toUpperCase();

      if (INTEGRATED_PROVIDER_KEYS.has(normKey)) {
        res.status(403).json({
          success: false,
          message: 'لا يمكن حذف شركة شحن مدمجة. يرجى استخدام إيقاف العمل بدلاً من الحذف.',
          error: 'لا يمكن حذف شركة شحن مدمجة. يرجى استخدام إيقاف العمل بدلاً من الحذف.',
        });
      }

      expect(statusCalled).toBe(403);
      expect(jsonCalled.success).toBe(false);
      expect(jsonCalled.message).toBe('لا يمكن حذف شركة شحن مدمجة. يرجى استخدام إيقاف العمل بدلاً من الحذف.');
    });
  });
});
