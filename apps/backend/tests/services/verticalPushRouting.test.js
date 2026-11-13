const mockPrisma = {
  company: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  companyApp: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
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
  },
  activityLog: {
    create: jest.fn(),
  },
};

const mockSendNotification = jest.fn();
const mockSendToPortalActor = jest.fn();
const mockGetLabPolicies = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: mockSendNotification,
}));

jest.mock('../../services/browserPushService', () => ({
  sendToPortalActor: mockSendToPortalActor,
}));

jest.mock('../../services/dentalAssignmentService', () => ({
  getLabPolicies: mockGetLabPolicies,
}));

describe('Vertical Push-First + WhatsApp Fallback & Education Settings', () => {
  let helper;
  let bookingService;
  let dentalService;
  let courierService;
  let educationSettingsController;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockPrisma.company.findUnique.mockResolvedValue({
      settings: JSON.stringify({
        portalSettings: { pushFirstSaveWhatsApp: true },
      }),
      slug: 'academy-one',
      publicCode: 'ACD-01',
      name: 'Academy One',
      customDomain: 'learn.academyone.com',
    });
    mockPrisma.company.update.mockResolvedValue({});
    mockPrisma.companyApp.findFirst.mockResolvedValue(null);
    mockPrisma.companyApp.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.dentalSetting.findFirst.mockResolvedValue({ key: 'notificationSchedule', value: [] });
    mockPrisma.dentalSetting.findMany.mockResolvedValue([]);
    mockPrisma.dentalSetting.upsert.mockImplementation(async ({ create }) => ({ value: create.value }));
    mockPrisma.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppNotificationTemplate.findFirst.mockResolvedValue(null);
    mockPrisma.whatsAppNotificationTemplate.create.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-1' });

    mockGetLabPolicies.mockResolvedValue({ notify: { patientEnabled: false } });
    mockSendNotification.mockResolvedValue({ success: true, messageId: 'wa-1' });
    mockSendToPortalActor.mockResolvedValue({
      attempted: 1,
      sent: 1,
      deliveredCount: 1,
      failed: 0,
      webSent: 1,
      fcmSent: 0,
    });

    helper = require('../../services/portalPushFirstHelper');
    bookingService = require('../../services/bookingNotificationService');
    dentalService = require('../../services/dentalLabNotificationService');
    courierService = require('../../services/courierNotificationService');
    educationSettingsController = require('../../controller/educationSettingsController');
  });

  describe('portalPushFirstHelper', () => {
    test('respects portalSettings priority over educationSettings and defaults true on error/missing', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        settings: JSON.stringify({
          portalSettings: { pushFirstSaveWhatsApp: false },
          educationSettings: { pushFirstSaveWhatsApp: true },
        }),
      });
      expect(await helper.isPushFirstEnabled('comp-1')).toBe(false);

      mockPrisma.company.findUnique.mockResolvedValueOnce({
        settings: JSON.stringify({
          educationSettings: { pushFirstSaveWhatsApp: false },
        }),
      });
      expect(await helper.isPushFirstEnabled('comp-1')).toBe(false);

      mockPrisma.company.findUnique.mockRejectedValueOnce(new Error('DB offline'));
      expect(await helper.isPushFirstEnabled('comp-1')).toBe(true);
    });
  });

  describe('bookingNotificationService', () => {
    const baseAppointment = {
      id: 'appt-1',
      patientId: 'patient-1',
      customerName: 'سارة علي',
      customerPhone: '01001112233',
      serviceName: 'كشف باطنة',
      branchName: 'المعادي',
      appointmentDate: '2026-11-15',
      startTime: '14:00',
    };

    test('delivers via Push-first and skips WhatsApp when patientId exists and deliveredCount > 0', async () => {
      const res = await bookingService.sendBookingNotification({
        companyId: 'comp-1',
        eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED,
        appointment: baseAppointment,
        recipientPhone: baseAppointment.customerPhone,
      });

      expect(res).toEqual({
        success: true,
        via: 'PUSH',
        channel: 'PUSH',
        deliveredCount: 1,
        skippedWhatsApp: true,
      });
      expect(mockSendToPortalActor).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'PATIENT',
          actorId: 'patient-1',
          typeId: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED,
          url: '/patient-portal',
        })
      );
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('falls back to WhatsApp when Push delivers 0', async () => {
      mockSendToPortalActor.mockResolvedValueOnce({ attempted: 0, sent: 0, deliveredCount: 0, failed: 0 });

      const res = await bookingService.sendBookingNotification({
        companyId: 'comp-1',
        eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_BOOKED,
        appointment: baseAppointment,
        recipientPhone: baseAppointment.customerPhone,
      });

      expect(res.success).toBe(true);
      expect(mockSendToPortalActor).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          recipientPhone: '01001112233',
          eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_BOOKED,
        })
      );
    });

    test('falls back to WhatsApp when pushFirstSaveWhatsApp is false', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        settings: JSON.stringify({ portalSettings: { pushFirstSaveWhatsApp: false } }),
      });

      const res = await bookingService.sendBookingNotification({
        companyId: 'comp-1',
        eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED,
        appointment: baseAppointment,
        recipientPhone: baseAppointment.customerPhone,
      });

      expect(res.success).toBe(true);
      expect(mockSendToPortalActor).not.toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    test('delivers Push when patientId exists even without recipientPhone, and returns no_phone if Push misses', async () => {
      const okPush = await bookingService.sendBookingNotification({
        companyId: 'comp-1',
        eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_REMINDER,
        appointment: { ...baseAppointment, customerPhone: null },
        recipientPhone: null,
      });
      expect(okPush.via).toBe('PUSH');
      expect(mockSendNotification).not.toHaveBeenCalled();

      mockSendToPortalActor.mockResolvedValueOnce({ attempted: 0, sent: 0, deliveredCount: 0 });
      const missPush = await bookingService.sendBookingNotification({
        companyId: 'comp-1',
        eventType: bookingService.BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_REMINDER,
        appointment: { ...baseAppointment, customerPhone: null },
        recipientPhone: null,
      });
      expect(missPush).toEqual({ success: false, reason: 'no_phone' });
    });
  });

  describe('dentalLabNotificationService', () => {
    const baseCase = {
      id: 'case-1',
      companyId: 'comp-1',
      caseNumber: 'DL-100',
      doctorId: 'doc-1',
      doctorName: 'د. كريم',
      patientName: 'ياسر',
      workTypeName: 'زيركون',
      total: 1500,
      paid: 500,
      remaining: 1000,
      doctor: { id: 'doc-1', name: 'د. كريم', phone: '01009998877' },
    };

    test('CASE_READY routes via Push-first to DENTIST and skips WhatsApp', async () => {
      const res = await dentalService.sendDentalNotification({
        companyId: 'comp-1',
        eventType: dentalService.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        caseRow: baseCase,
        doctor: baseCase.doctor,
      });

      expect(res).toEqual({
        success: true,
        via: 'PUSH',
        channel: 'PUSH',
        deliveredCount: 1,
        skippedWhatsApp: true,
      });
      expect(mockSendToPortalActor).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'DENTIST',
          actorId: 'doc-1',
          typeId: dentalService.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
          url: '/dental-portal',
        })
      );
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('MONTHLY_BILLING_REMINDER ALWAYS sends WhatsApp alongside non-blocking Push', async () => {
      const res = await dentalService.sendDentalNotification({
        companyId: 'comp-1',
        eventType: dentalService.DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER,
        caseRow: baseCase,
        doctor: baseCase.doctor,
      });

      expect(res.success).toBe(true);
      expect(mockSendToPortalActor).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: dentalService.DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER,
          recipientPhone: '01009998877',
        })
      );
    });

    test('activeChannel WHATSAPP bypasses Push-first and sends WhatsApp directly', async () => {
      mockPrisma.dentalSetting.findFirst.mockResolvedValueOnce({
        key: 'notificationSchedule',
        value: [
          {
            eventType: dentalService.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
            enabled: true,
            activeChannel: 'WHATSAPP',
            delayValue: 0,
            delayUnit: 'HOURS',
          },
        ],
      });

      const res = await dentalService.sendDentalNotification({
        companyId: 'comp-1',
        eventType: dentalService.DENTAL_NOTIFICATION_EVENTS.CASE_READY,
        caseRow: baseCase,
        doctor: baseCase.doctor,
      });

      expect(res.success).toBe(true);
      expect(mockSendToPortalActor).not.toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    test('notifyCaseEvent P7 patient-enabled branch routes Push to PATIENT portal when patientId exists', async () => {
      mockGetLabPolicies.mockResolvedValueOnce({ notify: { patientEnabled: true } });
      mockPrisma.dentalLabCase.findUnique.mockResolvedValueOnce({
        ...baseCase,
        patientId: 'pat-99',
        patientPhone: '01012345678',
      });

      const res = await dentalService.notifyCaseReady('case-1');

      expect(res.via).toBe('PUSH');
      expect(mockSendToPortalActor).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: 'PATIENT',
          actorId: 'pat-99',
          url: '/patient-portal',
        })
      );
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('courierNotificationService', () => {
    const baseOrder = {
      id: 'ord-1',
      orderNumber: 'ORD-500',
      customerId: 'cust-1',
      customerName: 'خالد حسن',
      customerPhone: '01122334455',
      total: 350,
    };
    const courier = { id: 'cour-1', name: 'أحمد المندوب', phone: '01200001111' };

    test('DELIVERED uses Push-first for CUSTOMER and skips WhatsApp when deliveredCount > 0', async () => {
      const res = await courierService.sendCourierNotification({
        companyId: 'comp-1',
        eventType: courierService.COURIER_NOTIFICATION_EVENTS.DELIVERED,
        order: baseOrder,
        courier,
        amount: 350,
        storeName: 'متجر النور',
      });

      expect(res).toEqual({
        success: true,
        via: 'PUSH',
        channel: 'PUSH',
        deliveredCount: 1,
        skippedWhatsApp: true,
      });
      expect(mockSendToPortalActor).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'CUSTOMER',
          actorId: 'cust-1',
          typeId: courierService.COURIER_NOTIFICATION_EVENTS.DELIVERED,
          url: '/customer-portal',
        })
      );
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('OUT_FOR_DELIVERY WITH OTP ALWAYS sends WhatsApp even when Push succeeds', async () => {
      const res = await courierService.sendCourierNotification({
        companyId: 'comp-1',
        eventType: courierService.COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
        order: baseOrder,
        courier,
        amount: 350,
        otpLine: '🔑 كود الاستلام: 4921 — اعرضه للكابتن عند استلام الطلب',
      });

      expect(res.success).toBe(true);
      expect(mockSendToPortalActor).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientPhone: '01122334455',
          eventType: courierService.COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
          variables: expect.objectContaining({
            otpLine: expect.stringContaining('4921'),
          }),
        })
      );
    });

    test('notifyRunDispatched sends COURIER push notification and customer OTP WhatsApp', async () => {
      const otpMap = new Map([['ship-1', '8812']]);

      courierService.notifyRunDispatched('comp-1', {
        run: { id: 'run-7' },
        shipments: [{ id: 'ship-1', order: baseOrder }],
        courier,
        otpByShipment: otpMap,
      });

      await new Promise((r) => setTimeout(r, 25));

      expect(mockSendToPortalActor).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'COURIER',
          actorId: 'cour-1',
          typeId: 'COURIER_RUN_DISPATCHED',
          url: '/courier-portal',
          data: { runId: 'run-7', shipmentCount: 1 },
        })
      );
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('educationSettingsController', () => {
    test('getSettings returns pushFirstSaveWhatsApp and additive company metadata', async () => {
      const req = { user: { id: 'u1', role: 'OWNER', companyId: 'comp-1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await educationSettingsController.getSettings(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.pushFirstSaveWhatsApp).toBe(true);
      expect(payload.data.companySlug).toBe('academy-one');
      expect(payload.data.publicCode).toBe('ACD-01');
      expect(payload.data.companyName).toBe('Academy One');
      expect(payload.data.customDomain).toBe('learn.academyone.com');
    });

    test('updateSettings persists pushFirstSaveWhatsApp and preserves it when omitted in subsequent updates', async () => {
      let storedSettings = JSON.stringify({ currency: 'EGP' });
      mockPrisma.company.findUnique.mockImplementation(async () => ({
        settings: storedSettings,
        slug: 'academy-one',
        publicCode: 'ACD-01',
        name: 'Academy One',
        customDomain: null,
      }));
      mockPrisma.company.update.mockImplementation(async ({ data }) => {
        storedSettings = data.settings;
        return { settings: storedSettings };
      });

      const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await educationSettingsController.updateSettings(
        {
          user: { id: 'u1', role: 'OWNER', companyId: 'comp-1' },
          body: { systemTitle: 'أكاديمية 1', pushFirstSaveWhatsApp: false },
        },
        res1
      );
      expect(res1.json.mock.calls[0][0].data.pushFirstSaveWhatsApp).toBe(false);
      expect(JSON.parse(storedSettings).educationSettings.pushFirstSaveWhatsApp).toBe(false);

      // Subsequent update omitting pushFirstSaveWhatsApp must preserve false
      const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await educationSettingsController.updateSettings(
        {
          user: { id: 'u1', role: 'OWNER', companyId: 'comp-1' },
          body: { systemTitle: 'أكاديمية 2' },
        },
        res2
      );
      expect(res2.json.mock.calls[0][0].data.pushFirstSaveWhatsApp).toBe(false);
      expect(JSON.parse(storedSettings).educationSettings.pushFirstSaveWhatsApp).toBe(false);
    });
  });

  describe('portalPushRoutes /preference endpoints', () => {
    test('fetches and updates company portal push preferences', async () => {
      let storedSettings = JSON.stringify({ portalSettings: { pushFirstSaveWhatsApp: true } });
      mockPrisma.company.findUnique.mockImplementation(async () => ({
        id: 'comp-1',
        settings: storedSettings,
        slug: 'dental-lab-1',
        publicCode: 'DL-77',
        name: 'معمل الدلتا',
        customDomain: 'lab.delta.com',
      }));
      mockPrisma.company.update.mockImplementation(async ({ data }) => {
        storedSettings = data.settings;
        return { settings: storedSettings };
      });

      const portalPushRoutes = require('../../routes/portalPushRoutes');
      // Verify router stack contains preference routes
      const preferenceGet = portalPushRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/preference' && layer.route.methods.get
      );
      const preferencePut = portalPushRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/preference' && layer.route.methods.put
      );
      expect(preferenceGet).toBeDefined();
      expect(preferencePut).toBeDefined();
    });
  });
});
