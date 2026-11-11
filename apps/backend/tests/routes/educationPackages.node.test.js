const test = require('node:test');
const assert = require('node:assert');
const controller = require('../../controller/educationPackagesController');

test('educationPackagesController - auto resolve subject in courses mode', async () => {
  let createdPackage = null;
  let createdSubject = null;

  const mockPrisma = {
    educationSubject: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdSubject = { id: 'sub-default-1', ...data };
        return createdSubject;
      }
    },
    educationPackage: {
      create: async ({ data }) => {
        createdPackage = { id: 'pkg-1', ...data };
        return createdPackage;
      }
    }
  };

  const sharedDb = require('../../services/sharedDatabase');
  const originalGetSharedPrisma = sharedDb.getSharedPrismaClient;
  sharedDb.getSharedPrismaClient = () => mockPrisma;

  const createMockRes = () => {
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
      getData: () => responseData,
      getStatusCode: () => statusCode
    };
    return res;
  };

  // 1. Create package without subjectId (Courses mode)
  const req = {
    user: { id: 'u1', companyId: 'comp-123' },
    body: {
      name: 'كورس بايثون للمبتدئين',
      hoursCount: 16,
      price: 2500
    }
  };
  const res = createMockRes();

  await controller.create(req, res);

  assert.strictEqual(res.getStatusCode(), 200);
  assert.strictEqual(res.getData().success, true);
  assert.ok(createdSubject, 'Default subject was created');
  assert.strictEqual(createdSubject.name, 'عام');
  assert.strictEqual(createdPackage.subjectId, 'sub-default-1');
  assert.strictEqual(createdPackage.name, 'كورس بايثون للمبتدئين');

  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
