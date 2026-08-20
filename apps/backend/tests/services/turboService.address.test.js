const axios = require('axios');

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    company: { findUnique: jest.fn() },
  })),
  safeQuery: jest.fn(async (operation) => operation()),
}));

const TurboService = require('../../services/turboService');

describe('TurboService shipping address formatting', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TurboService('test-api-key', 'company-1');

    jest.spyOn(service, 'getHeaders').mockResolvedValue({ Accept: 'application/json' });
    jest.spyOn(service, 'getApiKey').mockResolvedValue('test-api-key');
    jest.spyOn(service, 'getMainClientCode').mockResolvedValue('37321');
    jest.spyOn(service, 'getSenderNumber').mockResolvedValue('01000000000');
    jest.spyOn(service, 'getGovernments').mockResolvedValue({
      governments: [{ id: '2', name: 'الجيزة' }],
    });
  });

  test('extracts the complete structured address instead of collapsing to the city', () => {
    const fields = service.getShippingAddressFields(JSON.stringify({
      address: '9 Street',
      area: 'District 5',
      city: '4021:Giza',
      governorate: 'Giza',
    }));

    expect(fields.primaryAddress).toBe('9 Street');
    expect(fields.secondaryAddress).toBe('District 5, Giza');
    expect(fields.formattedAddress).toBe('9 Street, District 5, Giza');
    expect(fields.city).toBe('Giza');
    expect(fields.governorate).toBe('Giza');
  });

  test('sends the full address to Turbo when createShipment receives structured shippingAddress JSON', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: 1,
        result: {
          code: 'SHIP-100',
          bar_code: 'TRACK-100',
        },
      },
    });

    await service.createShipment({
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      customerName: 'Customer One',
      customerPhone: '01111111111',
      shippingAddress: JSON.stringify({
        address: '9 Street',
        area: 'District 5',
        city: '4021:Giza',
      }),
      city: '4021:Giza',
      governorate: 'الجيزة',
      items: [{ productName: 'Sneaker', quantity: 1, price: 100, total: 100 }],
      totalWeight: 1,
      totalValue: 100,
      paymentMethod: 'CASH',
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.address).toBe('9 Street, District 5');
    expect(payload.area).toBe('District 5');
    expect(payload.address).not.toBe('Giza');
  });

  test('uses the same address normalization for local waybills', () => {
    const waybill = service.generateLocalWaybill({
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      customerName: 'Customer One',
      customerPhone: '01111111111',
      shippingAddress: JSON.stringify({
        address: '9 Street',
        area: 'District 5',
        city: '4021:Giza',
        governorate: 'Giza',
      }),
      city: '4021:Giza',
      governorate: 'Giza',
      items: [],
    }, 'SHIP-100');

    expect(waybill.receiverAddress).toBe('9 Street, District 5, Giza');
    expect(waybill.receiverAddress2).toBe('District 5, Giza');
    expect(waybill.receiverCity).toBe('Giza');
    expect(waybill.receiverState).toBe('Giza');
  });

  test('falls back to customerAddress JSON when shippingAddress is missing on the order object', () => {
    const formatted = service.formatOrderForTurbo(
      {
        id: 'order-1',
        orderNumber: 'ORD-100',
        customerName: 'Customer One',
        customerPhone: '01111111111',
        customerAddress: JSON.stringify({
          address: '9 Street',
          area: 'District 5',
          city: '4021:Giza',
          governorate: 'Giza',
        }),
        city: '',
        subtotal: 100,
        shipping: 10,
        total: 110,
        paymentMethod: 'CASH',
      },
      null,
      [{ productName: 'Sneaker', quantity: 1, price: 100, total: 100 }]
    );

    expect(formatted.shippingAddress).toContain('address');
    expect(formatted.city).toBe('Giza');
    expect(formatted.governorate).toBe('Giza');
  });

  test('prefers customerAddress when shippingAddress only contains the city', () => {
    const formatted = service.formatOrderForTurbo(
      {
        id: 'order-1',
        orderNumber: 'ORD-101',
        customerName: 'Customer One',
        customerPhone: '01111111111',
        shippingAddress: 'Giza',
        customerAddress: JSON.stringify({
          addressLine1: '14 Gabr Tamam Street',
          district: 'Imbaba',
          city: 'Giza',
          governorate: 'Giza',
        }),
        city: 'Giza',
        subtotal: 100,
        shipping: 10,
        total: 110,
        paymentMethod: 'CASH',
      },
      null,
      [{ productName: 'Sneaker', quantity: 1, price: 100, total: 100 }]
    );

    expect(formatted.shippingAddress).toContain('14 Gabr Tamam Street');
    expect(service.getShippingAddressFields(formatted.shippingAddress).formattedAddress)
      .toBe('14 Gabr Tamam Street, Imbaba, Giza');
  });

  test('sends the richer customerAddress to Turbo if shippingAddress is city-only', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: 1,
        result: {
          code: 'SHIP-101',
          bar_code: 'TRACK-101',
        },
      },
    });

    await service.createShipment({
      orderId: 'order-1',
      orderNumber: 'ORD-101',
      customerName: 'Customer One',
      customerPhone: '01111111111',
      shippingAddress: 'Giza',
      customerAddress: JSON.stringify({
        addressLine1: '14 Gabr Tamam Street',
        district: 'Imbaba',
        city: 'Giza',
        governorate: 'Giza',
      }),
      city: 'Giza',
      governorate: 'Giza',
      items: [{ productName: 'Sneaker', quantity: 1, price: 100, total: 100 }],
      totalWeight: 1,
      totalValue: 100,
      paymentMethod: 'CASH',
    });

    const payload = axios.post.mock.calls[0][1];
    expect(payload.address).toBe('14 Gabr Tamam Street, Imbaba');
    expect(payload.address).not.toBe('Giza');
  });

  test('updates Turbo shipment with full address and numeric invoice number', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: 1,
        result: { code: '37406090' },
      },
    });

    await service.updateShipment('37406090', {
      orderNumber: 'ORD-839842-557',
      customerName: 'Customer One',
      customerPhone: '01111111111',
      shippingAddress: 'Giza',
      customerAddress: JSON.stringify({
        addressLine1: '14 Gabr Tamam Street',
        district: 'Imbaba',
        city: 'Giza',
        governorate: 'Giza',
      }),
      city: 'Giza',
      governorate: 'Giza',
      items: [{ productName: 'Sneaker', quantity: 1, price: 100, total: 100 }],
      totalValue: 100,
      paymentMethod: 'CASH',
    });

    const payload = axios.post.mock.calls[0][1];
    expect(payload.address).toBe('14 Gabr Tamam Street, Imbaba');
    expect(payload.invoice_number).toBe('ORD-839842-557');
  });
});
