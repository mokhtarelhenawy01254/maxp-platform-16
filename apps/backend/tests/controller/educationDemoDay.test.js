const test = require('node:test');
const assert = require('node:assert');
const sharedDb = require('../../services/sharedDatabase');
const originalGetSharedPrisma = sharedDb.getSharedPrismaClient;
let activePrismaGetter = originalGetSharedPrisma;
sharedDb.getSharedPrismaClient = () => activePrismaGetter();

const controller = require('../../controller/educationDemoDayController');

test('educationDemoDayController unit test suite', async (t) => {
  let demoDaysDb = [];
  let attendeesDb = [];
  let customersDb = [];
  let studentsDb = [];
  let enrollmentsDb = [];

  const mockPrisma = {
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX')) {
        return 1;
      }
      if (sql.includes('INSERT INTO "education_demo_days"')) {
        const [id, companyId, title, description, subjectId, teacherId, scheduledAt, durationMinutes, locationType, meetingLink, room, capacity, notes] = params;
        demoDaysDb.push({
          id, companyId, title, description, subjectId, teacherId, scheduledAt,
          durationMinutes, locationType, meetingLink, room, capacity, status: 'SCHEDULED', notes,
          createdAt: new Date(), updatedAt: new Date()
        });
        return 1;
      }
      if (sql.includes('INSERT INTO "education_demo_attendees"')) {
        const [id, companyId, demoDayId, customerId, studentName, guardianName, phone, phone2, email, age, grade, notes] = params;
        attendeesDb.push({
          id, companyId, demoDayId, customerId, studentName, guardianName, phone, phone2, email, age, grade,
          attendanceStatus: 'REGISTERED', conversionStatus: 'PENDING', notes,
          createdAt: new Date(), updatedAt: new Date()
        });
        return 1;
      }
      if (sql.includes('UPDATE "education_demo_attendees"')) {
        if (sql.includes("SET \n        \"attendanceStatus\" = 'ATTENDED'")) {
          const [studentId, customerId, attendeeId] = params;
          const a = attendeesDb.find(x => x.id === attendeeId);
          if (a) {
            a.attendanceStatus = 'ATTENDED';
            a.conversionStatus = 'CONVERTED';
            a.convertedStudentId = studentId;
            a.customerId = customerId;
          }
          return 1;
        }
        const [attendanceStatus, conversionStatus, notes, attendeeId, companyId] = params;
        const a = attendeesDb.find(x => x.id === attendeeId && x.companyId === companyId);
        if (a) {
          if (attendanceStatus) a.attendanceStatus = attendanceStatus;
          if (conversionStatus) a.conversionStatus = conversionStatus;
          if (notes) a.notes = notes;
        }
        return 1;
      }
      if (sql.includes('DELETE FROM "education_demo_attendees"')) {
        const [id, companyId] = params;
        attendeesDb = attendeesDb.filter(x => !(x.id === id && x.companyId === companyId));
        return 1;
      }
      return 1;
    },
    $queryRawUnsafe: async (sql, ...params) => {
      if (sql.includes('FROM "education_demo_days" d')) {
        const companyId = params[0];
        return demoDaysDb
          .filter(d => d.companyId === companyId)
          .map(d => ({
            ...d,
            subjectName: null,
            teacherName: null,
            totalAttendees: attendeesDb.filter(a => a.demoDayId === d.id && a.companyId === companyId).length,
            attendedCount: attendeesDb.filter(a => a.demoDayId === d.id && a.companyId === companyId && a.attendanceStatus === 'ATTENDED').length,
            convertedCount: attendeesDb.filter(a => a.demoDayId === d.id && a.companyId === companyId && a.conversionStatus === 'CONVERTED').length
          }));
      }
      if (sql.includes('SELECT * FROM "education_demo_attendees" WHERE "id" = $1')) {
        const [id, companyId] = params;
        return attendeesDb.filter(a => a.id === id && a.companyId === companyId);
      }
      return [];
    },
    customer: {
      findFirst: async ({ where }) => {
        return customersDb.find(c => c.companyId === where.companyId && (c.phone === where.OR[0].phone || c.phone === where.OR[1].phone)) || null;
      },
      create: async ({ data }) => {
        const newCust = { id: `cust_${customersDb.length + 1}`, ...data };
        customersDb.push(newCust);
        return newCust;
      },
      update: async ({ where, data }) => {
        const c = customersDb.find(x => x.id === where.id);
        if (c) Object.assign(c, data);
        return c;
      }
    },
    educationStudent: {
      create: async ({ data }) => {
        const s = { id: `stu_${studentsDb.length + 1}`, ...data };
        studentsDb.push(s);
        return s;
      }
    },
    educationPackage: {
      findFirst: async ({ where }) => ({ id: where.id, hoursCount: 12, price: 1500 })
    },
    educationEnrollment: {
      create: async ({ data }) => {
        const e = { id: `enr_${enrollmentsDb.length + 1}`, ...data };
        enrollmentsDb.push(e);
        return e;
      }
    },
    activityLog: {
      create: async () => ({ id: '1' })
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

  await t.test('createDemoDay and getAllDemoDays with attendee telemetry', async () => {
    const reqCreate = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-edu-1' },
      body: {
        title: 'يوم تعريفي لبرمجة الذكاء الاصطناعي للأطفال',
        description: 'جلسة ديمو تجريبية للطلاب الجدد',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 60,
        capacity: 25,
        locationType: 'ONLINE'
      }
    };
    const resCreate = createMockRes();
    await controller.createDemoDay(reqCreate, resCreate);
    const createData = resCreate.getData();
    assert.strictEqual(createData.success, true);
    assert.ok(createData.data.id);

    // List demo days
    const reqList = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-edu-1' },
      query: {}
    };
    const resList = createMockRes();
    await controller.getAllDemoDays(reqList, resList);
    const listData = resList.getData();
    assert.strictEqual(listData.success, true);
    assert.strictEqual(listData.data.length, 1);
    assert.strictEqual(listData.data[0].title, 'يوم تعريفي لبرمجة الذكاء الاصطناعي للأطفال');
    assert.strictEqual(listData.data[0].capacity, 25);
  });

  await t.test('registerAttendee creates Customer as CRM LEAD and links attendee', async () => {
    const demoId = demoDaysDb[0].id;
    const req = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-edu-1' },
      params: { id: demoId },
      body: {
        studentName: 'عمر المختار',
        guardianName: 'مختار الهنداوي',
        phone: '01012345678',
        email: 'mokhtar@example.com',
        age: 12,
        grade: 'الصف الأول الإعدادي',
        notes: 'مهتم بالروبوتيكس'
      }
    };
    const res = createMockRes();
    await controller.registerAttendee(req, res);
    const data = res.getData();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.customerId);

    // Verify Customer record created in CRM as LEAD
    const cust = customersDb.find(c => c.id === data.data.customerId);
    assert.ok(cust);
    assert.strictEqual(cust.status, 'LEAD');
    assert.strictEqual(cust.leadSource, 'OTHER');
    assert.strictEqual(cust.phone, '01012345678');
  });

  await t.test('convertAttendeeToStudent converts lead to enrolled student in one click', async () => {
    const attendee = attendeesDb[0];
    const req = {
      user: { id: 'u1', role: 'OWNER', companyId: 'comp-edu-1' },
      params: { attendeeId: attendee.id },
      body: {
        packageId: 'pkg-123',
        amountPaid: 1500
      }
    };
    const res = createMockRes();
    await controller.convertAttendeeToStudent(req, res);
    const data = res.getData();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.student);
    assert.strictEqual(data.data.student.firstName, 'عمر المختار');
    assert.strictEqual(attendee.attendanceStatus, 'ATTENDED');
    assert.strictEqual(attendee.conversionStatus, 'CONVERTED');

    // Customer status promoted to ACTIVE
    const cust = customersDb.find(c => c.id === attendee.customerId);
    assert.strictEqual(cust.status, 'ACTIVE');
    assert.strictEqual(cust.leadStage, 'CONVERTED');
  });

  await t.test('multi-tenant isolation: Company 2 cannot see Company 1 demo days', async () => {
    const reqList = {
      user: { id: 'u2', role: 'OWNER', companyId: 'comp-edu-2' },
      query: {}
    };
    const resList = createMockRes();
    await controller.getAllDemoDays(reqList, resList);
    const listData = resList.getData();
    assert.strictEqual(listData.success, true);
    assert.strictEqual(listData.data.length, 0); // Empty for company 2!
  });

  activePrismaGetter = originalGetSharedPrisma;
  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
