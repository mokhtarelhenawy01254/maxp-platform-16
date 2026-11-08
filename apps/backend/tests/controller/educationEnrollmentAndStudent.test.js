const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mock sharedDatabase before requiring controllers
const mockPrisma = {
  educationEnrollment: {
    findMany: async () => [],
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'enr-mock-1', ...data }),
    update: async ({ data }) => ({ id: 'enr-mock-1', ...data }),
    delete: async () => ({ id: 'enr-mock-1' }),
  },
  educationPackage: {
    findFirst: async () => null,
  },
  educationStudent: {
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'stu-mock-1', ...data }),
    update: async ({ data }) => ({ id: 'stu-mock-1', ...data }),
  },
  educationTeacher: {
    findFirst: async () => null,
  },
  customer: {
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'cust-mock-1', ...data }),
  },
};

// Override sharedDatabase require cache
const sharedDbPath = require.resolve('../../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => mockPrisma,
  },
};

const notifyServicePath = require.resolve('../../services/educationNotificationService');
require.cache[notifyServicePath] = {
  id: notifyServicePath,
  filename: notifyServicePath,
  loaded: true,
  exports: {
    notifyEnrollmentCreated: async () => true,
  },
};

const enrollmentController = require('../../controller/educationEnrollmentsController');
const studentController = require('../../controller/educationStudentsController');

describe('Education Enrollment & Student Controllers', () => {
  it('enrollment create safely handles empty string expiresAt and maps PAID to COMPLETED with tenant verification', async () => {
    mockPrisma.educationStudent.findFirst = async ({ where }) => {
      if (where.id === 'stu-1' && where.companyId === 'comp-1') {
        return { id: 'stu-1', firstName: 'طالب' };
      }
      return null;
    };

    mockPrisma.educationPackage.findFirst = async ({ where }) => {
      if (where.id === 'pkg-1' && where.companyId === 'comp-1') {
        return { id: 'pkg-1', companyId: 'comp-1', hoursCount: 10 };
      }
      return null;
    };

    mockPrisma.educationTeacher.findFirst = async ({ where }) => {
      if (where.id === 'tea-1' && where.companyId === 'comp-1') {
        return { id: 'tea-1', name: 'أحمد' };
      }
      return null;
    };

    let capturedCreateData = null;
    mockPrisma.educationEnrollment.create = async ({ data }) => {
      capturedCreateData = data;
      return { id: 'enr-1', ...data };
    };

    const req = {
      user: { companyId: 'comp-1' },
      body: {
        studentId: 'stu-1',
        packageId: 'pkg-1',
        teacherId: 'tea-1',
        amountPaid: '100',
        paymentStatus: 'PAID',
        expiresAt: '', // empty string from frontend
      },
    };

    let statusCode = 200;
    let jsonResult = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResult = data;
        return res;
      },
    };

    await enrollmentController.create(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(capturedCreateData.expiresAt, null);
    assert.strictEqual(capturedCreateData.paymentStatus, 'COMPLETED');
    assert.strictEqual(capturedCreateData.amountPaid, 100);
    assert.strictEqual(capturedCreateData.totalHours, 10);
    assert.strictEqual(capturedCreateData.remainingHours, 10);
    assert.strictEqual(capturedCreateData.teacherId, 'tea-1');
  });

  it('enrollment create rejects student belonging to different tenant (IDOR prevention)', async () => {
    mockPrisma.educationStudent.findFirst = async () => null; // not found in comp-1

    const req = {
      user: { companyId: 'comp-1' },
      body: {
        studentId: 'stu-foreign',
        packageId: 'pkg-1',
      },
    };

    let statusCode = 200;
    let jsonResult = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResult = data;
        return res;
      },
    };

    await enrollmentController.create(req, res);

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResult.success, false);
    assert.strictEqual(jsonResult.error, 'الطالب غير موجود');
  });

  it('enrollment create safely parses valid ISO date string for expiresAt', async () => {
    mockPrisma.educationStudent.findFirst = async () => ({ id: 'stu-1' });
    mockPrisma.educationPackage.findFirst = async () => ({
      id: 'pkg-1',
      companyId: 'comp-1',
      hoursCount: 5,
    });

    let capturedCreateData = null;
    mockPrisma.educationEnrollment.create = async ({ data }) => {
      capturedCreateData = data;
      return { id: 'enr-2', ...data };
    };

    const req = {
      user: { companyId: 'comp-1' },
      body: {
        studentId: 'stu-1',
        packageId: 'pkg-1',
        amountPaid: 50,
        paymentStatus: 'PENDING',
        expiresAt: '2026-12-31',
      },
    };

    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };

    await enrollmentController.create(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.ok(capturedCreateData.expiresAt instanceof Date);
    assert.strictEqual(capturedCreateData.paymentStatus, 'PENDING');
  });

  it('enrollment update safely handles empty string expiresAt and empty teacherId', async () => {
    mockPrisma.educationEnrollment.findFirst = async () => ({
      id: 'enr-1',
      companyId: 'comp-1',
      paymentStatus: 'PENDING',
    });

    let capturedUpdateData = null;
    mockPrisma.educationEnrollment.update = async ({ data }) => {
      capturedUpdateData = data;
      return { id: 'enr-1', ...data };
    };

    const req = {
      user: { companyId: 'comp-1' },
      params: { id: 'enr-1' },
      body: {
        paymentStatus: 'PAID',
        expiresAt: '',
        amountPaid: '250',
        teacherId: '', // unassign teacher
      },
    };

    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };

    await enrollmentController.update(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(capturedUpdateData.expiresAt, null);
    assert.strictEqual(capturedUpdateData.paymentStatus, 'COMPLETED');
    assert.strictEqual(capturedUpdateData.amountPaid, 250);
    assert.strictEqual(capturedUpdateData.teacherId, null);
    assert.strictEqual(capturedUpdateData.isActive, undefined); // verified not passed
  });

  it('student create auto-creates customer guardian when customerId is not provided', async () => {
    mockPrisma.customer.findFirst = async () => null;
    let capturedCustomerData = null;
    mockPrisma.customer.create = async ({ data }) => {
      capturedCustomerData = data;
      return { id: 'cust-auto-1', ...data };
    };

    let capturedStudentData = null;
    mockPrisma.educationStudent.create = async ({ data }) => {
      capturedStudentData = data;
      return { id: 'stu-new-1', ...data };
    };

    const req = {
      user: { companyId: 'comp-1' },
      body: {
        firstName: 'سفيان',
        lastName: 'أحمد',
        phone: '01011112222',
        guardianName: 'محمد أحمد',
        guardianPhone: '01099998888',
      },
    };

    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };

    await studentController.create(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(capturedCustomerData.firstName, 'محمد');
    assert.strictEqual(capturedCustomerData.lastName, 'أحمد');
    assert.strictEqual(capturedCustomerData.phone, '01099998888');
    assert.strictEqual(capturedStudentData.customerId, 'cust-auto-1');
    assert.strictEqual(capturedStudentData.firstName, 'سفيان');
    assert.strictEqual(capturedStudentData.lastName, 'أحمد');
  });

  it('student create auto-creates self-guardian when isSelfGuardian is true', async () => {
    mockPrisma.customer.findFirst = async () => null;
    let capturedCustomerData = null;
    mockPrisma.customer.create = async ({ data }) => {
      capturedCustomerData = data;
      return { id: 'cust-self-1', ...data };
    };

    mockPrisma.educationStudent.create = async ({ data }) => ({ id: 'stu-self-1', ...data });

    const req = {
      user: { companyId: 'comp-1' },
      body: {
        firstName: 'طالب',
        lastName: 'جامعي',
        phone: '01055556666',
        isSelfGuardian: true,
      },
    };

    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };

    await studentController.create(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(capturedCustomerData.firstName, 'طالب');
    assert.strictEqual(capturedCustomerData.lastName, 'جامعي');
    assert.strictEqual(capturedCustomerData.phone, '01055556666');
  });
});
