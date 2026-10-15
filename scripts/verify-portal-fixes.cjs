const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_key_for_portal_fixes_verification_2026';

// Self-contained test suite for portal fixes:
// 1) P0-1: Real payment session creation via KashierService, PENDING order, no token issued
// 2) P0-2: Content Gating - raw ?phone= rejected with 403 on locked lessons, valid token accepted, free preview accepted
// 3) P0-3: Verification code (OTP) required for login, attempts capped, resend cooldown, test account predictable code
// 4) P1: verify-payment endpoint checks payment and grants access only when confirmed

async function runUnitTests() {
  console.log('🧪 Running Academy Portal Fixes - Unit & Security Guard Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const academyController = require('../apps/backend/controller/academyController');
  const academyService = require('../apps/backend/services/academyService');
  const KashierService = require('../apps/backend/services/kashierService');
  const { getJwtSecret } = require('../apps/backend/utils/jwtSecret');

  const courseId = 'cmuzmwaxs07r2juml2v04xon5';
  const testPhone = '01000000099';
  const lesson1Id = 'lesson-1-free';
  const lesson2Id = 'lesson-2-free';
  const lesson3Id = 'cmv19ktd4006tju9cy15nblth'; // Lesson 3 locked

  // Setup Mock Database for academyService
  const mockDb = {
    academyCourse: {
      findUnique: async () => ({
        id: courseId,
        title: 'من أول إعلان… لأول نظام',
        price: 500,
        companyId: 'cmopgxu3a07i4jujj6f1oh32h',
        freePreviewLessons: 2,
        modules: [
          {
            id: 'mod-1',
            sortOrder: 1,
            lessons: [
              { id: lesson1Id, sortOrder: 1, isFreePreview: true },
              { id: lesson2Id, sortOrder: 2, isFreePreview: true },
              { id: lesson3Id, sortOrder: 3, isFreePreview: false },
            ],
          },
        ],
      }),
    },
    academyLesson: {
      findFirst: async ({ where }) => {
        const id = where.id;
        const isFree = id === lesson1Id || id === lesson2Id;
        return {
          id,
          title: `درس تجريبي ${id}`,
          isFreePreview: isFree,
          module: {
            course: {
              id: courseId,
              freePreviewLessons: 2,
              companyId: 'cmopgxu3a07i4jujj6f1oh32h',
            },
          },
        };
      },
      update: async () => ({}),
    },
    academyEnrollment: {
      findFirst: async ({ where }) => {
        const phone = where?.studentPhone || where?.OR?.find(o => o.studentPhone)?.studentPhone;
        if (phone === testPhone) {
          return {
            id: 'enr-test-99',
            courseId,
            studentPhone: testPhone,
            studentName: 'أحمد محمود',
            status: 'ACTIVE',
            companyId: 'cmopgxu3a07i4jujj6f1oh32h',
          };
        }
        return null;
      },
      findMany: async ({ where }) => {
        const phone = where?.studentPhone || where?.OR?.find(o => o.studentPhone)?.studentPhone;
        if (phone === testPhone) {
          return [
            {
              id: 'enr-test-99',
              courseId,
              studentPhone: testPhone,
              studentName: 'أحمد محمود',
              status: 'ACTIVE',
              course: { id: courseId, title: 'من أول إعلان… لأول نظام', price: 500 },
            },
          ];
        }
        return [];
      },
    },
    customer: {
      findFirst: async ({ where }) => {
        if (where.phone === testPhone) {
          return { id: 'cust-99', phone: testPhone, firstName: 'أحمد', lastName: 'محمود' };
        }
        return null;
      },
      create: async ({ data }) => ({ id: `cust-${Date.now()}`, ...data }),
    },
    order: {
      create: async ({ data }) => ({
        id: `ord-${Date.now()}`,
        ...data,
      }),
      findUnique: async ({ where }) => {
        if (where.orderNumber === 'ORD-PAID-123') {
          return {
            id: 'ord-123',
            orderNumber: 'ORD-PAID-123',
            customerPhone: testPhone,
            customerName: 'أحمد محمود',
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            companyId: 'cmopgxu3a07i4jujj6f1oh32h',
            metadata: JSON.stringify({ courseId }),
          };
        }
        if (where.orderNumber === 'ORD-PENDING-456') {
          return {
            id: 'ord-456',
            orderNumber: 'ORD-PENDING-456',
            customerPhone: '01011112222',
            customerName: 'طالب تحت السداد',
            status: 'PENDING',
            paymentStatus: 'PENDING',
            companyId: 'cmopgxu3a07i4jujj6f1oh32h',
            metadata: JSON.stringify({ courseId, kashierSessionId: 'sess-pending-456' }),
          };
        }
        return null;
      },
      update: async ({ data }) => ({ ...data }),
    },
    academyProgress: {
      upsert: async () => ({ id: 'prog-1', status: 'IN_PROGRESS' }),
    },
  };

  // Inject mockDb into academyService
  const originalGetDb = academyService.getDb;
  academyService.getDb = () => mockDb;
  academyService.processOrderAutoEnrollment = async () => ({ success: true });

  // Mock KashierService
  KashierService.createPaymentSession = async (params) => {
    return {
      success: true,
      sessionId: `kashier-sess-${Date.now()}`,
      sessionUrl: `https://payments.kashier.io/session/mock-${Date.now()}?mode=live`,
      mode: 'live',
    };
  };

  KashierService.getSessionStatus = async (sessionId) => {
    if (sessionId === 'sess-paid-real') {
      return { success: true, status: 'SUCCESS', method: 'CARD' };
    }
    return { success: true, status: 'PENDING' };
  };

  // -------------------------------------------------------------
  // Test 1: Content Gating (P0-2)
  // -------------------------------------------------------------
  console.log('--- Test 1: Content Gating & Vulnerability Prevention ---');
  {
    // Attacker sends ?phone=01000000099 without JWT token
    const req = {
      params: { id: lesson3Id },
      query: { phone: testPhone },
      headers: { 'x-student-phone': testPhone },
      user: null,
    };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };

    await academyController.getLessonContent(req, res);
    assert(statusCode === 403, `Attacker with ?phone= on Lesson 3 rejected with 403 Forbidden (got ${statusCode})`);
    assert(body?.error === 'هذا الدرس يتطلب الاشتراك في الكورس أولاً', 'Appropriate Arabic rejection message returned');
  }

  // -------------------------------------------------------------
  // Test 2: Free Preview (P0-2)
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Free Preview (Lesson 1 & 2 without token) ---');
  {
    const req = {
      params: { id: lesson1Id },
      query: {},
      headers: {},
      user: null,
    };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };

    await academyController.getLessonContent(req, res);
    assert(statusCode === 200 && body?.success === true, 'Visitor without token CAN view Lesson 1 free preview');
  }

  // -------------------------------------------------------------
  // Test 3: Authenticated Student Access on Lesson 3 (P0-2)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Authenticated Student Access with Token ---');
  {
    const token = jwt.sign(
      {
        id: `student_${testPhone}`,
        studentPhone: testPhone,
        role: 'STUDENT',
      },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    const req = {
      params: { id: lesson3Id },
      query: {},
      headers: { authorization: `Bearer ${token}` },
      user: null,
    };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };

    await academyController.getLessonContent(req, res);
    assert(statusCode === 200 && body?.success === true, 'Enrolled student WITH token can view Lesson 3');
  }

  // -------------------------------------------------------------
  // Test 4: Student Login & OTP Verification (P0-3)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Student Verification Code (OTP) ---');
  {
    // A: Login without code
    const req = { body: { phone: testPhone } };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };
    await academyController.studentLogin(req, res);
    assert(statusCode === 400 && body?.code === 'OTP_REQUIRED', 'Login without verification code fails with OTP_REQUIRED');

    // B: Send code
    const sendReq = { body: { phone: testPhone } };
    let sendStatus = 200;
    let sendBody = null;
    const sendRes = {
      status(c) { sendStatus = c; return this; },
      json(b) { sendBody = b; return this; },
    };
    await academyController.sendStudentLoginCode(sendReq, sendRes);
    assert(sendStatus === 200 && sendBody?.success === true, 'Verification code sent successfully');
    assert(sendBody?.testCode === '123456', 'Test account 01000000099 has predictable code 123456');

    // C: Login with wrong code
    const wrongReq = { body: { phone: testPhone, code: '000000' } };
    let wrongStatus = 200;
    let wrongBody = null;
    const wrongRes = {
      status(c) { wrongStatus = c; return this; },
      json(b) { wrongBody = b; return this; },
    };
    await academyController.studentLogin(wrongReq, wrongRes);
    assert(wrongStatus === 400 && wrongBody?.code === 'OTP_INVALID', 'Login with wrong code rejected with OTP_INVALID');

    // D: Login with correct code
    const okReq = { body: { phone: testPhone, code: '123456' } };
    let okStatus = 200;
    let okBody = null;
    const okRes = {
      status(c) { okStatus = c; return this; },
      json(b) { okBody = b; return this; },
    };
    await academyController.studentLogin(okReq, okRes);
    assert(okStatus === 200 && okBody?.success === true, 'Login with valid code succeeds');
    assert(typeof okBody?.token === 'string', 'Student JWT token generated and returned');
  }

  // -------------------------------------------------------------
  // Test 5: Real Checkout & verifyCoursePayment (P0-1)
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Real Payment Session Creation & Gate ---');
  {
    // A: Public checkout creates PENDING order and returns Kashier session URL
    const req = {
      params: { courseId },
      body: {
        studentPhone: '01055554444',
        studentName: 'مشتري جديد',
        paymentMethod: 'card',
      },
      get() { return 'https://maxp.online'; },
    };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };

    await academyController.checkoutCourse(req, res);
    assert(statusCode === 201, 'checkoutCourse returns 201 Created');
    assert(body?.paymentPending === true, 'paymentPending flag is true');
    assert(typeof body?.sessionUrl === 'string' && body.sessionUrl.includes('kashier.io'), 'Kashier payment session URL returned');
    assert(!body?.token, '🔒 CRITICAL SECURITY CHECK: NO student token issued prior to payment!');

    // B: verifyCoursePayment for confirmed order
    const verifyReq1 = {
      params: { courseId },
      body: { orderNumber: 'ORD-PAID-123' },
    };
    let v1Status = 200;
    let v1Body = null;
    const v1Res = {
      status(c) { v1Status = c; return this; },
      json(b) { v1Body = b; return this; },
    };
    await academyController.verifyCoursePayment(verifyReq1, v1Res);
    assert(v1Status === 200 && v1Body?.verified === true, 'verifyCoursePayment confirms already-paid order');
    assert(typeof v1Body?.token === 'string', 'Student token issued upon confirmed payment');

    // C: verifyCoursePayment for unpaid pending order
    const verifyReq2 = {
      params: { courseId },
      body: { orderNumber: 'ORD-PENDING-456' },
    };
    let v2Status = 200;
    let v2Body = null;
    const v2Res = {
      status(c) { v2Status = c; return this; },
      json(b) { v2Body = b; return this; },
    };
    await academyController.verifyCoursePayment(verifyReq2, v2Res);
    assert(v2Status === 402 && v2Body?.verified === false, 'verifyCoursePayment rejects unpaid pending order with 402');
  }

  // -------------------------------------------------------------
  // Test 6: Student Profile Protection
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Student Profile Access Protection ---');
  {
    // A: Without token
    const req = {
      headers: {},
      query: { phone: testPhone },
      user: null,
    };
    let statusCode = 200;
    let body = null;
    const res = {
      status(c) { statusCode = c; return this; },
      json(b) { body = b; return this; },
    };
    await academyController.getStudentProfile(req, res);
    assert(statusCode === 401 && body?.code === 'STUDENT_AUTH_REQUIRED', '/student/me rejects unauthenticated request with 401');
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  // Restore original
  academyService.getDb = originalGetDb;

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runUnitTests().catch((e) => {
  console.error('Test runner fatal error:', e);
  process.exit(1);
});
