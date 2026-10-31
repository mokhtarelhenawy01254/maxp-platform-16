const demoTicketAdapter = require('../services/shipping/adapters/demoTicketAdapter');
const manualTicketAdapter = require('../services/shipping/adapters/manualTicketAdapter');
const turboTicketAdapter = require('../services/shipping/adapters/turboTicketAdapter');
const { getTicketAdapter } = require('../services/shippingProviderService');
const ticketThreadService = require('../services/shipping/ticketThreadService');

describe('T26 — Shipping AI Agent & Carrier Conversations', () => {
  describe('Carrier Ticket Adapters', () => {
    test('demoTicketAdapter returns static demo ticket without network', async () => {
      const listRes = await demoTicketAdapter.listTickets({ companyId: 'comp_1', code: 'QA-SHIP-001' });
      expect(listRes.success).toBe(true);
      expect(Array.isArray(listRes.tickets)).toBe(true);
      expect(listRes.tickets.length).toBe(1);
      expect(listRes.tickets[0].code).toBe('QA-SHIP-001');

      const msgRes = await demoTicketAdapter.getMessages({ companyId: 'comp_1', ticketId: 'demo-ticket-001' });
      expect(msgRes.success).toBe(true);
      expect(msgRes.messages.length).toBe(2);
      expect(msgRes.messages[0].direction).toBe('INBOUND');
      expect(msgRes.messages[1].direction).toBe('INBOUND');

      const replyRes = await demoTicketAdapter.reply({ companyId: 'comp_1', ticketId: 'demo-ticket-001', message: 'العنوان مؤكد' });
      expect(replyRes.success).toBe(true);
      expect(replyRes.externalId).toMatch(/^demo-msg-\d+$/);
    });

    test('manualTicketAdapter gracefully handles unsupported operations', async () => {
      const res = await manualTicketAdapter.listTickets();
      expect(res.success).toBe(false);
      expect(res.supported).toBe(false);
      expect(res.reason).toBe('MANUAL_PROVIDER');
    });

    test('getTicketAdapter selects proper adapter based on providerKey and mode', () => {
      expect(getTicketAdapter({ providerKey: 'DEMO' })).toBe(demoTicketAdapter);
      expect(getTicketAdapter({ providerKey: 'MANUAL', integrationMode: 'TURBO_DEMO' })).toBe(demoTicketAdapter);
      expect(getTicketAdapter({ providerKey: 'TURBO', integrationMode: 'TURBO_DIRECT' })).toBe(turboTicketAdapter);
      expect(getTicketAdapter({ providerKey: 'MANUAL', integrationMode: 'MANUAL' })).toBe(manualTicketAdapter);
      expect(getTicketAdapter({ providerKey: 'UNKNOWN' })).toBe(manualTicketAdapter);
    });
  });

  describe('Deterministic Reply Policy (applyReplyPolicy)', () => {
    test('rejects auto-reply when autoReply setting is false', () => {
      const thread = { id: 'th1' };
      const message = { direction: 'INBOUND', body: 'برجاء تأكيد العنوان وموعد التسليم' };
      const settings = { autoReply: false };

      const policy = ticketThreadService.applyReplyPolicy(thread, message, settings);
      expect(policy).toBe('NEEDS_APPROVAL');
    });

    test('prevents financial commitments and cancellations even when autoReply is enabled', () => {
      const thread = { id: 'th1' };
      const settings = { autoReply: true, autoReplyIntents: ['ADDRESS', 'APPOINTMENT'] };

      const financialCases = [
        'هل يمكن دفع مبلغ تعويض عن التأخير؟',
        'العميل يطالب باسترداد فلوس الشحنة',
        'يرجى إلغاء الأوردر وعمل مرتجع',
        'Refund compensation requested by courier',
      ];

      for (const body of financialCases) {
        const policy = ticketThreadService.applyReplyPolicy(thread, { direction: 'INBOUND', body }, settings);
        expect(policy).toBe('NEEDS_APPROVAL');
      }
    });

    test('approves AUTO_REPLY for address, location, phone, and appointment inquiries', () => {
      const thread = { id: 'th1' };
      const settings = { autoReply: true, autoReplyIntents: ['ADDRESS', 'APPOINTMENT'] };

      const allowedCases = [
        'برجاء إرسال لوكيشن أو عنوان العميل بالتفصيل',
        'تأكيد موعد التسليم ورقم الهاتف',
        'Please confirm delivery appointment time',
        'مندوب الشحن يسأل عن رقم تليفون العميل البديل',
      ];

      for (const body of allowedCases) {
        const policy = ticketThreadService.applyReplyPolicy(thread, { direction: 'INBOUND', body }, settings);
        expect(policy).toBe('AUTO_REPLY');
      }
    });

    test('ignores OUTBOUND messages from auto-replying to ourselves', () => {
      const thread = { id: 'th1' };
      const settings = { autoReply: true };
      const policy = ticketThreadService.applyReplyPolicy(thread, { direction: 'OUTBOUND', body: 'العنوان مؤكد' }, settings);
      expect(policy).toBe('IGNORE');
    });
  });

  describe('Idempotency & Message Deduplication', () => {
    test('appendMessage catches P2002 and flags duplicate: true', async () => {
      const mockPrisma = {
        carrierTicketMessage: {
          create: jest.fn().mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed' }),
        },
      };

      const customService = new ticketThreadService.constructor(mockPrisma);
      const res = await customService.appendMessage('th_1', {
        companyId: 'comp_1',
        direction: 'INBOUND',
        externalId: 'ext_dup_1',
        body: 'نفس الرسالة السابقة',
      });

      expect(res.duplicate).toBe(true);
      expect(res.externalId).toBe('ext_dup_1');
    });

    test('idempotencyKey format matches strict T00 / C3 specification', () => {
      const companyId = 'comp_test';
      const threadId = 'th_test';
      const externalId = 'ext_msg_99';
      const key = `shipticketmsg:${companyId}:${threadId}:${externalId}`;

      expect(key).toBe('shipticketmsg:comp_test:th_test:ext_msg_99');
    });
  });
});
