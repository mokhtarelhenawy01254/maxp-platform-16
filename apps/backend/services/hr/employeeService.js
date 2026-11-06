/**
 * 👤 Employee Service
 * خدمة إدارة الموظفين
 */

const { getSharedPrismaClient, executeWithRetry } = require('../sharedDatabase');
const { validateEmployeeData } = require('../../utils/hrValidation');
const {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  EmployeeError
} = require('../../utils/hrErrors');

class EmployeeService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    const client = getSharedPrismaClient();
    if (!client) {
      throw new Error('Prisma client is not initialized. Please ensure database is initialized.');
    }
    return client;
  }

  /**
   * إنشاء موظف جديد
   */
  async createEmployee(companyId, data) {
    console.log('📥 [HR] Received employee data for company', companyId);

    // التحقق من صحة البيانات
    validateEmployeeData(data);

    // ✅ Check if email exists in User table and link if found, or create User if email provided
    let linkedUserId = data.userId || null;
    if (data.email && !linkedUserId) {
      const emailLower = data.email.toLowerCase();

      // Normalize the email in data to lowercase for storage
      data.email = emailLower;

      // Check if User exists with this email
      const existingUser = await this.prisma.user.findFirst({
        where: { email: emailLower }
      });

      if (existingUser) {
        // ✅ Check if user is already an active employee in THIS company
        const existingEmpRecord = await this.prisma.employee.findFirst({
          where: {
            userId: existingUser.id,
            companyId: companyId
          }
        });

        if (existingEmpRecord && existingEmpRecord.status === 'ACTIVE') {
          throw new ConflictError(`هذا الموظف مسجل بالفعل في هذه الشركة برقم وظيفي: ${existingEmpRecord.employeeNumber}`);
        }

        const userCompany = await this.prisma.userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: existingUser.id,
              companyId: companyId
            }
          }
        });

        if (userCompany && existingUser.companyId === companyId && existingUser.employeeNumber) {
          throw new ConflictError(`هذا الموظف مسجل بالفعل في هذه الشركة برقم وظيفي: ${existingUser.employeeNumber}`);
        }

        // Link existing User to this company if not already linked
        linkedUserId = existingUser.id;
        console.log(`✅ [HR] Linking existing User (${existingUser.email}) to company ${companyId}`);

        // Ensure UserCompany record exists and is active with chosen role
        await this.prisma.userCompany.upsert({
          where: {
            userId_companyId: {
              userId: existingUser.id,
              companyId: companyId
            }
          },
          update: {
            isActive: true,
            role: data.role || 'AGENT'
          },
          create: {
            userId: existingUser.id,
            companyId: companyId,
            role: data.role || 'AGENT',
            isActive: true,
            isDefault: false
          }
        });
      } else {
        // ✅ Create User automatically for new Employee (Completely new user)
        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');

        let passwordToUse;
        let isTemporaryPassword = false;
        let generatedRawPassword = null;
        let setupPasswordToken = null;
        let setupPasswordExpires = null;

        if (data.password && data.password.trim() !== '') {
          passwordToUse = await bcrypt.hash(data.password, 12);
          console.log('✅ [HR] Using password from frontend for new User');
        } else {
          generatedRawPassword = Math.random().toString(36).slice(-10) + 'A1!';
          passwordToUse = await bcrypt.hash(generatedRawPassword, 12);
          isTemporaryPassword = true;
          setupPasswordToken = crypto.randomBytes(32).toString('hex');
          setupPasswordExpires = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days
          console.log('✅ [HR] Generated temporary password and setup token for new User');
        }

        try {
          const newUser = await this.prisma.user.create({
            data: {
              email: emailLower,
              password: passwordToUse,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone || null,
              role: data.role || 'AGENT',
              isActive: true,
              companyId: companyId,
              resetPasswordToken: setupPasswordToken,
              resetPasswordExpires: setupPasswordExpires,
            }
          });

          linkedUserId = newUser.id;

          // Create UserCompany record
          await this.prisma.userCompany.create({
            data: {
              userId: newUser.id,
              companyId: companyId,
              role: data.role || 'AGENT',
              isActive: true,
              isDefault: true
            }
          });

          console.log(`✅ [HR] Created User (${newUser.email}) and UserCompany record.`);
          this._lastCreatedCredentials = isTemporaryPassword ? {
            email: emailLower,
            temporaryPassword: generatedRawPassword,
            setupToken: setupPasswordToken
          } : null;
        } catch (userError) {
          console.error(`❌ [HR] Failed to create User for Employee:`, userError.message);
          throw new Error(`فشل إنشاء حساب المستخدم للموظف: ${userError.message}`);
        }
      }
    }

    // Note: nationalId is not in User model, so we skip this check


    // التحقق من وجود القسم إذا تم توفيره
    if (data.departmentId && data.departmentId.trim() !== '') {
      const department = await this.prisma.department.findFirst({
        where: { id: data.departmentId, companyId }
      });
      if (!department) {
        console.warn(`⚠️ Department ${data.departmentId} not found, removing from data`);
        delete data.departmentId;
      }
    } else if (data.departmentId === '' || data.departmentId === null) {
      // Remove empty strings or null values
      delete data.departmentId;
    }

    // التحقق من وجود المنصب إذا تم توفيره
    if (data.positionId && data.positionId.trim() !== '') {
      const position = await this.prisma.position.findFirst({
        where: { id: data.positionId, companyId }
      });
      if (!position) {
        console.warn(`⚠️ Position ${data.positionId} not found, removing from data`);
        delete data.positionId;
      }
    } else if (data.positionId === '' || data.positionId === null) {
      // Remove empty strings or null values
      delete data.positionId;
    }

    // Note: managerId is not directly in User model, so we skip this check

    // توليد رقم موظف تلقائي إذا لم يتم توفيره
    if (!data.employeeNumber) {
      // Find the last employee number to ensure uniqueness
      const lastEmployee = await this.prisma.user.findFirst({
        where: {
          companyId,
          employeeNumber: { not: null }
        },
        orderBy: { employeeNumber: 'desc' },
        select: { employeeNumber: true }
      });

      let nextNumber = 1;
      if (lastEmployee?.employeeNumber) {
        const match = lastEmployee.employeeNumber.match(/EMP(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      data.employeeNumber = `EMP${String(nextNumber).padStart(5, '0')}`;
    }

    // Fetch current user if linked to avoid overwriting existing details
    const currentUser = linkedUserId ? await this.prisma.user.findUnique({
      where: { id: linkedUserId },
      select: { companyId: true, firstName: true, lastName: true, phone: true }
    }) : null;

    // Update or create User with employee data
    // ✅ Only include fields that exist in User model and handle empty strings
    const userData = {
      employeeNumber: data.employeeNumber,
      departmentId: data.departmentId && data.departmentId !== '' ? data.departmentId : null,
      positionId: data.positionId && data.positionId !== '' ? data.positionId : null,
      hireDate: data.hireDate && data.hireDate !== '' ? new Date(data.hireDate) : null,
      contractType: (() => {
        if (!data.contractType || data.contractType === '') return null;
        const type = data.contractType.toUpperCase();
        if (type === 'INTERNSHIP') return 'INTERN';
        if (['CONTRACT', 'TEMPORARY', 'FREELANCE'].includes(type)) return 'CONTRACTOR';
        return data.contractType;
      })(),
      baseSalary: data.baseSalary && data.baseSalary !== '' ? parseFloat(data.baseSalary) : null,
      firstName: data.firstName || currentUser?.firstName || 'موظف',
      lastName: data.lastName || currentUser?.lastName || 'جديد',
      phone: data.phone && data.phone !== '' ? data.phone : (currentUser?.phone || null),
      avatar: data.avatar || null,
      isActive: true,
      // If user has an existing primary companyId, preserve it. If null, set this companyId.
      companyId: (currentUser && currentUser.companyId) ? currentUser.companyId : companyId,
      // Deduction fields
      enableAutoDeduction: data.enableAutoDeduction !== undefined ? data.enableAutoDeduction : true,
      monthlyGraceMinutes: data.monthlyGraceMinutes !== undefined ? parseInt(data.monthlyGraceMinutes) : 60,
      maxDailyLateMinutes: data.maxDailyLateMinutes !== undefined ? parseInt(data.maxDailyLateMinutes) : 10,
      lateDeductionRate: data.lateDeductionRate !== undefined ? parseFloat(data.lateDeductionRate) : null
    };

    // ✅ سجل بدون بيانات شخصية (ممنوع طباعة الراتب/التليفون/تاريخ التعيين في اللوج)
    console.log(
      '💾 [HR] Saving employee data for company',
      companyId,
      '- employeeNumber:',
      userData.employeeNumber
    );

    let employee;
    if (linkedUserId) {
      // Update existing user
      employee = await this.prisma.user.update({
        where: { id: linkedUserId },
        data: userData,
        include: {
          departmentRelation: true,
          positionRelation: true
        }
      });
    } else {
      // This shouldn't happen as we create user above, but just in case
      throw new Error('User must be created before employee data can be added');
    }

    console.log('✅ [HR] Employee created:', employee.employeeNumber);

    // ✅ Sync with mirror Employee table
    await this.syncWithEmployeeTable(employee.id, companyId);

    // Send in-app notification if user already existed
    if (linkedUserId) {
      try {
        const comp = await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true }
        });
        await this.prisma.notification.create({
          data: {
            userId: linkedUserId,
            companyId: companyId,
            title: 'تمت إضافتك إلى فريق العمل',
            message: `تمت إضافتك كموظف في شركة "${comp?.name || 'الشركة'}" بنجاح. يمكنك الآن التبديل إليها ومتابعة مهامك.`,
            type: 'INFO',
            isRead: false
          }
        });
      } catch (notifErr) {
        console.warn('⚠️ Could not send welcome notification to employee:', notifErr.message);
      }
    }

    const credentials = this._lastCreatedCredentials;
    this._lastCreatedCredentials = null;

    return {
      ...employee,
      credentials: credentials || null
    };
  }

  /**
   * جلب موظف بـ userId
   */
  async getEmployeeByUserId(companyId, userId) {
    try {
      return await this.prisma.employee.findFirst({
        where: { companyId, userId },
        include: {
          department: { select: { id: true, name: true } },
          position:   { select: { id: true, title: true } },
          manager:    { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } catch (error) {
      console.error('❌ Error getting employee by userId:', error);
      throw new EmployeeError('حدث خطأ أثناء جلب بيانات الموظف');
    }
  }

  /**
   * جلب جميع الموظفين من جدول Employee مباشرة
   */
  async getEmployees(companyId, options = {}) {
    try {
      const {
        page: pageStr = 1,
        limit: limitStr = 20,
        search,
        departmentId,
        positionId,
        status,
        contractType,
        userStatus, // ✅ Add User Status filter
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // تحويل page و limit إلى أرقام
      const page = parseInt(pageStr, 10) || 1;
      const limit = parseInt(limitStr, 10) || 20;

      // عزل البيانات: يجب أن يكون companyId موجود دائماً
      if (!companyId) {
        throw new Error('companyId مطلوب لجلب الموظفين');
      }

      // بناء الفلاتر للموظفين من جدول User
      // جلب جميع المستخدمين في الشركة (الموظفين هم Users في نفس الشركة)
      // Only include users whose membership in this company is active.
      // Soft-deleted employees keep a disabled UserCompany row; adding isActive filter hides them from the list.
      const hrEmployeeRecords = await this.prisma.employee.findMany({
        where: { companyId },
        select: {
          id: true,
          userId: true,
          employeeNumber: true,
          nationalId: true,
          dateOfBirth: true,
          gender: true,
          nationality: true,
          address: true,
          emergencyContact: true,
          status: true,
          contractType: true,
          baseSalary: true,
          hireDate: true,
          departmentId: true,
          positionId: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });
      const validHrUserIds = hrEmployeeRecords.map(e => e.userId).filter(Boolean);

      const userWhere = {
        OR: [
          {
            employeeNumber: { not: null },
            OR: [
              { companyId: companyId },
              { userCompanies: { some: { companyId, isActive: true } } }
            ]
          },
          ...(validHrUserIds.length > 0 ? [{ id: { in: validHrUserIds } }] : [])
        ]
      };

      // فلتر البحث
      if (search) {
        userWhere.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ];
      }

      // فلاتر إضافية
      if (departmentId && departmentId !== 'all') userWhere.departmentId = departmentId;
      if (positionId && positionId !== 'all') userWhere.positionId = positionId;
      if (contractType && contractType !== 'all') {
        const type = contractType.toUpperCase();
        if (type === 'INTERNSHIP') userWhere.contractType = 'INTERN';
        else if (['CONTRACT', 'TEMPORARY', 'FREELANCE'].includes(type)) userWhere.contractType = 'CONTRACTOR';
        else userWhere.contractType = contractType;
      }

      // ✅ Handle status filter (ACTIVE / INACTIVE) - Case Insensitive
      if (status && status !== 'all') {
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'ACTIVE') {
          userWhere.isActive = true;
        } else if (statusUpper === 'INACTIVE') {
          userWhere.isActive = false;
        } else if (statusUpper === 'ACTIVE_USER' || statusUpper === 'INACTIVE_USER') {
          // Handled by userStatus below
        }
      }

      if (userStatus && userStatus !== 'all') {
        if (userStatus === 'ACTIVE_USER') {
          userWhere.isActive = true;
        } else if (userStatus === 'INACTIVE_USER') {
          userWhere.isActive = false;
        }
      }

      console.log('🔍 [HR] userWhere for getEmployees:', JSON.stringify(userWhere, null, 2));

      // ✅ ADDED: Debug check - are there users in this company that are NOT employees?
      const potentialUsersCount = await this.prisma.user.count({
        where: {
          companyId,
          employeeNumber: null
        }
      });
      if (potentialUsersCount > 0) {
        console.warn(`⚠️ [HR] Found ${potentialUsersCount} users in company ${companyId} who do NOT have an employeeNumber. They will be hidden from the HR list.`);
      }

      // جلب الموظفين من جدول User مباشرة
      const [users, total] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.user.findMany({
            where: userWhere,
            include: {
              departmentRelation: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  code: true
                }
              },
              positionRelation: {
                select: {
                  id: true,
                  title: true,
                  level: true
                }
              },
              // Include UserCompany for company-specific role
              userCompanies: {
                where: { companyId: companyId },
                select: {
                  role: true,
                  isActive: true
                },
                take: 1
              }
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit
          }),
          this.prisma.user.count({ where: userWhere })
        ]);
      });

      console.log('✅ [HR] Found employees:', total, 'Returned:', users.length);

      const employeeMap = new Map();
      for (const emp of hrEmployeeRecords) {
        if (emp.userId) employeeMap.set(emp.userId, emp);
        employeeMap.set(emp.id, emp);
      }

      // ✅ FIX: دمج بيانات User مع بيانات hr_employees لتقديم سجل موظف متكامل للـ frontend
      const formattedEmployees = users.map(user => {
        const empRecord = employeeMap.get(user.id) || null;
        const userIsActive = user.isActive;
        const userCompany = user.userCompanies?.[0];
        const userRole = userCompany?.role || user.role || null;

        return {
          id: user.id, // Use user.id as employee id
          userId: user.id,
          employeeRecordId: empRecord?.id || null,
          employeeNumber: empRecord?.employeeNumber || user.employeeNumber || 'N/A',
          firstName: empRecord?.firstName || user.firstName,
          lastName: empRecord?.lastName || user.lastName,
          firstNameEn: null,
          lastNameEn: null,
          email: empRecord?.email || user.email,
          phone: empRecord?.phone || user.phone,
          mobile: null,
          avatar: empRecord?.avatar || user.avatar,
          dateOfBirth: empRecord?.dateOfBirth || null,
          gender: empRecord?.gender || null,
          nationality: empRecord?.nationality || null,
          nationalId: empRecord?.nationalId || null,
          address: empRecord?.address || null,
          emergencyContact: empRecord?.emergencyContact || null,
          status: empRecord?.status || (userIsActive ? 'ACTIVE' : 'INACTIVE'),
          contractType: empRecord?.contractType || user.contractType || 'FULL_TIME',
          hireDate: empRecord?.hireDate || user.hireDate,
          baseSalary: empRecord?.baseSalary !== undefined && empRecord?.baseSalary !== null ? empRecord.baseSalary : user.baseSalary,
          department: user.departmentRelation || null,
          position: user.positionRelation || null,
          manager: empRecord?.manager || null,
          hasEmployeeRecord: Boolean(empRecord || user.employeeNumber),
          // ✅ Include User (HR Integration) data
          user: {
            id: user.id,
            email: user.email,
            role: userRole,
            isActive: userCompany ? userCompany.isActive : userIsActive,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          }
        };
      });

      console.log('✅ [HR] Formatted employees count:', formattedEmployees.length);
      if (formattedEmployees.length === 0) {
        console.warn('⚠️ [HR] No employees found after formatting! Something is wrong.');
      }

      return {
        employees: formattedEmployees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      throw error;
    }
  }

  /**
   * جلب موظف بالـ ID
   */
  async getEmployeeById(companyId, employeeId) {
    try {
      // 1. Fetch user (check direct companyId and userCompanies)
      let user = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          OR: [
            { companyId },
            { userCompanies: { some: { companyId } } }
          ]
        },
        include: {
          departmentRelation: true,
          positionRelation: true,
          attendances: {
            where: { companyId },
            orderBy: { date: 'desc' },
            take: 30
          },
          userCompanies: {
            where: { companyId },
            select: {
              role: true,
              isActive: true
            },
            take: 1
          }
        }
      });

      // 2. Fetch corresponding hr_employees record
      let empRecord = await this.prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            { id: employeeId },
            ...(user ? [{ userId: user.id }] : [{ userId: employeeId }])
          ]
        },
        include: {
          department: true,
          position: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // If user wasn't found by employeeId directly, but empRecord has userId
      if (!user && empRecord?.userId) {
        user = await this.prisma.user.findFirst({
          where: { id: empRecord.userId },
          include: {
            departmentRelation: true,
            positionRelation: true,
            attendances: {
              where: { companyId },
              orderBy: { date: 'desc' },
              take: 30
            },
            userCompanies: {
              where: { companyId },
              select: {
                role: true,
                isActive: true
              },
              take: 1
            }
          }
        });
      }

      if (!user && !empRecord) {
        return null;
      }

      const userCompany = user?.userCompanies?.[0];
      const effectiveRole = userCompany?.role || user?.role || 'AGENT';

      return {
        ...(user || {}),
        id: employeeId,
        userId: user?.id || empRecord?.userId || null,
        employeeRecordId: empRecord?.id || null,
        employeeNumber: empRecord?.employeeNumber || user?.employeeNumber || 'N/A',
        firstName: empRecord?.firstName || user?.firstName || '',
        lastName: empRecord?.lastName || user?.lastName || '',
        firstNameEn: empRecord?.firstNameEn || null,
        lastNameEn: empRecord?.lastNameEn || null,
        email: empRecord?.email || user?.email || '',
        phone: empRecord?.phone || user?.phone || '',
        mobile: empRecord?.mobile || null,
        avatar: empRecord?.avatar || user?.avatar || null,
        hireDate: empRecord?.hireDate || user?.hireDate || null,
        contractType: empRecord?.contractType || user?.contractType || 'FULL_TIME',
        baseSalary: empRecord?.baseSalary !== undefined && empRecord?.baseSalary !== null ? empRecord.baseSalary : user?.baseSalary,
        department: user?.departmentRelation || empRecord?.department || null,
        position: user?.positionRelation || empRecord?.position || null,
        manager: empRecord?.manager || null,
        status: empRecord?.status || (user?.isActive ? 'ACTIVE' : 'INACTIVE'),
        // Rich personal HR fields
        nationalId: empRecord?.nationalId || null,
        dateOfBirth: empRecord?.dateOfBirth || null,
        gender: empRecord?.gender || null,
        nationality: empRecord?.nationality || null,
        maritalStatus: empRecord?.maritalStatus || null,
        address: empRecord?.address || null,
        city: empRecord?.city || null,
        country: empRecord?.country || null,
        postalCode: empRecord?.postalCode || null,
        emergencyContact: empRecord?.emergencyContact || null,
        bankName: empRecord?.bankName || null,
        bankAccountNumber: empRecord?.bankAccountNumber || null,
        bankIban: empRecord?.bankIban || null,
        terminationDate: empRecord?.terminationDate || null,
        terminationReason: empRecord?.terminationReason || null,
        documents: empRecord?.documents || null,
        notes: empRecord?.notes || null,
        attendances: user?.attendances || [],
        user: user ? {
          id: user.id,
          email: user.email,
          role: effectiveRole,
          isActive: userCompany ? userCompany.isActive : user.isActive,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        } : null
      };
    } catch (error) {
      console.error('❌ Error getting employee:', error);
      throw error;
    }
  }

  /**
   * تحديث موظف
   */
  async updateEmployee(companyId, employeeId, data) {
    try {
      // Find existing User or Employee
      let existingUser = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          OR: [
            { companyId },
            { userCompanies: { some: { companyId } } }
          ]
        }
      });

      let empRecord = await this.prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            { id: employeeId },
            ...(existingUser ? [{ userId: existingUser.id }] : [{ userId: employeeId }])
          ]
        }
      });

      if (!existingUser && empRecord?.userId) {
        existingUser = await this.prisma.user.findUnique({
          where: { id: empRecord.userId }
        });
      }

      if (!existingUser && !empRecord) {
        throw new Error('الموظف غير موجود');
      }

      const updateData = {};
      if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
      if (data.contractType) {
        const type = data.contractType.toUpperCase();
        if (type === 'INTERNSHIP') updateData.contractType = 'INTERN';
        else if (['CONTRACT', 'TEMPORARY', 'FREELANCE'].includes(type)) updateData.contractType = 'CONTRACTOR';
        else updateData.contractType = data.contractType;
      }
      if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary ? parseFloat(data.baseSalary) : null;
      if (data.departmentId !== undefined) {
        updateData.departmentId = (data.departmentId && data.departmentId.trim() !== '') ? data.departmentId : null;
      }
      if (data.positionId !== undefined) {
        updateData.positionId = (data.positionId && data.positionId.trim() !== '') ? data.positionId : null;
      }
      if (data.employeeNumber !== undefined) updateData.employeeNumber = data.employeeNumber;
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;

      // Handle email update safely
      if (data.email && existingUser && data.email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
        const cleanEmail = data.email.trim().toLowerCase();
        const emailConflict = await this.prisma.user.findFirst({
          where: { email: cleanEmail, id: { not: existingUser.id } }
        });
        if (emailConflict) {
          throw new ConflictError('البريد الإلكتروني مستخدم بالفعل لمستخدم آخر');
        }
        updateData.email = cleanEmail;
      }

      // Deduction fields
      if (data.enableAutoDeduction !== undefined) updateData.enableAutoDeduction = data.enableAutoDeduction;
      if (data.monthlyGraceMinutes !== undefined) updateData.monthlyGraceMinutes = parseInt(data.monthlyGraceMinutes);
      if (data.maxDailyLateMinutes !== undefined) updateData.maxDailyLateMinutes = parseInt(data.maxDailyLateMinutes);
      if (data.lateDeductionRate !== undefined) updateData.lateDeductionRate = parseFloat(data.lateDeductionRate);

      // Record salary change if changed
      if (existingUser && data.baseSalary && existingUser.baseSalary &&
        parseFloat(data.baseSalary) !== parseFloat(existingUser.baseSalary)) {
        await this.prisma.salaryHistory.create({
          data: {
            companyId,
            userId: existingUser.id,
            previousSalary: existingUser.baseSalary,
            newSalary: data.baseSalary,
            changeType: 'adjustment',
            changePercentage: Number(((data.baseSalary - existingUser.baseSalary) / existingUser.baseSalary * 100)),
            effectiveDate: new Date()
          }
        });
      }

      // Update User table if existingUser exists
      if (existingUser) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
          include: {
            departmentRelation: true,
            positionRelation: true
          }
        });
      }

      // Update hr_employees record with personal/HR fields
      const hrFields = {};
      if (data.firstName) hrFields.firstName = data.firstName;
      if (data.lastName) hrFields.lastName = data.lastName;
      if (data.email) hrFields.email = data.email.trim().toLowerCase();
      if (data.phone !== undefined) hrFields.phone = data.phone;
      if (data.mobile !== undefined) hrFields.mobile = data.mobile;
      if (data.nationalId !== undefined) hrFields.nationalId = data.nationalId;
      if (data.dateOfBirth) hrFields.dateOfBirth = new Date(data.dateOfBirth);
      if (data.gender) hrFields.gender = data.gender;
      if (data.maritalStatus) hrFields.maritalStatus = data.maritalStatus;
      if (data.address !== undefined) hrFields.address = data.address;
      if (data.city !== undefined) hrFields.city = data.city;
      if (data.country !== undefined) hrFields.country = data.country;
      if (data.emergencyContact !== undefined) hrFields.emergencyContact = data.emergencyContact;
      if (data.bankName !== undefined) hrFields.bankName = data.bankName;
      if (data.bankAccountNumber !== undefined) hrFields.bankAccountNumber = data.bankAccountNumber;
      if (data.bankIban !== undefined) hrFields.bankIban = data.bankIban;
      if (data.departmentId !== undefined) hrFields.departmentId = updateData.departmentId;
      if (data.positionId !== undefined) hrFields.positionId = updateData.positionId;
      if (data.hireDate) hrFields.hireDate = updateData.hireDate;
      if (data.baseSalary !== undefined) hrFields.baseSalary = updateData.baseSalary;
      if (data.employeeNumber !== undefined) hrFields.employeeNumber = data.employeeNumber;
      if (data.status) hrFields.status = data.status;

      if (empRecord) {
        await this.prisma.employee.update({
          where: { id: empRecord.id },
          data: { ...hrFields, updatedAt: new Date() }
        });
      } else if (existingUser) {
        await this.syncWithEmployeeTable(existingUser.id, companyId);
      }

      return await this.getEmployeeById(companyId, employeeId);
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  async deleteEmployee(companyId, employeeId, options = {}) {
    try {
      const actorId = options.actorId || null;
      const actorEmail = options.actorEmail || null;
      const ipAddress = options.ipAddress || null;
      const userAgent = options.userAgent || null;
      const confirmationText = String(options.confirmationText || '').trim().toUpperCase();

      const safeAuditLog = async ({ action, description, severity = 'MEDIUM', isSuccess = true, metadata = {}, targetName = employeeId }) => {
        if (!actorId) return;
        try {
          await this.prisma.activityLog.create({
            data: {
              userId: actorId,
              companyId,
              category: 'HR',
              action,
              description,
              targetType: 'USER',
              targetId: employeeId,
              targetName,
              severity,
              isSuccess,
              metadata: JSON.stringify({
                actorEmail,
                ipAddress,
                userAgent,
                ...metadata
              })
            }
          });
        } catch (auditError) {
          console.warn('⚠️ [HR] Failed to write activity log:', auditError.message);
        }
      };

      console.log(`🗑️ [HR] Deleting employee ${employeeId} from company ${companyId} (actor: ${actorId || 'unknown'})`);

      if (confirmationText !== 'DELETE') {
        const error = new Error('تأكيد الحذف مطلوب. اكتب DELETE للمتابعة.');
        error.statusCode = 400;
        await safeAuditLog({
          action: 'EMPLOYEE_DELETE_BLOCKED',
          description: 'Blocked employee deletion due to missing confirmation token',
          severity: 'HIGH',
          isSuccess: false,
          metadata: { reason: 'MISSING_CONFIRMATION' }
        });
        throw error;
      }

      if (actorId && actorId === employeeId) {
        const error = new Error('لا يمكنك حذف حسابك الحالي من شاشة الموظفين.');
        error.statusCode = 403;
        await safeAuditLog({
          action: 'EMPLOYEE_DELETE_BLOCKED',
          description: 'Blocked self-deletion attempt from HR employee delete endpoint',
          severity: 'HIGH',
          isSuccess: false,
          metadata: { reason: 'SELF_DELETE_BLOCKED' }
        });
        throw error;
      }

      const existing = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          OR: [
            { companyId: companyId },
            { userCompanies: { some: { companyId } } }
          ]
        }
      });

      if (!existing) {
        console.error(`❌[HR] Employee ${employeeId} not found in company ${companyId}`);
        const error = new Error('الموظف غير موجود أو ليس لديك صلاحية لحذفه');
        error.statusCode = 404;
        throw error;
      }

      const targetMembership = await this.prisma.userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: employeeId,
            companyId
          }
        },
        select: {
          id: true,
          role: true,
          isActive: true,
          isDefault: true
        }
      });

      const effectiveTargetRole = targetMembership?.role || existing.role || null;
      const targetName = existing.email || `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || employeeId;

      if (effectiveTargetRole === 'OWNER') {
        const error = new Error('لا يمكن حذف حساب مالك الشركة من شاشة الموظفين.');
        error.statusCode = 403;
        await safeAuditLog({
          action: 'EMPLOYEE_DELETE_BLOCKED',
          description: `Blocked deletion of OWNER account (${targetName})`,
          severity: 'HIGH',
          isSuccess: false,
          metadata: {
            reason: 'OWNER_DELETE_BLOCKED',
            targetRole: effectiveTargetRole
          }
        });
        throw error;
      }

      console.log(`✅[HR] Found employee to delete: ${existing.firstName} ${existing.lastName}`);

      // 1. Remove employee fields from User record
      await this.prisma.user.update({
        where: { id: employeeId },
        data: {
          employeeNumber: null,
          departmentId: null,
          positionId: null,
          hireDate: null,
          contractType: null,
          baseSalary: null,
          ...(existing.companyId === companyId ? { companyId: null } : {})
        }
      });
      console.log('✅[HR] Cleared employee fields from User record');

      // 2. Soft-disable company membership (safer than hard delete for recovery)
      const ucUpdate = await this.prisma.userCompany.updateMany({
        where: { userId: employeeId, companyId },
        data: {
          isActive: false,
          isDefault: false
        }
      });
      console.log(`✅[HR] Disabled UserCompany records: ${ucUpdate.count}`);

      // 3. Prepare and run related data cleanup
      const deleteCondition = { userId: employeeId, companyId };

      const employeeRecord = await this.prisma.employee.findFirst({
        where: { userId: employeeId, companyId }
      });

      const deletePromises = [
        this.prisma.payroll.deleteMany({ where: deleteCondition }),
        this.prisma.attendance.deleteMany({ where: deleteCondition }),
        this.prisma.leaveRequest.deleteMany({ where: deleteCondition }),
        this.prisma.lateWarning.deleteMany({ where: deleteCondition }),
        this.prisma.rewardRecord.deleteMany({ where: deleteCondition }),
        this.prisma.salaryHistory.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.employeeWarning.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.performanceReview.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.employeeDocument.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.goal.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.resignation.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.shiftAssignment.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.promotion.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.kudos.deleteMany({ where: { OR: [{ fromUserId: employeeId }, { toUserId: employeeId }], companyId } }),
        this.prisma.rewardEligibilityLog.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.latenessBalance.deleteMany({ where: { employeeId: employeeId, companyId } }),
        this.prisma.latenessAllowance.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.latenessRecord.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.latenessDeduction.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.latenessMonthlySummary.deleteMany({ where: { userId: employeeId, companyId } }),
        this.prisma.employee.deleteMany({ where: { userId: employeeId, companyId } })
      ];

      if (employeeRecord) {
        console.log(`📄[HR] Found legacy employee record: ${employeeRecord.id}, adding specific cleanup`);
        deletePromises.push(
          this.prisma.hrPermissionRequest.deleteMany({ where: { employeeId: employeeRecord.id, companyId } }),
          this.prisma.manualDeduction.deleteMany({ where: { employeeId: employeeRecord.id, companyId } }),
          this.prisma.advanceRequest.deleteMany({ where: { employeeRelId: employeeRecord.id, companyId } })
        );
      }

      await Promise.all(deletePromises);
      console.log('✅[HR] All related transaction data cleaned up');

      // 4. Keep account for safer recovery; only membership is disabled
      const activeCompanyCount = await this.prisma.userCompany.count({
        where: {
          userId: employeeId,
          isActive: true
        }
      });
      console.log(`ℹ️[HR] User account preserved. Active memberships remaining: ${activeCompanyCount}`);

      await safeAuditLog({
        action: 'EMPLOYEE_REMOVED_FROM_COMPANY',
        description: `Employee removed from company via HR delete flow (${targetName})`,
        severity: 'MEDIUM',
        isSuccess: true,
        metadata: {
          removedUserId: employeeId,
          removedUserRole: effectiveTargetRole,
          disabledMembershipCount: ucUpdate.count,
          activeMembershipsAfter: activeCompanyCount
        },
        targetName
      });

      return { success: true };
    } catch (error) {
      console.error('❌ [HR] Error deleting employee:', error);
      throw error;
    }
  }

  /**
   * إنهاء خدمة موظف
   */
  async terminateEmployee(companyId, employeeId, data = {}) {
    try {
      console.log(`🛑 [HR] Terminating employee ${employeeId} in company ${companyId}`);

      const terminationDate = data.terminationDate ? new Date(data.terminationDate) : new Date();
      const terminationReason = data.terminationReason || data.reason || 'إنهاء خدمة';

      // 1. تحديث سجل hr_employees بحالة TERMINATED وتوثيق التاريخ والسبب
      await this.prisma.employee.updateMany({
        where: {
          companyId,
          OR: [{ userId: employeeId }, { id: employeeId }]
        },
        data: {
          status: 'TERMINATED',
          terminationDate,
          terminationReason,
          updatedAt: new Date()
        }
      });

      // 2. تعطيل عضوية الشركة للمستخدم على مستوى هذه الشركة فقط
      await this.prisma.userCompany.updateMany({
        where: { userId: employeeId, companyId },
        data: { isActive: false, isDefault: false }
      });

      // 3. التحقق إذا كان المستخدم عضواً في شركات أخرى فعالة قبل تعطيل الحساب عالمياً
      const otherActiveMemberships = await this.prisma.userCompany.count({
        where: {
          userId: employeeId,
          companyId: { not: companyId },
          isActive: true
        }
      });

      if (otherActiveMemberships === 0) {
        await this.prisma.user.update({
          where: { id: employeeId },
          data: { isActive: false }
        });
      }

      return await this.getEmployeeById(companyId, employeeId);
    } catch (error) {
      console.error('❌ Error terminating employee:', error);
      throw error;
    }
  }

  /**
   * إعادة تفعيل موظف سابق
   */
  async reactivateEmployee(companyId, employeeId, data = {}) {
    try {
      console.log(`🔄 [HR] Reactivating employee ${employeeId} for company ${companyId}`);

      // التحقق من وجود المستخدم
      const user = await this.prisma.user.findUnique({
        where: { id: employeeId },
        include: { employees: true, userCompanies: { where: { companyId } } }
      });

      if (!user) {
        throw new NotFoundError('المستخدم');
      }

      const employeeRecord =
        user.employees && user.employees.companyId === companyId ? user.employees : null;
      const membership = (user.userCompanies || [])[0] || null;
      const belongsToCompany = Boolean(
        user.companyId === companyId || employeeRecord || membership
      );
      if (!belongsToCompany) {
        throw new UnauthorizedError('هذا المستخدم لا ينتمي إلى شركتك');
      }

      const otherCompanyEmployee = await this.prisma.employee.findUnique({ where: { userId: employeeId } });
      if (otherCompanyEmployee && otherCompanyEmployee.companyId !== companyId) {
        throw new ConflictError('هذا المستخدم مسجل كموظف في شركة أخرى — لا يمكن نقله من هنا');
      }

      // 1. توليد أو استعادة رقم الموظف إذا لم يكن موجوداً
      let employeeNumber = data.employeeNumber || user.employeeNumber || employeeRecord?.employeeNumber;
      if (!employeeNumber) {
        const lastEmployee = await this.prisma.user.findFirst({
          where: {
            companyId,
            employeeNumber: { not: null }
          },
          orderBy: { employeeNumber: 'desc' },
          select: { employeeNumber: true }
        });

        let nextNumber = 1;
        if (lastEmployee?.employeeNumber) {
          const match = lastEmployee.employeeNumber.match(/EMP(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }
        employeeNumber = `EMP${String(nextNumber).padStart(5, '0')}`;
      }

      // 2. تحديث بيانات المستخدم وتفعيله
      const updateUserData = {
        isActive: true,
        employeeNumber,
        companyId: user.companyId || companyId,
        departmentId: (data.departmentId && data.departmentId.trim() !== '') ? data.departmentId : (user.departmentId || null),
        positionId: (data.positionId && data.positionId.trim() !== '') ? data.positionId : (user.positionId || null),
        hireDate: data.hireDate ? new Date(data.hireDate) : (user.hireDate || new Date()),
        contractType: (() => {
          if (!data.contractType || data.contractType === '') return user.contractType || 'FULL_TIME';
          const type = data.contractType.toUpperCase();
          if (type === 'INTERNSHIP') return 'INTERN';
          if (['CONTRACT', 'TEMPORARY', 'FREELANCE'].includes(type)) return 'CONTRACTOR';
          return data.contractType;
        })(),
        baseSalary: data.baseSalary ? parseFloat(data.baseSalary) : (user.baseSalary || null),
        firstName: data.firstName || user.firstName,
        lastName: data.lastName || user.lastName,
        phone: data.phone || user.phone,
      };

      if (data.enableAutoDeduction !== undefined) updateUserData.enableAutoDeduction = data.enableAutoDeduction;
      if (data.monthlyGraceMinutes !== undefined) updateUserData.monthlyGraceMinutes = parseInt(data.monthlyGraceMinutes);
      if (data.maxDailyLateMinutes !== undefined) updateUserData.maxDailyLateMinutes = parseInt(data.maxDailyLateMinutes);
      if (data.lateDeductionRate !== undefined) updateUserData.lateDeductionRate = parseFloat(data.lateDeductionRate);

      const updatedUser = await this.prisma.user.update({
        where: { id: employeeId },
        data: updateUserData,
        include: {
          departmentRelation: true,
          positionRelation: true
        }
      });

      // 3. تفعيل أو إنشاء سجل UserCompany
      await this.prisma.userCompany.upsert({
        where: {
          userId_companyId: {
            userId: employeeId,
            companyId: companyId
          }
        },
        update: {
          isActive: true,
          role: data.role || membership?.role || 'AGENT'
        },
        create: {
          userId: employeeId,
          companyId: companyId,
          role: data.role || membership?.role || 'AGENT',
          isActive: true,
          isDefault: false
        }
      });

      // 4. مزامنة مع جدول Employee (المرآة)
      await this.syncWithEmployeeTable(employeeId, companyId);

      if (employeeRecord) {
        await this.prisma.employee.update({
          where: { id: employeeRecord.id },
          data: { status: 'ACTIVE', terminationDate: null, terminationReason: null }
        });
      }

      // 5. إرسال إشعار ترحيبي للموظف
      try {
        const comp = await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true }
        });
        await this.prisma.notification.create({
          data: {
            userId: employeeId,
            companyId: companyId,
            title: 'تمت إعادة تفعيل حسابك الوظيفي',
            message: `تمت إعادة تفعيل حسابك كموظف في شركة "${comp?.name || 'الشركة'}" بنجاح. يمكنك الآن متابعة مهامك.`,
            type: 'INFO',
            isRead: false
          }
        });
      } catch (notifErr) {
        console.warn('⚠️ Could not send reactivation notification to employee:', notifErr.message);
      }

      console.log(`✅ [HR] Successfully reactivated employee ${updatedUser.employeeNumber}`);
      return updatedUser;
    } catch (error) {
      console.error('❌ Error reactivating employee:', error);
      throw error;
    }
  }

  /**
   * ربط موظف بحساب مستخدم
   */
  async linkToUser(companyId, employeeId, userId) {
    try {
      console.log(`🔗 [HR] Linking employee ${employeeId} to user ${userId} in company ${companyId}`);

      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          OR: [{ companyId }, { userCompanies: { some: { companyId } } }]
        }
      });
      if (!user) {
        throw new Error('حساب المستخدم غير موجود في هذه الشركة');
      }

      // البحث عن سجل الموظف
      let empRecord = await this.prisma.employee.findFirst({
        where: { companyId, OR: [{ id: employeeId }, { userId: employeeId }] }
      });
      if (!empRecord) {
        throw new Error('سجل الموظف غير موجود في هذه الشركة');
      }

      // ربط سجل hr_employees بحساب المستخدم
      await this.prisma.employee.update({
        where: { id: empRecord.id },
        data: { userId: user.id, updatedAt: new Date() }
      });

      // مزامنة كود الموظف وبياناته إلى جدول users
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          employeeNumber: empRecord.employeeNumber,
          departmentId: empRecord.departmentId || user.departmentId,
          positionId: empRecord.positionId || user.positionId,
          hireDate: empRecord.hireDate || user.hireDate,
          baseSalary: empRecord.baseSalary !== undefined && empRecord.baseSalary !== null ? empRecord.baseSalary : user.baseSalary
        }
      });

      return await this.getEmployeeById(companyId, user.id);
    } catch (error) {
      console.error('❌ Error linking employee to user:', error);
      throw error;
    }
  }

  /**
   * جلب الهيكل التنظيمي
   */
  async getOrganizationChart(companyId) {
    try {
      const employees = await this.prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { employeeNumber: { not: null } },
            { departmentId: { not: null } },
            { positionId: { not: null } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          departmentId: true,
          positionId: true,
          departmentRelation: { select: { id: true, name: true, color: true } },
          positionRelation: { select: { id: true, title: true, level: true } }
        }
      });

      // Note: managerId is not in User model, so we return flat structure
      // بناء الشجرة (مبسط - بدون managerId)
      const buildTree = (parentId = null) => {
        // Since we don't have managerId, return all employees as root level
        return employees.map(emp => ({
          ...emp,
          department: emp.departmentRelation,
          position: emp.positionRelation,
          subordinates: []
        }));
      };

      return buildTree(null);
    } catch (error) {
      console.error('❌ Error getting organization chart:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الموظفين
   */
  async getEmployeeStats(companyId) {
    try {
      const baseEmployeeWhere = {
        employeeNumber: { not: null },
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ]
      };

      const activeEmployeeWhere = {
        ...baseEmployeeWhere,
        isActive: true
      };

      const [
        totalEmployees,
        activeEmployees,
        byDepartmentRaw,
        byContractTypeRaw,
        activeUserCount,
        recentHires,
        upcomingBirthdaysRaw
      ] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.user.count({
            where: baseEmployeeWhere
          }),
          this.prisma.user.count({
            where: activeEmployeeWhere
          }),
          // Group by departmentId
          this.prisma.user.findMany({
            where: {
              ...activeEmployeeWhere,
              departmentId: { not: null }
            },
            select: { departmentId: true, departmentRelation: { select: { name: true } } }
          }),
          // Group by contractType
          this.prisma.user.findMany({
            where: {
              ...activeEmployeeWhere,
              contractType: { not: null }
            },
            select: { contractType: true }
          }),
          // Status grouping (active vs inactive)
          this.prisma.user.count({
            where: activeEmployeeWhere
          }),
          // Recent hires
          this.prisma.user.findMany({
            where: {
              ...activeEmployeeWhere,
              hireDate: { not: null }
            },
            orderBy: { hireDate: 'desc' },
            take: 5,
            include: {
              departmentRelation: { select: { name: true } }
            }
          }),
          // Upcoming birthdays - dateOfBirth not on User model
          Promise.resolve([])
        ]);
      });

      // برمجية تجميع البيانات
      const byDepartment = [];
      const deptMap = new Map();
      byDepartmentRaw.forEach(u => {
        const name = u.departmentRelation?.name || 'غير محدد';
        deptMap.set(name, (deptMap.get(name) || 0) + 1);
      });
      deptMap.forEach((count, name) => byDepartment.push({ name, count }));

      const byContractType = [];
      const contractMap = new Map();
      byContractTypeRaw.forEach(u => {
        const type = u.contractType || 'غير محدد';
        contractMap.set(type, (contractMap.get(type) || 0) + 1);
      });
      contractMap.forEach((count, name) => byContractType.push({ name, count }));

      const byStatus = [
        { name: 'نشط', count: activeUserCount },
        { name: 'غير نشط', count: totalEmployees - activeUserCount }
      ];

      // حساب أعياد الميلاد القادمة - Handling empty array
      const today = new Date();
      const upcoming = (upcomingBirthdaysRaw || [])
        .map(emp => {
          if (!emp.dateOfBirth) return null;
          const bday = new Date(emp.dateOfBirth);
          const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          if (nextBday < today) {
            nextBday.setFullYear(today.getFullYear() + 1);
          }
          return { ...emp, nextBirthday: nextBday };
        })
        .filter(Boolean)
        .sort((a, b) => a.nextBirthday - b.nextBirthday)
        .slice(0, 5);

      return {
        totalEmployees,
        activeEmployees,
        byDepartment,
        byContractType,
        byStatus,
        recentHires,
        upcomingBirthdays: upcoming
      };
    } catch (error) {
      console.error('❌ Error getting employee stats:', error);
      throw error;
    }
  }
  /**
   * مزامنة بيانات الموظف مع جدول Employee (المرآة) للحفاظ على توافق النظام
   */
  async syncWithEmployeeTable(userId, companyId) {
    try {
      // جلب بيانات المستخدم المحدثة
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      const targetCompanyId = companyId || user.companyId;
      const cleanEmpNum = user.employeeNumber || `EMP${userId.slice(-5).toUpperCase()}`;

      // إذا لم يكن لدى المستخدم رقم موظف، حفظ الرقم في المستخدم أيضاً
      if (!user.employeeNumber) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { employeeNumber: cleanEmpNum }
        });
      }

      // تحديث أو إنشاء في جدول Employee
      await this.prisma.employee.upsert({
        where: { userId },
        update: {
          companyId: targetCompanyId,
          employeeNumber: cleanEmpNum,
          departmentId: user.departmentId,
          positionId: user.positionId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          hireDate: user.hireDate,
          baseSalary: user.baseSalary,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          updatedAt: new Date()
        },
        create: {
          userId,
          companyId: targetCompanyId,
          employeeNumber: cleanEmpNum,
          departmentId: user.departmentId,
          positionId: user.positionId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          hireDate: user.hireDate || new Date(),
          baseSalary: user.baseSalary,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE'
        }
      });
      console.log(`🔄 [HR] Synced Employee record for user: ${user.email} (${cleanEmpNum})`);
    } catch (error) {
      console.error('❌ [HR] Error syncing Employee table:', error.message);
    }
  }
}

module.exports = new EmployeeService();
