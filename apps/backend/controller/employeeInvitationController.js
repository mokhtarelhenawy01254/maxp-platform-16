/**
 * 👥 Employee Invitation Controller
 * إدارة وإنشاء روابط دعوة الموظفين والانضمام الذاتي (Employee Self-Onboarding)
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * إنشاء رابط دعوة جديد لموظف (Admin)
 * POST /api/v1/hr/employee-invitations
 */
const createEmployeeInvitation = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId || req.params?.companyId;
    const invitedBy = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرّف الشركة مطلوب'
      });
    }

    const {
      role = 'AGENT',
      departmentId,
      positionId,
      contractType = 'FULL_TIME',
      email,
      phone,
      expiryDays = 7,
      baseSalary,
      notes
    } = req.body;

    // التحقق من وجود القسم والمنصب إن وُجدا والتأكد من انتمائهما لنفس الشركة
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId }
      });
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'القسم المحدد غير موجود أو غير تابع لهذه الشركة'
        });
      }
    }

    if (positionId) {
      const pos = await prisma.position.findFirst({
        where: { id: positionId, companyId }
      });
      if (!pos) {
        return res.status(400).json({
          success: false,
          message: 'المسمى الوظيفي المحدد غير موجود أو غير تابع لهذه الشركة'
        });
      }
    }

    // إذا تم تحديد إيميل، التحقق من عدم وجود مستخدم أو موظف نشط بالفعل بنفس الإيميل داخل الشركة
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    if (normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          userCompanies: {
            where: { companyId }
          }
        }
      });

      if (existingUser && existingUser.userCompanies.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'هذا المستخدم موجود بالفعل كعضو في شركتك'
        });
      }

      // التحقق من عدم وجود دعوة معلقة سارية المفعول لنفس الإيميل
      const existingPending = await prisma.employeeInvitation.findFirst({
        where: {
          companyId,
          email: normalizedEmail,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });

      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: 'توجد دعوة معلقة سارية بالفعل لهذا البريد الإلكتروني'
        });
      }
    }

    // توليد رمز أمان فريد مشفر
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    const days = parseInt(expiryDays, 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    // تجهيز الميتاداتا
    const metadataObj = {};
    if (baseSalary) metadataObj.baseSalary = baseSalary;
    if (notes) metadataObj.notes = notes;

    const invitation = await prisma.employeeInvitation.create({
      data: {
        companyId,
        token,
        role: role || 'AGENT',
        departmentId: departmentId || null,
        positionId: positionId || null,
        contractType: contractType || 'FULL_TIME',
        email: normalizedEmail || null,
        phone: phone ? phone.trim() : null,
        invitedBy,
        status: 'PENDING',
        expiresAt,
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null
      },
      include: {
        department: { select: { id: true, name: true, color: true } },
        position: { select: { id: true, title: true } },
        inviter: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true, logo: true } }
      }
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://maxp.online';
    const invitationLink = `${frontendBaseUrl}/auth/join-employee?token=${token}`;

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء رابط دعوة الموظف بنجاح',
      data: {
        invitation,
        invitationLink,
        token,
        expiresAt
      }
    });
  } catch (error) {
    console.error('❌ [createEmployeeInvitation] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إنشاء رابط الدعوة',
      error: error.message
    });
  }
};

/**
 * جلب قائمة دعوات الموظفين للشركة (Admin)
 * GET /api/v1/hr/employee-invitations
 */
const listEmployeeInvitations = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId || req.params?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرّف الشركة مطلوب'
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = { companyId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      prisma.employeeInvitation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, color: true } },
          position: { select: { id: true, title: true } },
          inviter: { select: { id: true, firstName: true, lastName: true } }
        }
      }),
      prisma.employeeInvitation.count({ where })
    ]);

    // تحديث صلاحية الروابط المنتهية تلقائياً
    const now = new Date();
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://maxp.online';

    const formattedInvitations = invitations.map(inv => {
      const isExpired = inv.status === 'PENDING' && new Date(inv.expiresAt) < now;
      const currentStatus = isExpired ? 'EXPIRED' : inv.status;
      return {
        ...inv,
        status: currentStatus,
        invitationLink: `${frontendBaseUrl}/auth/join-employee?token=${inv.token}`
      };
    });

    return res.json({
      success: true,
      data: {
        invitations: formattedInvitations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('❌ [listEmployeeInvitations] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب قائمة الدعوات',
      error: error.message
    });
  }
};

/**
 * إلغاء رابط دعوة موظف (Admin)
 * DELETE /api/v1/hr/employee-invitations/:id
 */
const revokeEmployeeInvitation = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId || req.params?.companyId;
    const { id } = req.params;

    const invitation = await prisma.employeeInvitation.findFirst({
      where: { id, companyId }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'رابط الدعوة غير موجود'
      });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء دعوة تم قبولها وتسجيل الموظف بها بالفعل'
      });
    }

    await prisma.employeeInvitation.update({
      where: { id },
      data: { status: 'REVOKED' }
    });

    return res.json({
      success: true,
      message: 'تم إلغاء رابط الدعوة بنجاح'
    });
  } catch (error) {
    console.error('❌ [revokeEmployeeInvitation] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إلغاء رابط الدعوة',
      error: error.message
    });
  }
};

/**
 * التحقق من صلاحية رابط الدعوة للمرشح (Public)
 * GET /api/v1/hr/employee-invitations/verify/:token
 */
const verifyEmployeeInvitation = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'رمز الدعوة مطلوب'
      });
    }

    const invitation = await prisma.employeeInvitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        position: {
          select: {
            id: true,
            title: true
          }
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'رابط الدعوة غير صحيح أو غير موجود'
      });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'هذا الرابط تم استخدامه بالفعل لإتمام تسجيل موظف'
      });
    }

    if (invitation.status === 'REVOKED') {
      return res.status(400).json({
        success: false,
        message: 'تم إلغاء رابط الدعوة هذا من قِبل إدارة الشركة'
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      if (invitation.status === 'PENDING') {
        await prisma.employeeInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' }
        });
      }
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية رابط الدعوة هذا. يرجى التواصل مع إدارة الشركة للحصول على رابط جديد.'
      });
    }

    return res.json({
      success: true,
      message: 'رابط الدعوة صالح',
      data: {
        invitation: {
          id: invitation.id,
          companyName: invitation.company?.name || 'الشركة',
          companyLogo: invitation.company?.logo || null,
          departmentName: invitation.department?.name || null,
          positionTitle: invitation.position?.title || null,
          role: invitation.role,
          contractType: invitation.contractType,
          prefilledEmail: invitation.email,
          prefilledPhone: invitation.phone,
          inviterName: invitation.inviter
            ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
            : null,
          expiresAt: invitation.expiresAt
        }
      }
    });
  } catch (error) {
    console.error('❌ [verifyEmployeeInvitation] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في التحقق من رابط الدعوة',
      error: error.message
    });
  }
};

/**
 * قبول الدعوة وتسجيل الموظف ذاتياً (Public)
 * POST /api/v1/hr/employee-invitations/accept/:token
 */
const acceptEmployeeInvitation = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { token } = req.params;

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      mobile,
      nationalId,
      dateOfBirth,
      gender,
      address,
      city,
      country = 'Egypt',
      emergencyContact
    } = req.body;

    // التحقق من الحقول الإجبارية
    if (!token) {
      return res.status(400).json({ success: false, message: 'رمز الدعوة مطلوب' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب وصحيح' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return res.status(400).json({ success: false, message: 'الاسم الأول واسم العائلة مطلوبان' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // جلب وفحص الدعوة
    const invitation = await prisma.employeeInvitation.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'رابط الدعوة غير صحيح أو منتهي' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: invitation.status === 'ACCEPTED'
          ? 'تم استخدام هذا الرابط للتسجيل مسبقاً'
          : 'هذا الرابط غير صالح أو تم إلغاؤه'
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.employeeInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ success: false, message: 'انتهت صلاحية هذا الرابط' });
    }

    // إذا كانت الدعوة مقيدة بإيميل محدد، يجب تطابق الإيميل
    if (invitation.email && invitation.email.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: `هذا الرابط مخصص حصرياً للبريد الإلكتروني (${invitation.email})`
      });
    }

    // التحقق من عدم وجود المستخدم في نفس الشركة
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userCompanies: {
          where: { companyId: invitation.companyId }
        }
      }
    });

    if (existingUser && existingUser.userCompanies.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'أنت مسجل بالفعل في هذه الشركة'
      });
    }

    // التحقق من عدم وجود موظف بنفس الرقم القومي في الشركة إن أُدخل
    if (nationalId && nationalId.trim()) {
      const existingEmpNationalId = await prisma.employee.findFirst({
        where: {
          companyId: invitation.companyId,
          nationalId: nationalId.trim()
        }
      });
      if (existingEmpNationalId) {
        return res.status(400).json({
          success: false,
          message: 'يوجد موظف مسجل بالفعل بنفس الرقم القومي في هذه الشركة'
        });
      }
    }

    // إنشاء الحساب وملف الموظف داخل Transaction
    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    let user = existingUser;

    if (!user) {
      // إنشاء مستخدم جديد
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          phone: phone ? phone.trim() : null,
          role: invitation.role || 'AGENT',
          companyId: invitation.companyId,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        }
      });
    } else {
      // تحديث بيانات المستخدم الحالي إن لم تكن مكتملة
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          phone: user.phone || (phone ? phone.trim() : null)
        }
      });
    }

    // ربط المستخدم بالشركة عبر UserCompany
    await prisma.userCompany.create({
      data: {
        userId: user.id,
        companyId: invitation.companyId,
        role: invitation.role || 'AGENT',
        isActive: true
      }
    });

    // توليد كود الموظف التسلسلي
    const empCount = await prisma.employee.count({
      where: { companyId: invitation.companyId }
    });
    const employeeNumber = `EMP${String(empCount + 1).padStart(5, '0')}`;

    // تحليل الميتاداتا إن وُجدت لاستخراج الراتب أو الملاحظات
    let parsedMetadata = {};
    if (invitation.metadata) {
      try {
        parsedMetadata = JSON.parse(invitation.metadata);
      } catch (e) {
        parsedMetadata = {};
      }
    }

    // إنشاء ملف الموظف في hr_employees
    const employee = await prisma.employee.create({
      data: {
        companyId: invitation.companyId,
        userId: user.id,
        employeeNumber,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: normalizedEmail,
        phone: phone ? phone.trim() : (invitation.phone || null),
        mobile: mobile ? mobile.trim() : null,
        nationalId: nationalId ? nationalId.trim() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender && ['MALE', 'FEMALE'].includes(gender) ? gender : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        country: country || 'Egypt',
        departmentId: invitation.departmentId || null,
        positionId: invitation.positionId || null,
        contractType: invitation.contractType || 'FULL_TIME',
        hireDate: new Date(),
        status: 'ACTIVE',
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        baseSalary: parsedMetadata.baseSalary ? parseFloat(parsedMetadata.baseSalary) : null,
        notes: parsedMetadata.notes || null
      }
    });

    // تحديث حالة الدعوة إلى مقبولة
    await prisma.employeeInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByUserId: user.id
      }
    });

    // إصدار JWT Token لتسجيل الدخول التلقائي
    const jwtSecret = process.env.JWT_SECRET || 'maxp_super_jwt_secret_2026';
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: invitation.role || 'AGENT',
      companyId: invitation.companyId
    };

    const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET || jwtSecret, { expiresIn: '7d' });

    console.log(`✅ [EMPLOYEE-ONBOARDED] Employee ${cleanFirstName} ${cleanLastName} (${normalizedEmail}) joined company ${invitation.companyId}`);

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل بياناتك وحسابك بنجاح. أهلاً بك في الفريق!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          role: invitation.role,
          companyId: invitation.companyId,
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber
        },
        token: accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('❌ [acceptEmployeeInvitation] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إتمام التسجيل والانضمام',
      error: error.message
    });
  }
};

module.exports = {
  createEmployeeInvitation,
  listEmployeeInvitations,
  revokeEmployeeInvitation,
  verifyEmployeeInvitation,
  acceptEmployeeInvitation
};
