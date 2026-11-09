const test = require('node:test');
const assert = require('node:assert');
const controller = require('../../controller/educationSettingsController');

test('educationSettingsController unit test', async (t) => {
  let mockCompany = {
    id: 'comp-123',
    settings: JSON.stringify({
      currency: 'EGP',
      sidebarSettings: [
        { key: 'dashboard', order: 0, visible: true, labelAr: 'لوحة التحكم' }
      ]
    })
  };

  let mockCompanyApp = {
    id: 'ca-1',
    companyId: 'comp-123',
    appId: 'education-app',
    customName: null
  };

  const mockPrisma = {
    company: {
      findUnique: async () => ({ ...mockCompany }),
      update: async ({ data }) => {
        mockCompany.settings = data.settings;
        return { ...mockCompany };
      }
    },
    companyApp: {
      findFirst: async () => mockCompanyApp,
      updateMany: async ({ data }) => {
        if (mockCompanyApp) {
          mockCompanyApp.customName = data.customName;
        }
        return { count: 1 };
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

  await t.test('getSettings returns default system title and all tabs', async () => {
    const req = { user: { id: 'u1', role: 'OWNER', companyId: 'comp-123' } };
    const res = createMockRes();

    await controller.getSettings(req, res);

    const responseData = res.getData();
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.data.systemTitle, 'النظام التعليمي');
    assert.strictEqual(responseData.data.tabs.length, controller.DEFAULT_EDUCATION_TABS.length);

    const ids = responseData.data.tabs.map(tab => tab.id);
    assert.ok(ids.includes('dashboard'));
    assert.ok(ids.includes('teachers'));
    assert.ok(ids.includes('students'));
    assert.ok(ids.includes('settings'));
  });

  await t.test('updateSettings updates systemTitle and tabs and syncs with sidebar', async () => {
    const req = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-123' },
      body: {
        systemTitle: 'أكاديمية المستقبل للغات والبرمجة',
        tabs: [
          { id: 'teachers', labelAr: 'المدربين المعتمدين', visible: true, order: 0 },
          { id: 'teacher-payments', labelAr: 'مستحقات المدربين', visible: false, order: 1 }
        ]
      }
    };
    const res = createMockRes();

    await controller.updateSettings(req, res);

    const responseData = res.getData();
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.data.systemTitle, 'أكاديمية المستقبل للغات والبرمجة');

    const saved = JSON.parse(mockCompany.settings);
    assert.strictEqual(saved.currency, 'EGP'); // Unrelated keys preserved
    assert.strictEqual(saved.educationSettings.systemTitle, 'أكاديمية المستقبل للغات والبرمجة');

    const teachers = saved.educationSettings.tabs.find(x => x.id === 'teachers');
    assert.strictEqual(teachers.labelAr, 'المدربين المعتمدين');

    const payments = saved.educationSettings.tabs.find(x => x.id === 'teacher-payments');
    assert.strictEqual(payments.visible, false);

    // Verify synced into sidebarSettings
    const sidebarTeacher = saved.sidebarSettings.find(x => x.key === '/admin/education/teachers');
    assert.ok(sidebarTeacher);
    assert.strictEqual(sidebarTeacher.labelAr, 'المدربين المعتمدين');
    assert.strictEqual(sidebarTeacher.visible, true);

    const sidebarPayment = saved.sidebarSettings.find(x => x.key === '/admin/education/teacher-payments');
    assert.ok(sidebarPayment);
    assert.strictEqual(sidebarPayment.visible, false);

    // Verify customName updated
    assert.strictEqual(mockCompanyApp.customName, 'أكاديمية المستقبل للغات والبرمجة');
  });

  await t.test('updateSettings rejects unauthorized user', async () => {
    const req = {
      user: { id: 'u2', role: 'EMPLOYEE', permissions: [], companyId: 'comp-123' },
      body: { systemTitle: 'تعديل غير مسموح' }
    };
    const res = createMockRes();

    await controller.updateSettings(req, res);
    assert.strictEqual(res.getStatusCode(), 403);
    assert.strictEqual(res.getData().success, false);
  });

  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
