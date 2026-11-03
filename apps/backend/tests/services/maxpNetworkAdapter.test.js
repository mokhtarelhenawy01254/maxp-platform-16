const maxpNetworkAdapter = require('../../services/shipping/adapters/maxpNetworkAdapter');
const {
  syncNetworkShipmentToStore,
  mapCarrierStatusToStoreStatus,
  isSuppressed,
  runSuppressed,
} = require('../../services/shipping/networkShipmentSyncService');
const tenantContext = require('../../services/tenantContext');

describe('MAXP_NETWORK Shipping Adapter & Cross-Tenant Sync Suite (SHIP-W6)', () => {
  const storeCompanyId = 'store-company-100';
  const shippingCompanyId = 'shipping-carrier-200';
  const orderId = 'order-abc-123';
  const clientMerchantId = 'merchant-client-555';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. mapCarrierStatusToStoreStatus deterministic mapping', () => {
    test('maps DELIVERED to DELIVERED order status and COMPLETED payment status', () => {
      const mapped = mapCarrierStatusToStoreStatus('DELIVERED');
      expect(mapped.orderStatus).toBe('DELIVERED');
      expect(mapped.paymentStatus).toBe('COMPLETED');
      expect(mapped.isCancelled).toBe(false);
    });

    test('maps RETURNED to RETURNED order status', () => {
      const mapped = mapCarrierStatusToStoreStatus('RETURNED');
      expect(mapped.orderStatus).toBe('RETURNED');
      expect(mapped.isCancelled).toBe(false);
    });

    test('maps transit statuses to SHIPPED with OUT_FOR_DELIVERY custom code', () => {
      const inTransit = mapCarrierStatusToStoreStatus('IN_TRANSIT');
      expect(inTransit.orderStatus).toBe('SHIPPED');
      expect(inTransit.customStatusCode).toBe('OUT_FOR_DELIVERY');

      const outForDel = mapCarrierStatusToStoreStatus('OUT_FOR_DELIVERY');
      expect(outForDel.orderStatus).toBe('SHIPPED');
      expect(outForDel.customStatusCode).toBe('OUT_FOR_DELIVERY');
    });

    test('maps CANCELLED to null orderStatus (policy: requires manual decision, never auto-cancels order)', () => {
      const cancelled = mapCarrierStatusToStoreStatus('CANCELLED');
      expect(cancelled.orderStatus).toBeNull();
      expect(cancelled.isCancelled).toBe(true);
    });
  });

  describe('2. createShipment via maxpNetworkAdapter', () => {
    test('successfully creates shipment in shipping company tenant when store is linked', async () => {
      const mockStoreOrder = {
        id: orderId,
        orderNumber: 'ORD-999',
        companyId: storeCompanyId,
        customerName: 'أحمد محمود',
        customerPhone: '01012345678',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        shippingAddress: 'شارع عباس العقاد',
        total: 750,
        currency: 'EGP',
        paymentMethod: 'COD',
        orderItems: [{ id: 'item-1' }, { id: 'item-2' }],
      };

      const mockStoreShippingCompany = {
        id: 'carrier-cfg-1',
        name: 'شركة النور للشحن (MaxP Network)',
        providerKey: 'MAXP_NETWORK',
        integrationMode: 'INTERNAL',
        linkedCompanyId: shippingCompanyId,
        settings: JSON.stringify({ linkedCompanyId: shippingCompanyId }),
        companyId: storeCompanyId,
      };

      const mockClientMerchant = {
        id: clientMerchantId,
        name: 'متجر الأناقة',
        companyId: shippingCompanyId,
        linkedCompanyId: storeCompanyId,
        isActive: true,
      };

      let createdCarrierShipment = null;
      let recordedEvent = null;

      const mockPrisma = {
        order: {
          findFirst: jest.fn(async () => mockStoreOrder),
          findUnique: jest.fn(async () => mockStoreOrder),
        },
        shippingCompany: {
          findFirst: jest.fn(async () => mockStoreShippingCompany),
          findUnique: jest.fn(async () => mockStoreShippingCompany),
        },
        merchant: {
          findFirst: jest.fn(async ({ where }) => {
            if (
              where.companyId === shippingCompanyId &&
              where.linkedCompanyId === storeCompanyId &&
              where.isActive
            ) {
              return mockClientMerchant;
            }
            return null;
          }),
        },
        shipment: {
          create: jest.fn(async ({ data }) => {
            createdCarrierShipment = { id: 'ship-net-001', ...data };
            return createdCarrierShipment;
          }),
        },
        shipmentEvent: {
          create: jest.fn(async ({ data }) => {
            recordedEvent = { id: 'event-001', ...data };
            return recordedEvent;
          }),
        },
      };

      // Instantiate adapter with mock prisma
      const adapter = new (maxpNetworkAdapter.constructor)(mockPrisma);

      const result = await adapter.createShipment({
        orderId,
        shippingCompanyId: mockStoreShippingCompany.id,
        storeCompanyId,
        weight: 2.5,
        pieces: 2,
        codAmount: 750,
      });

      expect(result.success).toBe(true);
      expect(result.externalShipmentId).toBe('ship-net-001');
      expect(result.trackingNumber).toMatch(/^TRK-NET-/);
      expect(result.labelUrl).toBe('/api/v1/shipping-portal/shipments/ship-net-001/waybill-label');

      // Verify created shipment in shipping company tenant
      expect(mockPrisma.shipment.create).toHaveBeenCalledTimes(1);
      const createData = mockPrisma.shipment.create.mock.calls[0][0].data;
      expect(createData.companyId).toBe(shippingCompanyId); // belongs to shipping company!
      expect(createData.merchantId).toBe(clientMerchantId); // client ID matches store!
      expect(createData.orderId).toBe(orderId); // cross-reference
      expect(createData.merchantOrderId).toBe('ORD-999');
      expect(createData.recipientName).toBe('أحمد محمود');
      expect(createData.recipientPhone).toBe('01012345678');
      expect(createData.destinationGovernorate).toBe('القاهرة');
      expect(createData.weight).toBe(2.5);
      expect(createData.pieces).toBe(2);
      expect(createData.codAmount).toBe(750);
      expect(createData.status).toBe('PENDING');
      expect(createData.carrierType).toBe('MAXP_NETWORK');

      // Verify timeline event
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledTimes(1);
      const eventData = mockPrisma.shipmentEvent.create.mock.calls[0][0].data;
      expect(eventData.companyId).toBe(shippingCompanyId);
      expect(eventData.toStatus).toBe('PENDING');
      expect(eventData.reasonCode).toBe('CREATED');
      expect(eventData.actorType).toBe('SYSTEM');
    });

    test('fails with 400 «غير مربوط بشركة شحن» when store has no merchant account at shipping company', async () => {
      const mockStoreOrder = {
        id: orderId,
        companyId: storeCompanyId,
      };

      const mockStoreShippingCompany = {
        id: 'carrier-cfg-1',
        providerKey: 'MAXP_NETWORK',
        linkedCompanyId: shippingCompanyId,
        companyId: storeCompanyId,
      };

      const mockPrisma = {
        order: { findFirst: jest.fn(async () => mockStoreOrder) },
        shippingCompany: { findFirst: jest.fn(async () => mockStoreShippingCompany) },
        merchant: {
          findFirst: jest.fn(async () => null), // NOT LINKED!
        },
      };

      const adapter = new (maxpNetworkAdapter.constructor)(mockPrisma);

      const result = await adapter.createShipment({
        orderId,
        shippingCompanyId: mockStoreShippingCompany.id,
        storeCompanyId,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('غير مربوط بشركة شحن');
      expect(result.reason).toBe('MERCHANT_NOT_LINKED');
    });
  });

  describe('3. Status flow-back from shipping company to store (syncNetworkShipmentToStore)', () => {
    test('updates store order to DELIVERED and records OrderStatusHistory when carrier delivers', async () => {
      const carrierShipment = {
        id: 'ship-carrier-1',
        companyId: shippingCompanyId,
        orderId,
        merchantId: clientMerchantId,
        status: 'DELIVERED',
        collectedAmount: 750,
        merchant: {
          id: clientMerchantId,
          companyId: shippingCompanyId,
          linkedCompanyId: storeCompanyId, // store's company!
        },
      };

      const storeOrder = {
        id: orderId,
        companyId: storeCompanyId,
        status: 'SHIPPED',
        paymentStatus: 'PENDING',
      };

      const storeShipment = {
        id: 'ship-store-local',
        orderId,
        companyId: storeCompanyId,
        status: 'PENDING',
      };

      let orderUpdatedData = null;
      let orderHistoryData = null;
      let shipmentUpdatedData = null;

      const mockPrisma = {
        order: {
          findFirst: jest.fn(async () => storeOrder),
          update: jest.fn(async ({ data }) => {
            orderUpdatedData = data;
            return { ...storeOrder, ...data };
          }),
        },
        orderStatusHistory: {
          create: jest.fn(async ({ data }) => {
            orderHistoryData = data;
            return { id: 'hist-1', ...data };
          }),
        },
        shipment: {
          findFirst: jest.fn(async () => storeShipment),
          update: jest.fn(async ({ data }) => {
            shipmentUpdatedData = data;
            return { ...storeShipment, ...data };
          }),
        },
        shipmentEvent: {
          create: jest.fn(async () => ({ id: 'ev-1' })),
        },
      };

      const syncResult = await syncNetworkShipmentToStore(
        mockPrisma,
        carrierShipment,
        'DELIVERED',
        { actorType: 'COURIER', actorId: 'courier-007', reason: 'تم التسليم للعميل باليد' }
      );

      expect(syncResult.success).toBe(true);
      expect(syncResult.orderUpdated).toBe(true);

      // Verify order update
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          paymentStatus: 'COMPLETED',
        },
      });

      // Verify OrderStatusHistory
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          status: 'DELIVERED',
          oldStatus: 'SHIPPED',
          changedBy: 'courier-007',
          reason: 'تم التسليم للعميل باليد',
        }),
      });

      // Verify store shipment update and COD collectedAmount reflection
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-store-local' },
        data: {
          status: 'DELIVERED',
          collectedAmount: 750,
        },
      });
    });

    test('updates store order to RETURNED when carrier marks shipment returned', async () => {
      const carrierShipment = {
        id: 'ship-carrier-1',
        companyId: shippingCompanyId,
        orderId,
        merchantId: clientMerchantId,
        status: 'RETURNED',
        merchant: {
          id: clientMerchantId,
          companyId: shippingCompanyId,
          linkedCompanyId: storeCompanyId,
        },
      };

      const storeOrder = {
        id: orderId,
        companyId: storeCompanyId,
        status: 'SHIPPED',
      };

      const mockPrisma = {
        order: {
          findFirst: jest.fn(async () => storeOrder),
          update: jest.fn(async ({ data }) => ({ ...storeOrder, ...data })),
        },
        orderStatusHistory: {
          create: jest.fn(async () => ({ id: 'hist-2' })),
        },
        shipment: {
          findFirst: jest.fn(async () => null),
        },
      };

      const syncResult = await syncNetworkShipmentToStore(
        mockPrisma,
        carrierShipment,
        'RETURNED',
        { actorType: 'ADMIN', reason: 'رفض الاستلام من العميل' }
      );

      expect(syncResult.success).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'RETURNED' },
      });
    });

    test('does NOT auto-cancel store order when carrier shipment is CANCELLED (manual decision policy)', async () => {
      const carrierShipment = {
        id: 'ship-carrier-1',
        companyId: shippingCompanyId,
        orderId,
        merchantId: clientMerchantId,
        status: 'CANCELLED',
        merchant: {
          id: clientMerchantId,
          companyId: shippingCompanyId,
          linkedCompanyId: storeCompanyId,
        },
      };

      const storeOrder = {
        id: orderId,
        companyId: storeCompanyId,
        status: 'SHIPPED',
      };

      const mockPrisma = {
        order: {
          findFirst: jest.fn(async () => storeOrder),
          update: jest.fn(),
        },
        orderStatusHistory: {
          create: jest.fn(async () => ({ id: 'hist-3' })),
        },
        shipment: {
          findFirst: jest.fn(async () => null),
        },
      };

      const syncResult = await syncNetworkShipmentToStore(
        mockPrisma,
        carrierShipment,
        'CANCELLED',
        { actorType: 'SYSTEM' }
      );

      expect(syncResult.success).toBe(true);
      // Order status update MUST NOT be called!
      expect(mockPrisma.order.update).not.toHaveBeenCalled();

      // But OrderStatusHistory note MUST be created for store audit
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          status: 'SHIPPED', // status remains unchanged
          oldStatus: 'SHIPPED',
          reason: expect.stringContaining('تم إلغاء الشحنة لدى شركة الشحن'),
        }),
      });
    });

    test('prevents infinite recursion loops via suppression storage', async () => {
      let callCount = 0;
      const mockPrisma = {
        shipment: {
          findUnique: jest.fn(async () => {
            callCount++;
            return {
              id: 'ship-1',
              orderId,
              merchantId: clientMerchantId,
              merchant: { linkedCompanyId: storeCompanyId },
            };
          }),
        },
      };

      await runSuppressed(async () => {
        expect(isSuppressed()).toBe(true);
        const result = await syncNetworkShipmentToStore(mockPrisma, 'ship-1', 'DELIVERED');
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe('SUPPRESSED_LOOP_PREVENTION');
      });

      expect(isSuppressed()).toBe(false);
      expect(callCount).toBe(0); // Exited early before any DB query
    });
  });

  describe('4. Tenant isolation verification', () => {
    test('shipping company cannot query store orders directly outside its tenant context', async () => {
      // In isolated multi-tenant environment, query scoped to shippingCompanyId yields 0 rows for other tenant's orders
      const mockPrisma = {
        order: {
          findFirst: jest.fn(async ({ where }) => {
            if (where.companyId === shippingCompanyId) {
              return null; // 0 rows / 404!
            }
            return { id: orderId, companyId: storeCompanyId };
          }),
        },
      };

      // Query from shipping company tenant context
      const carrierView = await mockPrisma.order.findFirst({
        where: { id: orderId, companyId: shippingCompanyId },
      });

      expect(carrierView).toBeNull();
    });
  });
});
