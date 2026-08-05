const scheduleService = require('../../services/hr/customerNotificationScheduleService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: jest.fn(async () => ({ success: true })),
}));

describe('customerNotificationScheduleService', () => {
  const companyId = 'company-1';
  const eventType = 'LOYALTY_POINTS_AWARDED';

  let prisma;

  beforeEach(() => {
    prisma = {
      customerNotificationSchedule: {
        upsert: jest.fn(async ({ create }) => ({ id: 'sched-1', ...create })),
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
        update: jest.fn(async ({ data }) => ({ id: 'sched-1', eventType, ...data })),
      },
      whatsAppNotificationTemplate: {
        findMany: jest.fn(async () => []),
      },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
  });

  describe('CUSTOMER_NOTIFICATION_EVENTS', () => {
    it('covers all 10 loyalty/cashback/quality events', () => {
      expect(Object.keys(scheduleService.CUSTOMER_NOTIFICATION_EVENTS)).toHaveLength(10);
      expect(scheduleService.CUSTOMER_NOTIFICATION_EVENTS[eventType]).toBeDefined();
      expect(scheduleService.CUSTOMER_NOTIFICATION_EVENTS.CASHBACK_CREDITED).toBeDefined();
      expect(scheduleService.CUSTOMER_NOTIFICATION_EVENTS.CUSTOMER_QUALITY_UPGRADED).toBeDefined();
    });
  });

  describe('ensureSchedules', () => {
    it('upserts a default row for every event', async () => {
      await scheduleService.ensureSchedules(companyId);
      expect(prisma.customerNotificationSchedule.upsert).toHaveBeenCalledTimes(10);
      expect(prisma.customerNotificationSchedule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId_eventType: { companyId, eventType: eventType } },
          create: expect.objectContaining({
            companyId,
            eventType,
            enabled: true,
            activeChannel: 'AUTO',
            delayValue: 0,
          }),
        }),
      );
    });
  });

  describe('updateSchedule', () => {
    it('validates the active channel and persists changes', async () => {
      await scheduleService.updateSchedule(companyId, eventType, {
        enabled: false,
        activeChannel: 'BAILEYS',
        delayValue: 7,
        delayUnit: 'DAYS',
      });
      expect(prisma.customerNotificationSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId_eventType: { companyId, eventType } },
          data: expect.objectContaining({ enabled: false, activeChannel: 'BAILEYS', delayValue: 7, delayUnit: 'DAYS' }),
        }),
      );
    });

    it('rejects an invalid channel', async () => {
      await expect(
        scheduleService.updateSchedule(companyId, eventType, { activeChannel: 'FOO' }),
      ).rejects.toThrow('قناة غير صالحة');
    });

    it('rejects an unknown event', async () => {
      await expect(
        scheduleService.updateSchedule(companyId, 'NOT_A_REAL_EVENT', {}),
      ).rejects.toThrow('حدث إشعار غير معروف');
    });
  });

  describe('resolveTemplate', () => {
    const makeTpl = (channel, metaStatus = null) => ({
      id: `tpl-${channel}`,
      channel,
      metaTemplateName: metaStatus ? `meta_${channel}` : null,
      metaTemplateStatus: metaStatus,
    });

    it('returns the approved Meta template for META_CLOUD channel', async () => {
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        makeTpl('BAILEYS'),
        makeTpl('META_CLOUD', 'APPROVED'),
      ]);
      const tpl = await scheduleService.resolveTemplate(companyId, eventType, 'META_CLOUD');
      expect(tpl?.channel).toBe('META_CLOUD');
    });

    it('returns null when META_CLOUD template is not bound/approved', async () => {
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        makeTpl('BAILEYS'),
        makeTpl('META_CLOUD', 'PENDING'),
      ]);
      const tpl = await scheduleService.resolveTemplate(companyId, eventType, 'META_CLOUD');
      expect(tpl).toBeNull();
    });

    it('prefers Meta in AUTO when approved, otherwise falls back to normal', async () => {
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        makeTpl('BAILEYS'),
        makeTpl('META_CLOUD', 'APPROVED'),
      ]);
      expect((await scheduleService.resolveTemplate(companyId, eventType, 'AUTO'))?.channel).toBe('META_CLOUD');

      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        makeTpl('BAILEYS'),
        makeTpl('META_CLOUD', 'PENDING'),
      ]);
      expect((await scheduleService.resolveTemplate(companyId, eventType, 'AUTO'))?.channel).toBe('BAILEYS');
    });
  });

  describe('sendCustomerNotification', () => {
    const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');

    beforeEach(() => {
      jest.clearAllMocks();
      prisma.customerNotificationSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        companyId,
        eventType,
        enabled: true,
        activeChannel: 'AUTO',
        delayValue: 0,
        delayUnit: 'HOURS',
      });
    });

    it('skips when the schedule is disabled', async () => {
      prisma.customerNotificationSchedule.findUnique.mockResolvedValue({
        id: 'sched-1', companyId, eventType, enabled: false, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS',
      });
      const result = await scheduleService.sendCustomerNotification({
        companyId,
        eventType,
        customer: { id: 'c-1', phone: '01000000000', firstName: 'Ahmed' },
      });
      expect(result).toEqual({ success: false, reason: 'schedule_disabled' });
      expect(WhatsAppNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('sends via the resolved template with channel preference', async () => {
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        { id: 'tpl-b', channel: 'BAILEYS', isActive: true },
      ]);
      const result = await scheduleService.sendCustomerNotification({
        companyId,
        eventType,
        customer: { id: 'c-1', phone: '01000000000', firstName: 'Ahmed' },
        variables: { points: '50' },
      });
      expect(result).toEqual({ success: true });
      expect(WhatsAppNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          eventType,
          recipientPhone: '01000000000',
          preferredTemplateId: 'tpl-b',
          channel: null,
          variables: expect.objectContaining({ points: '50', customerName: 'Ahmed' }),
        }),
      );
    });

    it('returns no_template when no template exists (default fallback path via sendNotification)', async () => {
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      const result = await scheduleService.sendCustomerNotification({
        companyId,
        eventType,
        customer: { id: 'c-1', phone: '01000000000', firstName: 'Ahmed' },
      });
      // بدون قالب في DB يروح للقالب الافتراضي عبر sendNotification (preferredTemplateId غير موجود)
      const callArgs = WhatsAppNotificationService.sendNotification.mock.calls[0][0];
      expect(callArgs.preferredTemplateId).toBeUndefined();
      expect(callArgs.channel).toBeNull();
      expect(result).toEqual({ success: true });
    });

    it('returns meta_template_not_ready when forcing Meta without an approved template', async () => {
      prisma.customerNotificationSchedule.findUnique.mockResolvedValue({
        id: 'sched-1', companyId, eventType, enabled: true, activeChannel: 'META_CLOUD', delayValue: 0, delayUnit: 'HOURS',
      });
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([
        { id: 'tpl-b', channel: 'BAILEYS', isActive: true },
      ]);
      const result = await scheduleService.sendCustomerNotification({
        companyId,
        eventType,
        customer: { id: 'c-1', phone: '01000000000', firstName: 'Ahmed' },
      });
      expect(result).toEqual({ success: false, reason: 'meta_template_not_ready' });
      expect(WhatsAppNotificationService.sendNotification).not.toHaveBeenCalled();
    });
  });
});
