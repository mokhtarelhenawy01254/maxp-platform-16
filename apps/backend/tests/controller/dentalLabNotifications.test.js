jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { sendNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
const service = require('../../services/dentalLabNotificationService');

const createPrisma = (overrides = {}) => {
  const prisma = {
    dentalSetting: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    whatsAppNotificationTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    dentalLabCase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    dentalCaseStatusHistory: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    dentalLabDoctor: {
      findFirst: jest.fn(),
    },
    dentalSetting: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    workTypeStageTemplate: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    financialPosting: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const makeCase = (overrides = {}) => ({
  id: 'case-1',
  companyId: 'company-1',
  caseNumber: 'DL-20260809-0001',
  doctorId: 'doc-1',
  doctorName: 'د. أحمد',
  patientName: 'محمد علي',
  workTypeName: 'تاج زيركون',
  teeth: '11,21',
  shade: 'A1',
  material: 'زيركون',
  status: 'RECEIVED',
  orderStatus: 'PENDING',
  priority: 'NORMAL',
  dueDate: new Date('2026-08-09T10:00:00.000Z'),
  total: 200,
  paid: 0,
  remaining: 200,
  doctor: { id: 'doc-1', name: 'د. أحمد', phone: '01001234567' },
  ...overrides,
});

describe('dentalLabNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotificationSchedule', () => {
    test('returns 5 defaults, persists them and seeds the 5 default templates', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.whatsAppNotificationTemplate.create.mockResolvedValue({});
      prisma.dentalSetting.findFirst.mockResolvedValue(null);
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const schedule = await service.getNotificationSchedule('company-1');

      expect(schedule).toHaveLength(5);
      expect(schedule.map((s) => s.eventType)).toEqual([
        service.DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED,
        service.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        service.DENTAL_NOTIFICATION_EVENTS.CASE_DELIVERED,
        service.DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE,
        service.DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER,
      ]);
      expect(schedule[0]).toMatchObject({ enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'استلام الحالة' });
      expect(schedule[3]).toMatchObject({ label: 'تأخير الحالة', trigger: 'case_overdue' });
      expect(schedule[4]).toMatchObject({ label: 'تنبيه الفوترة الشهرية', trigger: 'billing_cycle' });

      // persisted defaults under the notificationSchedule key
      expect(prisma.dentalSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId_key: { companyId: 'company-1', key: 'notificationSchedule' } },
          create: expect.objectContaining({ companyId: 'company-1', key: 'notificationSchedule' }),
        })
      );

      // seeded 5 WhatsAppNotificationTemplate rows with category DENTAL_LAB
      expect(prisma.whatsAppNotificationTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1', category: 'DENTAL_LAB' } })
      );
      expect(prisma.whatsAppNotificationTemplate.create).toHaveBeenCalledTimes(5);
      expect(prisma.whatsAppNotificationTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'DENTAL_LAB', channel: 'AUTO', isActive: true, isDefault: false }),
        })
      );
    });

    test('merges stored schedule rows with defaults when partially stored', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.dentalSetting.findFirst.mockResolvedValue({
        key: 'notificationSchedule',
        value: [
          { eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY, enabled: false, activeChannel: 'BAILEYS', delayValue: 3, delayUnit: 'HOURS' },
        ],
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const schedule = await service.getNotificationSchedule('company-1');

      expect(schedule).toHaveLength(5);
      expect(schedule.find((s) => s.eventType === service.DENTAL_NOTIFICATION_EVENTS.CASE_READY)).toMatchObject({
        enabled: false,
        activeChannel: 'BAILEYS',
        delayValue: 3,
        label: 'الحالة جاهزة',
      });
      expect(schedule.find((s) => s.eventType === service.DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED).enabled).toBe(true);
    });
  });

  describe('saveNotificationSchedule', () => {
    test('upserts the patch into the stored array and writes the whole array back', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findFirst.mockResolvedValue({
        key: 'notificationSchedule',
        value: [
          { eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS' },
        ],
      });
      prisma.dentalSetting.upsert.mockImplementation(({ update }) => Promise.resolve({ value: update.value }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const updated = await service.saveNotificationSchedule('company-1', {
        eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        enabled: false,
        activeChannel: 'BAILEYS',
        delayValue: 2,
        delayUnit: 'HOURS',
      });

      expect(updated).toHaveLength(5);
      expect(updated.find((s) => s.eventType === service.DENTAL_NOTIFICATION_EVENTS.CASE_READY)).toMatchObject({
        enabled: false,
        activeChannel: 'BAILEYS',
        delayValue: 2,
        delayUnit: 'HOURS',
        label: 'الحالة جاهزة',
      });
      expect(prisma.dentalSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId_key: { companyId: 'company-1', key: 'notificationSchedule' } },
          update: { value: expect.arrayContaining([expect.objectContaining({ eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY, enabled: false })]) },
        })
      );
    });

    test('adds a new event when the eventType is not stored yet', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findFirst.mockResolvedValue(null);
      prisma.dentalSetting.upsert.mockImplementation(({ update }) => Promise.resolve({ value: update.value }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const updated = await service.saveNotificationSchedule('company-1', {
        eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE,
        enabled: true,
      });

      expect(updated).toHaveLength(5);
      expect(updated.find((s) => s.eventType === service.DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE).enabled).toBe(true);
    });
  });

  describe('sendDentalNotification', () => {
    test('respects enabled:false and does not call WhatsApp service', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.dentalSetting.findFirst.mockResolvedValue({
        key: 'notificationSchedule',
        value: [
          { eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY, enabled: false, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS' },
        ],
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await service.sendDentalNotification({
        companyId: 'company-1',
        eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        caseRow: makeCase(),
        doctor: { id: 'doc-1', name: 'د. أحمد', phone: '01001234567' },
      });

      expect(result).toEqual({ success: false, reason: 'disabled' });
      expect(sendNotification).not.toHaveBeenCalled();
    });

    test('returns no_phone when the doctor has no phone', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await service.sendDentalNotification({
        companyId: 'company-1',
        eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        caseRow: makeCase({ doctor: { id: 'doc-1', name: 'د. أحمد', phone: null } }),
        doctor: { id: 'doc-1', name: 'د. أحمد', phone: null },
      });

      expect(result).toEqual({ success: false, reason: 'no_phone' });
      expect(sendNotification).not.toHaveBeenCalled();
    });

    test('builds vars + contentOverride and forwards to WhatsAppNotificationService', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      getSharedPrismaClient.mockReturnValue(prisma);

      sendNotification.mockResolvedValue({ success: true });

      const result = await service.sendDentalNotification({
        companyId: 'company-1',
        eventType: service.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        caseRow: makeCase(),
        doctor: { id: 'doc-1', name: 'د. أحمد', phone: '01001234567' },
      });

      expect(sendNotification).toHaveBeenCalledTimes(1);
      const args = sendNotification.mock.calls[0][0];
      expect(args.companyId).toBe('company-1');
      expect(args.recipientPhone).toBe('01001234567');
      expect(args.recipientName).toBe('د. أحمد');
      expect(args.recipientType).toBe('CUSTOMER');
      expect(args.category).toBe('CUSTOMER');
      expect(args.eventType).toBe(service.DENTAL_NOTIFICATION_EVENTS.CASE_READY);
      expect(args.priority).toBe(4);
      expect(args.variables.caseNumber).toBe('DL-20260809-0001');
      expect(args.variables.patientName).toBe('محمد علي');
      expect(args.variables.workType).toBe('تاج زيركون');
      expect(args.variables.shade).toBe('A1');
      expect(args.variables.teeth).toBe('11,21');
      expect(args.variables.material).toBe('زيركون');
      expect(args.variables.dueDate).toBe('2026-08-09');
      expect(args.variables.totalAmount).toBe('200');
      expect(args.variables.paidAmount).toBe('0');
      expect(args.variables.remainingAmount).toBe('200');
      expect(args.variables.contentOverride).toContain('حالتك جاهزة للتسليم');
      expect(args.variables.contentOverride).toContain('DL-20260809-0001');
      expect(result.success).toBe(true);
    });
  });

  describe('notifyCaseReceived / notifyCaseReady / notifyCaseDelivered', () => {
    test('notifyCaseReceived loads the case and sends via the WhatsApp service', async () => {
      const prisma = createPrisma();
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      prisma.dentalLabCase.findUnique.mockResolvedValue(makeCase());
      getSharedPrismaClient.mockReturnValue(prisma);
      sendNotification.mockResolvedValue({ success: true });

      const result = await service.notifyCaseReceived('case-1');

      expect(prisma.dentalLabCase.findUnique).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        include: { doctor: { select: { id: true, name: true, phone: true } } },
      });
      const args = sendNotification.mock.calls[0][0];
      expect(args.eventType).toBe(service.DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED);
      expect(args.recipientPhone).toBe('01001234567');
      expect(args.variables.contentOverride).toContain('تم استلام حالتكم الجديدة');
      expect(result.success).toBe(true);
    });

    test('returns not_found when the case does not exist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findUnique.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await service.notifyCaseReady('missing');

      expect(result).toEqual({ success: false, reason: 'not_found' });
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('scanOverdueCases', () => {
    test('finds overdue cases, sends notifications and records history rows', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        makeCase({ id: 'case-1', caseNumber: 'DL-20260809-0001' }),
        makeCase({ id: 'case-2', caseNumber: 'DL-20260809-0002' }),
      ]);
      prisma.dentalCaseStatusHistory.findFirst.mockResolvedValue(null);
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      prisma.dentalLabCase.findUnique.mockImplementation(({ where }) => Promise.resolve(makeCase({ id: where.id })));
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);
      sendNotification.mockResolvedValue({ success: true });

      const result = await service.scanOverdueCases('company-1');

      expect(prisma.dentalLabCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            dueDate: { lt: expect.any(Date) },
            status: { notIn: ['DELIVERED', 'CLOSED'] },
          }),
        })
      );
      expect(result).toEqual({ scanned: 2, sent: 2, failed: 0, skipped: 0, internalNotifsCreated: 0 });
      expect(sendNotification).toHaveBeenCalledTimes(2);
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledTimes(2);
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            caseId: 'case-1',
            dimension: 'NOTIFICATION',
            status: 'OVERDUE_NOTIFIED',
            reason: 'تجاوز تاريخ الاستحقاق',
          }),
        })
      );
    });

    test('creates in-app internal notification for overdue cases', async () => {
      const prisma = createPrisma({
        notification: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        },
      });
      prisma.dentalLabCase.findMany.mockResolvedValue([
        makeCase({ id: 'case-1', caseNumber: 'DL-20260809-0001', companyId: 'company-1' }),
      ]);
      prisma.dentalCaseStatusHistory.findFirst.mockResolvedValue(null);
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      prisma.dentalLabCase.findUnique.mockResolvedValue(makeCase({ id: 'case-1', companyId: 'company-1' }));
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);
      sendNotification.mockResolvedValue({ success: true });

      const result = await service.scanOverdueCases('company-1');

      expect(result.internalNotifsCreated).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            type: 'DENTAL_CASE_OVERDUE',
            title: expect.stringContaining('DL-20260809-0001'),
          }),
        })
      );
    });

    test('skips cases that already have an OVERDUE_NOTIFIED history row', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        makeCase({ id: 'case-1', caseNumber: 'DL-20260809-0001' }),
        makeCase({ id: 'case-2', caseNumber: 'DL-20260809-0002' }),
      ]);
      prisma.dentalCaseStatusHistory.findFirst
        .mockResolvedValueOnce({ id: 'history-1' }) // case-1 already notified
        .mockResolvedValueOnce(null); // case-2 not yet notified
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      prisma.dentalLabCase.findUnique.mockImplementation(({ where }) => Promise.resolve(makeCase({ id: where.id })));
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);
      sendNotification.mockResolvedValue({ success: true });

      const result = await service.scanOverdueCases('company-1');

      expect(result).toEqual({ scanned: 2, sent: 1, failed: 0, skipped: 1, internalNotifsCreated: 0 });
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(prisma.dentalCaseStatusHistory.create.mock.calls[0][0].data.caseId).toBe('case-2');
    });

    test('does not record history when the notification fails', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([makeCase({ id: 'case-1' })]);
      prisma.dentalCaseStatusHistory.findFirst.mockResolvedValue(null);
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      prisma.dentalLabCase.findUnique.mockResolvedValue(makeCase());
      prisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
      prisma.dentalSetting.upsert.mockImplementation(({ create }) => Promise.resolve({ value: create.value }));
      prisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);
      sendNotification.mockResolvedValue({ success: false, reason: 'no_session' });

      const result = await service.scanOverdueCases('company-1');

      expect(result).toEqual({ scanned: 1, sent: 0, failed: 1, skipped: 0, internalNotifsCreated: 0 });
      expect(prisma.dentalCaseStatusHistory.create).not.toHaveBeenCalled();
    });
  });
});