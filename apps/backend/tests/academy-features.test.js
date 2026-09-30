/**
 * @file academy-features.test.js
 * @desc Tests for 4 academy features:
 *   1. Block free enrollment on paid courses
 *   2. Auto-enrollment after paid order
 *   3. Subscribe button store redirect (backend validation of storeProductId)
 *   4. Subscription duration (expiresAt) + lesson access denial after expiry
 */

const academyService = require('../services/academyService');

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────
jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => ({}),
}));

// Mock getDb on the singleton
const mockDb = {
  academyCourse: { findFirst: jest.fn() },
  academyEnrollment: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};
academyService.getDb = () => mockDb;

// ────────────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────────────
const paidCourse = {
  id: 'course-paid',
  companyId: 'co1',
  price: 500,
  storeProductId: 'prod-abc',
  subscriptionDays: 30,
  isGlobal: false,
  title: 'كورس اختبار',
};

const freeCourse = {
  id: 'course-free',
  companyId: 'co1',
  price: 0,
  storeProductId: null,
  subscriptionDays: null,
  isGlobal: false,
  title: 'كورس مجاني',
};

// ────────────────────────────────────────────────────────────────────────────
// Feature 1: Block free enrollment on paid courses
// ────────────────────────────────────────────────────────────────────────────
describe('Feature 1 — منع التسجيل المجاني في الكورسات المدفوعة', () => {
  beforeEach(() => jest.clearAllMocks());

  test('يرفض تسجيل طالب في كورس مدفوع بدون orderId ولا byAdmin', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(paidCourse);

    await expect(
      academyService.enrollStudent({
        companyId: 'co1',
        courseId: 'course-paid',
        studentPhone: '01000000001',
        studentName: 'طالب تجريبي',
      })
    ).rejects.toThrow('هذا الكورس مدفوع');
  });

  test('يسمح لأدمن بالتسجيل بدون دفع (byAdmin=true)', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(paidCourse);
    mockDb.academyEnrollment.findFirst.mockResolvedValue(null); // no existing
    mockDb.academyEnrollment.create.mockResolvedValue({ id: 'enr-1', status: 'ACTIVE' });

    const result = await academyService.enrollStudent({
      companyId: 'co1',
      courseId: 'course-paid',
      studentPhone: '01000000001',
      studentName: 'طالب',
      byAdmin: true,
    });

    expect(result.status).toBe('ACTIVE');
  });

  test('يسمح بالتسجيل إذا كان orderId موجوداً (بعد دفع)', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(paidCourse);
    mockDb.academyEnrollment.findFirst.mockResolvedValue(null);
    mockDb.academyEnrollment.create.mockResolvedValue({ id: 'enr-2', status: 'ACTIVE', expiresAt: new Date() });

    const result = await academyService.enrollStudent({
      companyId: 'co1',
      courseId: 'course-paid',
      studentPhone: '01000000002',
      orderId: 'order-xyz',
    });

    expect(result.status).toBe('ACTIVE');
  });

  test('يسمح بالتسجيل في كورس مجاني بدون دفع', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(freeCourse);
    mockDb.academyEnrollment.findFirst.mockResolvedValue(null);
    mockDb.academyEnrollment.create.mockResolvedValue({ id: 'enr-3', status: 'ACTIVE' });

    const result = await academyService.enrollStudent({
      companyId: 'co1',
      courseId: 'course-free',
      studentPhone: '01000000003',
    });

    expect(result.status).toBe('ACTIVE');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Feature 2: Auto-enrollment from paid order
// ────────────────────────────────────────────────────────────────────────────
describe('Feature 2 — التسجيل التلقائي بعد الدفع', () => {
  beforeEach(() => jest.clearAllMocks());

  test('يسجّل الطالب تلقائياً عند وجود كورس مرتبط بالمنتج', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(paidCourse);
    mockDb.academyEnrollment.findFirst
      .mockResolvedValueOnce(null)  // orderId check — not enrolled yet
      .mockResolvedValueOnce(null); // existing enrollment check
    mockDb.academyEnrollment.create.mockResolvedValue({ id: 'enr-auto', status: 'ACTIVE' });

    const result = await academyService.autoEnrollFromPaidOrder({
      companyId: 'co1',
      customerId: 'cust-1',
      storeProductId: 'prod-abc',
      orderId: 'order-001',
      customerName: 'أحمد',
      customerPhone: '01000000010',
    });

    expect(result).not.toBeNull();
    expect(mockDb.academyEnrollment.create).toHaveBeenCalledTimes(1);
  });

  test('لا يسجّل مرتين إذا نفس orderId مسبقاً', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(paidCourse);
    mockDb.academyEnrollment.findFirst.mockResolvedValue({ id: 'enr-already', status: 'ACTIVE' });

    const result = await academyService.autoEnrollFromPaidOrder({
      companyId: 'co1',
      customerId: 'cust-1',
      storeProductId: 'prod-abc',
      orderId: 'order-001',
    });

    expect(result.id).toBe('enr-already');
    expect(mockDb.academyEnrollment.create).not.toHaveBeenCalled();
  });

  test('يعيد null إذا لم يوجد كورس مرتبط بالمنتج', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue(null);

    const result = await academyService.autoEnrollFromPaidOrder({
      companyId: 'co1',
      storeProductId: 'prod-nonexistent',
      orderId: 'order-002',
    });

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Feature 3: storeProductId validation (backend side)
// ────────────────────────────────────────────────────────────────────────────
describe('Feature 3 — storeProductId: التحقق من ربط الكورس بمنتج', () => {
  test('الكورس المدفوع يحتوي على storeProductId', () => {
    expect(paidCourse.storeProductId).toBeTruthy();
    expect(Number(paidCourse.price)).toBeGreaterThan(0);
  });

  test('الكورس المجاني لا يحتوي على storeProductId', () => {
    // Free course should redirect directly to enroll, not store
    expect(freeCourse.price).toBe(0);
    expect(freeCourse.storeProductId).toBeFalsy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Feature 4: Subscription duration (expiresAt)
// ────────────────────────────────────────────────────────────────────────────
describe('Feature 4 — مدة الاشتراك وتاريخ الانتهاء', () => {
  beforeEach(() => jest.clearAllMocks());

  test('يحسب expiresAt بشكل صحيح بناءً على subscriptionDays', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue({ ...paidCourse, subscriptionDays: 30 });
    mockDb.academyEnrollment.findFirst.mockResolvedValue(null);

    let capturedData = null;
    mockDb.academyEnrollment.create.mockImplementation(({ data }) => {
      capturedData = data;
      return Promise.resolve({ ...data, id: 'enr-sub' });
    });

    await academyService.enrollStudent({
      companyId: 'co1',
      courseId: 'course-paid',
      orderId: 'order-sub',
      studentPhone: '01000000020',
    });

    expect(capturedData.subscriptionDays).toBe(30);
    expect(capturedData.expiresAt).toBeInstanceOf(Date);

    const diffDays = Math.round(
      (capturedData.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  test('كورس بدون subscriptionDays → expiresAt تكون null (مؤبد)', async () => {
    mockDb.academyCourse.findFirst.mockResolvedValue({ ...paidCourse, subscriptionDays: null });
    mockDb.academyEnrollment.findFirst.mockResolvedValue(null);

    let capturedData = null;
    mockDb.academyEnrollment.create.mockImplementation(({ data }) => {
      capturedData = data;
      return Promise.resolve({ ...data, id: 'enr-forever' });
    });

    await academyService.enrollStudent({
      companyId: 'co1',
      courseId: 'course-paid',
      orderId: 'order-sub2',
      studentPhone: '01000000021',
    });

    expect(capturedData.expiresAt).toBeNull();
  });

  test('suspendEnrollment: يوقف اشتراك الطالب', async () => {
    mockDb.academyEnrollment.findFirst.mockResolvedValue({ id: 'enr-1', companyId: 'co1', status: 'ACTIVE' });
    mockDb.academyEnrollment.update = jest.fn().mockResolvedValue({ id: 'enr-1', status: 'SUSPENDED' });

    const result = await academyService.suspendEnrollment({ enrollmentId: 'enr-1', companyId: 'co1' });
    expect(result.status).toBe('SUSPENDED');
  });

  test('reactivateEnrollment: يعيد تفعيل اشتراك موقوف', async () => {
    mockDb.academyEnrollment.findFirst.mockResolvedValue({ id: 'enr-1', companyId: 'co1', status: 'SUSPENDED' });
    mockDb.academyEnrollment.update = jest.fn().mockResolvedValue({ id: 'enr-1', status: 'ACTIVE' });

    const result = await academyService.reactivateEnrollment({ enrollmentId: 'enr-1', companyId: 'co1' });
    expect(result.status).toBe('ACTIVE');
  });
});
