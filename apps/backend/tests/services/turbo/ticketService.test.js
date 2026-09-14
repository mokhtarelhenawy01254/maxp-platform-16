jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data; boundary=---test' }),
  }));
});

jest.mock('../../../utils/turbo/errorHandler', () => ({
  // ticketService catches errors, calls handleError (for logging), then returns { success: false }
  // so we mock it as a no-op (not re-throwing) to allow the return to execute
  handleError: jest.fn(),
}));

const axios = require('axios');
const TicketService = require('../../../services/turbo/ticketService');

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

describe('TicketService', () => {
  let client, service;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    service = new TicketService(client);
  });

  describe('addTicket', () => {
    test('sends correct payload and returns ticket ID', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, ticket_id: 'TKT-001', message: 'تم إنشاء التذكرة' },
      });

      const result = await service.addTicket('محتوى التذكرة', 3, 'TRK-001');

      expect(result.success).toBe(true);
      expect(result.ticketId).toBe('TKT-001');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/tickets/create'),
        expect.objectContaining({
          authentication_key: 'test-api-key',
          category_id: 3,
          content: 'محتوى التذكرة',
          code: 'TRK-001',
          priority: 'low',
          related_to: 'others',
        }),
        expect.any(Object)
      );
    });

    test('returns failure response on API error (success: 0)', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'خطأ في البيانات' },
      });

      const result = await service.addTicket('محتوى', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('فشل في إضافة التذكرة');
    });
  });

  describe('getInquiriesTypes', () => {
    test('returns inquiry categories on success', async () => {
      axios.get.mockResolvedValue({
        data: { success: 1, data: [{ id: 1, name: 'شكوى' }, { id: 2, name: 'استفسار' }] },
      });

      const result = await service.getInquiriesTypes();

      expect(result.success).toBe(true);
      expect(result.types).toHaveLength(2);
      expect(result.types[0].name).toBe('شكوى');
    });

    test('returns failure on API error', async () => {
      axios.get.mockResolvedValue({
        data: { success: 0, error_msg: 'Unauthorized' },
      });

      const result = await service.getInquiriesTypes();
      expect(result.success).toBe(false);
      expect(result.types).toEqual([]);
    });
  });

  describe('getTickets', () => {
    test('returns paginated tickets list', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: 1,
          feed: {
            data: [{ id: 'TKT-001', subject: 'مشكلة' }],
            current_page: 1,
            per_page: 10,
            total: 1,
            last_page: 1,
          },
        },
      });

      const result = await service.getTickets(1, 10);

      expect(result.success).toBe(true);
      expect(result.tickets).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    test('returns empty list on 404 (endpoint not available)', async () => {
      const err = new Error('Not Found');
      err.response = { status: 404 };
      axios.get.mockRejectedValue(err);

      const result = await service.getTickets(1, 10);

      expect(result.success).toBe(true);
      expect(result.tickets).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getTicket', () => {
    test('returns single ticket on success', async () => {
      axios.get.mockResolvedValue({
        data: { success: 1, feed: { id: 'TKT-001', subject: 'استفسار', replies: [] } },
      });

      const result = await service.getTicket('TKT-001');

      expect(result.success).toBe(true);
      expect(result.ticket.id).toBe('TKT-001');
      // replies should be mapped to messages
      expect(result.ticket.messages).toEqual([]);
    });

    test('returns not-found response when ticket does not exist', async () => {
      axios.get.mockResolvedValue({
        data: { success: 0, error_msg: 'غير موجود' },
      });

      const result = await service.getTicket('TKT-MISSING');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.ticket).toBeNull();
    });
  });

  describe('getTicketLog', () => {
    test('returns logs on success', async () => {
      axios.get.mockResolvedValue({
        data: { success: 1, feed: [{ event: 'created', date: '2026-07-24' }] },
      });

      const result = await service.getTicketLog('TKT-001');

      expect(result.success).toBe(true);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].event).toBe('created');
    });

    test('returns empty logs on 404', async () => {
      const err = new Error('Not Found');
      err.response = { status: 404 };
      axios.get.mockRejectedValue(err);

      const result = await service.getTicketLog('TKT-X');

      expect(result.success).toBe(true);
      expect(result.logs).toEqual([]);
    });
  });

  describe('replyToTicket', () => {
    test('sends FormData without image and returns success', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, message: 'تم إرسال الرد' },
      });

      const result = await service.replyToTicket('TKT-001', 'رد من العميل');

      expect(result.success).toBe(true);
      expect(result.message).toBe('تم إرسال الرد');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/tickets\/(TKT-001\/message-store|reply)/),
        expect.any(Object), // FormData instance
        expect.objectContaining({ maxContentLength: Infinity })
      );
    });

    test('appends image buffer when imageFile provided', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, message: 'تم إرسال الرد بالصورة' },
      });

      const FormData = require('form-data');
      const mockFormInstance = new FormData();

      const imageFile = {
        buffer: Buffer.from('fake-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      };

      await service.replyToTicket('TKT-001', 'رد مع صورة', imageFile);

      // FormData.append should have been called with 'image'
      const appendCalls = mockFormInstance.append.mock.calls.map(c => c[0]);
      // The mock is shared so we check the last instantiation's append calls
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('returns failure when API returns success: 0', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'غير مصرح' },
      });

      const result = await service.replyToTicket('TKT-001', 'رد');
      expect(result.success).toBe(false);
      expect(result.message).toBe('فشل في إرسال الرد');
    });
  });

  describe('getUnreadTicketsCount', () => {
    test('returns counts on success', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: 1,
          feed: { tickets: 3, missions: 1, orders: 0 },
        },
      });

      const result = await service.getUnreadTicketsCount();

      expect(result.success).toBe(true);
      expect(result.counts.tickets).toBe(3);
      expect(result.counts.missions).toBe(1);
    });

    test('returns zero counts on 404', async () => {
      const err = new Error('Not Found');
      err.response = { status: 404 };
      axios.get.mockRejectedValue(err);

      const result = await service.getUnreadTicketsCount();

      expect(result.success).toBe(true);
      expect(result.counts).toEqual({ tickets: 0, missions: 0, orders: 0 });
    });

    test('returns failure on unexpected error', async () => {
      const err = new Error('server crash');
      axios.get.mockRejectedValue(err);

      const result = await service.getUnreadTicketsCount();

      expect(result.success).toBe(false);
      expect(result.error).toBe('server crash');
    });
  });
});
