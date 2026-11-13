const sharedDatabase = require('../services/sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const {
  ensureTablesExist,
  generateDemoDayId,
  generateAttendeeId
} = require('../services/educationDemoDayService');
const { logEducationEvent } = require('../services/educationAuditService');

const DISALLOWED_ROLES = new Set(['SHIPPING_CLIENT', 'STUDENT', 'CUSTOMER', 'COURIER']);

const getCompanyId = (req) => {
  const userRole = String(req.user?.role || '').toUpperCase();
  if (DISALLOWED_ROLES.has(userRole)) return null;
  const headerCid = req.headers?.['x-company-id'] || req.headers?.['X-Company-Id'] || req.query?.companyId;
  if (headerCid) {
    if (userRole === 'SUPER_ADMIN') return String(headerCid).trim();
    if (req.user?.companyId === headerCid) return String(headerCid).trim();
    const hasCompany = Array.isArray(req.user?.userCompanies) && req.user.userCompanies.some(uc => uc.companyId === headerCid || uc.company?.id === headerCid);
    if (hasCompany) return String(headerCid).trim();
  }
  return req.user?.companyId || req.user?.effectiveCompanyId || req.user?.userCompanies?.[0]?.companyId || null;
};

// 1. Get all demo days with counts
const getAllDemoDays = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const { status, search } = req.query;

    let query = `
      SELECT 
        d.*,
        s.name AS "subjectName",
        t.name AS "teacherName",
        COALESCE(a.total_attendees, 0) AS "totalAttendees",
        COALESCE(a.attended_count, 0) AS "attendedCount",
        COALESCE(a.converted_count, 0) AS "convertedCount"
      FROM "education_demo_days" d
      LEFT JOIN "education_subjects" s ON s.id = d."subjectId" AND s."companyId" = d."companyId"
      LEFT JOIN "education_teachers" t ON t.id = d."teacherId" AND t."companyId" = d."companyId"
      LEFT JOIN (
        SELECT 
          "demoDayId",
          COUNT(*) AS total_attendees,
          COUNT(*) FILTER (WHERE "attendanceStatus" = 'ATTENDED') AS attended_count,
          COUNT(*) FILTER (WHERE "conversionStatus" = 'CONVERTED') AS converted_count
        FROM "education_demo_attendees"
        WHERE "companyId" = $1
        GROUP BY "demoDayId"
      ) a ON a."demoDayId" = d.id
      WHERE d."companyId" = $1
    `;

    const params = [companyId];

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (d.title ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY d."scheduledAt" DESC`;

    const demoDays = await prisma.$queryRawUnsafe(query, ...params);

    res.json({ success: true, data: demoDays });
  } catch (error) {
    console.error('Error in getAllDemoDays:', error);
    res.status(500).json({ success: false, error: 'فشل جلب فعاليات الديمو داي' });
  }
};

// 2. Get single demo day with its attendees
const getDemoDayById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const demoDays = await prisma.$queryRawUnsafe(`
      SELECT 
        d.*,
        s.name AS "subjectName",
        t.name AS "teacherName"
      FROM "education_demo_days" d
      LEFT JOIN "education_subjects" s ON s.id = d."subjectId" AND s."companyId" = d."companyId"
      LEFT JOIN "education_teachers" t ON t.id = d."teacherId" AND t."companyId" = d."companyId"
      WHERE d.id = $1 AND d."companyId" = $2
    `, id, companyId);

    if (!demoDays.length) {
      return res.status(404).json({ success: false, error: 'الفعالية غير موجودة' });
    }

    const attendees = await prisma.$queryRawUnsafe(`
      SELECT 
        a.*,
        c."leadStage",
        c."leadPriority"
      FROM "education_demo_attendees" a
      LEFT JOIN "Customer" c ON c.id = a."customerId"
      WHERE a."demoDayId" = $1 AND a."companyId" = $2
      ORDER BY a."createdAt" DESC
    `, id, companyId);

    res.json({
      success: true,
      data: {
        ...demoDays[0],
        attendees
      }
    });
  } catch (error) {
    console.error('Error in getDemoDayById:', error);
    res.status(500).json({ success: false, error: 'فشل جلب تفاصيل الديمو داي' });
  }
};

// 3. Create Demo Day
const createDemoDay = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const {
      title,
      description,
      subjectId,
      teacherId,
      scheduledAt,
      durationMinutes,
      locationType,
      meetingLink,
      room,
      capacity,
      notes
    } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, error: 'عنوان الفعالية وتاريخ الانعقاد مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const id = generateDemoDayId();
    const duration = parseInt(durationMinutes, 10) || 60;
    const cap = parseInt(capacity, 10) || 20;
    const loc = locationType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';
    const parsedDate = new Date(scheduledAt);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_demo_days" (
        "id", "companyId", "title", "description", "subjectId", "teacherId",
        "scheduledAt", "durationMinutes", "locationType", "meetingLink", "room",
        "capacity", "status", "notes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SCHEDULED', $13, NOW(), NOW()
      )
    `, id, companyId, title.trim(), description || null, subjectId || null, teacherId || null,
       parsedDate, duration, loc, meetingLink || null, room || null, cap, notes || null);

    await logEducationEvent({
      companyId,
      req,
      action: 'CREATE_DEMO_DAY',
      entityType: 'DEMO_DAY',
      entityId: id,
      targetName: title
    });

    res.status(201).json({ success: true, data: { id, title, scheduledAt: parsedDate } });
  } catch (error) {
    console.error('Error in createDemoDay:', error);
    res.status(500).json({ success: false, error: 'فشل إنشاء فعالية الديمو داي' });
  }
};

// 4. Update Demo Day
const updateDemoDay = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const {
      title,
      description,
      subjectId,
      teacherId,
      scheduledAt,
      durationMinutes,
      locationType,
      meetingLink,
      room,
      capacity,
      status,
      notes
    } = req.body;

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const duration = durationMinutes !== undefined ? parseInt(durationMinutes, 10) : 60;
    const cap = capacity !== undefined ? parseInt(capacity, 10) : 20;
    const loc = locationType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';

    await prisma.$executeRawUnsafe(`
      UPDATE "education_demo_days"
      SET 
        "title" = COALESCE($1, "title"),
        "description" = $2,
        "subjectId" = $3,
        "teacherId" = $4,
        "scheduledAt" = COALESCE($5, "scheduledAt"),
        "durationMinutes" = $6,
        "locationType" = $7,
        "meetingLink" = $8,
        "room" = $9,
        "capacity" = $10,
        "status" = COALESCE($11, "status"),
        "notes" = $12,
        "updatedAt" = NOW()
      WHERE "id" = $13 AND "companyId" = $14
    `, title || null, description || null, subjectId || null, teacherId || null,
       scheduledAt ? new Date(scheduledAt) : null, duration, loc, meetingLink || null,
       room || null, cap, status || null, notes || null, id, companyId);

    await logEducationEvent({
      companyId,
      req,
      action: 'UPDATE_DEMO_DAY',
      entityType: 'DEMO_DAY',
      entityId: id,
      targetName: title
    });

    res.json({ success: true, message: 'تم تحديث الفعالية بنجاح' });
  } catch (error) {
    console.error('Error in updateDemoDay:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث الفعالية' });
  }
};

// 5. Delete Demo Day
const deleteDemoDay = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    await prisma.$executeRawUnsafe(`DELETE FROM "education_demo_attendees" WHERE "demoDayId" = $1 AND "companyId" = $2`, id, companyId);
    await prisma.$executeRawUnsafe(`DELETE FROM "education_demo_days" WHERE "id" = $1 AND "companyId" = $2`, id, companyId);

    await logEducationEvent({
      companyId,
      req,
      action: 'DELETE_DEMO_DAY',
      entityType: 'DEMO_DAY',
      entityId: id
    });

    res.json({ success: true, message: 'تم حذف الفعالية بنجاح' });
  } catch (error) {
    console.error('Error in deleteDemoDay:', error);
    res.status(500).json({ success: false, error: 'فشل حذف الفعالية' });
  }
};

// 6. Register Attendee (creates or links Customer as CRM Lead)
const registerAttendee = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: demoDayId } = req.params;
    const { studentName, guardianName, phone, phone2, email, age, grade, notes } = req.body;

    if (!studentName || !phone) {
      return res.status(400).json({ success: false, error: 'اسم الطالب ورقم الهاتف مطلوبان' });
    }

    const cleanPhone = String(phone).replace(/[^\d+]/g, '').trim();
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    // Find or create Customer (CRM Lead)
    let customer = await prisma.customer.findFirst({
      where: {
        companyId,
        OR: [
          { phone: cleanPhone },
          { phone2: cleanPhone },
          { phoneNormalized: cleanPhone }
        ]
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId,
          firstName: guardianName ? guardianName.trim() : studentName.trim(),
          lastName: guardianName ? studentName.trim() : '',
          phone: cleanPhone,
          phone2: phone2 ? String(phone2).replace(/[^\d+]/g, '').trim() : null,
          email: email ? String(email).trim() : null,
          status: 'LEAD',
          leadStage: 'NEW_LEAD',
          leadSource: 'DEMO_DAY',
          notes: `سجل لحضور الديمو داي: ${notes || ''}`
        }
      });
    }

    const attendeeId = generateAttendeeId();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_demo_attendees" (
        "id", "companyId", "demoDayId", "customerId", "studentName", "guardianName",
        "phone", "phone2", "email", "age", "grade", "attendanceStatus",
        "conversionStatus", "notes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'REGISTERED', 'PENDING', $12, NOW(), NOW()
      )
    `, attendeeId, companyId, demoDayId, customer.id, studentName.trim(), guardianName ? guardianName.trim() : null,
       cleanPhone, phone2 ? String(phone2).replace(/[^\d+]/g, '').trim() : null,
       email ? String(email).trim() : null, age ? parseInt(age, 10) : null, grade || null, notes || null);

    await logEducationEvent({
      companyId,
      req,
      action: 'REGISTER_DEMO_ATTENDEE',
      entityType: 'DEMO_DAY',
      entityId: attendeeId,
      targetName: studentName
    });

    res.status(201).json({
      success: true,
      data: {
        id: attendeeId,
        studentName,
        customerId: customer.id
      }
    });
  } catch (error) {
    console.error('Error in registerAttendee:', error);
    res.status(500).json({ success: false, error: 'فشل تسجيل الحاضر' });
  }
};

// 7. Update Attendee Status (Attendance, Conversion, Notes)
const updateAttendeeStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { attendeeId } = req.params;
    const { attendanceStatus, conversionStatus, notes } = req.body;

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    await prisma.$executeRawUnsafe(`
      UPDATE "education_demo_attendees"
      SET 
        "attendanceStatus" = COALESCE($1, "attendanceStatus"),
        "conversionStatus" = COALESCE($2, "conversionStatus"),
        "notes" = COALESCE($3, "notes"),
        "updatedAt" = NOW()
      WHERE "id" = $4 AND "companyId" = $5
    `, attendanceStatus || null, conversionStatus || null, notes || null, attendeeId, companyId);

    await logEducationEvent({
      companyId,
      req,
      action: 'UPDATE_DEMO_ATTENDEE',
      entityType: 'DEMO_DAY',
      entityId: attendeeId,
      details: { attendanceStatus, conversionStatus }
    });

    res.json({ success: true, message: 'تم تحديث حالة الحاضر بنجاح' });
  } catch (error) {
    console.error('Error in updateAttendeeStatus:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث حالة الحاضر' });
  }
};

// 8. Convert Lead to Enrolled Student
const convertAttendeeToStudent = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { attendeeId } = req.params;
    const { packageId, teacherId, amountPaid } = req.body;

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM "education_demo_attendees" WHERE "id" = $1 AND "companyId" = $2
    `, attendeeId, companyId);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'الحاضر غير موجود' });
    }

    const attendee = rows[0];

    // Ensure customer exists
    let customerId = attendee.customerId;
    if (!customerId) {
      const cust = await prisma.customer.create({
        data: {
          companyId,
          firstName: attendee.guardianName || attendee.studentName,
          lastName: attendee.guardianName ? attendee.studentName : '',
          phone: attendee.phone,
          status: 'ACTIVE',
          leadStage: 'WON',
          notes: 'تم التحويل من ديمو داي'
        }
      });
      customerId = cust.id;
    } else {
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: 'ACTIVE', leadStage: 'WON' }
      }).catch(() => {});
    }

    // Create EducationStudent
    const student = await prisma.educationStudent.create({
      data: {
        companyId,
        customerId,
        firstName: attendee.studentName,
        lastName: attendee.guardianName || '',
        phone: attendee.phone,
        phone2: attendee.phone2,
        grade: attendee.grade,
        notes: `طالب محول من ديمو داي`
      }
    });

    // Optional package enrollment
    let enrollment = null;
    if (packageId) {
      const pkg = await prisma.educationPackage.findFirst({
        where: { id: packageId, companyId }
      });
      if (pkg) {
        enrollment = await prisma.educationEnrollment.create({
          data: {
            companyId,
            studentId: student.id,
            packageId: pkg.id,
            teacherId: teacherId || null,
            totalHours: pkg.hoursCount,
            remainingHours: pkg.hoursCount,
            amountPaid: parseFloat(amountPaid) || 0,
            paymentStatus: (parseFloat(amountPaid) || 0) >= pkg.price ? 'PAID' : 'PARTIAL'
          }
        });
      }
    }

    // Update attendee record
    await prisma.$executeRawUnsafe(`
      UPDATE "education_demo_attendees"
      SET 
        "attendanceStatus" = 'ATTENDED',
        "conversionStatus" = 'CONVERTED',
        "convertedStudentId" = $1,
        "customerId" = $2,
        "updatedAt" = NOW()
      WHERE "id" = $3
    `, student.id, customerId, attendeeId);

    await logEducationEvent({
      companyId,
      req,
      action: 'CONVERT_DEMO_LEAD',
      entityType: 'DEMO_DAY',
      entityId: attendeeId,
      targetName: attendee.studentName,
      details: { studentId: student.id, enrollmentId: enrollment?.id }
    });

    res.json({
      success: true,
      message: 'تم تحويل العميل المحتمل إلى طالب بنجاح',
      data: {
        student,
        enrollment
      }
    });
  } catch (error) {
    console.error('Error in convertAttendeeToStudent:', error);
    res.status(500).json({ success: false, error: 'فشل تحويل الحاضر إلى طالب' });
  }
};

// 9. Delete Attendee
const deleteAttendee = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { attendeeId } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_demo_attendees" WHERE "id" = $1 AND "companyId" = $2
    `, attendeeId, companyId);

    res.json({ success: true, message: 'تم حذف الحاضر بنجاح' });
  } catch (error) {
    console.error('Error in deleteAttendee:', error);
    res.status(500).json({ success: false, error: 'فشل حذف الحاضر' });
  }
};

// 10. Public view of a Demo Day
const getPublicDemoDay = async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const demoDays = await prisma.$queryRawUnsafe(`
      SELECT 
        d.id,
        d."companyId",
        d.title,
        d.description,
        d."scheduledAt",
        d."durationMinutes",
        d."locationType",
        d.room,
        d.capacity,
        d.status,
        c.name AS "companyName",
        s.name AS "subjectName"
      FROM "education_demo_days" d
      LEFT JOIN "Company" c ON c.id = d."companyId"
      LEFT JOIN "education_subjects" s ON s.id = d."subjectId" AND s."companyId" = d."companyId"
      WHERE d.id = $1 AND d.status != 'CANCELLED'
    `, id);

    if (!demoDays.length) {
      return res.status(404).json({ success: false, error: 'الفعالية غير متاحة' });
    }

    const event = demoDays[0];
    const counts = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total FROM "education_demo_attendees" WHERE "demoDayId" = $1
    `, id);

    const registered = parseInt(counts[0]?.total || 0, 10);
    const spotsLeft = Math.max(0, event.capacity - registered);

    res.json({
      success: true,
      data: {
        ...event,
        registeredCount: registered,
        spotsLeft,
        isFull: spotsLeft <= 0
      }
    });
  } catch (error) {
    console.error('Error in getPublicDemoDay:', error);
    res.status(500).json({ success: false, error: 'فشل جلب تفاصيل الفعالية' });
  }
};

// 11. Public registration from external form
const registerPublicAttendee = async (req, res) => {
  try {
    const { id: demoDayId } = req.params;
    const { studentName, guardianName, phone, phone2, email, age, grade, notes } = req.body;

    if (!studentName || !phone) {
      return res.status(400).json({ success: false, error: 'اسم الطالب ورقم الهاتف مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const events = await prisma.$queryRawUnsafe(`
      SELECT * FROM "education_demo_days" WHERE "id" = $1 AND "status" != 'CANCELLED'
    `, demoDayId);

    if (!events.length) {
      return res.status(404).json({ success: false, error: 'الفعالية غير متاحة' });
    }

    const event = events[0];
    const companyId = event.companyId;

    // Check capacity
    const counts = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total FROM "education_demo_attendees" WHERE "demoDayId" = $1
    `, demoDayId);
    if (parseInt(counts[0]?.total || 0, 10) >= event.capacity) {
      return res.status(400).json({ success: false, error: 'عذراً، اكتملت السعة القصوى لهذه الجلسة' });
    }

    const cleanPhone = String(phone).replace(/[^\d+]/g, '').trim();

    // CRM Lead
    let customer = await prisma.customer.findFirst({
      where: {
        companyId,
        OR: [{ phone: cleanPhone }, { phone2: cleanPhone }]
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId,
          firstName: guardianName ? guardianName.trim() : studentName.trim(),
          lastName: guardianName ? studentName.trim() : '',
          phone: cleanPhone,
          phone2: phone2 ? String(phone2).replace(/[^\d+]/g, '').trim() : null,
          email: email ? String(email).trim() : null,
          status: 'LEAD',
          leadStage: 'NEW_LEAD',
          leadSource: 'DEMO_DAY',
          notes: `تسجيل ذاتي عبر رابط الديمو داي: ${event.title}`
        }
      });
    }

    const attendeeId = generateAttendeeId();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_demo_attendees" (
        "id", "companyId", "demoDayId", "customerId", "studentName", "guardianName",
        "phone", "phone2", "email", "age", "grade", "attendanceStatus",
        "conversionStatus", "notes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'REGISTERED', 'PENDING', $12, NOW(), NOW()
      )
    `, attendeeId, companyId, demoDayId, customer.id, studentName.trim(), guardianName ? guardianName.trim() : null,
       cleanPhone, phone2 ? String(phone2).replace(/[^\d+]/g, '').trim() : null,
       email ? String(email).trim() : null, age ? parseInt(age, 10) : null, grade || null, notes || null);

    res.status(201).json({
      success: true,
      message: 'تم تأكيد تسجيلك في اليوم التجريبي بنجاح',
      data: {
        id: attendeeId,
        title: event.title,
        scheduledAt: event.scheduledAt
      }
    });
  } catch (error) {
    console.error('Error in registerPublicAttendee:', error);
    res.status(500).json({ success: false, error: 'فشل إتمام التسجيل' });
  }
};

module.exports = {
  getAllDemoDays,
  getDemoDayById,
  createDemoDay,
  updateDemoDay,
  deleteDemoDay,
  registerAttendee,
  updateAttendeeStatus,
  convertAttendeeToStudent,
  deleteAttendee,
  getPublicDemoDay,
  registerPublicAttendee
};
