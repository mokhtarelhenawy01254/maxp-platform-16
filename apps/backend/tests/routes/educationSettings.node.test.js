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

  await t.test('educationMode defaults to COURSES and hides subjects by default, and enables them in ACADEMIC mode', async () => {
    // 1. Check default getSettings when empty
    mockCompany.settings = JSON.stringify({});
    const reqGet = { user: { id: 'u1', role: 'COMPANY_ADMIN', companyId: 'comp-123' } };
    const resGet = createMockRes();
    await controller.getSettings(reqGet, resGet);

    const initialData = resGet.getData().data;
    assert.strictEqual(initialData.educationMode, 'COURSES');
    assert.strictEqual(initialData.enableSubjects, false);
    const subjectsTab = initialData.tabs.find(t => t.id === 'subjects');
    assert.strictEqual(subjectsTab.visible, false);

    // 2. Switch to ACADEMIC mode
    const reqUpdate = {
      user: { id: 'u1', role: 'COMPANY_ADMIN', companyId: 'comp-123' },
      body: {
        educationMode: 'ACADEMIC',
        enableSubjects: true,
        tabs: initialData.tabs
      }
    };
    const resUpdate = createMockRes();
    await controller.updateSettings(reqUpdate, resUpdate);

    const updatedData = resUpdate.getData().data;
    assert.strictEqual(updatedData.educationMode, 'ACADEMIC');
    assert.strictEqual(updatedData.enableSubjects, true);
    const updatedSubjectsTab = updatedData.tabs.find(t => t.id === 'subjects');
    assert.strictEqual(updatedSubjectsTab.visible, true);

    // 3. Switch back to COURSES even if stale enableSubjects: true is supplied -> forced false, no bare settings/dashboard keys
    const reqBackToCourses = {
      user: { id: 'u1', role: 'COMPANY_ADMIN', companyId: 'comp-123' },
      body: {
        educationMode: 'COURSES',
        enableSubjects: true,
        tabs: updatedData.tabs
      }
    };
    const resBackToCourses = createMockRes();
    await controller.updateSettings(reqBackToCourses, resBackToCourses);

    const coursesData = resBackToCourses.getData().data;
    assert.strictEqual(coursesData.educationMode, 'COURSES');
    assert.strictEqual(coursesData.enableSubjects, false);
    assert.strictEqual(coursesData.tabs.find(t => t.id === 'subjects').visible, false);

    const savedAfterCourses = JSON.parse(mockCompany.settings);
    const bareSettingsKey = savedAfterCourses.sidebarSettings.find(x => x.key === 'settings');
    const bareDashboardKey = savedAfterCourses.sidebarSettings.find(x => x.key === 'dashboard');
    assert.strictEqual(bareSettingsKey, undefined, 'Must not emit colliding bare key "settings"');
    assert.strictEqual(bareDashboardKey, undefined, 'Must not emit colliding bare key "dashboard"');
    const eduSubjectsEntry = savedAfterCourses.sidebarSettings.find(x => x.key === 'education-subjects');
    assert.ok(eduSubjectsEntry);
    assert.strictEqual(eduSubjectsEntry.visible, false);
  });

  await t.test('rejects disallowed roles (SHIPPING_CLIENT, STUDENT, CUSTOMER, COURIER) with 403', async () => {
    for (const role of ['SHIPPING_CLIENT', 'STUDENT', 'CUSTOMER', 'COURIER']) {
      const reqGet = { user: { id: 'u-bad', role, companyId: 'comp-123' } };
      const resGet = createMockRes();
      await controller.getSettings(reqGet, resGet);
      assert.strictEqual(resGet.getStatusCode(), 403, `getSettings should reject ${role}`);

      const reqPut = { user: { id: 'u-bad', role, companyId: 'comp-123' }, body: { educationMode: 'ACADEMIC' } };
      const resPut = createMockRes();
      await controller.updateSettings(reqPut, resPut);
      assert.strictEqual(resPut.getStatusCode(), 403, `updateSettings should reject ${role}`);
    }
  });

  await t.test('multi-tenant isolation: modifying settings for Company A does not affect Company B', async () => {
    const companies = {
      'comp-A': { id: 'comp-A', settings: JSON.stringify({ educationSettings: { educationMode: 'COURSES', enableSubjects: false } }) },
      'comp-B': { id: 'comp-B', settings: JSON.stringify({ educationSettings: { educationMode: 'ACADEMIC', enableSubjects: true } }) }
    };

    mockPrisma.company.findUnique = async ({ where }) => companies[where.id] ? { ...companies[where.id] } : null;
    mockPrisma.company.update = async ({ where, data }) => {
      companies[where.id].settings = data.settings;
      return { ...companies[where.id] };
    };

    // User switches Company A to ACADEMIC mode
    const reqA = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-A' },
      body: { educationMode: 'ACADEMIC', enableSubjects: true }
    };
    const resA = createMockRes();
    await controller.updateSettings(reqA, resA);
    assert.strictEqual(resA.getData().success, true);

    // Verify Company A is updated
    const savedA = JSON.parse(companies['comp-A'].settings);
    assert.strictEqual(savedA.educationSettings.educationMode, 'ACADEMIC');
    assert.strictEqual(savedA.educationSettings.enableSubjects, true);

    // Now update Company B to COURSES mode
    const reqB = {
      user: { id: 'u2', role: 'OWNER', companyId: 'comp-B' },
      body: { educationMode: 'COURSES', enableSubjects: false }
    };
    const resB = createMockRes();
    await controller.updateSettings(reqB, resB);
    assert.strictEqual(resB.getData().success, true);

    // Verify Company B is COURSES and Company A remains ACADEMIC!
    const finalA = JSON.parse(companies['comp-A'].settings);
    const finalB = JSON.parse(companies['comp-B'].settings);
    assert.strictEqual(finalA.educationSettings.educationMode, 'ACADEMIC');
    assert.strictEqual(finalB.educationSettings.educationMode, 'COURSES');
    assert.notStrictEqual(finalA.educationSettings.educationMode, finalB.educationSettings.educationMode);

    // Also test header x-company-id resolution for multi-company owner / super admin
    const reqMulti = {
      user: { id: 'u3', role: 'SUPER_ADMIN', companyId: 'comp-A' },
      headers: { 'x-company-id': 'comp-B' }
    };
    const resMulti = createMockRes();
    await controller.getSettings(reqMulti, resMulti);
    assert.strictEqual(resMulti.getData().data.educationMode, 'COURSES'); // read from comp-B via header!
  });

  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
