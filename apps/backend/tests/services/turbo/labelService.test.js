jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../../../utils/turbo/errorHandler', () => ({
  handleError: jest.fn((error) => { throw error; }),
}));

const axios = require('axios');
const LabelService = require('../../../services/turbo/labelService');

function createMockClient(overrides = {}) {
  return {
    getApiKey: jest.fn().mockResolvedValue('test-api-key'),
    getHeaders: jest.fn().mockResolvedValue({ Accept: 'application/json' }),
    baseUrl: 'https://backoffice.turbo-eg.com/external-api',
    timeout: 30000,
    ...overrides,
  };
}

function makePdfBuffer() {
  return Buffer.from('%PDF-1.4 fake-pdf-data');
}

describe('LabelService', () => {
  let client, service;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    service = new LabelService(client);
  });

  describe('printLabel', () => {
    test('succeeds on first endpoint and returns base64 PDF', async () => {
      const pdfBuf = makePdfBuffer();
      axios.post.mockResolvedValueOnce({
        data: pdfBuf,
        headers: { 'x-label-url': 'https://example.com/label.pdf' },
      });

      const result = await service.printLabel('TURBO-001');

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('TURBO-001');
      expect(result.labelPdf).toBe(pdfBuf.toString('base64'));
      expect(result.contentType).toBe('application/pdf');
      expect(result.labelUrl).toBe('https://example.com/label.pdf');
    });

    test('falls back to GET when POST returns 405', async () => {
      const pdfBuf = makePdfBuffer();
      const err405 = new Error('Method Not Allowed');
      err405.response = { status: 405, data: null };

      axios.post.mockRejectedValueOnce(err405);
      axios.get.mockResolvedValueOnce({ data: pdfBuf, headers: {} });

      const result = await service.printLabel('TURBO-001');

      expect(result.success).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('tries next endpoint on 404', async () => {
      const pdfBuf = makePdfBuffer();
      const err404 = new Error('Not Found');
      err404.response = { status: 404, data: null };
      const err404b = new Error('Not Found');
      err404b.response = { status: 404, data: null };

      // /print-label → 404 POST, 404 GET
      axios.post.mockRejectedValueOnce(err404);
      axios.get.mockRejectedValueOnce(err404b);
      // /get-label → succeeds
      axios.post.mockResolvedValueOnce({ data: pdfBuf, headers: {} });

      const result = await service.printLabel('TURBO-001');
      expect(result.success).toBe(true);
    });

    test('throws when all endpoints fail', async () => {
      const err = new Error('fatal');
      err.response = { status: 500, data: null };
      axios.post.mockRejectedValue(err);

      await expect(service.printLabel('TURBO-X')).rejects.toThrow('fatal');
    });
  });

  describe('printWaybill', () => {
    test('returns API waybill as base64 when available', async () => {
      const pdfBuf = makePdfBuffer();
      axios.post.mockResolvedValueOnce({ data: pdfBuf, headers: {} });

      const result = await service.printWaybill('TURBO-001');

      expect(result.success).toBe(true);
      expect(result.waybillPdf).toBe(pdfBuf.toString('base64'));
      expect(result.fromApi).toBe(true);
    });

    test('falls back to local waybill when API fails and orderData provided', async () => {
      const err = new Error('waybill endpoint missing');
      err.response = { status: 404, data: null };
      axios.post.mockRejectedValue(err);
      axios.get.mockRejectedValue(err);

      const orderData = {
        orderId: 'ord-1', orderNumber: 'ORD-001', customerName: 'أحمد',
        customerPhone: '01011111111', city: 'القاهرة', governorate: 'القاهرة',
        items: [{ name: 'منتج', quantity: 1, weight: 1, price: 100 }],
        totalWeight: 1, totalValue: 100, shipping: 20,
      };

      const result = await service.printWaybill('TURBO-001', orderData);

      expect(result.success).toBe(true);
      expect(result.fromApi).toBe(false);
      expect(result.waybillData).toBeDefined();
      expect(result.waybillData.receiverName).toBe('أحمد');
    });

    test('throws when API fails and no orderData provided', async () => {
      const err = new Error('no waybill');
      err.response = { status: 404, data: null };
      axios.post.mockRejectedValue(err);
      axios.get.mockRejectedValue(err);

      await expect(service.printWaybill('TURBO-001', null)).rejects.toThrow();
    });
  });

  describe('generateLocalWaybill', () => {
    test('fills all fields correctly from orderData', () => {
      const orderData = {
        orderId: 'ord-1',
        orderNumber: 'ORD-100',
        customerName: 'سارة محمد',
        customerPhone: '01099999999',
        customerEmail: 'sara@test.com',
        city: 'الجيزة',
        governorate: 'الجيزة',
        items: [
          { name: 'فستان', quantity: 2, weight: 0.5, price: 200 },
        ],
        totalWeight: 1,
        totalValue: 400,
        shipping: 40,
        notes: 'هدية',
        createdAt: '2026-07-24T10:00:00Z',
      };

      const waybill = service.generateLocalWaybill(orderData, 'TURBO-999');

      expect(waybill.turboOrderCode).toBe('TURBO-999');
      expect(waybill.orderId).toBe('ord-1');
      expect(waybill.orderNumber).toBe('ORD-100');
      expect(waybill.receiverName).toBe('سارة محمد');
      expect(waybill.receiverPhone).toBe('01099999999');
      expect(waybill.receiverEmail).toBe('sara@test.com');
      expect(waybill.receiverState).toBe('الجيزة');
      expect(waybill.receiverCountry).toBe('Egypt');
      expect(waybill.items[0].name).toBe('فستان');
      expect(waybill.items[0].quantity).toBe(2);
      expect(waybill.items[0].total).toBe(400);
      expect(waybill.notes).toBe('هدية');
      expect(waybill.shippingCost).toBe(40);
    });

    test('cleans city name that contains colon prefix', () => {
      const orderData = {
        city: '4021:Giza',
        governorate: 'الجيزة',
        items: [],
        totalWeight: 0, totalValue: 0, shipping: 0,
      };

      const waybill = service.generateLocalWaybill(orderData, 'T1');
      expect(waybill.receiverCity).toBe('Giza');
    });

    test('handles missing optional fields gracefully', () => {
      const waybill = service.generateLocalWaybill(
        { items: [], totalWeight: 0, totalValue: 0, shipping: 0 },
        'T1'
      );
      expect(waybill.receiverName).toBe('');
      expect(waybill.receiverPhone).toBe('');
      expect(waybill.itemsCount).toBe(0);
    });
  });
});
