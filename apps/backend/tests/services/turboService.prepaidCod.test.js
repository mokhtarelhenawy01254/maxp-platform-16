const ShipmentService = require('../../services/turbo/shipmentService');

describe('Turbo ShipmentService - Prepaid COD amount', () => {
  const dummyApiClient = {
    getHeaders: jest.fn().mockResolvedValue({}),
    getApiKey: jest.fn().mockResolvedValue('test-key'),
    getMainClientCode: jest.fn().mockResolvedValue(12345),
    getSenderNumber: jest.fn().mockResolvedValue('01000000000'),
    baseUrl: 'https://backoffice.turbo-eg.com/external-api',
    timeout: 5000,
    get: jest.fn().mockResolvedValue({ data: { success: true, feed: [] } }),
  };

  test('sets amount_to_be_collected to 0 when paymentMethod is PAYMOB or CARD', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: 1,
        result: { code: 'TB-101', bar_code: '38129999' },
      },
    });

    const service = new ShipmentService(dummyApiClient);
    const result = await service.createShipment({
      orderId: 'ord-prepaid-1',
      orderNumber: 'ORD-PREPAID-1',
      customerName: 'Prepaid Customer',
      customerPhone: '01012345678',
      shippingAddress: 'شارع التحرير الدقي',
      governorate: 'الجيزة',
      totalValue: 750,
      paymentMethod: 'PAYMOB',
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/add-order'),
      expect.objectContaining({
        amount_to_be_collected: 0,
        receiver: 'Prepaid Customer',
        phone1: '01012345678',
      }),
      expect.any(Object)
    );
    axios.post.mockRestore();
  });

  test('sets amount_to_be_collected to 0 when paymentStatus is COMPLETED even if paymentMethod is CASH', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: 1,
        result: { code: 'TB-102', bar_code: '38129998' },
      },
    });

    const service = new ShipmentService(dummyApiClient);
    const result = await service.createShipment({
      orderId: 'ord-prepaid-2',
      orderNumber: 'ORD-PREPAID-2',
      customerName: 'Paid In Advance Customer',
      customerPhone: '01012345678',
      shippingAddress: 'شارع التحرير الدقي',
      governorate: 'الجيزة',
      totalValue: 900,
      paymentMethod: 'CASH',
      paymentStatus: 'COMPLETED',
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/add-order'),
      expect.objectContaining({
        amount_to_be_collected: 0,
      }),
      expect.any(Object)
    );
    axios.post.mockRestore();
  });

  test('sets amount_to_be_collected to totalValue for regular COD cash order', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: 1,
        result: { code: 'TB-103', bar_code: '38129997' },
      },
    });

    const service = new ShipmentService(dummyApiClient);
    const result = await service.createShipment({
      orderId: 'ord-cod-1',
      orderNumber: 'ORD-COD-1',
      customerName: 'COD Customer',
      customerPhone: '01012345678',
      shippingAddress: 'شارع التحرير الدقي',
      governorate: 'الجيزة',
      totalValue: 450,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/add-order'),
      expect.objectContaining({
        amount_to_be_collected: 450,
      }),
      expect.any(Object)
    );
    axios.post.mockRestore();
  });
});
