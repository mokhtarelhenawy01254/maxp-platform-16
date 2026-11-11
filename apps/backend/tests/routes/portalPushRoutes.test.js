const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-portal-push-jwt-secret';

const mockPrisma = {
  company: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
  },
  educationTeacher: {
    findFirst: jest.fn(),
  },
  patient: {
    findFirst: jest.fn(),
  },
  bookingDoctor: {
    findFirst: jest.fn(),
  },
  dentalLabDoctor: {
    findFirst: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  browserPushSubscription: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  notificationPreference: {
    findMany: jest.fn(),
  },
};

const mockWebPush = {
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
};

const mockFirebaseMessaging = {
  isFirebaseInitialized: jest.fn(() => true),
  sendToFcmTokens: jest.fn(),
};

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn((targetPath) => {
      const normalizedPath = String(targetPath || '').replace(/\\/g, '/');
      if (
        normalizedPath.endsWith('/backend/.env') ||
        normalizedPath.endsWith('/backend/.env.local')
      ) {
        return false;
      }
      return actualFs.existsSync(targetPath);
    }),
  };
});

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('web-push', () => mockWebPush);

jest.mock('../../services/firebaseMessagingService', () => mockFirebaseMessaging);

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
}));

jest.mock('../../services/companyCacheService', () => ({
  getCompanyBySlug: jest.fn(async () => null),
  getCompanyByCustomDomain: jest.fn(async () => null),
  getCompanyById: jest.fn(async () => null),
  invalidateCompanyCache: jest.fn(async () => undefined),
}));

describe('Portal Push Routes (/api/v1/portal/push) & Multi-Actor BrowserPushService', () => {
  const originalEnv = { ...process.env };
  let app;
  let injectedCompany = null;
  let router;
  let browserPushService;

  const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  const buildSampleWebSubscription = (suffix = '1') => ({
    endpoint: `https://push.example.com/sub/${suffix}`,
    keys: {
      p256dh: `p256dh-key-${suffix}`,
      auth: `auth-key-${suffix}`,
    },
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    injectedCompany = null;

    process.env = {
      ...originalEnv,
      JWT_SECRET,
      WEB_PUSH_PUBLIC_KEY: 'test-vapid-public-key',
      WEB_PUSH_PRIVATE_KEY: 'test-vapid-private-key',
      WEB_PUSH_SUBJECT: 'mailto:push@maxp.online',
    };

    mockPrisma.company.findFirst.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.browserPushSubscription.upsert.mockImplementation(async ({ create }) => ({
      id: 'sub-1',
      ...create,
    }));
    mockPrisma.browserPushSubscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.browserPushSubscription.findMany.mockResolvedValue([]);
    mockPrisma.browserPushSubscription.update.mockResolvedValue({ id: 'sub-1' });
    mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
    mockWebPush.sendNotification.mockResolvedValue({ statusCode: 201 });
    mockFirebaseMessaging.isFirebaseInitialized.mockReturnValue(true);
    mockFirebaseMessaging.sendToFcmTokens.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    router = require('../../routes/portalPushRoutes');
    browserPushService = require('../../services/browserPushService');

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (injectedCompany) {
        req.company = injectedCompany;
      }
      next();
    });
    app.use('/api/v1/portal/push', router);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('globalSecurity whitelists GET public-key routes only', () => {
    const { isPublicRoute } = require('../../middleware/globalSecurity');
    expect(isPublicRoute('GET', '/api/v1/portal/push/public-key')).toBe(true);
    expect(isPublicRoute('GET', '/api/portal/push/public-key')).toBe(true);
    expect(isPublicRoute('POST', '/api/v1/portal/push/subscribe')).toBe(false);
    expect(isPublicRoute('POST', '/api/v1/portal/push/unsubscribe')).toBe(false);
    expect(isPublicRoute('POST', '/api/v1/portal/push/test')).toBe(false);
  });

  test('GET /public-key succeeds unauthenticated when configured and when unconfigured', async () => {
    const resConfigured = await request(app).get('/api/v1/portal/push/public-key');
    expect(resConfigured.status).toBe(200);
    expect(resConfigured.body).toEqual({
      success: true,
      data: {
        configured: true,
        publicKey: 'test-vapid-public-key',
      },
    });

    delete process.env.WEB_PUSH_PUBLIC_KEY;
    delete process.env.WEB_PUSH_PRIVATE_KEY;

    const resUnconfigured = await request(app).get('/api/v1/portal/push/public-key');
    expect(resUnconfigured.status).toBe(200);
    expect(resUnconfigured.body).toEqual({
      success: true,
      data: {
        configured: false,
        publicKey: null,
      },
    });
  });

  test('POST /subscribe rejects unauthenticated (401) and invalid JWT (401)', async () => {
    const noTokenRes = await request(app)
      .post('/api/v1/portal/push/subscribe')
      .send({ subscription: buildSampleWebSubscription() });
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.success).toBe(false);

    const badTokenRes = await request(app)
      .post('/api/v1/portal/push/subscribe')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .send({ subscription: buildSampleWebSubscription() });
    expect(badTokenRes.status).toBe(401);
    expect(badTokenRes.body.code).toBe('INVALID_TOKEN');
  });

  test('POST /subscribe rejects cross-tenant req.company mismatch with 403 TENANT_MISMATCH', async () => {
    injectedCompany = { id: 'company-other', isActive: true };
    const token = signToken({
      parentId: 'parent-1',
      companyId: 'company-1',
      role: 'PARENT',
    });

    const res = await request(app)
      .post('/api/v1/portal/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: buildSampleWebSubscription() });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TENANT_MISMATCH');
    expect(mockPrisma.browserPushSubscription.upsert).not.toHaveBeenCalled();
  });

  test('POST /subscribe rejects blocked/inactive portal actor with 403', async () => {
    mockPrisma.customer.findFirst.mockResolvedValueOnce({
      id: 'parent-blocked',
      companyId: 'company-1',
      status: 'BLOCKED',
    });

    const token = signToken({
      parentId: 'parent-blocked',
      companyId: 'company-1',
      role: 'PARENT',
    });

    const res = await request(app)
      .post('/api/v1/portal/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: buildSampleWebSubscription() });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_INACTIVE');
    expect(mockPrisma.browserPushSubscription.upsert).not.toHaveBeenCalled();
  });

  test.each([
    {
      role: 'PARENT',
      expectedActorType: 'PARENT',
      tokenPayload: { parentId: 'parent-1', companyId: 'company-1', role: 'PARENT' },
      expectedActorId: 'parent-1',
      setupMock: () =>
        mockPrisma.customer.findFirst.mockResolvedValueOnce({
          id: 'parent-1',
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
    },
    {
      role: 'TEACHER',
      expectedActorType: 'TEACHER',
      tokenPayload: { teacherId: 'teacher-1', companyId: 'company-1', role: 'TEACHER' },
      expectedActorId: 'teacher-1',
      setupMock: () =>
        mockPrisma.educationTeacher.findFirst.mockResolvedValueOnce({
          id: 'teacher-1',
          companyId: 'company-1',
          isActive: true,
        }),
    },
    {
      role: 'PATIENT',
      expectedActorType: 'PATIENT',
      tokenPayload: { patientId: 'patient-1', companyId: 'company-1', role: 'PATIENT' },
      expectedActorId: 'patient-1',
      setupMock: () =>
        mockPrisma.patient.findFirst.mockResolvedValueOnce({
          id: 'patient-1',
          companyId: 'company-1',
          isActive: true,
          status: 'ACTIVE',
        }),
    },
    {
      role: 'DOCTOR',
      expectedActorType: 'DOCTOR',
      tokenPayload: { doctorId: 'doctor-1', companyId: 'company-1', role: 'DOCTOR' },
      expectedActorId: 'doctor-1',
      setupMock: () =>
        mockPrisma.bookingDoctor.findFirst.mockResolvedValueOnce({
          id: 'doctor-1',
          companyId: 'company-1',
          isActive: true,
        }),
    },
    {
      role: 'DENTIST (via DENTAL_DOCTOR token)',
      expectedActorType: 'DENTIST',
      tokenPayload: { dentistId: 'dentist-1', companyId: 'company-1', role: 'DENTAL_DOCTOR' },
      expectedActorId: 'dentist-1',
      setupMock: () =>
        mockPrisma.dentalLabDoctor.findFirst.mockResolvedValueOnce({
          id: 'dentist-1',
          companyId: 'company-1',
          isActive: true,
        }),
    },
    {
      role: 'COURIER',
      expectedActorType: 'COURIER',
      tokenPayload: { courierId: 'courier-1', companyId: 'company-1', role: 'COURIER' },
      expectedActorId: 'courier-1',
      setupMock: () =>
        mockPrisma.courier.findFirst.mockResolvedValueOnce({
          id: 'courier-1',
          companyId: 'company-1',
          isActive: true,
        }),
    },
    {
      role: 'CUSTOMER',
      expectedActorType: 'CUSTOMER',
      tokenPayload: { customerId: 'customer-1', companyId: 'company-1', role: 'CUSTOMER' },
      expectedActorId: 'customer-1',
      setupMock: () =>
        mockPrisma.customer.findFirst.mockResolvedValueOnce({
          id: 'customer-1',
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
    },
    {
      role: 'STUDENT',
      expectedActorType: 'STUDENT',
      tokenPayload: {
        id: 'student_01012345678',
        studentPhone: '01012345678',
        companyId: 'company-1',
        role: 'STUDENT',
      },
      expectedActorId: 'student_01012345678',
      setupMock: () => undefined,
    },
    {
      role: 'USER (staff fallback)',
      expectedActorType: 'USER',
      tokenPayload: { userId: 'staff-1', companyId: 'company-1', role: 'COMPANY_ADMIN' },
      expectedActorId: 'staff-1',
      setupMock: () =>
        mockPrisma.user.findFirst.mockResolvedValueOnce({
          id: 'staff-1',
          companyId: 'company-1',
          isActive: true,
        }),
    },
  ])(
    'POST /subscribe ignores spoofed body companyId/actorId and binds strictly to verified $role token',
    async ({ expectedActorType, tokenPayload, expectedActorId, setupMock }) => {
      setupMock();
      const token = signToken(tokenPayload);
      const sub = buildSampleWebSubscription(expectedActorType.toLowerCase());

      const res = await request(app)
        .post('/api/v1/portal/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          companyId: 'spoofed-company-999',
          actorId: 'spoofed-actor-999',
          actorType: 'SUPER_ADMIN',
          userId: 'spoofed-user-999',
          platform: 'WEB_PUSH',
          subscription: sub,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          id: 'sub-1',
          actorType: expectedActorType,
          platform: 'WEB_PUSH',
        },
      });

      const upsertCall = mockPrisma.browserPushSubscription.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ endpoint: sub.endpoint });
      expect(upsertCall.create.companyId).toBe('company-1');
      expect(upsertCall.create.actorType).toBe(expectedActorType);
      expect(upsertCall.create.actorId).toBe(expectedActorId);
      expect(upsertCall.create.userId).toBe(
        expectedActorType === 'USER' ? expectedActorId : null
      );
      expect(upsertCall.update.companyId).toBe('company-1');
      expect(upsertCall.update.actorType).toBe(expectedActorType);
      expect(upsertCall.update.actorId).toBe(expectedActorId);
    }
  );

  test('POST /subscribe supports FCM_ANDROID and POST /unsubscribe scopes strictly to portalActor', async () => {
    mockPrisma.educationTeacher.findFirst.mockResolvedValue({
      id: 'teacher-7',
      companyId: 'company-1',
      isActive: true,
    });
    const token = signToken({
      teacherId: 'teacher-7',
      companyId: 'company-1',
      role: 'TEACHER',
    });

    const subRes = await request(app)
      .post('/api/v1/portal/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: 'spoofed-company',
        actorId: 'spoofed-teacher',
        platform: 'FCM_ANDROID',
        fcmToken: 'fcm-device-token-123',
      });

    expect(subRes.status).toBe(200);
    expect(subRes.body).toEqual({
      success: true,
      data: {
        id: 'sub-1',
        actorType: 'TEACHER',
        platform: 'FCM_ANDROID',
      },
    });

    const upsertCall = mockPrisma.browserPushSubscription.upsert.mock.calls[0][0];
    expect(upsertCall.where.endpoint).toBe('fcm:fcm-device-token-123');
    expect(upsertCall.create.subscription).toEqual({
      provider: 'fcm',
      token: 'fcm-device-token-123',
      platform: 'FCM_ANDROID',
    });

    const unsubRes = await request(app)
      .post('/api/v1/portal/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: 'spoofed-company',
        actorId: 'spoofed-teacher',
        fcmToken: 'fcm-device-token-123',
      });

    expect(unsubRes.status).toBe(200);
    expect(mockPrisma.browserPushSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        actorType: 'TEACHER',
        actorId: 'teacher-7',
        endpoint: 'fcm:fcm-device-token-123',
      },
      data: {
        isActive: false,
        lastErrorMessage: 'Unsubscribed by portal actor',
      },
    });
  });

  test('POST /test partitions Web Push + FCM rows and returns combined counts', async () => {
    mockPrisma.customer.findFirst.mockResolvedValueOnce({
      id: 'parent-9',
      companyId: 'company-1',
      status: 'ACTIVE',
    });
    mockPrisma.browserPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-web',
        companyId: 'company-1',
        actorType: 'PARENT',
        actorId: 'parent-9',
        platform: 'WEB_PUSH',
        endpoint: 'https://push.example.com/sub/parent-9',
        subscription: buildSampleWebSubscription('parent-9'),
        isActive: true,
      },
      {
        id: 'sub-fcm',
        companyId: 'company-1',
        actorType: 'PARENT',
        actorId: 'parent-9',
        platform: 'FCM_IOS',
        endpoint: 'fcm:ios-token-99',
        subscription: { provider: 'fcm', token: 'ios-token-99', platform: 'FCM_IOS' },
        isActive: true,
      },
    ]);

    const token = signToken({
      parentId: 'parent-9',
      companyId: 'company-1',
      role: 'PARENT',
    });

    const res = await request(app)
      .post('/api/v1/portal/push/test')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'اختبار البوابة', body: 'رسالة تجريبية', url: '/parent/sessions' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        attempted: 2,
        sent: 2,
        deliveredCount: 2,
        failed: 0,
        webSent: 1,
        fcmSent: 1,
      },
    });
    expect(mockWebPush.sendNotification).toHaveBeenCalledTimes(1);
    expect(mockFirebaseMessaging.sendToFcmTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['ios-token-99'],
        title: 'اختبار البوابة',
        body: 'رسالة تجريبية',
      })
    );
  });

  test('sendBrowserPushToCompany safely filters null userId portal subscriptions', async () => {
    mockPrisma.browserPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-portal-only',
        companyId: 'company-1',
        userId: null,
        actorType: 'PARENT',
        actorId: 'parent-1',
        platform: 'WEB_PUSH',
        endpoint: 'https://push.example.com/sub/portal-only',
        subscription: buildSampleWebSubscription('portal-only'),
        isActive: true,
        user: null,
      },
    ]);

    const result = await browserPushService.sendBrowserPushToCompany({
      companyId: 'company-1',
      typeId: 'order_created',
      title: 'Staff Broadcast',
      body: 'New order',
    });

    expect(mockPrisma.notificationPreference.findMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      attempted: 0,
      sent: 0,
      skipped: 1,
      failed: 0,
    });
  });
});
