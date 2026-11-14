const sharedDatabase = require('../services/sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const {
  ensureTablesExist,
  generateGroupId,
  generateMemberId,
  generateSessionId,
  generateAttId
} = require('../services/educationGroupsService');

let sendNotification = null;
try {
  sendNotification = require('../services/whatsapp/WhatsAppNotificationService').sendNotification;
} catch (e) {
  // Optional notification service
}

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

const getAll = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const { subjectId, teacherId, status, search } = req.query;

    let query = `
      SELECT 
        g.*,
        s.name AS "subjectName",
        t.name AS "teacherName",
        t.phone AS "teacherPhone",
        COALESCE(m.total_members, 0) AS "totalMembers",
        COALESCE(m.active_members, 0) AS "activeMembers",
        COALESCE(m.waiting_members, 0) AS "waitingMembers"
      FROM "education_groups" g
      LEFT JOIN "education_subjects" s ON s.id = g."subjectId" AND s."companyId" = g."companyId"
      LEFT JOIN "education_teachers" t ON t.id = g."teacherId" AND t."companyId" = g."companyId"
      LEFT JOIN (
        SELECT 
          "groupId",
          COUNT(*) AS total_members,
          COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_members,
          COUNT(*) FILTER (WHERE status = 'WAITING_LIST') AS waiting_members
        FROM "education_group_members"
        WHERE "companyId" = $1
        GROUP BY "groupId"
      ) m ON m."groupId" = g.id
      WHERE g."companyId" = $1
    `;

    const params = [companyId];
    let paramIndex = 2;

    if (subjectId) {
      query += ` AND g."subjectId" = $${paramIndex++}`;
      params.push(subjectId);
    }
    if (teacherId) {
      query += ` AND g."teacherId" = $${paramIndex++}`;
      params.push(teacherId);
    }
    if (status) {
      query += ` AND g."status" = $${paramIndex++}`;
      params.push(status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ` AND (g."name" ILIKE $${paramIndex} OR g."code" ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY g."createdAt" DESC`;

    const rawGroups = await prisma.$queryRawUnsafe(query, ...params);

    const groups = rawGroups.map(g => ({
      ...g,
      totalMembers: Number(g.totalMembers || 0),
      activeMembers: Number(g.activeMembers || 0),
      waitingMembers: Number(g.waitingMembers || 0),
      scheduleDays: typeof g.scheduleDays === 'string' ? JSON.parse(g.scheduleDays) : (g.scheduleDays || []),
      isFull: Number(g.activeMembers || 0) >= (g.capacity || 15)
    }));

    return res.json({ success: true, data: groups });
  } catch (err) {
    console.error('[EducationGroups] getAll error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const rawGroup = await prisma.$queryRawUnsafe(`
      SELECT 
        g.*,
        s.name AS "subjectName",
        t.name AS "teacherName",
        t.phone AS "teacherPhone"
      FROM "education_groups" g
      LEFT JOIN "education_subjects" s ON s.id = g."subjectId" AND s."companyId" = g."companyId"
      LEFT JOIN "education_teachers" t ON t.id = g."teacherId" AND t."companyId" = g."companyId"
      WHERE g.id = $1 AND g."companyId" = $2
    `, id, companyId);

    if (!rawGroup || rawGroup.length === 0) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const group = {
      ...rawGroup[0],
      scheduleDays: typeof rawGroup[0].scheduleDays === 'string' ? JSON.parse(rawGroup[0].scheduleDays) : (rawGroup[0].scheduleDays || [])
    };

    // Fetch members with student details
    const members = await prisma.$queryRawUnsafe(`
      SELECT 
        m.*,
        st."firstName" AS "studentFirstName",
        st."lastName" AS "studentLastName",
        st.code AS "studentCode",
        st.phone AS "studentPhone",
        c."firstName" AS "guardianFirstName",
        c."lastName" AS "guardianLastName",
        c.phone AS "guardianPhone"
      FROM "education_group_members" m
      INNER JOIN "education_students" st ON st.id = m."studentId" AND st."companyId" = m."companyId"
      LEFT JOIN "customers" c ON c.id = st."customerId" AND c."companyId" = m."companyId"
      WHERE m."groupId" = $1 AND m."companyId" = $2
      ORDER BY m."status" ASC, m."joinedAt" ASC
    `, id, companyId);

    // Fetch recent sessions
    const sessions = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') AS "presentCount",
        COUNT(a.id) FILTER (WHERE a.status = 'ABSENT') AS "absentCount",
        COUNT(a.id) AS "totalCount"
      FROM "education_group_sessions" s
      LEFT JOIN "education_group_attendance" a ON a."sessionId" = s.id AND a."companyId" = s."companyId"
      WHERE s."groupId" = $1 AND s."companyId" = $2
      GROUP BY s.id
      ORDER BY s."sessionDate" DESC
      LIMIT 20
    `, id, companyId);

    return res.json({
      success: true,
      data: {
        ...group,
        members: members.map(m => ({
          ...m,
          studentName: `${m.studentFirstName || ''} ${m.studentLastName || ''}`.trim(),
          guardianName: `${m.guardianFirstName || ''} ${m.guardianLastName || ''}`.trim()
        })),
        sessions: sessions.map(s => ({
          ...s,
          presentCount: Number(s.presentCount || 0),
          absentCount: Number(s.absentCount || 0),
          totalCount: Number(s.totalCount || 0)
        }))
      }
    });
  } catch (err) {
    console.error('[EducationGroups] getById error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const {
      name,
      code,
      subjectId,
      teacherId,
      level,
      capacity,
      feeType,
      feeAmount,
      teacherRateType,
      teacherRateValue,
      scheduleDays,
      startTime,
      endTime,
      room,
      status,
      startDate,
      endDate,
      notes,
      branchId,
      classroomId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'اسم المجموعة مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    // In Courses/Packages mode, subjectId might be omitted. Auto-resolve to default company subject.
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId) {
      let defaultSubject = await prisma.educationSubject.findFirst({
        where: { companyId, name: 'عام' }
      });
      if (!defaultSubject) {
        defaultSubject = await prisma.educationSubject.create({
          data: {
            companyId,
            name: 'عام',
            description: 'تصنيف عام للكورسات والمجموعات',
            color: '#6366f1',
            isActive: true
          }
        });
      }
      resolvedSubjectId = defaultSubject.id;
    } else {
      const validSubject = await prisma.educationSubject.findFirst({
        where: { id: subjectId, companyId }
      });
      if (!validSubject) {
        return res.status(400).json({ success: false, error: 'المادة المحددة غير صالحة أو غير تابعة لهذه الشركة' });
      }
    }

    if (teacherId) {
      const validTeacher = await prisma.educationTeacher.findFirst({
        where: { id: teacherId, companyId },
        select: { id: true }
      });
      if (!validTeacher) {
        return res.status(400).json({ success: false, error: 'المدرب المحدد غير صالح أو غير تابع لهذه الشركة' });
      }
    }

    const id = generateGroupId();
    const daysJson = JSON.stringify(Array.isArray(scheduleDays) ? scheduleDays : []);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_groups" (
        "id", "companyId", "name", "code", "subjectId", "teacherId", "level",
        "capacity", "feeType", "feeAmount", "teacherRateType", "teacherRateValue",
        "scheduleDays", "startTime", "endTime", "room", "status",
        "startDate", "endDate", "notes", "branchId", "classroomId", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13::jsonb, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, NOW(), NOW()
      )
    `,
      id,
      companyId,
      name.trim(),
      code ? code.trim() : null,
      resolvedSubjectId,
      teacherId || null,
      level || null,
      capacity ? parseInt(capacity, 10) : 15,
      feeType || 'MONTHLY',
      feeAmount ? parseFloat(feeAmount) : 0,
      teacherRateType || 'PERCENTAGE',
      teacherRateValue ? parseFloat(teacherRateValue) : 50,
      daysJson,
      startTime || '17:00',
      endTime || '18:30',
      room || null,
      status || 'OPEN',
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      notes || null,
      branchId ? String(branchId).trim() : null,
      classroomId ? String(classroomId).trim() : null
    );

    return res.json({ success: true, data: { id, branchId: branchId || null, classroomId: classroomId || null, message: 'تم إنشاء المجموعة بنجاح' } });
  } catch (err) {
    console.error('[EducationGroups] create error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const {
      name,
      code,
      subjectId,
      teacherId,
      level,
      capacity,
      feeType,
      feeAmount,
      teacherRateType,
      teacherRateValue,
      scheduleDays,
      startTime,
      endTime,
      room,
      status,
      startDate,
      endDate,
      notes,
      branchId,
      classroomId
    } = req.body;

    const daysJson = JSON.stringify(Array.isArray(scheduleDays) ? scheduleDays : []);

    if (subjectId) {
      const validSubject = await prisma.educationSubject.findFirst({
        where: { id: subjectId, companyId }
      });
      if (!validSubject) {
        return res.status(400).json({ success: false, error: 'المادة المحددة غير صالحة أو غير تابعة لهذه الشركة' });
      }
    }

    if (teacherId) {
      const validTeacher = await prisma.educationTeacher.findFirst({
        where: { id: teacherId, companyId },
        select: { id: true }
      });
      if (!validTeacher) {
        return res.status(400).json({ success: false, error: 'المدرب المحدد غير صالح أو غير تابع لهذه الشركة' });
      }
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "education_groups" SET
        "name" = COALESCE($1, "name"),
        "code" = $2,
        "subjectId" = COALESCE($3, "subjectId"),
        "teacherId" = $4,
        "level" = $5,
        "capacity" = COALESCE($6, "capacity"),
        "feeType" = COALESCE($7, "feeType"),
        "feeAmount" = COALESCE($8, "feeAmount"),
        "teacherRateType" = COALESCE($9, "teacherRateType"),
        "teacherRateValue" = COALESCE($10, "teacherRateValue"),
        "scheduleDays" = $11::jsonb,
        "startTime" = COALESCE($12, "startTime"),
        "endTime" = COALESCE($13, "endTime"),
        "room" = $14,
        "status" = COALESCE($15, "status"),
        "startDate" = $16,
        "endDate" = $17,
        "notes" = $18,
        "updatedAt" = NOW()
      WHERE "id" = $19 AND "companyId" = $20
    `,
      name ? name.trim() : null,
      code ? code.trim() : null,
      subjectId || null,
      teacherId || null,
      level || null,
      capacity !== undefined ? parseInt(capacity, 10) : null,
      feeType || null,
      feeAmount !== undefined ? parseFloat(feeAmount) : null,
      teacherRateType || null,
      teacherRateValue !== undefined ? parseFloat(teacherRateValue) : null,
      daysJson,
      startTime || null,
      endTime || null,
      room || null,
      status || null,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      notes || null,
      id,
      companyId
    );

    return res.json({ success: true, message: 'تم تحديث المجموعة بنجاح' });
  } catch (err) {
    console.error('[EducationGroups] update error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_group_attendance" WHERE "groupId" = $1 AND "companyId" = $2
    `, id, companyId);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_group_sessions" WHERE "groupId" = $1 AND "companyId" = $2
    `, id, companyId);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_group_members" WHERE "groupId" = $1 AND "companyId" = $2
    `, id, companyId);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_groups" WHERE "id" = $1 AND "companyId" = $2
    `, id, companyId);

    return res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  } catch (err) {
    console.error('[EducationGroups] remove error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Member management
const addMember = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: groupId } = req.params;
    const { studentId, paymentStatus, amountPaid, notes, forceActive } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'معرف الطالب مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    // Verify student belongs to this tenant
    const validStudent = await prisma.educationStudent.findFirst({
      where: { id: studentId, companyId },
      select: { id: true }
    });
    if (!validStudent) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود أو غير تابع لهذه الشركة' });
    }

    // Check if group exists and check capacity
    const groupRows = await prisma.$queryRawUnsafe(`
      SELECT g.id, g.capacity, COALESCE(COUNT(m.id) FILTER (WHERE m.status = 'ACTIVE'), 0) AS active_count
      FROM "education_groups" g
      LEFT JOIN "education_group_members" m ON m."groupId" = g.id AND m."companyId" = g."companyId"
      WHERE g.id = $1 AND g."companyId" = $2
      GROUP BY g.id, g.capacity
    `, groupId, companyId);

    if (!groupRows || groupRows.length === 0) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const group = groupRows[0];
    const isFull = Number(group.active_count) >= Number(group.capacity);
    const memberStatus = (isFull && !forceActive) ? 'WAITING_LIST' : 'ACTIVE';

    // Check duplicate enrollment (only if currently active or waiting)
    const existing = await prisma.$queryRawUnsafe(`
      SELECT id, status FROM "education_group_members"
      WHERE "groupId" = $1 AND "studentId" = $2 AND "companyId" = $3 AND "status" IN ('ACTIVE', 'WAITING_LIST')
    `, groupId, studentId, companyId);

    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, error: 'الطالب مسجل بالفعل في هذه المجموعة' });
    }

    const memberId = generateMemberId();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_group_members" (
        "id", "companyId", "groupId", "studentId", "status", "paymentStatus", "amountPaid", "notes", "joinedAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
    `,
      memberId,
      companyId,
      groupId,
      studentId,
      memberStatus,
      paymentStatus || 'PAID',
      amountPaid ? parseFloat(amountPaid) : 0,
      notes || null
    );

    if (isFull) {
      await prisma.$executeRawUnsafe(`
        UPDATE "education_groups" SET "status" = 'FULL' WHERE "id" = $1 AND "companyId" = $2 AND "status" = 'OPEN'
      `, groupId, companyId);
    }

    return res.json({
      success: true,
      data: {
        memberId,
        status: memberStatus,
        message: memberStatus === 'WAITING_LIST'
          ? 'تم إضافة الطالب في قائمة الانتظار لاكتمال العدد'
          : 'تم تسجيل الطالب في المجموعة بنجاح'
      }
    });
  } catch (err) {
    console.error('[EducationGroups] addMember error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: groupId, studentId } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "education_group_members"
      WHERE "groupId" = $1 AND "studentId" = $2 AND "companyId" = $3
    `, groupId, studentId, companyId);

    // Auto-promote oldest waiting student if available
    const waitingStudent = await prisma.$queryRawUnsafe(`
      SELECT id FROM "education_group_members"
      WHERE "groupId" = $1 AND "companyId" = $2 AND "status" = 'WAITING_LIST'
      ORDER BY "joinedAt" ASC
      LIMIT 1
    `, groupId, companyId);

    if (waitingStudent && waitingStudent.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "education_group_members" SET
          "status" = 'ACTIVE',
          "updatedAt" = NOW()
        WHERE "id" = $1 AND "companyId" = $2
      `, waitingStudent[0].id, companyId);
    } else {
      await prisma.$executeRawUnsafe(`
        UPDATE "education_groups" SET "status" = 'OPEN' WHERE "id" = $1 AND "companyId" = $2 AND "status" = 'FULL'
      `, groupId, companyId);
    }

    return res.json({ success: true, message: 'تم إزالة الطالب من المجموعة' });
  } catch (err) {
    console.error('[EducationGroups] removeMember error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const transferMember = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: fromGroupId } = req.params;
    const { studentId, targetGroupId } = req.body;

    if (!studentId || !targetGroupId) {
      return res.status(400).json({ success: false, error: 'معرف الطالب والمجموعة المستهدفة مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    // Fetch previous payment details (and verify membership in source group for this tenant)
    const oldMember = await prisma.$queryRawUnsafe(`
      SELECT "paymentStatus", "amountPaid" FROM "education_group_members"
      WHERE "groupId" = $1 AND "studentId" = $2 AND "companyId" = $3 AND "status" IN ('ACTIVE', 'WAITING_LIST')
      ORDER BY "joinedAt" DESC LIMIT 1
    `, fromGroupId, studentId, companyId);
    if (!oldMember || oldMember.length === 0) {
      return res.status(404).json({ success: false, error: 'الطالب غير مسجل في المجموعة الأصلية' });
    }
    const prevPaymentStatus = oldMember[0].paymentStatus || 'PAID';
    const prevAmountPaid = oldMember[0].amountPaid || 0;

    // Update old membership to TRANSFERRED
    await prisma.$executeRawUnsafe(`
      UPDATE "education_group_members" SET
        "status" = 'TRANSFERRED',
        "updatedAt" = NOW()
      WHERE "groupId" = $1 AND "studentId" = $2 AND "companyId" = $3
    `, fromGroupId, studentId, companyId);

    // Auto-promote oldest waiting student from original group if available
    const waitingStudent = await prisma.$queryRawUnsafe(`
      SELECT id FROM "education_group_members"
      WHERE "groupId" = $1 AND "companyId" = $2 AND "status" = 'WAITING_LIST'
      ORDER BY "joinedAt" ASC
      LIMIT 1
    `, fromGroupId, companyId);

    if (waitingStudent && waitingStudent.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "education_group_members" SET
          "status" = 'ACTIVE',
          "updatedAt" = NOW()
        WHERE "id" = $1 AND "companyId" = $2
      `, waitingStudent[0].id, companyId);
    }

    // Check target group exists in same tenant and check capacity
    const targetGroupRows = await prisma.$queryRawUnsafe(`
      SELECT g.id, g.capacity, COALESCE(COUNT(m.id) FILTER (WHERE m.status = 'ACTIVE'), 0) AS active_count
      FROM "education_groups" g
      LEFT JOIN "education_group_members" m ON m."groupId" = g.id AND m."companyId" = g."companyId"
      WHERE g.id = $1 AND g."companyId" = $2
      GROUP BY g.id, g.capacity
    `, targetGroupId, companyId);

    if (!targetGroupRows || targetGroupRows.length === 0) {
      return res.status(404).json({ success: false, error: 'المجموعة المستهدفة غير موجودة' });
    }

    const isTargetFull = Number(targetGroupRows[0].active_count) >= Number(targetGroupRows[0].capacity);
    const targetStatus = isTargetFull ? 'WAITING_LIST' : 'ACTIVE';

    // Add into target group with carried over payment
    const newMemberId = generateMemberId();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_group_members" (
        "id", "companyId", "groupId", "studentId", "status", "paymentStatus", "amountPaid", "notes", "joinedAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
    `,
      newMemberId,
      companyId,
      targetGroupId,
      studentId,
      targetStatus,
      prevPaymentStatus,
      prevAmountPaid,
      `تم النقل من المجموعة: ${fromGroupId}`
    );

    return res.json({
      success: true,
      message: targetStatus === 'WAITING_LIST'
        ? 'تم نقل الطالب إلى قائمة الانتظار بالمجموعة الجديدة لاكتمال عددها'
        : 'تم نقل الطالب إلى المجموعة الجديدة بنجاح'
    });
  } catch (err) {
    console.error('[EducationGroups] transferMember error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Sessions & Attendance
const recordSession = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: groupId } = req.params;
    const {
      sessionDate,
      teacherId,
      topic,
      homework,
      notes,
      attendanceList, // [{ studentId, status: 'PRESENT' | 'ABSENT' | 'EXCUSED', notes }]
      notifyAbsentWhatsApp
    } = req.body;

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    // Verify group belongs to this tenant before recording session
    const groupCheck = await prisma.$queryRawUnsafe(`
      SELECT id FROM "education_groups" WHERE id = $1 AND "companyId" = $2 LIMIT 1
    `, groupId, companyId);
    if (!groupCheck || groupCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const sessionId = generateSessionId();
    const date = sessionDate ? new Date(sessionDate) : new Date();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "education_group_sessions" (
        "id", "companyId", "groupId", "teacherId", "sessionDate", "topic", "homework", "status", "notes", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'COMPLETED', $8, NOW()
      )
    `,
      sessionId,
      companyId,
      groupId,
      teacherId || null,
      date,
      topic || null,
      homework || null,
      notes || null
    );

    // Insert attendance records (tenant-verified students only)
    if (Array.isArray(attendanceList) && attendanceList.length > 0) {
      const requestedStudentIds = Array.from(
        new Set(attendanceList.map(it => it && it.studentId).filter(Boolean))
      );
      const tenantStudents = requestedStudentIds.length > 0
        ? await prisma.educationStudent.findMany({
            where: { id: { in: requestedStudentIds }, companyId },
            include: { customer: true }
          })
        : [];
      const studentMap = new Map(tenantStudents.map(st => [st.id, st]));

      for (const item of attendanceList) {
        if (!item || !item.studentId || !studentMap.has(item.studentId)) {
          continue;
        }
        const attId = generateAttId();
        let notifiedAt = null;

        // Notify absent parent if requested
        if (notifyAbsentWhatsApp && item.status === 'ABSENT' && sendNotification) {
          try {
            const st = studentMap.get(item.studentId);
            const phone = st?.customer?.phone || st?.phone;
            if (phone) {
              const studentName = `${st.firstName || ''} ${st.lastName || ''}`.trim();
              const parentName = st.customer?.firstName || 'ولي الأمر';
              const msg = `نحيط سيادتكم علماً بأن الطالب/ة (${studentName}) تغيب اليوم عن حضور موعد مجموعته الدراسية.`;
              await sendNotification({
                companyId,
                recipientPhone: phone,
                recipientName: parentName,
                recipientType: 'CUSTOMER',
                category: 'EDUCATION',
                eventType: 'EDUCATION_ABSENCE_ALERT',
                contentOverride: msg,
                priority: 3
              }).catch(waErr => console.error('[EducationGroups] Send absence alert error:', waErr.message));
              notifiedAt = new Date();
            }
          } catch (notifErr) {
            console.error('[EducationGroups] Absence notification failed:', notifErr.message);
          }
        }

        await prisma.$executeRawUnsafe(`
          INSERT INTO "education_group_attendance" (
            "id", "companyId", "sessionId", "groupId", "studentId", "status", "notes", "notifiedParentAt", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW()
          )
        `,
          attId,
          companyId,
          sessionId,
          groupId,
          item.studentId,
          item.status || 'PRESENT',
          item.notes || null,
          notifiedAt
        );
      }
    }

    return res.json({
      success: true,
      data: {
        sessionId,
        message: 'تم تسجيل المحاضرة وتوثيق الحضور والغياب بنجاح'
      }
    });
  } catch (err) {
    console.error('[EducationGroups] recordSession error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getFinancials = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id: groupId } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const groupRows = await prisma.$queryRawUnsafe(`
      SELECT * FROM "education_groups" WHERE "id" = $1 AND "companyId" = $2
    `, groupId, companyId);

    if (!groupRows || groupRows.length === 0) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }
    const group = groupRows[0];

    // Total collections
    const revenueRows = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(id) AS total_students,
        COUNT(id) FILTER (WHERE "paymentStatus" = 'PAID') AS paid_count,
        COALESCE(SUM("amountPaid"), 0) AS total_collected
      FROM "education_group_members"
      WHERE "groupId" = $1 AND "companyId" = $2 AND "status" = 'ACTIVE'
    `, groupId, companyId);

    const totalStudents = Number(revenueRows[0]?.total_students || 0);
    const paidCount = Number(revenueRows[0]?.paid_count || 0);
    const totalCollected = parseFloat(revenueRows[0]?.total_collected || 0);

    // Total completed sessions
    const sessionRows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(id) AS session_count
      FROM "education_group_sessions"
      WHERE "groupId" = $1 AND "companyId" = $2 AND "status" = 'COMPLETED'
    `, groupId, companyId);
    const sessionCount = Number(sessionRows[0]?.session_count || 0);

    // Calculate teacher share
    let teacherShare = 0;
    if (group.teacherRateType === 'PERCENTAGE') {
      teacherShare = (totalCollected * (group.teacherRateValue || 50)) / 100;
    } else if (group.teacherRateType === 'FIXED_PER_SESSION') {
      teacherShare = (group.teacherRateValue || 0) * sessionCount;
    } else if (group.teacherRateType === 'PER_STUDENT') {
      teacherShare = (group.teacherRateValue || 0) * totalStudents;
    }

    teacherShare = Math.round(teacherShare * 100) / 100;
    const centerProfit = Math.round((totalCollected - teacherShare) * 100) / 100;

    return res.json({
      success: true,
      data: {
        groupId,
        groupName: group.name,
        feeType: group.feeType,
        feeAmount: group.feeAmount,
        totalStudents,
        paidCount,
        totalCollected,
        sessionCount,
        teacherRateType: group.teacherRateType,
        teacherRateValue: group.teacherRateValue,
        teacherShare,
        centerProfit
      }
    });
  } catch (err) {
    console.error('[EducationGroups] getFinancials error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addMember,
  removeMember,
  transferMember,
  recordSession,
  getFinancials
};
