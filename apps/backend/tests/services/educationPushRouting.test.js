const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  educationStudent: {
    findUnique: jest.fn(),
  },
  educationPackage: {
    findUnique: jest.fn(),
  },
  educationEnrollment: {
    findUnique: jest.fn(),
  },
  educationSession: {
    findUnique: jest.fn(),
  },
  customerNotificationSchedule: {
    findUnique: jest.fn(),
  },
  whatsAppNotificationTemplate: {
    findFirst: jest.fn(),
  },
};

const mockSendNotification = jest.fn();
const mockSendToPortalActor = jest.fn();
const mockLogEducationEvent = jest.fn(async () => ({ id: 'audit-1' }));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: mockSendNotification,
}));

jest.mock('../../services/browserPushService', () => ({
  sendToPortalActor: mockSendToPortalActor,
}));

jest.mock('../../services/educationAuditService', () => ({
  logEducationEvent: mockLogEducationEvent,
}));

describe('educationNotificationService Push-First & Critical Dual Routing', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockPrisma.company.findUnique.mockResolvedValue({
      settings: JSON.stringify({
        educationSettings: { pushFirstSaveWhatsApp: true },
      }),
    });
    mockPrisma.customerNotificationSchedule.findUnique.mockResolvedValue(null);
    mockPrisma.whatsAppNotificationTemplate.findFirst.mockResolvedValue(null);
    mockSendNotification.mockResolvedValue({ success: true, messageId: 'wa-1' });
    mockSendToPortalActor.mockResolvedValue({
      attempted: 1,
      sent: 1,
      deliveredCount: 1,
      failed: 0,
      webSent: 1,
      fcmSent: 0,
    });

    service = require('../../services/educationNotificationService');
  });

  test('notifySessionScheduled delivers Push first and SKIPS WhatsApp when deliveredCount > 0 and pushFirstSaveWhatsApp !== false', async () => {
    mockPrisma.educationSession.findUnique.mockResolvedValueOnce({
      id: 'sess-1',
      scheduledAt: '2026-11-12T15:00:00.000Z',
      plannedDuration: 60,
      teacherId: 'teacher-1',
      student: {
        firstName: 'أحمد',
        lastName: 'محمد',
        customerId: 'parent-1',
        customer: { id: 'parent-1', firstName: 'محمد', phone: '201012345678' },
      },
      teacher: { id: 'teacher-1', name: 'أ/ سارة', phone: '201099887766' },
      subject: { name: 'الرياضيات' },
      enrollment: { remainingHours: 10 },
    });

    await service.notifySessionScheduled('comp-1', { id: 'sess-1' });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(2);
    expect(mockSendToPortalActor).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyId: 'comp-1',
        actorType: 'PARENT',
        actorId: 'parent-1',
        typeId: service.EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
        url: '/parent/sessions',
      })
    );
    expect(mockSendToPortalActor).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        companyId: 'comp-1',
        actorType: 'TEACHER',
        actorId: 'teacher-1',
        typeId: service.EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
        url: '/teacher/schedule',
      })
    );

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockLogEducationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp-1',
        action: 'SEND_NOTIFICATION',
        details: expect.objectContaining({
          channel: 'PUSH',
          savedWhatsApp: true,
        }),
      })
    );
  });

  test('notifySessionScheduled falls back to WhatsApp when deliveredCount === 0', async () => {
    mockSendToPortalActor.mockResolvedValue({
      attempted: 0,
      sent: 0,
      deliveredCount: 0,
      failed: 0,
    });
    mockPrisma.educationSession.findUnique.mockResolvedValueOnce({
      id: 'sess-2',
      scheduledAt: '2026-11-12T15:00:00.000Z',
      plannedDuration: 45,
      teacherId: 'teacher-2',
      student: {
        firstName: 'عمر',
        lastName: 'علي',
        customerId: 'parent-2',
        customer: { id: 'parent-2', firstName: 'علي', phone: '201011112222' },
      },
      teacher: { id: 'teacher-2', name: 'أ/ كريم', phone: '201033334444' },
      subject: { name: 'العلوم' },
      enrollment: { remainingHours: 8 },
    });

    await service.notifySessionScheduled('comp-1', { id: 'sess-2' });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '201011112222',
        recipientType: 'CUSTOMER',
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      })
    );
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '201033334444',
        recipientType: 'EMPLOYEE',
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      })
    );
  });

  test('notifySessionScheduled falls back to WhatsApp when pushFirstSaveWhatsApp is false even if Push succeeds', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: JSON.stringify({
        educationSettings: { pushFirstSaveWhatsApp: false },
      }),
    });
    mockPrisma.educationSession.findUnique.mockResolvedValueOnce({
      id: 'sess-3',
      scheduledAt: '2026-11-12T16:00:00.000Z',
      plannedDuration: 60,
      teacherId: 'teacher-3',
      student: {
        firstName: 'ليلى',
        lastName: 'حسن',
        customerId: 'parent-3',
        customer: { id: 'parent-3', firstName: 'حسن', phone: '201055556666' },
      },
      teacher: { id: 'teacher-3', name: 'أ/ منى', phone: '201077778888' },
      subject: { name: 'اللغة العربية' },
    });

    await service.notifySessionScheduled('comp-1', { id: 'sess-3' });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  test('notifySessionConfirmed, notifySessionCancelled, and notifySessionReminder use Push-first routing', async () => {
    mockPrisma.educationSession.findUnique
      .mockResolvedValueOnce({
        id: 'sess-conf',
        scheduledAt: '2026-11-12T10:00:00.000Z',
        plannedDuration: 60,
        actualDuration: 60,
        student: {
          firstName: 'يوسف',
          lastName: 'نادر',
          customerId: 'parent-4',
          customer: { id: 'parent-4', firstName: 'نادر', phone: '201011110000' },
        },
        subject: { name: 'الفيزياء' },
        enrollment: { remainingHours: 5 },
      })
      .mockResolvedValueOnce({
        id: 'sess-canc',
        scheduledAt: '2026-11-12T12:00:00.000Z',
        teacherId: 'teacher-4',
        student: {
          firstName: 'يوسف',
          lastName: 'نادر',
          customerId: 'parent-4',
          customer: { id: 'parent-4', firstName: 'نادر', phone: '201011110000' },
        },
        teacher: { id: 'teacher-4', name: 'أ/ طارق', phone: '201099990000' },
        subject: { name: 'الفيزياء' },
      });

    await service.notifySessionConfirmed('comp-1', 'sess-conf');
    await service.notifySessionCancelled('comp-1', { id: 'sess-canc' });
    await service.notifySessionReminder('comp-1', {
      id: 'sess-rem',
      scheduledAt: '2026-11-13T14:00:00.000Z',
      teacherId: 'teacher-4',
      student: {
        firstName: 'يوسف',
        lastName: 'نادر',
        customerId: 'parent-4',
        customer: { id: 'parent-4', firstName: 'نادر', phone: '201011110000' },
      },
      teacher: { id: 'teacher-4', name: 'أ/ طارق', phone: '201099990000' },
      subject: { name: 'الفيزياء' },
    });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(5);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test('notifyEnrollmentCreated ALWAYS sends WhatsApp EVEN WHEN deliveredCount > 0 (critical financial event)', async () => {
    mockPrisma.educationStudent.findUnique.mockResolvedValueOnce({
      id: 'stu-1',
      firstName: 'مريم',
      lastName: 'خالد',
      customerId: 'parent-1',
      customer: {
        id: 'parent-1',
        firstName: 'خالد',
        phone: '201022223333',
      },
    });
    mockPrisma.educationPackage.findUnique.mockResolvedValueOnce({
      id: 'pkg-1',
      name: 'باقة التميز',
      subject: { name: 'البرمجة' },
    });

    const result = await service.notifyEnrollmentCreated('comp-1', {
      id: 'enr-1',
      studentId: 'stu-1',
      packageId: 'pkg-1',
      totalHours: 16,
      amountPaid: 1200,
    });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(1);
    expect(mockSendToPortalActor).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp-1',
        actorType: 'PARENT',
        actorId: 'parent-1',
        typeId: service.EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
        url: '/parent/enrollments',
      })
    );
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp-1',
        recipientPhone: '201022223333',
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
      })
    );
    expect(result.channel).toBe('DUAL');
    expect(result.savedWhatsApp).toBe(false);
  });

  test('notifyEnrollmentLowHours, notifyEnrollmentExpiring, and notifyParentActivated ALWAYS send Push + WhatsApp even if Push throws or delivers', async () => {
    const sharedEnrollment = {
      id: 'enr-low',
      remainingHours: 1.5,
      expiresAt: '2026-11-20T00:00:00.000Z',
      student: {
        firstName: 'آدم',
        lastName: 'سمير',
        customerId: 'parent-5',
        customer: { id: 'parent-5', firstName: 'سمير', phone: '201044445555' },
      },
      package: { name: 'باقة الأساس', subject: { name: 'الإنجليزي' } },
    };

    await service.notifyEnrollmentLowHours('comp-1', sharedEnrollment);

    mockSendToPortalActor.mockRejectedValueOnce(new Error('VAPID network error'));
    await service.notifyEnrollmentExpiring('comp-1', sharedEnrollment);

    await service.notifyParentActivated({
      companyId: 'comp-1',
      customerId: 'parent-5',
      parentPhone: '201044445555',
      parentName: 'سمير',
    });

    expect(mockSendToPortalActor).toHaveBeenCalledTimes(3);
    expect(mockSendNotification).toHaveBeenCalledTimes(3);
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_LOW_HOURS,
        recipientPhone: '201044445555',
      })
    );
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_EXPIRING,
        recipientPhone: '201044445555',
      })
    );
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        eventType: service.EDUCATION_NOTIFICATION_EVENTS.PARENT_ACTIVATED,
        recipientPhone: '201044445555',
      })
    );
  });
});
