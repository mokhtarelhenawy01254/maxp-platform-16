const test = require('node:test');
const assert = require('node:assert');
const sharedDb = require('../../services/sharedDatabase');
const originalGetSharedPrisma = sharedDb.getSharedPrismaClient;
let activePrismaGetter = originalGetSharedPrisma;
sharedDb.getSharedPrismaClient = () => activePrismaGetter();

const controller = require('../../controller/educationSettingsController');
const sessionsController = require('../../controller/educationSessionsController');
const teachersController = require('../../controller/educationTeachersController');
const requireEducationAppInstalled = require('../../middleware/requireEducationAppInstalled');
const {
  getTeacherLabel,
  getSingularTeacherLabel,
  deriveSingularTeacherAr,
  deriveSingularTeacherEn,
  invalidateTeacherLabelCache
} = require('../../services/educationLabelService');

test('educationSettingsController unit test', async (t) => {
  let activityLogs = [];
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
    },
    activityLog: {
      create: async ({ data }) => {
        activityLogs.push(data);
        return { id: `log-${activityLogs.length}`, ...data };
      }
    }
  };

  activePrismaGetter = () => mockPrisma;

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

  await t.test('uses Teachers defaults, normalizes legacy values on read/put, writes itemId keys, and logs audit events', async () => {
    const defaultTeachers = controller.DEFAULT_EDUCATION_TABS.find(tab => tab.id === 'teachers');
    const defaultSchedule = controller.DEFAULT_EDUCATION_TABS.find(tab => tab.id === 'teacher-schedule');
    const defaultPayments = controller.DEFAULT_EDUCATION_TABS.find(tab => tab.id === 'teacher-payments');
    assert.strictEqual(defaultTeachers.defaultLabelAr, 'المدرسين');
    assert.strictEqual(defaultTeachers.defaultLabelEn, 'Teachers');
    assert.strictEqual(defaultSchedule.defaultLabelAr, 'جدول المدرسين');
    assert.strictEqual(defaultSchedule.defaultLabelEn, 'Teacher Schedule');
    assert.strictEqual(defaultPayments.defaultLabelAr, 'مرتبات المدرسين');
    assert.strictEqual(defaultPayments.defaultLabelEn, 'Teacher Payments');

    const legacyCompany = {
      id: 'comp-legacy',
      settings: JSON.stringify({
        educationSettings: {
          tabs: [
            { id: 'teachers', labelAr: 'المهندسين', labelEn: 'Instructors', visible: true, order: 4 },
            { id: 'teacher-schedule', labelAr: 'جدول المهندسين', labelEn: 'Instructor Schedule', visible: true, order: 5 },
            { id: 'teacher-payments', labelAr: 'مرتبات المهندسين', labelEn: 'Instructor Payments', visible: true, order: 6 }
          ]
        }
      })
    };
    let updateCalled = false;
    mockPrisma.company.findUnique = async () => ({ ...legacyCompany });
    mockPrisma.company.update = async ({ data }) => {
      updateCalled = true;
      legacyCompany.settings = data.settings;
      return { ...legacyCompany };
    };

    // Read normalizes legacy values without writing to DB
    const resRead = createMockRes();
    await controller.getSettings({ user: { id: 'u1', role: 'OWNER', companyId: 'comp-legacy' } }, resRead);
    assert.strictEqual(updateCalled, false);
    const readTabs = resRead.getData().data.tabs;
    assert.strictEqual(readTabs.find(x => x.id === 'teachers').labelAr, 'المدرسين');
    assert.strictEqual(readTabs.find(x => x.id === 'teachers').labelEn, 'Teachers');
    assert.strictEqual(readTabs.find(x => x.id === 'teacher-schedule').labelAr, 'جدول المدرسين');
    assert.strictEqual(readTabs.find(x => x.id === 'teacher-payments').labelAr, 'مرتبات المدرسين');

    // Unauthorized PUT logs failed audit row with severity HIGH
    activityLogs = [];
    const resForbidden = createMockRes();
    await controller.updateSettings({
      user: { id: 'u-emp', role: 'EMPLOYEE', permissions: [], companyId: 'comp-legacy' },
      body: { systemTitle: 'x' }
    }, resForbidden);
    assert.strictEqual(resForbidden.getStatusCode(), 403);
    assert.strictEqual(activityLogs.length, 1);
    assert.strictEqual(activityLogs[0].action, 'UPDATE_EDUCATION_SETTINGS');
    assert.strictEqual(activityLogs[0].isSuccess, false);
    assert.strictEqual(activityLogs[0].severity, 'HIGH');

    // Authorized PUT cleans legacy values, writes education-<tabId> keys, and logs success audit
    activityLogs = [];
    const resPut = createMockRes();
    await controller.updateSettings({
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-legacy' },
      body: {
        tabs: [
          { id: 'teachers', labelAr: 'المهندسين', labelEn: 'Instructors', visible: true, order: 0 },
          { id: 'teacher-schedule', labelAr: 'جدول المدربين', labelEn: 'Trainer Schedule', visible: true, order: 1 }
        ]
      }
    }, resPut);
    assert.strictEqual(resPut.getStatusCode(), 200);
    const saved = JSON.parse(legacyCompany.settings);
    assert.strictEqual(saved.educationSettings.tabs.find(x => x.id === 'teachers').labelAr, 'المدرسين');
    assert.strictEqual(saved.educationSettings.tabs.find(x => x.id === 'teacher-schedule').labelAr, 'جدول المدربين');
    assert.ok(saved.sidebarSettings.find(x => x.key === 'education-teachers' && x.labelAr === 'المدرسين'));
    assert.ok(saved.sidebarSettings.find(x => x.key === 'education-teacher-schedule' && x.labelAr === 'جدول المدربين'));
    assert.strictEqual(activityLogs.length, 1);
    assert.strictEqual(activityLogs[0].action, 'UPDATE_EDUCATION_SETTINGS');
    assert.strictEqual(activityLogs[0].isSuccess, true);
    assert.strictEqual(activityLogs[0].targetType, 'SETTINGS');

    // educationLabelService caches per companyId:lang and falls back cleanly
    invalidateTeacherLabelCache('comp-cache');
    let dbReads = 0;
    mockPrisma.company.findUnique = async () => {
      dbReads += 1;
      return {
        id: 'comp-cache',
        settings: JSON.stringify({
          educationSettings: { tabs: [{ id: 'teachers', labelAr: 'المدربين', labelEn: 'Trainers' }] }
        })
      };
    };
    assert.strictEqual(await getTeacherLabel('comp-cache', 'ar'), 'المدربين');
    assert.strictEqual(await getTeacherLabel('comp-cache', 'ar'), 'المدربين');
    assert.strictEqual(dbReads, 1);
    assert.strictEqual(await getTeacherLabel('comp-cache', 'en'), 'Trainers');
    assert.strictEqual(dbReads, 2);

    invalidateTeacherLabelCache('comp-err');
    mockPrisma.company.findUnique = async () => { throw new Error('DB down'); };
    assert.strictEqual(await getTeacherLabel('comp-err', 'ar'), 'المدرسين');
    assert.strictEqual(await getTeacherLabel('comp-err', 'en'), 'Teachers');
  });

  await t.test('enableDemoDay toggle controls demo-day tab visibility and syncs with sidebar', async () => {
    mockCompany = {
      id: 'comp-123',
      settings: JSON.stringify({
        sidebarSettings: []
      })
    };
    mockPrisma.company.findUnique = async () => ({ ...mockCompany });
    mockPrisma.company.update = async ({ data }) => {
      mockCompany.settings = data.settings;
      return { ...mockCompany };
    };

    // 1. Check default: demo-day is hidden (visible: false)
    const req1 = { user: { id: 'u1', role: 'OWNER', companyId: 'comp-123' } };
    const res1 = createMockRes();
    await controller.getSettings(req1, res1);
    const data1 = res1.getData();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.data.enableDemoDay, false);
    const demoTab1 = data1.data.tabs.find(t => t.id === 'demo-day');
    assert.ok(demoTab1);
    assert.strictEqual(demoTab1.visible, false);

    // 2. Enable Demo Day
    const req2 = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-123' },
      body: {
        enableDemoDay: true
      }
    };
    const res2 = createMockRes();
    await controller.updateSettings(req2, res2);
    const data2 = res2.getData();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.data.enableDemoDay, true);
    const demoTab2 = data2.data.tabs.find(t => t.id === 'demo-day');
    assert.strictEqual(demoTab2.visible, true);

    // Check sidebar sync
    const saved = JSON.parse(mockCompany.settings);
    const sidebarDemo = saved.sidebarSettings.find(s => s.key === '/admin/education/demo-day');
    assert.ok(sidebarDemo);
    assert.strictEqual(sidebarDemo.visible, true);

    // 3. Disable Demo Day
    const req3 = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-123' },
      body: {
        enableDemoDay: false
      }
    };
    const res3 = createMockRes();
    await controller.updateSettings(req3, res3);
    const data3 = res3.getData();
    assert.strictEqual(data3.success, true);
    assert.strictEqual(data3.data.enableDemoDay, false);
    const demoTab3 = data3.data.tabs.find(t => t.id === 'demo-day');
    assert.strictEqual(demoTab3.visible, false);
  });

  await t.test('RBAC middleware enforces userPermissions/education.settings.manage and logs disallowed roles', async () => {
    activityLogs = [];
    // Stale/untrusted JWT permissions:['settings.manage'] must be rejected when DB userPermissions is empty
    let nextCalled = false;
    const resUntrusted = createMockRes();
    await controller.requireSettingsManage(
      {
        user: { id: 'u-staff', role: 'EMPLOYEE', userPermissions: [], permissions: ['settings.manage'], companyId: 'comp-rbac' },
        body: { systemTitle: 'x' }
      },
      resUntrusted,
      () => { nextCalled = true; }
    );
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(resUntrusted.getStatusCode(), 403);
    assert.strictEqual(activityLogs.length, 1);
    assert.strictEqual(activityLogs[0].companyId, 'comp-rbac');
    assert.strictEqual(activityLogs[0].isSuccess, false);

    // DISALLOWED_ROLES (STUDENT) still logs failed audit attempt using user's companyId
    activityLogs = [];
    const resStudent = createMockRes();
    await controller.requireSettingsManage(
      { user: { id: 'u-stu', role: 'STUDENT', companyId: 'comp-rbac' }, body: {} },
      resStudent,
      () => { nextCalled = true; }
    );
    assert.strictEqual(resStudent.getStatusCode(), 403);
    assert.strictEqual(activityLogs.length, 1);
    assert.strictEqual(activityLogs[0].companyId, 'comp-rbac');
    assert.strictEqual(activityLogs[0].action, 'UPDATE_EDUCATION_SETTINGS');

    // User with DB permission education.settings.manage passes
    nextCalled = false;
    const resAllowed = createMockRes();
    await controller.requireSettingsManage(
      { user: { id: 'u-mgr', role: 'EMPLOYEE', userPermissions: ['education.settings.manage'], companyId: 'comp-rbac' }, body: {} },
      resAllowed,
      () => { nextCalled = true; }
    );
    assert.strictEqual(nextCalled, true);
  });

  await t.test('partial PUT preserves systemTitle, iconName, omitted tabs, and object sidebarSettings', async () => {
    let savedRecord = {
      id: 'comp-partial',
      settings: JSON.stringify({
        educationSettings: {
          systemTitle: 'أكاديمية النجوم',
          systemTitleEn: 'Stars Academy',
          educationMode: 'COURSES',
          enableSubjects: false,
          tabs: [
            { id: 'teachers', labelAr: 'المدربين', labelEn: 'Coaches', iconName: 'Users', order: 0, visible: true }
          ]
        },
        sidebarSettings: {
          sections: { education: { visible: true, order: 4 } },
          items: { 'education-teachers': { visible: true, order: 0 } }
        }
      })
    };
    mockPrisma.company.findUnique = async () => ({ ...savedRecord });
    mockPrisma.company.update = async ({ data }) => {
      savedRecord.settings = data.settings;
      return { ...savedRecord };
    };
    activityLogs = [];

    // Partial PUT toggling educationMode only should NOT wipe systemTitle or custom tab icon/labels
    const resPartial = createMockRes();
    await controller.updateSettings(
      { user: { id: 'u1', role: 'OWNER', companyId: 'comp-partial' }, body: { educationMode: 'ACADEMIC', enableSubjects: true } },
      resPartial
    );
    assert.strictEqual(resPartial.getStatusCode(), 200);
    const updated = resPartial.getData().data;
    assert.strictEqual(updated.systemTitle, 'أكاديمية النجوم');
    assert.strictEqual(updated.systemTitleEn, 'Stars Academy');
    const teacherTab = updated.tabs.find(t => t.id === 'teachers');
    assert.strictEqual(teacherTab.labelAr, 'المدربين');
    assert.strictEqual(teacherTab.labelEn, 'Coaches');
    assert.strictEqual(teacherTab.iconName, 'Users');

    // sidebarSettings object shape preserved
    const rawSaved = JSON.parse(savedRecord.settings);
    assert.strictEqual(Array.isArray(rawSaved.sidebarSettings), false);
    assert.strictEqual(rawSaved.sidebarSettings.sections.education.labelAr, 'أكاديمية النجوم');
    assert.strictEqual(rawSaved.sidebarSettings.items['education-teachers'].iconName, 'Users');

    // getSettings also returns persisted iconName
    const resRead = createMockRes();
    await controller.getSettings({ user: { id: 'u1', role: 'OWNER', companyId: 'comp-partial' } }, resRead);
    assert.strictEqual(resRead.getData().data.tabs.find(t => t.id === 'teachers').iconName, 'Users');

    // Audit log recorded before and after snapshots
    assert.strictEqual(activityLogs.length, 1);
    const meta = JSON.parse(activityLogs[0].metadata);
    assert.ok(meta.details.before);
    assert.ok(meta.details.after);
    assert.strictEqual(meta.details.after.systemTitle, 'أكاديمية النجوم');
  });

  await t.test('singularization, session descriptions, teacher password redaction, and app gating', async () => {
    assert.strictEqual(deriveSingularTeacherAr('المدرسين'), 'المدرس');
    assert.strictEqual(deriveSingularTeacherAr('المدربين'), 'المدرب');
    assert.strictEqual(deriveSingularTeacherAr('الأساتذة'), 'الأستاذ');
    assert.strictEqual(deriveSingularTeacherAr('الدكاترة'), 'الدكتور');
    assert.strictEqual(deriveSingularTeacherEn('Teachers'), 'Teacher');
    assert.strictEqual(deriveSingularTeacherEn('Coaches'), 'Coach');

    // Mock company settings for singular label lookup + session create/confirm/cancel
    invalidateTeacherLabelCache('comp-sess-default');
    invalidateTeacherLabelCache('comp-sess-custom');
    mockPrisma.company.findUnique = async ({ where }) => {
      if (where.id === 'comp-sess-custom') {
        return {
          id: 'comp-sess-custom',
          settings: JSON.stringify({
            educationSettings: { tabs: [{ id: 'teachers', labelAr: 'المدربين', labelEn: 'Coaches' }] }
          })
        };
      }
      return { id: where.id, settings: JSON.stringify({}) };
    };
    assert.strictEqual(await getSingularTeacherLabel('comp-sess-default', 'ar'), 'المدرس');
    assert.strictEqual(await getSingularTeacherLabel('comp-sess-custom', 'ar'), 'المدرب');
    assert.strictEqual(await getSingularTeacherLabel('comp-sess-custom', 'en'), 'Coach');

    activityLogs = [];
    mockPrisma.educationEnrollment = {
      findFirst: async () => ({
        id: 'enr-1',
        studentId: 'stu-1',
        teacherId: 'tch-1',
        remainingHours: 10,
        package: { subjectId: 'sub-1' }
      })
    };
    mockPrisma.educationTeacher = {
      findFirst: async () => ({ id: 'tch-1', companyId: 'comp-sess-custom', name: 'خالد' })
    };
    mockPrisma.educationSession = {
      findFirst: async () => null,
      create: async () => ({
        id: 'sess-1',
        scheduledAt: new Date('2026-11-15T10:00:00Z'),
        plannedDuration: 60,
        topic: 'Math',
        student: { firstName: 'أحمد', lastName: 'علي' },
        teacher: { id: 'tch-1', name: 'خالد' },
        subject: { id: 'sub-1', name: 'رياضيات' }
      })
    };
    const resSess = createMockRes();
    await sessionsController.create(
      {
        user: { id: 'u1', role: 'OWNER', companyId: 'comp-sess-custom' },
        body: { enrollmentId: 'enr-1', scheduledAt: '2026-11-15T10:00:00Z' }
      },
      resSess
    );
    await new Promise(r => setImmediate(r));
    assert.strictEqual(resSess.getStatusCode(), 200);
    const schedLog = activityLogs.find(l => l.action === 'SCHEDULE_SESSION');
    assert.ok(schedLog);
    assert.ok(schedLog.description.includes('مع المدرب خالد'), `Expected custom singular label, got: ${schedLog.description}`);
    assert.strictEqual(schedLog.description.includes('المهندس'), false);

    // Teacher removal strips password hash from audit details
    activityLogs = [];
    mockPrisma.educationTeacher = {
      findFirst: async () => ({ id: 'tch-secret', companyId: 'comp-sess-default', name: 'أ. سارة', password: '$2a$10$hashedpassword' }),
      delete: async () => ({})
    };
    const resDel = createMockRes();
    await teachersController.remove(
      { user: { id: 'u1', role: 'OWNER', companyId: 'comp-sess-default' }, params: { id: 'tch-secret' } },
      resDel
    );
    await new Promise(r => setImmediate(r));
    assert.strictEqual(resDel.getStatusCode(), 200);
    const delLog = activityLogs.find(l => l.action === 'DELETE_TEACHER');
    assert.ok(delLog);
    const delMeta = JSON.parse(delLog.metadata);
    assert.strictEqual(delMeta.details.deletedTeacher.password, undefined);

    // requireEducationAppInstalled strictly blocks uninstalled/expired trial companies and never auto-creates
    let createdApp = false;
    mockPrisma.companyApp = {
      findFirst: async () => null,
      create: async () => { createdApp = true; return {}; }
    };
    let gateNext = false;
    const resUninstalled = createMockRes();
    await requireEducationAppInstalled(
      { user: { id: 'u1', role: 'OWNER', companyId: 'comp-no-edu' } },
      resUninstalled,
      () => { gateNext = true; }
    );
    assert.strictEqual(gateNext, false);
    assert.strictEqual(createdApp, false);
    assert.strictEqual(resUninstalled.getStatusCode(), 403);
    assert.strictEqual(resUninstalled.getData().code, 'APP_ACCESS_DENIED');

    mockPrisma.companyApp.findFirst = async () => ({
      id: 'ca-exp',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() - 86400 * 1000).toISOString()
    });
    const resExpired = createMockRes();
    await requireEducationAppInstalled(
      { user: { id: 'u1', role: 'OWNER', companyId: 'comp-expired' } },
      resExpired,
      () => { gateNext = true; }
    );
    assert.strictEqual(gateNext, false);
    assert.strictEqual(resExpired.getStatusCode(), 403);

    mockPrisma.companyApp.findFirst = async () => ({ id: 'ca-ok', status: 'ACTIVE', trialEndsAt: null });
    await requireEducationAppInstalled(
      { user: { id: 'u1', role: 'OWNER', companyId: 'comp-ok' } },
      createMockRes(),
      () => { gateNext = true; }
    );
    assert.strictEqual(gateNext, true);
  });

  activePrismaGetter = originalGetSharedPrisma;
  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
