const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.use(verifyToken.authenticateToken);

/**
 * @route GET /api/v1/team/members
 * @desc Get company team members (id, name, role, phone) for authorized users
 */
router.get('/members', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة غير متوفر',
        code: 'NO_COMPANY_ID'
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ],
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const members = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'عضو فريق',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role || 'MEMBER',
      phone: u.phone || '',
      email: u.email || '',
      avatar: u.avatar || null
    }));

    return res.status(200).json({
      success: true,
      data: members,
      members,
      count: members.length
    });
  } catch (error) {
    console.error('[TeamRoutes] GET /members error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب أعضاء فريق العمل'
    });
  }
});

// ============================================================================
// Shipping Employees CRUD & User Account Linking (SHIP-T5)
// ============================================================================

/**
 * @route POST /api/v1/team/employees
 * @desc Create a new shipping employee (unique employeeCode per company)
 */
router.post('/employees', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة غير متوفر',
        code: 'NO_COMPANY_ID'
      });
    }

    const {
      employeeCode,
      fullName,
      jobTitle,
      photoUrl,
      personalPhone,
      workPhone,
      hireDate,
      isActive = true,
      userId
    } = req.body;

    if (!employeeCode || !String(employeeCode).trim()) {
      return res.status(400).json({
        success: false,
        error: 'كود الموظف مطلوب',
        code: 'EMPLOYEE_CODE_REQUIRED'
      });
    }

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({
        success: false,
        error: 'اسم الموظف بالكامل مطلوب',
        code: 'FULL_NAME_REQUIRED'
      });
    }

    if (!jobTitle || !String(jobTitle).trim()) {
      return res.status(400).json({
        success: false,
        error: 'المسمى الوظيفي مطلوب',
        code: 'JOB_TITLE_REQUIRED'
      });
    }

    const cleanCode = String(employeeCode).trim().toUpperCase();

    // Check uniqueness per company -> 409 Conflict
    const existing = await prisma.shippingEmployee.findFirst({
      where: {
        companyId,
        employeeCode: cleanCode
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `كود الموظف ${cleanCode} مستخدم بالفعل في هذه الشركة`,
        code: 'DUPLICATE_EMPLOYEE_CODE'
      });
    }

    // Validate linked user if supplied
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: String(userId),
          OR: [
            { companyId },
            { userCompanies: { some: { companyId, isActive: true } } }
          ]
        }
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'حساب المستخدم المحدد غير موجود أو غير تابع للشركة',
          code: 'INVALID_USER_ID'
        });
      }
    }

    const employee = await prisma.shippingEmployee.create({
      data: {
        companyId,
        employeeCode: cleanCode,
        fullName: String(fullName).trim(),
        jobTitle: String(jobTitle).trim(),
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        personalPhone: personalPhone ? String(personalPhone).trim() : null,
        workPhone: workPhone ? String(workPhone).trim() : null,
        hireDate: hireDate ? new Date(hireDate) : null,
        isActive: Boolean(isActive),
        userId: userId ? String(userId) : null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      employee,
      data: employee
    });
  } catch (error) {
    console.error('[TeamRoutes] POST /employees error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء ملف الموظف'
    });
  }
});

/**
 * @route GET /api/v1/team/employees
 * @desc List shipping employees for the company
 */
router.get('/employees', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة غير متوفر',
        code: 'NO_COMPANY_ID'
      });
    }

    const { isActive, search } = req.query;
    const where = { companyId };

    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { jobTitle: { contains: q, mode: 'insensitive' } },
        { workPhone: { contains: q } },
        { personalPhone: { contains: q } },
      ];
    }

    const employees = await prisma.shippingEmployee.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { employeeCode: 'asc' }
      ]
    });

    return res.status(200).json({
      success: true,
      data: employees,
      employees,
      count: employees.length
    });
  } catch (error) {
    console.error('[TeamRoutes] GET /employees error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل جلب قائمة الموظفين'
    });
  }
});

/**
 * @route GET /api/v1/team/employees/:id
 * @desc Get single shipping employee details
 */
router.get('/employees/:id', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { id } = req.params;

    const employee = await prisma.shippingEmployee.findFirst({
      where: { id, companyId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      employee,
      data: employee
    });
  } catch (error) {
    console.error('[TeamRoutes] GET /employees/:id error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل جلب تفاصيل الموظف'
    });
  }
});

/**
 * @route PUT /api/v1/team/employees/:id
 * @desc Update shipping employee details
 */
router.put('/employees/:id', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { id } = req.params;

    const existing = await prisma.shippingEmployee.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const {
      employeeCode,
      fullName,
      jobTitle,
      photoUrl,
      personalPhone,
      workPhone,
      hireDate,
      isActive,
      userId
    } = req.body;

    const dataToUpdate = {};

    if (employeeCode) {
      const cleanCode = String(employeeCode).trim().toUpperCase();
      if (cleanCode !== existing.employeeCode) {
        const codeTaken = await prisma.shippingEmployee.findFirst({
          where: {
            companyId,
            employeeCode: cleanCode,
            id: { not: id }
          }
        });
        if (codeTaken) {
          return res.status(409).json({
            success: false,
            error: `كود الموظف ${cleanCode} مستخدم بالفعل لموظف آخر`,
            code: 'DUPLICATE_EMPLOYEE_CODE'
          });
        }
        dataToUpdate.employeeCode = cleanCode;
      }
    }

    if (fullName !== undefined) dataToUpdate.fullName = String(fullName).trim();
    if (jobTitle !== undefined) dataToUpdate.jobTitle = String(jobTitle).trim();
    if (photoUrl !== undefined) dataToUpdate.photoUrl = photoUrl ? String(photoUrl).trim() : null;
    if (personalPhone !== undefined) dataToUpdate.personalPhone = personalPhone ? String(personalPhone).trim() : null;
    if (workPhone !== undefined) dataToUpdate.workPhone = workPhone ? String(workPhone).trim() : null;
    if (hireDate !== undefined) dataToUpdate.hireDate = hireDate ? new Date(hireDate) : null;
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;
    if (userId !== undefined) dataToUpdate.userId = userId ? String(userId) : null;

    const updated = await prisma.shippingEmployee.update({
      where: { id },
      data: dataToUpdate
    });

    return res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      employee: updated,
      data: updated
    });
  } catch (error) {
    console.error('[TeamRoutes] PUT /employees/:id error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تحديث بيانات الموظف'
    });
  }
});

/**
 * @route DELETE /api/v1/team/employees/:id
 * @desc Delete or deactivate a shipping employee
 */
router.delete('/employees/:id', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { id } = req.params;

    const existing = await prisma.shippingEmployee.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    await prisma.shippingEmployee.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'تم حذف ملف الموظف بنجاح'
    });
  } catch (error) {
    console.error('[TeamRoutes] DELETE /employees/:id error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل حذف ملف الموظف'
    });
  }
});

/**
 * @route POST /api/v1/team/employees/:id/link
 * @desc Link employee record to a user login account
 */
router.post('/employees/:id/link', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'معرف حساب المستخدم مطلوب للربط',
        code: 'USER_ID_REQUIRED'
      });
    }

    const employee = await prisma.shippingEmployee.findFirst({
      where: { id, companyId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: String(userId),
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'حساب المستخدم المحدد غير موجود أو غير تابع للشركة',
        code: 'INVALID_USER_ID'
      });
    }

    const updated = await prisma.shippingEmployee.update({
      where: { id },
      data: { userId: String(userId) }
    });

    return res.status(200).json({
      success: true,
      message: 'تم ربط الموظف بحساب المستخدم بنجاح',
      employee: updated,
      data: updated
    });
  } catch (error) {
    console.error('[TeamRoutes] POST /employees/:id/link error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل ربط الموظف بحساب المستخدم'
    });
  }
});

/**
 * @route POST /api/v1/team/employees/:id/unlink
 * @desc Unlink employee record from user login account
 */
router.post('/employees/:id/unlink', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { id } = req.params;

    const employee = await prisma.shippingEmployee.findFirst({
      where: { id, companyId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const updated = await prisma.shippingEmployee.update({
      where: { id },
      data: { userId: null }
    });

    return res.status(200).json({
      success: true,
      message: 'تم إلغاء ربط الموظف بحساب المستخدم بنجاح',
      employee: updated,
      data: updated
    });
  } catch (error) {
    console.error('[TeamRoutes] POST /employees/:id/unlink error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل إلغاء ربط الموظف'
    });
  }
});

module.exports = router;
