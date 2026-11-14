const test = require('node:test');
const assert = require('node:assert');
const sharedDb = require('../../services/sharedDatabase');
const originalGetSharedPrisma = sharedDb.getSharedPrismaClient;
let activePrismaGetter = originalGetSharedPrisma;
sharedDb.getSharedPrismaClient = () => activePrismaGetter();

const branchService = require('../../services/educationBranchService');
const branchController = require('../../controller/educationBranchesController');
const demoDayController = require('../../controller/educationDemoDayController');
const groupsController = require('../../controller/educationGroupsController');

test('Education Branches, Classrooms, and Harmony Test Suite', async (t) => {
  let branchesDb = [];
  let demoDaysDb = [];
  let groupsDb = [];

  const mockPrisma = {
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('ALTER TABLE') || sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX')) {
        return 1;
      }
      if (sql.includes('INSERT INTO "branches"')) {
        const [id, companyId, name, address, city, phone, email, workingHours, googleMapsUrl, managerName, managerPhone, classrooms, isActive] = params;
        branchesDb.push({
          id, companyId, name, address, city, phone, email, workingHours,
          googleMapsUrl, managerName, managerPhone, classrooms, isActive: isActive !== false
        });
        return 1;
      }
      if (sql.includes('INSERT INTO "education_demo_days"')) {
        const [id, companyId, title, description, subjectId, teacherId, scheduledAt, durationMinutes, locationType, meetingLink, room, capacity, notes, branchId, classroomId, googleMapsUrl] = params;
        demoDaysDb.push({
          id, companyId, title, description, subjectId, teacherId, scheduledAt, durationMinutes,
          locationType, meetingLink, room, capacity, notes, branchId, classroomId, googleMapsUrl, status: 'SCHEDULED'
        });
        return 1;
      }
      if (sql.includes('INSERT INTO "education_groups"')) {
        const [id, companyId, name, subjectId, teacherId, capacity, notes, branchId, classroomId] = params;
        groupsDb.push({
          id, companyId, name, subjectId, teacherId, capacity, notes, branchId, classroomId
        });
        return 1;
      }
      return 1;
    },
    $queryRawUnsafe: async (sql, ...params) => {
      if (sql.includes('FROM "branches"') && sql.includes('WHERE id = $1')) {
        const b = branchesDb.find(x => x.id === params[0] && (!params[1] || x.companyId === params[1]));
        return b ? [b] : [];
      }
      if (sql.includes('FROM "branches"') && sql.includes('"companyId" = $1')) {
        return branchesDb.filter(x => x.companyId === params[0]);
      }
      if (sql.includes('FROM "education_demo_days"') && sql.includes('d.id = $1')) {
        const d = demoDaysDb.find(x => x.id === params[0]);
        if (!d) return [];
        const b = branchesDb.find(x => x.id === d.branchId);
        return [{
          ...d,
          companyName: 'CodeTreps Academy',
          subjectName: 'Python Pro',
          branchName: b?.name || null,
          branchAddress: b?.address || null,
          branchCity: b?.city || null,
          branchPhone: b?.phone || null,
          branchGoogleMapsUrl: d.googleMapsUrl || b?.googleMapsUrl || null
        }];
      }
      if (sql.includes('FROM "education_demo_days" d')) {
        return demoDaysDb.map(d => {
          const b = branchesDb.find(x => x.id === d.branchId);
          return {
            ...d,
            subjectName: 'Scratch Kids',
            teacherName: 'Eng. Ahmed',
            totalAttendees: 0,
            attendedCount: 0,
            convertedCount: 0,
            branchName: b?.name || null,
            branchAddress: b?.address || null,
            branchCity: b?.city || null,
            branchPhone: b?.phone || null,
            branchGoogleMapsUrl: d.googleMapsUrl || b?.googleMapsUrl || null
          };
        });
      }
      if (sql.includes('FROM "education_groups"')) {
        return groupsDb.map(g => {
          const b = branchesDb.find(x => x.id === g.branchId);
          return {
            ...g,
            subjectName: 'AI Explorers',
            teacherName: 'Coach Mona',
            memberCount: 8,
            sessionCount: 4,
            branchName: b?.name || null
          };
        });
      }
      return [];
    },
    educationSubject: {
      findFirst: async () => ({ id: 'subj_ai_01', name: 'AI Explorers' })
    },
    educationTeacher: {
      findFirst: async () => ({ id: 'teacher_01', name: 'Coach Mona' })
    }
  };

  activePrismaGetter = () => mockPrisma;

  await t.test('1. Create education branch with classrooms and Google Maps link', async () => {
    const req = {
      user: { role: 'COMPANY_ADMIN', companyId: 'comp_codetreps_01' },
      body: {
        name: 'فرع فؤاد - محطة الرمل',
        address: '68 شارع فؤاد، الدور 3',
        city: 'الإسكندرية',
        phone: '01012345678',
        googleMapsUrl: 'https://maps.app.goo.gl/codetreps-fouad',
        workingHours: 'السبت - الخميس 10ص - 8م',
        classrooms: [
          { id: 'room_1', name: 'معمل البرمجة (Lab 1)', capacity: 12, type: 'LAB' },
          { id: 'room_2', name: 'قاعة الروبوتكس', capacity: 8, type: 'ROBOTICS' }
        ]
      }
    };
    let resJson = null;
    let resStatus = 200;
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resJson = data; return res; }
    };

    await branchController.createBranch(req, res);
    assert.strictEqual(resStatus, 201);
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.name, 'فرع فؤاد - محطة الرمل');
    assert.strictEqual(resJson.data.classrooms.length, 2);
    assert.strictEqual(resJson.data.totalCapacity, 20);
    assert.strictEqual(resJson.data.googleMapsUrl, 'https://maps.app.goo.gl/codetreps-fouad');
  });

  await t.test('2. Multi-tenant isolation for branches', async () => {
    // Branch for another company
    const reqOther = {
      user: { role: 'COMPANY_ADMIN', companyId: 'comp_other_company' },
      body: {
        name: 'فرع شركة أخرى',
        phone: '01111111111'
      }
    };
    const res = { status: () => res, json: () => {} };
    await branchController.createBranch(reqOther, res);

    // Query from CodeTreps
    const reqQuery = {
      user: { role: 'COMPANY_ADMIN', companyId: 'comp_codetreps_01' },
      query: {}
    };
    let queryResult = null;
    const resQuery = {
      status: () => resQuery,
      json: (data) => { queryResult = data; }
    };
    await branchController.getBranches(reqQuery, resQuery);
    assert.strictEqual(queryResult.success, true);
    assert.strictEqual(queryResult.data.length, 1);
    assert.strictEqual(queryResult.data[0].name, 'فرع فؤاد - محطة الرمل');
  });

  await t.test('3. Create Demo Day linked to branch and classroom with auto Google Maps', async () => {
    const branch = branchesDb.find(b => b.companyId === 'comp_codetreps_01');
    assert.ok(branch, 'Branch must exist');

    const req = {
      user: { role: 'COMPANY_ADMIN', companyId: 'comp_codetreps_01' },
      body: {
        title: 'ديمو داي تجربة البرمجة للأطفال',
        scheduledAt: '2026-11-20T16:00:00Z',
        durationMinutes: 90,
        locationType: 'OFFLINE',
        branchId: branch.id,
        classroomId: 'room_1',
        capacity: 12
      }
    };
    let resJson = null;
    let resStatus = 200;
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resJson = data; return res; }
    };

    await demoDayController.createDemoDay(req, res);
    assert.strictEqual(resStatus, 201);
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.branchId, branch.id);
    assert.strictEqual(resJson.data.googleMapsUrl, 'https://maps.app.goo.gl/codetreps-fouad');
  });

  await t.test('4. Public Demo Day output exposes branch details and Google Maps URL', async () => {
    const demo = demoDaysDb[0];
    assert.ok(demo, 'Demo day must exist');

    const req = { params: { id: demo.id } };
    let resJson = null;
    let resStatus = 200;
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resJson = data; return res; }
    };

    await demoDayController.getPublicDemoDay(req, res);
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.branchName, 'فرع فؤاد - محطة الرمل');
    assert.strictEqual(resJson.data.branchAddress, '68 شارع فؤاد، الدور 3');
    assert.strictEqual(resJson.data.branchGoogleMapsUrl, 'https://maps.app.goo.gl/codetreps-fouad');
    assert.strictEqual(resJson.data.branchPhone, '01012345678');
  });

  await t.test('5. Assign Education Group to branch and classroom', async () => {
    const branch = branchesDb.find(b => b.companyId === 'comp_codetreps_01');
    const req = {
      user: { role: 'COMPANY_ADMIN', companyId: 'comp_codetreps_01' },
      body: {
        name: 'جروب الذكاء الاصطناعي السبت',
        subjectId: 'subj_ai_01',
        teacherId: 'teacher_01',
        capacity: 10,
        branchId: branch.id,
        classroomId: 'room_1'
      }
    };
    let resJson = null;
    let resStatus = 200;
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resJson = data; return res; }
    };

    await groupsController.create(req, res);
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.branchId, branch.id);
    assert.strictEqual(resJson.data.classroomId, 'room_1');
  });
});
