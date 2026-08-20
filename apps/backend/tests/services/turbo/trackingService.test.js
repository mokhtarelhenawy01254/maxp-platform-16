jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../../../utils/turbo/errorHandler', () => ({
  handleError: jest.fn((error) => { throw error; }),
  getTurboErrorMessage: jest.fn((error) => error?.response?.data?.error_msg || error?.message || 'Unknown error'),
}));

const axios = require('axios');
const TrackingService = require('../../../services/turbo/trackingService');

function createMockClient(overrides = {}) {
  return {
    getApiKey: jest.fn().mockResolvedValue('test-api-key'),
    getHeaders: jest.fn().mockResolvedValue({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    getMainClientCode: jest.fn().mockResolvedValue('37321'),
    baseUrl: 'https://backoffice.turbo-eg.com/external-api',
    timeout: 30000,
    ...overrides,
  };
}

describe('TrackingService', () => {
  let client, service;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    service = new TrackingService(client);
  });

  describe('trackShipment', () => {
    test('returns shipment data when search-order succeeds with array', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: 1,
          data: [{ status: 'delivered', status_code: '7', bar_code: 'TRK-001' }],
        },
      });

      const result = await service.trackShipment('TRK-001');

      expect(result.success).toBe(true);
      expect(result.data.code).toBe('TRK-001');
      expect(result.data.status).toBe('delivered');
      expect(result.data.status_code).toBe('7');
    });

    test('returns shipment data when search-order succeeds with single object', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: 'in_transit', status_code: '3', bar_code: 'TRK-002' },
        },
      });

      const result = await service.trackShipment('TRK-002');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('in_transit');
    });

    test('falls back to get-status when search-order fails, finds by code', async () => {
      // search-order throws
      axios.post
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          data: {
            data: [
              { code: 'TRK-003', status: 'returned', status_code: '5', bar_code: 'BAR-003' },
            ],
          },
        });

      const result = await service.trackShipment('TRK-003');
      expect(result.success).toBe(true);
      expect(result.data.code).toBe('TRK-003');
      expect(result.data.status).toBe('returned');
    });

    test('falls back to get-status and finds by bar_code', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({
          data: {
            data: [
              { code: 'OTHER', status: 'cancelled', status_code: '6', bar_code: 'BAR-999' },
            ],
          },
        });

      const result = await service.trackShipment('BAR-999');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
    });

    test('returns not-found when search-order returns success:0', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { success: 0, data: null } })
        .mockRejectedValueOnce(new Error('get-status failed'));

      const result = await service.trackShipment('UNKNOWN');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    test('returns not-found when both endpoints fail', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('search failed'))
        .mockRejectedValueOnce(new Error('status failed'));

      const result = await service.trackShipment('TRK-404');
      expect(result.success).toBe(false);
      expect(result.error).toContain('90');
    });

    test('returns error response when outer error occurs (getApiKey fails)', async () => {
      client.getApiKey.mockRejectedValue(new Error('no API key'));
      const result = await service.trackShipment('TRK-X');
      expect(result.success).toBe(false);
      expect(result.error).toBe('no API key');
    });

    test('calls search-order with correct payload', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: 1, data: [{ status: 'created', status_code: '1' }] },
      });

      await service.trackShipment('ABC-123');

      expect(axios.post).toHaveBeenCalledWith(
        'https://backoffice.turbo-eg.com/external-api/search-order',
        expect.objectContaining({
          authentication_key: 'test-api-key',
          main_client_code: '37321',
          search_key: 'ABC-123',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getShipmentStatus', () => {
    test('returns structured response on success', async () => {
      axios.get.mockResolvedValue({
        data: {
          id: 'SHP-1',
          status: 'delivered',
          tracking_number: 'TRK-001',
          current_location: 'Cairo HQ',
          estimated_delivery: '2026-07-25',
          delivered_at: '2026-07-24',
        },
      });

      const result = await service.getShipmentStatus('SHP-1');

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('SHP-1');
      expect(result.status).toBe('delivered');
      expect(result.currentLocation).toBe('Cairo HQ');
      expect(result.deliveredAt).toBe('2026-07-24');
    });

    test('throws when API call fails', async () => {
      const apiError = new Error('API down');
      axios.get.mockRejectedValue(apiError);

      await expect(service.getShipmentStatus('SHP-X')).rejects.toThrow('API down');
    });
  });

  describe('fetchAllStatuses', () => {
    test('returns mapped shipments with correct internalStatus', async () => {
      axios.post.mockResolvedValue({
        data: {
          success: 1,
          data: [
            { code: 'TRK-001', bar_code: 'BAR-001', status: 'Delivered', status_code: '7' },
            { code: 'TRK-002', bar_code: 'BAR-002', status: 'Cancelled', status_code: '6' },
          ],
        },
      });

      const result = await service.fetchAllStatuses('2026-01-01', '2026-07-24');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.shipments[0].internalStatus).toBe('delivered');
      expect(result.shipments[1].internalStatus).toBe('cancelled');
      expect(result.dateRange).toEqual({ from: '2026-01-01', to: '2026-07-24' });
    });

    test('uses default 90-day range when no dates provided', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, data: [] },
      });

      const result = await service.fetchAllStatuses(null, null);

      expect(result.success).toBe(true);
      // Should have dateRange with 90 days ago
      const fromDate = new Date(result.dateRange.from);
      const daysDiff = Math.round((Date.now() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      // Allow ±1 day tolerance: setDate(-90) can land on 89 or 91 days ago depending on clock
      expect(daysDiff).toBeGreaterThanOrEqual(89);
      expect(daysDiff).toBeLessThanOrEqual(91);
    });

    test('returns empty shipments array when no data', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, data: [] },
      });

      const result = await service.fetchAllStatuses('2026-01-01', '2026-07-24');
      expect(result.shipments).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('throws when API returns success: 0', async () => {
      const { handleError } = require('../../../utils/turbo/errorHandler');
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'Authentication failed' },
      });

      await expect(service.fetchAllStatuses(null, null)).rejects.toThrow('Authentication failed');
    });

    test('maps all shipment fields correctly', async () => {
      axios.post.mockResolvedValue({
        data: {
          success: 1,
          data: [{
            code: 'C1', bar_code: 'B1', status: 'Out for delivery', status_code: '4',
            return_reason: null, delay_reason: 'traffic', branch: 'Cairo North',
            captain: 'Ahmed', captain_number1: '01111111111', received_amount: 250,
            invoice_number: '1001',
          }],
        },
      });

      const result = await service.fetchAllStatuses('2026-01-01', '2026-07-24');
      const s = result.shipments[0];

      expect(s.code).toBe('C1');
      expect(s.barCode).toBe('B1');
      expect(s.branch).toBe('Cairo North');
      expect(s.captain).toBe('Ahmed');
      expect(s.captainNumber1).toBe('01111111111');
      expect(s.receivedAmount).toBe(250);
      expect(s.invoiceNumber).toBe('1001');
    });
  });
});
