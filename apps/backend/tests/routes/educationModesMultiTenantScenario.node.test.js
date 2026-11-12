const test = require('node:test');
const assert = require('node:assert');
const settingsController = require('../../controller/educationSettingsController');
const packagesController = require('../../controller/educationPackagesController');
const groupsController = require('../../controller/educationGroupsController');
const sharedDb = require('../../services/sharedDatabase');

test('Comprehensive Scenario Test: Default vs Changed Mode + Strict Multi-Tenant Isolation', async (t) => {
  // In-memory multi-tenant database mock
  const database = {
    companies: {
      'comp-alpha': {
        id: 'comp-alpha',
        name: 'Alpha Courses Academy',
        settings: JSON.stringify({}) // Default, no custom settings yet
      },
      'comp-beta': {
        id: 'comp-beta',
        name: 'Beta Academic Tutoring Center',
        settings: JSON.stringify({})
      }
    },
    subjects: [],
    packages: [],
    companyApps: []
  };

  const mockPrisma = {
    company: {
      findUnique: async ({ where }) => {
        const c = database.companies[where.id];
        return c ? { ...c } : null;
      },
      update: async ({ where, data }) => {
        const c = database.companies[where.id];
        if (!c) throw new Error('Company not found');
        if (data.settings !== undefined) c.settings = data.settings;
        return { ...c };
      }
    },
    companyApp: {
      findFirst: async ({ where }) => {
        return database.companyApps.find(ca => ca.companyId === where.companyId) || null;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        database.companyApps.forEach(ca => {
          if (ca.companyId === where.companyId) {
            ca.customName = data.customName;
            count++;
          }
        });
        return { count };
      }
    },
    educationSubject: {
      findFirst: async ({ where }) => {
        return database.subjects.find(s => {
          if (where.id && s.id !== where.id) return false;
          if (where.name && s.name !== where.name) return false;
          if (where.companyId && s.companyId !== where.companyId) return false;
          if (where.isActive !== undefined && s.isActive !== where.isActive) return false;
          return true;
        }) || null;
      },
      findMany: async ({ where }) => {
        return database.subjects.filter(s => s.companyId === where.companyId);
      },
      create: async ({ data }) => {
        const newSub = { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...data };
        database.subjects.push(newSub);
        return newSub;
      }
    },
    educationPackage: {
      findMany: async ({ where }) => {
        return database.packages.filter(p => {
          if (p.companyId !== where.companyId) return false;
          if (where.subjectId && p.subjectId !== where.subjectId) return false;
          return true;
        }).map(p => ({
          ...p,
          subject: database.subjects.find(s => s.id === p.subjectId) || null
        }));
      },
      create: async ({ data }) => {
        const newPkg = { id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...data };
        database.packages.push(newPkg);
        return {
          ...newPkg,
          subject: database.subjects.find(s => s.id === newPkg.subjectId) || null
        };
      }
    },
    educationTeacher: {
      findFirst: async ({ where }) => null
    },
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('INSERT INTO "education_groups"')) {
        const [id, companyId, name, code, subjectId] = params;
        if (!database.groups) database.groups = [];
        database.groups.push({ id, companyId, name, code, subjectId });
      }
      return 1;
    },
    $queryRawUnsafe: async (sql, ...params) => {
      return [{ count: 0 }];
    }
  };

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

  await t.test('Scenario 1: Company Alpha does NOT change settings (Default Mode)', async () => {
    // 1. Fetch settings for Company Alpha
    const reqGet = { user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' } };
    const resGet = createMockRes();
    await settingsController.getSettings(reqGet, resGet);

    const data = resGet.getData().data;
    // By default: Mode is COURSES
    assert.strictEqual(data.educationMode, 'COURSES', 'Default mode should be COURSES');
    assert.strictEqual(data.enableSubjects, false, 'Default enableSubjects should be false');

    // Subjects tab is hidden
    const subjectsTab = data.tabs.find(tab => tab.id === 'subjects');
    assert.strictEqual(subjectsTab.visible, false, 'Subjects tab must be hidden by default');

    // Other core tabs remain visible
    const packagesTab = data.tabs.find(tab => tab.id === 'packages');
    assert.strictEqual(packagesTab.visible, true, 'Packages tab must be visible');

    // 2. Create a package without specifying any subjectId in Courses mode
    const reqCreatePkg = {
      user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' },
      body: {
        name: 'باقة البرمجة والذكاء الاصطناعي الشاملة',
        hoursCount: 40,
        price: 2500,
        sessionDuration: 60
      }
    };
    const resCreatePkg = createMockRes();
    await packagesController.create(reqCreatePkg, resCreatePkg);

    assert.strictEqual(resCreatePkg.getStatusCode(), 200);
    const createdPkg = resCreatePkg.getData().data;
    assert.strictEqual(createdPkg.name, 'باقة البرمجة والذكاء الاصطناعي الشاملة');
    assert.strictEqual(createdPkg.companyId, 'comp-alpha');
    // Ensure subject was auto-created/assigned as default system subject
    assert.ok(createdPkg.subjectId, 'subjectId should be auto-resolved');
    assert.strictEqual(createdPkg.subject.name, 'عام', 'Default subject name should be عام');
  });

  await t.test('Scenario 2: Company Beta changes settings to ACADEMIC mode', async () => {
    // 1. Switch Company Beta to ACADEMIC mode
    const reqUpdate = {
      user: { id: 'user-beta', role: 'OWNER', companyId: 'comp-beta' },
      body: {
        educationMode: 'ACADEMIC',
        enableSubjects: true
      }
    };
    const resUpdate = createMockRes();
    await settingsController.updateSettings(reqUpdate, resUpdate);

    assert.strictEqual(resUpdate.getStatusCode(), 200);
    const updated = resUpdate.getData().data;
    assert.strictEqual(updated.educationMode, 'ACADEMIC');
    assert.strictEqual(updated.enableSubjects, true);

    const subjectsTab = updated.tabs.find(tab => tab.id === 'subjects');
    assert.strictEqual(subjectsTab.visible, true, 'Subjects tab must be visible in ACADEMIC mode');

    // 2. Create a custom academic subject for Beta
    const customSubject = await mockPrisma.educationSubject.create({
      data: { companyId: 'comp-beta', name: 'الفيزياء الثانوية العامة', isActive: true }
    });

    // 3. Create a package linked to that subject
    const reqCreatePkg = {
      user: { id: 'user-beta', role: 'OWNER', companyId: 'comp-beta' },
      body: {
        subjectId: customSubject.id,
        name: 'باقة فيزياء تالتة ثانوي مكثف',
        hoursCount: 20,
        price: 1200,
        sessionDuration: 90
      }
    };
    const resCreatePkg = createMockRes();
    await packagesController.create(reqCreatePkg, resCreatePkg);

    assert.strictEqual(resCreatePkg.getStatusCode(), 200);
    const betaPkg = resCreatePkg.getData().data;
    assert.strictEqual(betaPkg.companyId, 'comp-beta');
    assert.strictEqual(betaPkg.subjectId, customSubject.id);
  });

  await t.test('Scenario 3: Verify strict multi-tenant isolation (No leakage between Alpha and Beta)', async () => {
    // 1. Re-query Company Alpha settings: Must still be COURSES and NOT influenced by Beta
    const reqGetAlpha = { user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' } };
    const resGetAlpha = createMockRes();
    await settingsController.getSettings(reqGetAlpha, resGetAlpha);

    const alphaSettings = resGetAlpha.getData().data;
    assert.strictEqual(alphaSettings.educationMode, 'COURSES', 'Alpha must still be COURSES');
    assert.strictEqual(alphaSettings.enableSubjects, false, 'Alpha enableSubjects must still be false');
    assert.strictEqual(alphaSettings.tabs.find(t => t.id === 'subjects').visible, false);

    // 2. Re-query Company Beta settings: Must still be ACADEMIC
    const reqGetBeta = { user: { id: 'user-beta', role: 'OWNER', companyId: 'comp-beta' } };
    const resGetBeta = createMockRes();
    await settingsController.getSettings(reqGetBeta, resGetBeta);

    const betaSettings = resGetBeta.getData().data;
    assert.strictEqual(betaSettings.educationMode, 'ACADEMIC', 'Beta must remain ACADEMIC');
    assert.strictEqual(betaSettings.enableSubjects, true, 'Beta enableSubjects must remain true');
    assert.strictEqual(betaSettings.tabs.find(t => t.id === 'subjects').visible, true);

    // 3. Query packages for Alpha: Should only return Alpha packages
    const reqPkgsAlpha = { user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' }, query: {} };
    const resPkgsAlpha = createMockRes();
    await packagesController.getAll(reqPkgsAlpha, resPkgsAlpha);

    const alphaPkgs = resPkgsAlpha.getData().data;
    assert.strictEqual(alphaPkgs.length, 1);
    assert.strictEqual(alphaPkgs[0].name, 'باقة البرمجة والذكاء الاصطناعي الشاملة');
    assert.strictEqual(alphaPkgs[0].companyId, 'comp-alpha');

    // 4. Query packages for Beta: Should only return Beta packages
    const reqPkgsBeta = { user: { id: 'user-beta', role: 'OWNER', companyId: 'comp-beta' }, query: {} };
    const resPkgsBeta = createMockRes();
    await packagesController.getAll(reqPkgsBeta, resPkgsBeta);

    const betaPkgs = resPkgsBeta.getData().data;
    assert.strictEqual(betaPkgs.length, 1);
    assert.strictEqual(betaPkgs[0].name, 'باقة فيزياء تالتة ثانوي مكثف');
    assert.strictEqual(betaPkgs[0].companyId, 'comp-beta');

    // 5. Test multi-company header switching for Super Admin
    const reqSuperAlpha = {
      user: { id: 'super-admin', role: 'SUPER_ADMIN' },
      headers: { 'x-company-id': 'comp-alpha' },
      query: {}
    };
    const resSuperAlpha = createMockRes();
    await settingsController.getSettings(reqSuperAlpha, resSuperAlpha);
    assert.strictEqual(resSuperAlpha.getData().data.educationMode, 'COURSES');

    const reqSuperBeta = {
      user: { id: 'super-admin', role: 'SUPER_ADMIN' },
      headers: { 'x-company-id': 'comp-beta' },
      query: {}
    };
    const resSuperBeta = createMockRes();
    await settingsController.getSettings(reqSuperBeta, resSuperBeta);
    assert.strictEqual(resSuperBeta.getData().data.educationMode, 'ACADEMIC');
  });

  await t.test('Scenario 4: Education Groups auto-resolve subject in COURSES mode and isolate across tenants', async () => {
    // 1. Alpha (COURSES mode) creates a group without subjectId
    const reqCreateGroupAlpha = {
      user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' },
      body: {
        name: 'مجموعة بايثون متقدم',
        code: 'GRP-PY-01',
        capacity: 20
      }
    };
    const resCreateGroupAlpha = createMockRes();
    await groupsController.create(reqCreateGroupAlpha, resCreateGroupAlpha);

    assert.strictEqual(resCreateGroupAlpha.getStatusCode(), 200, 'Alpha group should be created without subjectId');
    assert.strictEqual(resCreateGroupAlpha.getData().success, true);

    const createdAlphaGroup = database.groups?.find(g => g.name === 'مجموعة بايثون متقدم');
    assert.ok(createdAlphaGroup, 'Alpha group must exist in database');
    assert.strictEqual(createdAlphaGroup.companyId, 'comp-alpha');

    // Default subject 'عام' should have been created for Alpha
    const alphaDefaultSubject = database.subjects.find(s => s.companyId === 'comp-alpha' && s.name === 'عام');
    assert.ok(alphaDefaultSubject, 'Default subject عام must be created for Alpha');
    assert.strictEqual(createdAlphaGroup.subjectId, alphaDefaultSubject.id);

    // 2. Beta (ACADEMIC mode) creates a group with its subject (Physics)
    const betaPhysics = database.subjects.find(s => s.companyId === 'comp-beta');
    assert.ok(betaPhysics, 'Beta physics subject must exist');

    const reqCreateGroupBeta = {
      user: { id: 'user-beta', role: 'OWNER', companyId: 'comp-beta' },
      body: {
        name: 'مجموعة فيزياء الأحد والثلاثاء',
        code: 'GRP-PHY-01',
        subjectId: betaPhysics.id,
        capacity: 15
      }
    };
    const resCreateGroupBeta = createMockRes();
    await groupsController.create(reqCreateGroupBeta, resCreateGroupBeta);

    assert.strictEqual(resCreateGroupBeta.getStatusCode(), 200);
    const createdBetaGroup = database.groups?.find(g => g.name === 'مجموعة فيزياء الأحد والثلاثاء');
    assert.ok(createdBetaGroup);
    assert.strictEqual(createdBetaGroup.companyId, 'comp-beta');
    assert.strictEqual(createdBetaGroup.subjectId, betaPhysics.id);

    // 3. Alpha tries to use Beta's subject: must fail with 400 (Cross-tenant security guard)
    const reqCrossTenant = {
      user: { id: 'user-alpha', role: 'OWNER', companyId: 'comp-alpha' },
      body: {
        name: 'مجموعة اختراق غير شرعي',
        subjectId: betaPhysics.id
      }
    };
    const resCrossTenant = createMockRes();
    await groupsController.create(reqCrossTenant, resCrossTenant);

    assert.strictEqual(resCrossTenant.getStatusCode(), 400, 'Cross-tenant subjectId must be rejected');
    assert.strictEqual(resCrossTenant.getData().success, false);
  });

  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
