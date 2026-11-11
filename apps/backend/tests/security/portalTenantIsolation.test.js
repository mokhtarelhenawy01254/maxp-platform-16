'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = 'phase1-portal-tenant-isolation-secret';

const COMPANY_A = {
  id: 'comp-alpha',
  name: 'Alpha Academy & Lab',
  slug: 'alpha',
  publicCode: 'ALP01',
  customDomain: 'portal.alpha-custom.com',
  email: 'alpha@example.com',
  logo: '/logos/alpha.png',
  currency: 'EGP',
  settings: null,
  isActive: true,
  trialModeEnabled: true,
  trialEndsAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  installedApps: [{ app: { slug: 'dental-lab-app' } }],
};

const COMPANY_B = {
  id: 'comp-beta',
  name: 'Beta Academy & Clinic',
  slug: 'beta',
  publicCode: 'BET02',
  customDomain: 'portal.beta-custom.com',
  email: 'beta@example.com',
  logo: '/logos/beta.png',
  currency: 'EGP',
  settings: null,
  isActive: true,
  trialModeEnabled: true,
  trialEndsAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  installedApps: [{ app: { slug: 'dental-lab-app' } }],
};

const mockRedisStore = new Map();
const mockRedisCacheService = {
  isConnected: true,
  get: jest.fn(async (key) => (mockRedisStore.has(key) ? mockRedisStore.get(key) : null)),
  set: jest.fn(async (key, value) => {
    mockRedisStore.set(key, value);
    return true;
  }),
  del: jest.fn(async (key) => {
    mockRedisStore.delete(key);
    return true;
  }),
};

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  store: {
    findUnique: jest.fn(),
  },
  productLandingPage: {
    findFirst: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  educationTeacher: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  bookingDoctor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  dentalLabDoctor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  courier: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  academyEnrollment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  educationStudent: {
    findMany: jest.fn(),
  },
  educationSession: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  educationTeacherPayment: {
    aggregate: jest.fn(),
  },
  educationEnrollment: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  medicalInvoice: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  dentalLabCase: {
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  dentalInvoice: {
    aggregate: jest.fn(),
  },
  dentalLabPayment: {
    aggregate: jest.fn(),
  },
  deliveryRun: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  whatsAppSession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  executeWithRetry: jest.fn((fn) => Promise.resolve().then(fn)),
  safeQuery: jest.fn((fn, fallback = null) => Promise.resolve().then(fn).catch(() => fallback)),
}));

jest.mock('../../services/companyCacheService', () => ({
  getCompanyLookup: jest.fn(async (_kind, _key, loader) => loader()),
  getCompanyBySlug: jest.fn(async () => null),
  getCompanyByCustomDomain: jest.fn(async () => null),
  getCompanyById: jest.fn(async () => null),
  invalidateCompanyCache: jest.fn(async () => undefined),
}));

jest.mock('../../services/redisCacheService', () => mockRedisCacheService);

jest.mock('../../services/educationAuditService', () => ({
  logEducationEvent: jest.fn(async () => undefined),
}));

const mockNotifyParentActivated = jest.fn(async () => ({ success: true }));
jest.mock('../../services/educationNotificationService', () => ({
  notifyParentActivated: (...args) => mockNotifyParentActivated(...args),
}));

jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(async () => undefined),
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
  getCompanySessions: jest.fn(() => [{ sessionId: 'wa-baileys-1' }]),
  getSession: jest.fn(() => ({
    status: 'connected',
    provider: 'BAILEYS',
    sock: { ws: { readyState: 1 }, sendMessage: jest.fn() },
  })),
  getSocketReadyState: jest.fn(() => 1),
}));

jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn(async () => ({ success: true })),
}));

jest.mock('../../services/academyService', () => ({
  getDb: jest.fn(() => mockPrisma),
}));

describe('Phase 1: Cross-Portal Multi-Tenant Isolation & Secret-First Disambiguation', () => {
  const originalEnv = { ...process.env };
  const secretHash = bcrypt.hashSync('CorrectPass#123', 4);
  const pinHash = bcrypt.hashSync('4321', 4);

  const wireCompanyLookup = () => {
    const byId = { [COMPANY_A.id]: COMPANY_A, [COMPANY_B.id]: COMPANY_B };
    const bySlug = { [COMPANY_A.slug]: COMPANY_A, [COMPANY_B.slug]: COMPANY_B };
    const byCustomDomain = {
      [COMPANY_A.customDomain]: COMPANY_A,
      [COMPANY_B.customDomain]: COMPANY_B,
    };

    mockPrisma.company.findUnique.mockImplementation(async ({ where }) => {
      if (where?.id) return byId[where.id] || null;
      if (where?.slug) return bySlug[where.slug] || null;
      if (where?.customDomain) return byCustomDomain[where.customDomain] || null;
      return null;
    });

    mockPrisma.company.findMany.mockImplementation(async ({ where }) => {
      const ids = where?.id?.in || [];
      return ids.map((id) => byId[id]).filter(Boolean);
    });
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockRedisStore.clear();

    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      JWT_SECRET,
      MAIN_DOMAIN: 'maxp.online',
      ALLOW_ACADEMY_TEST_OTP: 'false',
    };

    wireCompanyLookup();
    mockPrisma.store.findUnique.mockResolvedValue(null);
    mockPrisma.productLandingPage.findFirst.mockResolvedValue(null);
    mockPrisma.educationStudent.findMany.mockResolvedValue([]);
    mockPrisma.educationEnrollment.count.mockResolvedValue(0);
    mockPrisma.educationSession.count.mockResolvedValue(0);
    mockPrisma.educationSession.findMany.mockResolvedValue([]);
    mockPrisma.educationTeacherPayment.aggregate.mockResolvedValue({ _sum: { netAmount: 0 } });
    mockPrisma.appointment.count.mockResolvedValue(0);
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.medicalInvoice.count.mockResolvedValue(0);
    mockPrisma.medicalInvoice.aggregate.mockResolvedValue({ _sum: { amountPaid: 0 } });
    mockPrisma.dentalLabCase.count.mockResolvedValue(0);
    mockPrisma.dentalLabCase.aggregate.mockResolvedValue({ _sum: { finalPrice: 0, paidAmount: 0 } });
    mockPrisma.dentalLabCase.groupBy.mockResolvedValue([]);
    mockPrisma.dentalInvoice.aggregate.mockResolvedValue({ _sum: { remaining: 0 } });
    mockPrisma.dentalLabPayment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.deliveryRun.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppSession.findUnique.mockResolvedValue(null);
    mockPrisma.whatsAppSession.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppSession.findFirst.mockResolvedValue({
      id: 'wa-baileys-1',
      provider: 'BAILEYS',
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  describe('1. subdomainMiddleware Host-first precedence & conflict guard', () => {
    test('resolves company strictly from Host subdomain and custom domain, ignoring conflicting spoofing headers with 403', async () => {
      const { extractSubdomainMiddleware } = require('../../middleware/subdomainMiddleware');
      const tenantContext = require('../../services/tenantContext');

      const app = express();
      app.use(express.json());
      app.use(extractSubdomainMiddleware);
      app.all('/probe', (req, res) => {
        res.json({
          companyId: req.company?.id || null,
          alsCompanyId: tenantContext.getCompanyId(),
        });
      });

      const okSubdomain = await request(app)
        .get('/probe')
        .set('Host', 'alpha.maxp.online');
      expect(okSubdomain.status).toBe(200);
      expect(okSubdomain.body).toEqual({ companyId: COMPANY_A.id, alsCompanyId: COMPANY_A.id });

      const okCustomDomain = await request(app)
        .get('/probe')
        .set('Host', COMPANY_B.customDomain);
      expect(okCustomDomain.status).toBe(200);
      expect(okCustomDomain.body).toEqual({ companyId: COMPANY_B.id, alsCompanyId: COMPANY_B.id });

      const spoofXSubdomain = await request(app)
        .get('/probe')
        .set('Host', 'alpha.maxp.online')
        .set('X-Subdomain', 'beta');
      expect(spoofXSubdomain.status).toBe(403);
      expect(spoofXSubdomain.body.code).toBe('TENANT_HOST_MISMATCH');

      const spoofQueryCompanyId = await request(app)
        .get(`/probe?companyId=${COMPANY_B.id}`)
        .set('Host', 'alpha.maxp.online');
      expect(spoofQueryCompanyId.status).toBe(403);
      expect(spoofQueryCompanyId.body.code).toBe('TENANT_HOST_MISMATCH');

      const spoofBodyCompanyId = await request(app)
        .post('/probe')
        .set('Host', 'alpha.maxp.online')
        .send({ companyId: COMPANY_B.id });
      expect(spoofBodyCompanyId.status).toBe(403);
      expect(spoofBodyCompanyId.body.code).toBe('TENANT_HOST_MISMATCH');

      const apexFallback = await request(app)
        .get('/probe')
        .set('Host', 'maxp.online')
        .set('X-Subdomain', 'beta');
      expect(apexFallback.status).toBe(200);
      expect(apexFallback.body).toEqual({ companyId: COMPANY_B.id, alsCompanyId: COMPANY_B.id });
    });
  });

  describe('2. portalAuthFactory cross-tenant JWT, role & status isolation', () => {
    const cases = [
      {
        label: 'Parent portal',
        mountPath: '/api/v1/education/parent-portal',
        routeFile: '../../routes/educationParentPortalRoutes',
        probePath: '/dashboard',
        model: 'customer',
        role: 'PARENT',
        idKey: 'parentId',
        actorA: {
          id: 'parent-a1',
          firstName: 'Ahmed',
          lastName: 'Ali',
          email: 'p@test.com',
          phone: '01011112222',
          companyId: COMPANY_A.id,
          status: 'ACTIVE',
        },
        inactiveActorA: {
          id: 'parent-a1',
          firstName: 'Ahmed',
          lastName: 'Ali',
          companyId: COMPANY_A.id,
          status: 'BLOCKED',
        },
      },
      {
        label: 'Teacher portal',
        mountPath: '/api/v1/education/teacher-portal',
        routeFile: '../../routes/educationTeacherPortalRoutes',
        probePath: '/dashboard',
        model: 'educationTeacher',
        role: 'TEACHER',
        idKey: 'teacherId',
        actorA: {
          id: 'teacher-a1',
          name: 'Mr. Tarek',
          email: 't@test.com',
          phone: '01033334444',
          companyId: COMPANY_A.id,
          isActive: true,
        },
        inactiveActorA: {
          id: 'teacher-a1',
          name: 'Mr. Tarek',
          companyId: COMPANY_A.id,
          isActive: false,
        },
      },
      {
        label: 'Doctor portal',
        mountPath: '/api/v1/booking/doctor-portal',
        routeFile: '../../routes/bookingDoctorPortalRoutes',
        probePath: '/dashboard',
        model: 'bookingDoctor',
        role: 'DOCTOR',
        idKey: 'doctorId',
        actorA: {
          id: 'doctor-a1',
          title: 'Dr.',
          name: 'Dr. Omar',
          email: 'd@test.com',
          phone: '01055556666',
          companyId: COMPANY_A.id,
          isActive: true,
        },
        inactiveActorA: {
          id: 'doctor-a1',
          name: 'Dr. Omar',
          companyId: COMPANY_A.id,
          isActive: false,
        },
      },
      {
        label: 'Patient portal',
        mountPath: '/api/v1/booking/patient-portal',
        routeFile: '../../routes/bookingPatientPortalRoutes',
        probePath: '/dashboard',
        model: 'patient',
        role: 'PATIENT',
        idKey: 'patientId',
        actorA: {
          id: 'patient-a1',
          firstName: 'Mona',
          lastName: 'Hassan',
          phone: '01077778888',
          email: 'pt@test.com',
          companyId: COMPANY_A.id,
          isActive: true,
        },
        inactiveActorA: {
          id: 'patient-a1',
          firstName: 'Mona',
          lastName: 'Hassan',
          companyId: COMPANY_A.id,
          isActive: false,
        },
      },
      {
        label: 'Dental Doctor portal',
        mountPath: '/api/v1/dental-portal',
        routeFile: '../../routes/dentalLabPortalRoutes',
        probePath: '/dashboard',
        model: 'dentalLabDoctor',
        role: 'DENTAL_DOCTOR',
        idKey: 'dentistId',
        actorA: {
          id: 'dentist-a1',
          name: 'Dr. Kareem',
          phone: '01099990000',
          clinicName: 'Alpha Smile',
          companyId: COMPANY_A.id,
          isActive: true,
        },
        inactiveActorA: {
          id: 'dentist-a1',
          name: 'Dr. Kareem',
          companyId: COMPANY_A.id,
          isActive: false,
        },
      },
    ];

    test.each(cases)(
      '$label rejects wrong host (403 TENANT_MISMATCH), wrong role (401), token/DB mismatch (401), and inactive actors (403)',
      async ({ mountPath, routeFile, probePath, model, role, idKey, actorA, inactiveActorA }) => {
        const router = require(routeFile);
        const app = express();
        app.use(express.json());
        app.use(mountPath, router);

        const validToken = signToken({ [idKey]: actorA.id, companyId: COMPANY_A.id, role });
        const wrongRoleToken = signToken({ [idKey]: actorA.id, companyId: COMPANY_A.id, role: 'WRONG_ROLE' });
        const tamperedToken = signToken({ [idKey]: actorA.id, companyId: COMPANY_B.id, role });

        mockPrisma[model].findUnique.mockResolvedValue(actorA);
        mockPrisma[model].findFirst.mockResolvedValue(actorA);

        const okSameHost = await request(app)
          .get(`${mountPath}${probePath}`)
          .set('Host', 'alpha.maxp.online')
          .set('Authorization', `Bearer ${validToken}`);
        expect(okSameHost.status).toBe(200);

        const blockedCrossHost = await request(app)
          .get(`${mountPath}${probePath}`)
          .set('Host', 'beta.maxp.online')
          .set('Authorization', `Bearer ${validToken}`);
        expect(blockedCrossHost.status).toBe(403);
        expect(blockedCrossHost.body.code).toBe('TENANT_MISMATCH');

        const blockedWrongRole = await request(app)
          .get(`${mountPath}${probePath}`)
          .set('Host', 'alpha.maxp.online')
          .set('Authorization', `Bearer ${wrongRoleToken}`);
        expect(blockedWrongRole.status).toBe(401);

        const blockedTamperedCompany = await request(app)
          .get(`${mountPath}${probePath}`)
          .set('Host', 'beta.maxp.online')
          .set('Authorization', `Bearer ${tamperedToken}`);
        expect(blockedTamperedCompany.status).toBe(401);

        mockPrisma[model].findUnique.mockResolvedValue(inactiveActorA);
        mockPrisma[model].findFirst.mockResolvedValue(inactiveActorA);

        const blockedInactive = await request(app)
          .get(`${mountPath}${probePath}`)
          .set('Host', 'alpha.maxp.online')
          .set('Authorization', `Bearer ${validToken}`);
        expect(blockedInactive.status).toBe(403);
      }
    );
  });

  describe('3. Portal login tenant scoping & secret-first multi-company disambiguation', () => {
    const buildApp = (mountPath, routeFile) => {
      const app = express();
      app.use(express.json());
      app.use(mountPath, require(routeFile));
      return app;
    };

    test('Parent login filters by Host companyId and uses secret-first disambiguation on apex domain', async () => {
      const app = buildApp('/api/v1/education/parent-portal', '../../routes/educationParentPortalRoutes');

      const candA = {
        id: 'parent-a',
        firstName: 'Ahmed',
        lastName: 'Alpha',
        phone: '01012345678',
        email: 'parent@example.com',
        password: secretHash,
        companyId: COMPANY_A.id,
        status: 'ACTIVE',
        company: COMPANY_A,
      };
      const candB = {
        id: 'parent-b',
        firstName: 'Ahmed',
        lastName: 'Beta',
        phone: '01012345678',
        email: 'parent@example.com',
        password: secretHash,
        companyId: COMPANY_B.id,
        status: 'ACTIVE',
        company: COMPANY_B,
      };

      mockPrisma.customer.findMany.mockImplementation(async ({ where }) => {
        const all = [candA, candB];
        return where?.companyId ? all.filter((c) => c.companyId === where.companyId) : all;
      });

      // Wrong password must NEVER reveal multi-company membership
      const wrongSecret = await request(app)
        .post('/api/v1/education/parent-portal/login')
        .set('Host', 'maxp.online')
        .send({ email: '01012345678', password: 'WrongPassword!' });
      expect(wrongSecret.status).toBe(401);
      expect(wrongSecret.body.requiresCompanySelection).toBeUndefined();
      expect(wrongSecret.body.companies).toBeUndefined();

      // Correct password on apex returns disambiguation options
      const apexMulti = await request(app)
        .post('/api/v1/education/parent-portal/login')
        .set('Host', 'maxp.online')
        .send({ email: '01012345678', password: 'CorrectPass#123' });
      expect(apexMulti.status).toBe(200);
      expect(apexMulti.body.requiresCompanySelection).toBe(true);
      expect(apexMulti.body.code).toBe('COMPANY_SELECTION_REQUIRED');
      expect(apexMulti.body.companies).toHaveLength(2);

      // Selecting Company B mints token strictly for Company B
      const selectedB = await request(app)
        .post('/api/v1/education/parent-portal/login')
        .set('Host', 'maxp.online')
        .send({ email: '01012345678', password: 'CorrectPass#123', companyId: COMPANY_B.id });
      expect(selectedB.status).toBe(200);
      expect(selectedB.body.success).toBe(true);
      expect(selectedB.body.data.parent.companyId).toBe(COMPANY_B.id);
      const decodedB = jwt.verify(selectedB.body.data.token, JWT_SECRET);
      expect(decodedB.companyId).toBe(COMPANY_B.id);

      // Subdomain Host directly logs into ONLY that tenant and passes companyId to Prisma where
      const subdomainSingle = await request(app)
        .post('/api/v1/education/parent-portal/login')
        .set('Host', 'alpha.maxp.online')
        .send({ email: '01012345678', password: 'CorrectPass#123' });
      expect(subdomainSingle.status).toBe(200);
      expect(subdomainSingle.body.data.parent.companyId).toBe(COMPANY_A.id);
      expect(mockPrisma.customer.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: COMPANY_A.id }),
        })
      );
    });

    test('Teacher, Doctor, Patient, Dental Doctor & Courier logins enforce secret-first disambiguation and reject wrong secrets before revealing companies', async () => {
      const loginCases = [
        {
          mountPath: '/api/v1/education/teacher-portal',
          routeFile: '../../routes/educationTeacherPortalRoutes',
          model: 'educationTeacher',
          bodyValid: { email: 'actor@example.com', password: 'CorrectPass#123' },
          bodyInvalid: { email: 'actor@example.com', password: 'BadPassword!' },
          cands: [
            { id: 't-a', name: 'T A', email: 'actor@example.com', password: secretHash, companyId: COMPANY_A.id, isActive: true, company: COMPANY_A },
            { id: 't-b', name: 'T B', email: 'actor@example.com', password: secretHash, companyId: COMPANY_B.id, isActive: true, company: COMPANY_B },
          ],
          getToken: (body) => body?.data?.token,
        },
        {
          mountPath: '/api/v1/booking/doctor-portal',
          routeFile: '../../routes/bookingDoctorPortalRoutes',
          model: 'bookingDoctor',
          bodyValid: { email: 'actor@example.com', password: 'CorrectPass#123' },
          bodyInvalid: { email: 'actor@example.com', password: 'BadPassword!' },
          cands: [
            { id: 'd-a', name: 'D A', email: 'actor@example.com', password: secretHash, companyId: COMPANY_A.id, isActive: true, company: COMPANY_A },
            { id: 'd-b', name: 'D B', email: 'actor@example.com', password: secretHash, companyId: COMPANY_B.id, isActive: true, company: COMPANY_B },
          ],
          getToken: (body) => body?.data?.token,
        },
        {
          mountPath: '/api/v1/booking/patient-portal',
          routeFile: '../../routes/bookingPatientPortalRoutes',
          model: 'patient',
          bodyValid: { phone: '01022223333', password: 'CorrectPass#123' },
          bodyInvalid: { phone: '01022223333', password: 'BadPassword!' },
          cands: [
            { id: 'pt-a', firstName: 'P', lastName: 'A', phone: '01022223333', password: secretHash, companyId: COMPANY_A.id, isActive: true, company: COMPANY_A },
            { id: 'pt-b', firstName: 'P', lastName: 'B', phone: '01022223333', password: secretHash, companyId: COMPANY_B.id, isActive: true, company: COMPANY_B },
          ],
          getToken: (body) => body?.data?.token,
        },
        {
          mountPath: '/api/v1/dental-portal',
          routeFile: '../../routes/dentalLabPortalRoutes',
          model: 'dentalLabDoctor',
          bodyValid: { phone: '01022223333', pin: '4321' },
          bodyInvalid: { phone: '01022223333', pin: '0000' },
          cands: [
            { id: 'dd-a', name: 'DD A', clinicName: 'Clinic A', phone: '01022223333', portalPin: pinHash, companyId: COMPANY_A.id, isActive: true },
            { id: 'dd-b', name: 'DD B', clinicName: 'Clinic B', phone: '01022223333', portalPin: pinHash, companyId: COMPANY_B.id, isActive: true },
          ],
          getToken: (body) => body?.data?.token || body?.token,
        },
        {
          mountPath: '/api/v1/courier-portal',
          routeFile: '../../routes/courierPortalRoutes',
          model: 'courier',
          bodyValid: { phone: '01022223333', pin: '4321' },
          bodyInvalid: { phone: '01022223333', pin: '0000' },
          cands: [
            { id: 'cr-a', name: 'Courier A', phone: '01022223333', pinHash, companyId: COMPANY_A.id, isActive: true, company: COMPANY_A },
            { id: 'cr-b', name: 'Courier B', phone: '01022223333', pinHash, companyId: COMPANY_B.id, isActive: true, company: COMPANY_B },
          ],
          getToken: (body) => body?.data?.token,
        },
      ];

      for (const spec of loginCases) {
        const app = buildApp(spec.mountPath, spec.routeFile);
        mockPrisma[spec.model].findMany.mockImplementation(async ({ where }) => {
          return where?.companyId ? spec.cands.filter((c) => c.companyId === where.companyId) : spec.cands;
        });

        const wrongRes = await request(app)
          .post(`${spec.mountPath}/login`)
          .set('Host', 'maxp.online')
          .send(spec.bodyInvalid);
        expect(wrongRes.status).toBe(401);
        expect(wrongRes.body.companies).toBeUndefined();

        const multiRes = await request(app)
          .post(`${spec.mountPath}/login`)
          .set('Host', 'maxp.online')
          .send(spec.bodyValid);
        expect(multiRes.status).toBe(200);
        expect(multiRes.body.requiresCompanySelection).toBe(true);
        expect(multiRes.body.code).toBe('COMPANY_SELECTION_REQUIRED');
        expect(multiRes.body.companies.map((c) => c.companyId)).toEqual([COMPANY_A.id, COMPANY_B.id]);

        const tenantRes = await request(app)
          .post(`${spec.mountPath}/login`)
          .set('Host', 'beta.maxp.online')
          .send(spec.bodyValid);
        expect(tenantRes.status).toBe(200);
        expect(tenantRes.body.success).toBe(true);
        const token = spec.getToken(tenantRes.body);
        expect(jwt.verify(token, JWT_SECRET).companyId).toBe(COMPANY_B.id);
      }
    });

    test('Parent activation link blocks cross-tenant activation on mismatched Host (403 TENANT_MISMATCH)', async () => {
      const app = buildApp('/api/v1/education/parent-portal', '../../routes/educationParentPortalRoutes');

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'parent-a',
        companyId: COMPANY_A.id,
        firstName: 'Ali',
        lastName: 'Hassan',
        phone: '01012345678',
        password: null,
        parentActivationExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        company: { id: COMPANY_A.id, name: COMPANY_A.name, logo: COMPANY_A.logo },
      });

      const wrongHostValidate = await request(app)
        .get('/api/v1/education/parent-portal/activate?token=tok123')
        .set('Host', 'beta.maxp.online');
      expect(wrongHostValidate.status).toBe(403);
      expect(wrongHostValidate.body.code).toBe('TENANT_MISMATCH');

      const wrongHostActivate = await request(app)
        .post('/api/v1/education/parent-portal/activate')
        .set('Host', 'beta.maxp.online')
        .send({ token: 'tok123', password: 'NewPassword123' });
      expect(wrongHostActivate.status).toBe(403);
      expect(wrongHostActivate.body.code).toBe('TENANT_MISMATCH');
      expect(mockNotifyParentActivated).not.toHaveBeenCalled();

      mockPrisma.customer.updateMany.mockResolvedValueOnce({ count: 1 });
      const sameHostActivate = await request(app)
        .post('/api/v1/education/parent-portal/activate')
        .set('Host', 'alpha.maxp.online')
        .send({ token: 'tok123', password: 'NewPassword123' });
      expect(sameHostActivate.status).toBe(200);
      expect(sameHostActivate.body.success).toBe(true);
      expect(mockNotifyParentActivated).toHaveBeenCalledWith({
        companyId: COMPANY_A.id,
        customerId: 'parent-a',
        parentPhone: '01012345678',
        parentName: 'Ali Hassan',
      });
    });
  });

  describe('4. Academy Student Redis OTP tenant isolation & JWT cross-tenant block', () => {
    test('scopes Redis OTP by companyScope, enforces OTP verification before company selection, and blocks cross-tenant student JWT', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/v1/academy', require('../../routes/academyRoutes'));

      const enrollmentA = {
        id: 'enr-a',
        companyId: COMPANY_A.id,
        studentPhone: '01044445555',
        studentName: 'Student One',
        status: 'ACTIVE',
        course: { id: 'c1', title: 'Course A', price: 100, thumbnailUrl: null },
      };
      const enrollmentB = {
        id: 'enr-b',
        companyId: COMPANY_B.id,
        studentPhone: '01044445555',
        studentName: 'Student One',
        status: 'ACTIVE',
        course: { id: 'c2', title: 'Course B', price: 200, thumbnailUrl: null },
      };

      mockPrisma.academyEnrollment.findFirst.mockImplementation(async ({ where }) => {
        if (where?.companyId === COMPANY_B.id) return enrollmentB;
        return enrollmentA;
      });
      mockPrisma.academyEnrollment.findMany.mockImplementation(async ({ where }) => {
        const all = [enrollmentA, enrollmentB];
        return where?.companyId ? all.filter((e) => e.companyId === where.companyId) : all;
      });

      // Request OTP strictly on alpha.maxp.online
      const sendRes = await request(app)
        .post('/api/v1/academy/student/send-code')
        .set('Host', 'alpha.maxp.online')
        .send({ phone: '01044445555' });
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);

      const alphaRedisKey = Array.from(mockRedisStore.keys()).find((k) =>
        k.startsWith(`portal:otp:student:${COMPANY_A.id}:`)
      );
      expect(alphaRedisKey).toBeDefined();
      const otpCode = mockRedisStore.get(alphaRedisKey).code;

      // Alpha OTP MUST NOT work when submitted on beta.maxp.online
      const crossTenantOtpAttempt = await request(app)
        .post('/api/v1/academy/student/login')
        .set('Host', 'beta.maxp.online')
        .send({ phone: '01044445555', code: otpCode });
      expect(crossTenantOtpAttempt.status).toBe(400);
      expect(crossTenantOtpAttempt.body.code).toBe('OTP_EXPIRED');

      // Wrong OTP on apex MUST fail BEFORE exposing multi-academy company selection
      mockRedisStore.set('portal:otp:student:global:01044445555', {
        code: '654321',
        expiresAt: Date.now() + 60000,
        attempts: 0,
        lastSentAt: Date.now(),
      });
      const wrongApexOtp = await request(app)
        .post('/api/v1/academy/student/login')
        .set('Host', 'maxp.online')
        .send({ phone: '01044445555', code: '000000' });
      expect(wrongApexOtp.status).toBe(400);
      expect(wrongApexOtp.body.code).toBe('OTP_INVALID');
      expect(wrongApexOtp.body.companies).toBeUndefined();

      // Valid global OTP triggers disambiguation, then scoped login issues Company B JWT
      const disambiguateApex = await request(app)
        .post('/api/v1/academy/student/login')
        .set('Host', 'maxp.online')
        .send({ phone: '01044445555', code: '654321' });
      expect(disambiguateApex.status).toBe(200);
      expect(disambiguateApex.body.requiresCompanySelection).toBe(true);
      expect(disambiguateApex.body.code).toBe('COMPANY_SELECTION_REQUIRED');
      expect(disambiguateApex.body.companies.map((c) => c.companyId)).toEqual([COMPANY_A.id, COMPANY_B.id]);

      const loginCompanyB = await request(app)
        .post('/api/v1/academy/student/login')
        .set('Host', 'maxp.online')
        .send({ phone: '01044445555', code: '654321', companyId: COMPANY_B.id });
      expect(loginCompanyB.status).toBe(200);
      expect(loginCompanyB.body.success).toBe(true);
      const studentTokenB = loginCompanyB.body.token;
      expect(jwt.verify(studentTokenB, JWT_SECRET).companyId).toBe(COMPANY_B.id);

      // Using Company B student JWT against alpha.maxp.online returns 403 TENANT_MISMATCH
      const crossTenantProfile = await request(app)
        .get('/api/v1/academy/student/me')
        .set('Host', 'alpha.maxp.online')
        .set('Authorization', `Bearer ${studentTokenB}`);
      expect(crossTenantProfile.status).toBe(403);
      expect(crossTenantProfile.body.code).toBe('TENANT_MISMATCH');
    });
  });
});
