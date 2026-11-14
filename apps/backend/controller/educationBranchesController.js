const sharedDatabase = require('../services/sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const {
  ensureTablesExist,
  generateBranchId,
  validateClassrooms,
  getCompanyBranches,
  getBranchById: getBranchByIdService
} = require('../services/educationBranchService');
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

// 1. Get all branches for company with parsed classrooms and summary stats
const getBranches = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const { status, search } = req.query;
    let branches = await getCompanyBranches(companyId, prisma);

    if (status === 'ACTIVE') {
      branches = branches.filter(b => b.isActive);
    } else if (status === 'INACTIVE') {
      branches = branches.filter(b => !b.isActive);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      branches = branches.filter(b => 
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.managerName && b.managerName.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error in getBranches:', error);
    res.status(500).json({ success: false, error: 'فشل جلب فروع وقاعات المنظومة التعليمية' });
  }
};

// 2. Get single branch by ID with usage counts
const getBranchById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const branch = await getBranchByIdService(id, companyId, prisma);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    // Optional usage counts (demo days & groups)
    let demoDaysCount = 0;
    let groupsCount = 0;
    try {
      const demoRes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS count FROM "education_demo_days" WHERE "branchId" = $1 AND "companyId" = $2
      `, id, companyId);
      demoDaysCount = Number(demoRes[0]?.count || 0);
    } catch (_) {}

    try {
      const groupRes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS count FROM "education_groups" WHERE "branchId" = $1 AND "companyId" = $2
      `, id, companyId);
      groupsCount = Number(groupRes[0]?.count || 0);
    } catch (_) {}

    res.json({
      success: true,
      data: {
        ...branch,
        demoDaysCount,
        groupsCount
      }
    });
  } catch (error) {
    console.error('Error in getBranchById:', error);
    res.status(500).json({ success: false, error: 'فشل جلب تفاصيل الفرع' });
  }
};

// 3. Create branch
const createBranch = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const {
      name,
      address,
      city,
      phone,
      email,
      workingHours,
      googleMapsUrl,
      managerName,
      managerPhone,
      classrooms,
      isActive
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    let parsedClassrooms = [];
    try {
      parsedClassrooms = validateClassrooms(classrooms || []);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const id = generateBranchId();
    const active = isActive !== undefined ? Boolean(isActive) : true;
    const phoneVal = phone ? String(phone).trim() : '';

    await prisma.$executeRawUnsafe(`
      INSERT INTO "branches" (
        "id", "companyId", "name", "address", "city", "phone", "email",
        "workingHours", "googleMapsUrl", "managerName", "managerPhone",
        "classrooms", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12::jsonb, $13, NOW(), NOW()
      )
    `,
      id,
      companyId,
      name.trim(),
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      phoneVal,
      email ? String(email).trim() : null,
      workingHours ? String(workingHours).trim() : null,
      googleMapsUrl ? String(googleMapsUrl).trim() : null,
      managerName ? String(managerName).trim() : null,
      managerPhone ? String(managerPhone).trim() : null,
      JSON.stringify(parsedClassrooms),
      active
    );

    await logEducationEvent({
      companyId,
      req,
      action: 'CREATE_BRANCH',
      entityType: 'BRANCH',
      entityId: id,
      targetName: name.trim()
    }).catch(() => {});

    const created = await getBranchByIdService(id, companyId, prisma);

    res.status(201).json({
      success: true,
      message: 'تم إضافة الفرع بنجاح',
      data: created
    });
  } catch (error) {
    console.error('Error in createBranch:', error);
    res.status(500).json({ success: false, error: 'فشل إضافة الفرع' });
  }
};

// 4. Update branch
const updateBranch = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const {
      name,
      address,
      city,
      phone,
      email,
      workingHours,
      googleMapsUrl,
      managerName,
      managerPhone,
      classrooms,
      isActive
    } = req.body;

    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const existingRows = await prisma.$queryRawUnsafe(`
      SELECT * FROM "branches" WHERE id = $1 AND "companyId" = $2
    `, id, companyId);

    if (!existingRows.length) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const current = existingRows[0];

    let finalClassroomsJson = current.classrooms ? (typeof current.classrooms === 'string' ? current.classrooms : JSON.stringify(current.classrooms)) : '[]';
    if (classrooms !== undefined) {
      try {
        const validated = validateClassrooms(classrooms);
        finalClassroomsJson = JSON.stringify(validated);
      } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
    }

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedAddress = address !== undefined ? (address ? String(address).trim() : null) : current.address;
    const updatedCity = city !== undefined ? (city ? String(city).trim() : null) : current.city;
    const updatedPhone = phone !== undefined ? (phone ? String(phone).trim() : '') : current.phone;
    const updatedEmail = email !== undefined ? (email ? String(email).trim() : null) : current.email;
    const updatedWorkingHours = workingHours !== undefined ? (workingHours ? String(workingHours).trim() : null) : current.workingHours;
    const updatedGoogleMapsUrl = googleMapsUrl !== undefined ? (googleMapsUrl ? String(googleMapsUrl).trim() : null) : current.googleMapsUrl;
    const updatedManagerName = managerName !== undefined ? (managerName ? String(managerName).trim() : null) : current.managerName;
    const updatedManagerPhone = managerPhone !== undefined ? (managerPhone ? String(managerPhone).trim() : null) : current.managerPhone;
    const updatedIsActive = isActive !== undefined ? Boolean(isActive) : current.isActive;

    await prisma.$executeRawUnsafe(`
      UPDATE "branches" SET
        "name" = $1,
        "address" = $2,
        "city" = $3,
        "phone" = $4,
        "email" = $5,
        "workingHours" = $6,
        "googleMapsUrl" = $7,
        "managerName" = $8,
        "managerPhone" = $9,
        "classrooms" = $10::jsonb,
        "isActive" = $11,
        "updatedAt" = NOW()
      WHERE id = $12 AND "companyId" = $13
    `,
      updatedName,
      updatedAddress,
      updatedCity,
      updatedPhone,
      updatedEmail,
      updatedWorkingHours,
      updatedGoogleMapsUrl,
      updatedManagerName,
      updatedManagerPhone,
      finalClassroomsJson,
      updatedIsActive,
      id,
      companyId
    );

    await logEducationEvent({
      companyId,
      req,
      action: 'UPDATE_BRANCH',
      entityType: 'BRANCH',
      entityId: id,
      targetName: updatedName
    }).catch(() => {});

    const updated = await getBranchByIdService(id, companyId, prisma);

    res.json({
      success: true,
      message: 'تم تحديث بيانات الفرع والقاعات بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('Error in updateBranch:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث الفرع' });
  }
};

// 5. Delete or Deactivate branch
const deleteBranch = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const existing = await prisma.$queryRawUnsafe(`
      SELECT id, name FROM "branches" WHERE id = $1 AND "companyId" = $2
    `, id, companyId);

    if (!existing.length) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const branchName = existing[0].name;

    // Check if branch is referenced in demo days or groups
    let demoCount = 0;
    let groupCount = 0;
    try {
      const demoDays = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS count FROM "education_demo_days" WHERE "branchId" = $1 AND "companyId" = $2
      `, id, companyId);
      demoCount = Number(demoDays[0]?.count || 0);
    } catch (_) {}

    try {
      const groups = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS count FROM "education_groups" WHERE "branchId" = $1 AND "companyId" = $2
      `, id, companyId);
      groupCount = Number(groups[0]?.count || 0);
    } catch (_) {}

    if (demoCount > 0 || groupCount > 0) {
      // Soft deactivate to protect relational integrity
      await prisma.$executeRawUnsafe(`
        UPDATE "branches" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1 AND "companyId" = $2
      `, id, companyId);

      await logEducationEvent({
        companyId,
        req,
        action: 'DEACTIVATE_BRANCH',
        entityType: 'BRANCH',
        entityId: id,
        targetName: branchName,
        details: { reason: 'Has related demo days or groups', demoCount, groupCount }
      }).catch(() => {});

      return res.json({
        success: true,
        message: 'تم إلغاء تفعيل الفرع تلقائياً لوجود فعاليات أو مجموعات تعليمية مرتبطة به',
        deactivated: true
      });
    }

    // Hard delete when unreferenced
    await prisma.$executeRawUnsafe(`
      DELETE FROM "branches" WHERE id = $1 AND "companyId" = $2
    `, id, companyId);

    await logEducationEvent({
      companyId,
      req,
      action: 'DELETE_BRANCH',
      entityType: 'BRANCH',
      entityId: id,
      targetName: branchName
    }).catch(() => {});

    res.json({
      success: true,
      message: 'تم حذف الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error in deleteBranch:', error);
    res.status(500).json({ success: false, error: 'فشل حذف الفرع' });
  }
};

// 6. Toggle Branch Active Status
const toggleBranchStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    await ensureTablesExist(prisma);

    const rows = await prisma.$queryRawUnsafe(`
      UPDATE "branches" 
      SET "isActive" = NOT "isActive", "updatedAt" = NOW()
      WHERE id = $1 AND "companyId" = $2
      RETURNING id, name, "isActive"
    `, id, companyId);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const updated = rows[0];

    await logEducationEvent({
      companyId,
      req,
      action: updated.isActive ? 'ACTIVATE_BRANCH' : 'DEACTIVATE_BRANCH',
      entityType: 'BRANCH',
      entityId: id,
      targetName: updated.name
    }).catch(() => {});

    res.json({
      success: true,
      message: `تم ${updated.isActive ? 'تفعيل' : 'إلغاء تفعيل'} الفرع بنجاح`,
      data: updated
    });
  } catch (error) {
    console.error('Error in toggleBranchStatus:', error);
    res.status(500).json({ success: false, error: 'فشل تغيير حالة الفرع' });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus
};
