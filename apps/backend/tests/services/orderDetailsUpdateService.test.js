const { OrderDetailsUpdateService } = require('../../services/orderDetailsUpdateService');

function createPrismaMock() {
  return {
    order: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async ({ where, data, include }) => ({
        id: where.id,
        orderNumber: 'ORD-1001',
        customerName: data.customerName ?? 'Customer One',
        customerPhone: data.customerPhone ?? '01011111111',
        notes: data.notes ?? 'note',
        city: data.city ?? 'القاهرة',
        shippingAddress: data.shippingAddress ?? JSON.stringify({ city: 'القاهرة', governorate: 'القاهرة' }),
        turboShipmentId: 'turbo-1',
        company: {
          id: 'company-1',
          turboApiKey: 'turbo-key',
          turboEnabled: true,
        },
        customer: { id: 'customer-1' },
        orderItems: [{ id: 'item-1', productId: 'prod-1', productName: 'Swan Boot' }],
        include,
      })),
    },
    guestOrder: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async ({ where, data }) => ({
        id: where.id,
        orderNumber: 'GST-2001',
        guestName: data.guestName ?? 'Guest User',
        guestPhone: data.guestPhone ?? '01022222222',
        notes: data.notes ?? 'guest-note',
        shippingAddress: data.shippingAddress,
      })),
    },
  };
}

describe('OrderDetailsUpdateService', () => {
  test('updates a regular order, merges metadata, and syncs turbo shipment with orderItems', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 'ORD-1001',
      metadata: JSON.stringify({ source: 'manual' }),
      shippingAddress: JSON.stringify({ city: 'الجيزة', governorate: 'الجيزة', area: 'الدقي' }),
    });
    const TurboService = jest.fn().mockImplementation(() => ({
      formatOrderForTurbo: jest.fn((order, customer, orderItems) => ({
        orderId: order.id,
        customerId: customer.id,
        itemCount: orderItems.length,
      })),
      updateShipment: jest.fn(async () => true),
    }));
    const service = new OrderDetailsUpdateService({
      getPrisma: () => prisma,
      now: () => new Date('2026-05-06T12:00:00.000Z'),
      TurboService,
    });

    const result = await service.updateOrderDetails({
      orderIdentifier: 'ORD-1001',
      companyId: 'company-1',
      input: {
        customerPhone: '01012345678',
        customerName: 'New Customer',
        alternativePhone: '01112345678',
        city: 'القاهرة',
        governorate: 'القاهرة',
        shippingAddress: { area: 'مدينة نصر' },
        metadataPatch: { priority: 'high' },
      },
    });

    expect(result).toEqual(expect.objectContaining({
      orderType: 'regular',
      orderId: 'order-1',
      orderNumber: 'ORD-1001',
      updatedFields: expect.arrayContaining([
        'customerPhone',
        'customerName',
        'alternativePhone',
        'city',
        'governorate',
        'shippingAddress',
        'metadataPatch',
      ]),
      customerName: 'New Customer',
      customerPhone: '01012345678',
      city: 'القاهرة',
      governorate: 'القاهرة',
      alternativePhone: '01112345678',
      shippingAddress: {
        city: 'القاهرة',
        governorate: 'القاهرة',
        area: 'مدينة نصر',
      },
      turboSync: {
        attempted: true,
        updated: true,
        shipmentId: 'turbo-1',
        error: null,
      },
    }));

    expect(JSON.parse(prisma.order.update.mock.calls[0][0].data.metadata)).toEqual({
      source: 'manual',
      alternativePhone: '01112345678',
      priority: 'high',
    });
    expect(TurboService).toHaveBeenCalledWith('turbo-key', 'company-1');
    const turboInstance = TurboService.mock.results[0].value;
    expect(turboInstance.formatOrderForTurbo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      { id: 'customer-1' },
      [{ id: 'item-1', productId: 'prod-1', productName: 'Swan Boot' }]
    );
  });

  test('updates a guest order and preserves storefront metadata defaults', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValueOnce(null);
    prisma.guestOrder.findFirst.mockResolvedValueOnce({
      id: 'guest-1',
      orderNumber: 'GST-2001',
      metadata: '',
      shippingAddress: JSON.stringify({ city: 'المنصورة', governorate: 'الدقهلية' }),
    });
    const service = new OrderDetailsUpdateService({
      getPrisma: () => prisma,
      now: () => new Date('2026-05-06T12:00:00.000Z'),
    });

    const result = await service.updateOrderDetails({
      orderIdentifier: 'GST-2001',
      companyId: 'company-1',
      input: {
        customerName: 'Guest Updated',
        customerPhone: '01087654321',
        notes: 'updated guest note',
        metadataPatch: { sourceChannel: 'facebook' },
      },
    });

    expect(result).toEqual(expect.objectContaining({
      orderType: 'guest',
      orderId: 'guest-1',
      customerName: 'Guest Updated',
      customerPhone: '01087654321',
      notes: 'updated guest note',
      metadata: expect.objectContaining({
        source: 'storefront',
        isGuestOrder: true,
        sourceChannel: 'facebook',
      }),
      turboSync: {
        attempted: false,
        updated: false,
        shipmentId: null,
        error: null,
      },
    }));
  });

  test('updates a guest order and syncs with Turbo when turboShipmentId exists', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValueOnce(null);
    prisma.guestOrder.findFirst.mockResolvedValueOnce({
      id: 'guest-2',
      orderNumber: 'GST-2002',
      turboShipmentId: '38125555',
      metadata: JSON.stringify({ isGuestOrder: true }),
      shippingAddress: JSON.stringify({ city: 'القاهرة', governorate: 'القاهرة', area: 'المعادي' }),
    });
    prisma.guestOrder.update.mockResolvedValueOnce({
      id: 'guest-2',
      orderNumber: 'GST-2002',
      guestName: 'Guest With Turbo',
      guestPhone: '01099998888',
      turboShipmentId: '38125555',
      shippingAddress: JSON.stringify({ city: 'الجيزة', governorate: 'الجيزة', area: 'الدقي' }),
      company: { id: 'company-1', turboApiKey: 'turbo-key', turboEnabled: true },
    });
    prisma.company = {
      findUnique: jest.fn().mockResolvedValueOnce({
        id: 'company-1',
        turboApiKey: 'turbo-key',
        turboEnabled: true,
      }),
    };

    const TurboService = jest.fn().mockImplementation(() => ({
      formatOrderForTurbo: jest.fn(() => ({
        orderId: 'guest-2',
        customerName: 'Guest With Turbo',
      })),
      updateShipment: jest.fn(async () => true),
    }));

    const service = new OrderDetailsUpdateService({
      getPrisma: () => prisma,
      now: () => new Date('2026-05-06T12:00:00.000Z'),
      TurboService,
    });

    const result = await service.updateOrderDetails({
      orderIdentifier: 'GST-2002',
      companyId: 'company-1',
      input: {
        customerName: 'Guest With Turbo',
        customerPhone: '01099998888',
      },
    });

    expect(result).toEqual(expect.objectContaining({
      orderType: 'guest',
      orderId: 'guest-2',
      orderNumber: 'GST-2002',
      turboSync: {
        attempted: true,
        updated: true,
        shipmentId: '38125555',
        error: null,
      },
    }));
    expect(TurboService).toHaveBeenCalledWith('turbo-key', 'company-1');
  });

  test('throws a validation error for invalid phone numbers', async () => {
    const service = new OrderDetailsUpdateService({
      getPrisma: () => createPrismaMock(),
    });

    await expect(service.updateOrderDetails({
      orderIdentifier: 'ORD-1001',
      companyId: 'company-1',
      input: {
        customerPhone: '123',
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('رقم الهاتف'),
    });
  });
});
