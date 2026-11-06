/**
 * 👥 Staff Sync Service (الخدمة المركزية الموحدة لمزامنة الموظفين)
 *
 * الغرض:
 * القضاء التام على فجوة "ازدواجية الهوية" بين جداول:
 * 1. User (المصادقة وتسجيل الدخول)
 * 2. UserCompany (الربط المتعدد والرتبة داخل الشركة)
 * 3. Employee (السجل الوظيفي والإداري للـ HR)
 *
 * يضمن ظهور الموظف بنسبة 100% في كافة شاشات المنصة (المستخدمين، HR، الحضور، إسناد الطلبات، المهام).
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class StaffSyncService {
  constructor() {
    this._prisma = null;
  }

  get prisma() {
    if (!this._prisma) {
      this._prisma = getSharedPrismaClient();
    }
    return this._prisma;
  }

  /**
   * مزامنة وإنشاء وتثبيت أضلاع الموظف الثلاثة (User + UserCompany + Employee)
   *
   * @param {string} companyId - معرّف الشركة المستهدفة
   * @param {string} userId - معرّف المستخدم
   * @param {object} options - الخيارات الإضافية (رول، قسم، منصب، راتب، إلخ)
   */
  async syncStaffRecord(companyId, userId, options = {}) {
    if (!companyId || !userId) {
      throw new Error('companyId و userId مطلوبان لمزامنة سجل الموظف');
    }

    const {
      role = 'AGENT',
      roleId = null,
      departmentId = null,
      positionId = null,
      contractType = 'FULL_TIME',
      hireDate = new Date(),
      baseSalary = undefined,
      isActive = true,
      employeeNumber = null,
      phone = undefined,
      nationalId = undefined,
      dateOfBirth = undefined,
      gender = undefined,
      address = undefined,
      city = undefined,
      notes = undefined
    } = options;

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`المستخدم غير موجود: ${userId}`);
    }

    // 1. ضمان وجود وتفعيل سجل UserCompany
    const userCompany = await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId,
          companyId
        }
      },
      create: {
        userId,
        companyId,
        role: role || user.role || 'AGENT',
        roleId: roleId || undefined,
        isActive: isActive !== false,
        isDefault: true
      },
      update: {
        role: role || user.role || 'AGENT',
        ...(roleId ? { roleId } : {}),
        isActive: isActive !== false
      }
    });

    // 2. ضمان وجود وتحديث سجل Employee (hr_employees)
    let employee = await this.prisma.employee.findUnique({
      where: { userId }
    });
    const wasExisting = Boolean(employee);

    // توليد الرقم الوظيفي إن لم يكن متوفراً مع منع تكرار الرقم داخل نفس الشركة
    let targetEmpNumber = employeeNumber || employee?.employeeNumber || user.employeeNumber;
    if (targetEmpNumber) {
      const collision = await this.prisma.employee.findFirst({
        where: {
          companyId,
          employeeNumber: targetEmpNumber,
          userId: { not: userId }
        },
        select: { id: true }
      });
      if (collision) {
        targetEmpNumber = null;
      }
    }

    if (!targetEmpNumber) {
      const lastEmployee = await this.prisma.employee.findFirst({
        where: { companyId },
        orderBy: { employeeNumber: 'desc' },
        select: { employeeNumber: true }
      });
      let nextSeq = 1;
      if (lastEmployee?.employeeNumber) {
        const match = lastEmployee.employeeNumber.match(/EMP(\d+)/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        } else {
          const empCount = await this.prisma.employee.count({ where: { companyId } });
          nextSeq = empCount + 1;
        }
      } else {
        const empCount = await this.prisma.employee.count({ where: { companyId } });
        nextSeq = empCount + 1;
      }
      targetEmpNumber = `EMP${String(nextSeq).padStart(5, '0')}`;
    }

    const employeePayload = {
      companyId,
      employeeNumber: targetEmpNumber,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email ? user.email.toLowerCase().trim() : '',
      phone: phone !== undefined ? phone : (user.phone || null),
      nationalId: nationalId !== undefined ? nationalId : (employee?.nationalId || null),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : (employee?.dateOfBirth || null),
      gender: gender || employee?.gender || null,
      address: address !== undefined ? address : (employee?.address || null),
      city: city !== undefined ? city : (employee?.city || null),
      departmentId: departmentId || employee?.departmentId || null,
      positionId: positionId || employee?.positionId || null,
      contractType: contractType || employee?.contractType || 'FULL_TIME',
      hireDate: hireDate ? new Date(hireDate) : (employee?.hireDate || new Date()),
      baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : (employee?.baseSalary || undefined),
      status: isActive !== false ? 'ACTIVE' : 'INACTIVE',
      notes: notes !== undefined ? notes : (employee?.notes || undefined)
    };

    if (employee) {
      employee = await this.prisma.employee.update({
        where: { id: employee.id },
        data: employeePayload
      });
    } else {
      employee = await this.prisma.employee.create({
        data: {
          ...employeePayload,
          userId
        }
      });
    }

    // 3. مزامنة البيانات القديمة في جدول User لضمان دعم الشاشات الكلاسيكية
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        companyId,
        role: role || user.role || 'AGENT',
        employeeNumber: targetEmpNumber,
        departmentId: departmentId || employee?.departmentId || null,
        positionId: positionId || employee?.positionId || null,
        contractType: contractType || employee?.contractType || 'FULL_TIME',
        hireDate: hireDate ? new Date(hireDate) : (employee?.hireDate || user.hireDate || new Date()),
        baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : (employee?.baseSalary || user.baseSalary || undefined),
        isActive: isActive !== false
      }
    });

    console.log(`✅ [StaffSyncService] Synced staff member: ${user.firstName} ${user.lastName} (${user.email}) in company ${companyId}`);

    return {
      success: true,
      action: wasExisting ? 'UPDATED' : 'CREATED',
      userId,
      companyId,
      employeeNumber: targetEmpNumber,
      userCompany,
      employee
    };
  }

  /**
   * مزامنة حالة الموظف المزدوجة (تفعيل/إيقاف متزامن بين UserCompany و Employee)
   *
   * @param {string} companyId - معرّف الشركة
   * @param {string} userId - معرّف المستخدم
   * @param {string} targetStatus - 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE'
   */
  async syncStaffStatus(companyId, userId, targetStatus) {
    if (!companyId || !userId) {
      throw new Error('companyId و userId مطلوبان لتعديل حالة الموظف');
    }

    const isNowActive = targetStatus === 'ACTIVE';

    // 1. تحديث UserCompany
    await this.prisma.userCompany.updateMany({
      where: { userId, companyId },
      data: { isActive: isNowActive }
    });

    // 2. تحديث Employee
    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId }
    });

    if (employee) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { status: targetStatus }
      });
    }

    // 3. لو كان المستخدم معطلاً في كل شركاته، يُعطل في جدول User
    const otherActiveMemberships = await this.prisma.userCompany.count({
      where: {
        userId,
        isActive: true
      }
    });

    const userDeactivated = otherActiveMemberships === 0 && !isNowActive;
    if (userDeactivated) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
    } else if (isNowActive) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
      });
    }

    return {
      success: true,
      userId,
      companyId,
      status: targetStatus,
      isActive: isNowActive,
      userDeactivated
    };
  }

  /**
   * جلب الموظفين المتاحين للإسناد والتوزيع (الطلبات، المهام، الشات، التوصيل)
   * يحل مشكلة اختفاء المدراء والمشرفين عبر فحص الصلاحية بدلاً من تقييد role = 'AGENT' فقط.
   */
  async getAssignableStaff(companyId, options = {}) {
    if (!companyId) return [];

    const {
      module = 'all',
      search = '',
      roles,
      includeRoles = ['OWNER', 'MANAGER', 'COMPANY_ADMIN', 'AGENT'],
      departmentId,
      activeOnly = true,
      limit
    } = options;

    const VALID_USER_COMPANIES_ROLES = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];
    const requestedRoles = roles || includeRoles;
    const effectiveRoles = (Array.isArray(requestedRoles) ? requestedRoles : [requestedRoles])
      .map(r => String(r).toUpperCase().trim())
      .filter(r => VALID_USER_COMPANIES_ROLES.includes(r));

    const finalRoles = effectiveRoles.length ? effectiveRoles : ['OWNER', 'MANAGER', 'COMPANY_ADMIN', 'AGENT'];

    const userCompanyWhere = {
      companyId,
      ...(activeOnly ? { isActive: true } : {}),
      role: { in: finalRoles }
    };

    const userSearchWhere = {
      ...(activeOnly ? { isActive: true } : {})
    };

    if (departmentId) {
      userSearchWhere.departmentId = departmentId;
    }

    if (search && search.trim()) {
      userSearchWhere.OR = [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const members = await this.prisma.userCompany.findMany({
      where: {
        ...userCompanyWhere,
        user: userSearchWhere
      },
      ...(limit ? { take: limit } : {}),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            role: true,
            employeeNumber: true,
            departmentId: true,
            positionId: true,
            phone: true,
            departmentRelation: { select: { id: true, name: true } },
            positionRelation: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // جلب بيانات الـ HR المكملة (إن وجدت)
    const userIds = members.map(m => m.userId);
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        userId: { in: userIds }
      },
      select: {
        id: true,
        userId: true,
        employeeNumber: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } }
      }
    });

    const safeEmployees = Array.isArray(employees) ? employees : [];
    const empMap = new Map(safeEmployees.map(e => [e.userId, e]));

    return members.map(m => {
      const u = m.user;
      const emp = empMap.get(m.userId);
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

      return {
        id: u.id,
        userId: u.id,
        employeeId: emp?.id || null,
        name: fullName,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: m.role || u.role,
        employeeNumber: emp?.employeeNumber || u.employeeNumber || null,
        department: emp?.department?.name || u.departmentRelation?.name || null,
        position: emp?.position?.title || u.positionRelation?.title || null,
        avatar: u.avatar || null
      };
    });
  }

  /**
   * فحص وإصلاح بيانات موظفي شركة بالكامل (Self-Healing Reconcile)
   */
  async reconcileCompanyStaff(companyId, { dryRun = false } = {}) {
    if (!companyId) throw new Error('companyId مطلوب للمطابقة');

    // 1. جلب كافة المستخدمين المرتبطين بالشركة
    const [directUsers, companyMembers] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true }
      }),
      this.prisma.userCompany.findMany({
        where: { companyId },
        select: { userId: true, role: true, isActive: true }
      })
    ]);

    const allUserIds = new Set([
      ...directUsers.map(u => u.id),
      ...companyMembers.map(m => m.userId)
    ]);

    let healedCount = 0;
    const details = [];

    for (const userId of allUserIds) {
      try {
        if (!dryRun) {
          await this.syncStaffRecord(companyId, userId);
        }
        healedCount++;
        details.push({ userId, status: 'SYNCED' });
      } catch (err) {
        details.push({ userId, status: 'ERROR', error: err.message });
      }
    }

    return {
      success: true,
      companyId,
      totalUsers: allUserIds.size,
      totalScanned: allUserIds.size,
      synced: healedCount,
      healedCount,
      dryRun,
      details
    };
  }
}

// Singleton instance
const staffSyncService = new StaffSyncService();

module.exports = staffSyncService;
module.exports.StaffSyncService = StaffSyncService;
