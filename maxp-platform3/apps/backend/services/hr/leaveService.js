/**
 * 🏖️ Leave Service
 * خدمة إدارة الإجازات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validateLeaveData } = require('../../utils/hrValidation');
const auditService = require('./auditService');
const {
  NotFoundError,
  InsufficientLeaveBalanceError,
  LeaveOverlapError,
  LeaveError
} = require('../../utils/hrErrors');
const whatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
const hrNotificationService = require('./hrNotificationService');

class LeaveService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء طلب إجازة
   */
  async createLeaveRequest(companyId, employeeId, data) {
    try {
      // التحقق من صحة البيانات
      validateLeaveData(data);

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // حساب عدد الأيام
      const totalDays = await this.calculateWorkingDays(companyId, startDate, endDate, data.isHalfDay);

      // التحقق من وجود الموظف وأنه ينتمي للشركة
      console.log('🔍 [Debug Leave] Employee lookup params:', { employeeId, companyId });

      const employee = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          companyId: companyId
        }
      });

      console.log('🔍 [Debug Leave] Employee lookup result:', {
        employeeId,
        companyId,
        found: !!employee,
        employeeId: employee?.id,
        employeeCompanyId: employee?.companyId
      });

      if (!employee) {
        // Additional debugging: check if employee exists at all
        const employeeAnyCompany = await this.prisma.user.findUnique({
          where: { id: employeeId },
          select: { id: true, companyId: true, firstName: true, lastName: true }
        });

        console.log('🔍 [Debug Leave] Employee in any company:', employeeAnyCompany);

        if (employeeAnyCompany) {
          throw new NotFoundError(`الموظف موجود لكن ينتمي لشركة أخرى`, employeeId);
        } else {
          throw new NotFoundError('الموظف', employeeId);
        }
      }

      // التحقق من الرصيد حسب نوع الإجازة
      if (data.type === 'ANNUAL' && employee.annualLeaveBalance < totalDays) {
        throw new InsufficientLeaveBalanceError(
          'الإجازات السنوية',
          totalDays,
          employee.annualLeaveBalance
        );
      }

      if (data.type === 'SICK' && employee.sickLeaveBalance < totalDays) {
        throw new InsufficientLeaveBalanceError(
          'الإجازات المرضية',
          totalDays,
          employee.sickLeaveBalance
        );
      }

      // التحقق من عدم وجود تداخل مع إجازات أخرى
      const overlapping = await this.prisma.leaveRequest.findFirst({
        where: {
          userId: employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      if (overlapping) {
        throw new LeaveOverlapError(overlapping);
      }

      console.log('🔍 [Debug Leave] Creating leave request with:', {
        companyId,
        userId: employeeId,
        employeeId: employee.id,
        employeeCompanyId: employee.companyId,
        type: data.type,
        startDate,
        endDate
      });

      // Double-check user exists directly in database before creating
      // This helps catch any database sync issues
      const userExists = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true }
      });

      if (!userExists) {
        console.error('❌ [Debug Leave] User not found in database before create:', employeeId);
        throw new NotFoundError('الموظف', employeeId);
      }

      const leaveRequest = await this.prisma.leaveRequest.create({
        data: {
          companyId,
          userId: employeeId,
          type: data.type,
          startDate,
          endDate,
          totalDays,
          isHalfDay: data.isHalfDay || false,
          halfDayPeriod: data.halfDayPeriod,
          reason: data.reason,
          attachments: data.attachments ? JSON.stringify(data.attachments) : null,
          substituteId: data.substituteId,
          status: 'PENDING'
        }
      });

      // Send WhatsApp notification to owner
      setImmediate(async () => {
        try {
          const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'موظف';
          let leaveTypeName = data.type === 'ANNUAL' ? 'سنوية' : data.type === 'SICK' ? 'مرضية' : data.type === 'UNPAID' ? 'غير مدفوعة' : 'أخرى';
          await hrNotificationService.notifyHrEvent({
            companyId,
            notificationKey: 'notifyOnLeaveRequest',
            employeeUserId: employeeId,
            includeManagers: true,
            title: 'طلب إجازة جديد',
            message: `قدّم ${employeeName} طلب إجازة ${leaveTypeName} من ${new Date(startDate).toLocaleDateString('ar-EG')} إلى ${new Date(endDate).toLocaleDateString('ar-EG')} لمدة ${totalDays} يوم.`,
            type: 'HR_LEAVE_REQUEST',
            data: {
              leaveRequestId: leaveRequest.id,
              employeeId,
              leaveType: data.type,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              totalDays,
              isHalfDay: Boolean(data.isHalfDay)
            },
            whatsApp: {
              employeeName,
              actionId: 'LEAVE',
              actionName: 'طلب إجازة',
              details: `النوع: ${leaveTypeName}\nالمدة: ${totalDays} يوم\nمن: ${new Date(startDate).toLocaleDateString('ar-EG')} إلى: ${new Date(endDate).toLocaleDateString('ar-EG')}\nالسبب: ${data.reason || 'غير محدد'}`,
              requiresApproval: true
            }
          });
        } catch (waOwnerError) {
          console.error('❌ [Leave-Owner-Notify] Error:', waOwnerError);
        }
      });

      return leaveRequest;
    } catch (error) {
      console.error('❌ Error creating leave request:', error);

      // Handle foreign key constraint errors specifically
      if (error.code === 'P2003') {
        const constraintField = error.meta?.field_name || error.meta?.constraint?.[0];
        console.error('❌ Foreign key constraint violation:', {
          code: error.code,
          field: constraintField,
          constraint: error.meta?.constraint,
          employeeId: employeeId
        });

        if (constraintField === 'userId' || error.meta?.constraint?.includes('userId')) {
          console.error('❌ User ID foreign key constraint failed');
          console.error('❌ This usually means:');
          console.error('   1. The user does not exist in the database');
          console.error('   2. The foreign key constraint is misconfigured');
          console.error('   3. Database schema is out of sync');
          throw new NotFoundError('الموظف غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات', employeeId);
        }
      }

      throw error;
    }
  }

  /**
   * جلب طلبات الإجازات
   */
  async getLeaveRequests(companyId, options = {}) {
    try {
      const {
        employeeId,
        status,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = {};

      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }

      if (status) where.status = status;
      if (type) where.type = type;

      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = new Date(startDate);
        if (endDate) where.startDate.lte = new Date(endDate);
      }

      // Filter out orphaned records by ensuring userId exists in User table
      // This prevents Prisma errors when including the user relation
      const userWhere = {};
      if (companyId) {
        userWhere.companyId = companyId;
      }
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      // Handle userId filter: if employeeId is provided, verify it's valid
      if (employeeId) {
        if (validUserIdList.includes(employeeId)) {
          where.userId = employeeId;
        } else {
          // Requested employeeId doesn't exist, return empty result
          return {
            requests: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      } else {
        // Only include leave requests with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          // No valid users found, return empty result
          return {
            requests: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      }

      const [requests, total] = await Promise.all([
        this.prisma.leaveRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        this.prisma.leaveRequest.count({ where })
      ]);

      // Fetch user data separately since user relation is commented out in schema
      const userIds = [...new Set(requests.map(r => r.userId))];
      const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];

      const [users, approvers] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            departmentRelation: {
              select: { id: true, name: true }
            }
          }
        }),
        approverIds.length > 0 ? this.prisma.user.findMany({
          where: { id: { in: approverIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }) : []
      ]);

      const usersMap = new Map(users.map(u => [u.id, u]));
      const approversMap = new Map(approvers.map(a => [a.id, a]));

      // Map user data to requests
      const mappedRequests = requests.map(request => {
        const user = usersMap.get(request.userId);
        const approver = request.approvedBy ? approversMap.get(request.approvedBy) : null;

        return {
          ...request,
          employee: user ? {
            ...user,
            department: user.departmentRelation
          } : null,
          approver: approver || null
        };
      });

      return {
        requests: mappedRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting leave requests:', error);
      throw error;
    }
  }

  /**
   * جلب آخر طلبات الإجازات للموظف
   */
  async getRecentLeavesForEmployee(companyId, employeeId, limit = 5) {
    try {
      const leaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return leaves;
    } catch (error) {
      console.error('❌ Error getting recent leaves for employee:', error);
      throw error;
    }
  }

  /**
   * جلب طلب إجازة بالـ ID
   */
  async getLeaveRequestById(companyId, requestId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      return request;
    } catch (error) {
      console.error('❌ Error getting leave request:', error);
      throw error;
    }
  }

  /**
   * الموافقة على طلب إجازة
   */
  async approveLeaveRequest(companyId, requestId, approverEmployeeId, approverUserId = null) {
    try {
      console.log(`🔍 [LEAVE-APPROVE] Starting approval for request ${requestId} by employee ${approverEmployeeId}`);

      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      // السماح بالموافقة على الطلبات قيد الانتظار أو المرفوضة فقط
      if (request.status !== 'PENDING' && request.status !== 'REJECTED') {
        throw new Error('لا يمكن الموافقة على هذا الطلب - الطلب موافق عليه مسبقاً');
      }

      // 🛡️ Security Check: Prevent Self-Approval (unless user is COMPANY_ADMIN or SUPER_ADMIN)
      if (request.userId === approverEmployeeId) {
        console.log(`⚠️ [LEAVE-APPROVE] Self-approval detected. Request userId: ${request.userId}, Approver employeeId: ${approverEmployeeId}`);
        console.log(`🔍 [LEAVE-APPROVE] Checking approver role. approverUserId: ${approverUserId}`);

        // Check if approver is COMPANY_ADMIN or SUPER_ADMIN
        let isAdmin = false;
        if (approverUserId) {
          const approverUser = await this.prisma.user.findUnique({
            where: { id: approverUserId },
            select: { role: true, email: true }
          });

          console.log(`👤 [LEAVE-APPROVE] Approver user: ${approverUser?.email}, Role: ${approverUser?.role}`);

          isAdmin = approverUser?.role === 'COMPANY_ADMIN' || approverUser?.role === 'SUPER_ADMIN';
        } else {
          console.warn(`⚠️ [LEAVE-APPROVE] approverUserId is null/undefined - cannot check admin status`);
        }

        if (!isAdmin) {
          console.error(`❌ [LEAVE-APPROVE] Self-approval blocked - user is not COMPANY_ADMIN or SUPER_ADMIN`);
          throw new Error('لا يمكنك الموافقة على طلب الإجازة الخاص بك (مطلوب مدير آخر)');
        } else {
          console.log(`✅ [LEAVE-APPROVE] Admin user approving their own leave request - allowed`);
        }
      }

      console.log(`✅ [LEAVE-APPROVE] Request validated: ${request.type} from ${request.startDate} to ${request.endDate}`);

      // تحديث الطلب
      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedBy: approverEmployeeId,
          approvedAt: new Date()
        }
      });

      // Note: annualLeaveBalance and sickLeaveBalance are not in User model
      // Leave balance should be calculated from LeaveRequest records instead

      // إنشاء سجلات حضور للإجازة
      try {
        const dates = this.getDateRange(request.startDate, request.endDate);
        for (const date of dates) {
          // Ensure date is a Date object with only date part (no time)
          const dateOnly = new Date(date);
          dateOnly.setHours(0, 0, 0, 0);

          try {
            await this.prisma.attendance.upsert({
              where: {
                userId_date: {
                  userId: request.userId,
                  date: dateOnly
                }
              },
              create: {
                companyId,
                userId: request.userId,
                date: dateOnly,
                status: 'ON_LEAVE',
                notes: `إجازة ${this.getLeaveTypeName(request.type)}`
              },
              update: {
                status: 'ON_LEAVE',
                notes: `إجازة ${this.getLeaveTypeName(request.type)}`
              }
            });
          } catch (attendanceError) {
            console.error(`❌ Error creating attendance for date ${dateOnly.toISOString()}:`, attendanceError);
            // Continue with other dates even if one fails
          }
        }
      } catch (dateRangeError) {
        console.error('❌ Error getting date range:', dateRangeError);
        // Don't throw - attendance records are secondary to approval
      }

      // 🔗 تسجيل خصم توضيحي للإجازة غير المدفوعة ليظهر في شاشة الخصومات (بدون مضاعفة الخصم في كشف الرواتب)
      if (request.type === 'UNPAID') {
        try {
          const employeeRecord = await this.prisma.employee.findFirst({
            where: { userId: request.userId, companyId },
            select: { id: true, baseSalary: true }
          });

          if (employeeRecord) {
            const settings = await this.prisma.hRSettings.findUnique({
              where: { companyId },
              select: { workingDaysPerMonth: true }
            });

            const workingDaysPerMonth = settings?.workingDaysPerMonth
              ? parseFloat(settings.workingDaysPerMonth)
              : 22;
            const dailyRate =
              workingDaysPerMonth > 0
                ? (parseFloat(employeeRecord.baseSalary || 0) / workingDaysPerMonth)
                : 0;

            const totalDays = request.totalDays || 0;
            const amount = Number((dailyRate * totalDays).toFixed(2));
            const start = new Date(request.startDate);
            const end = new Date(request.endDate);
            const desc = `إجازة غير مدفوعة الأجر من ${start.toISOString().split('T')[0]} إلى ${end.toISOString().split('T')[0]}`;

            // إزالة أي سجل سابق لنفس الطلب لتفادي التكرار
            await this.prisma.manualDeduction.deleteMany({
              where: {
                companyId,
                employeeId: employeeRecord.id,
                notes: { contains: `LeaveRequest:${request.id}` }
              }
            });

            await this.prisma.manualDeduction.create({
              data: {
                companyId,
                employeeId: employeeRecord.id,
                type: 'ABSENCE',
                category: 'UNPAID_LEAVE',
                amount,
                reason: `إجازة غير مدفوعة (${totalDays} يوم)`,
                description: desc,
                date: start,
                effectiveMonth: start.getMonth() + 1,
                effectiveYear: start.getFullYear(),
                status: 'APPROVED',
                approvedBy: approverEmployeeId,
                approvedAt: new Date(),
                appliedToPayroll: false, // الخصم المالي يُحتسب بالفعل في كشف الرواتب
                notes: `LeaveRequest:${request.id}`,
                createdBy: approverUserId || 'SYSTEM'
              }
            });
          } else {
            console.warn('[LEAVE-APPROVE] No employee record found to log unpaid leave deduction');
          }
        } catch (deductionError) {
          console.error('❌ [LEAVE-APPROVE] Failed to log unpaid leave deduction:', deductionError);
        }
      }

      // 📝 Audit Log: تسجيل الموافقة
      try {
        // Use provided userId or use approverEmployeeId directly (it's already a userId)
        let actorUserId = approverUserId || approverEmployeeId;

        if (actorUserId) {
          await auditService.logAction(
            companyId,
            actorUserId,
            'APPROVE',
            'LEAVE',
            requestId,
            {
              leaveType: request.type,
              totalDays: request.totalDays,
              startDate: request.startDate,
              endDate: request.endDate,
              employeeId: request.userId,
              approverEmployeeId: approverEmployeeId
            }
          );
        }
      } catch (auditError) {
        console.error('❌ Error creating audit log:', auditError);
        // Don't throw - audit log is secondary to approval
      }

      // 📢 إرسال إشعار الواتساب للموظف (في الخلفية لتجنب التأخير للمسؤول)
      setImmediate(async () => {
        try {
          // جلب بيانات الموظف (بما في ذلك الهاتف)
          const employeeData = await this.prisma.user.findUnique({
            where: { id: updated.userId },
            select: { id: true, firstName: true, phone: true }
          });

          if (employeeData && employeeData.phone) {
            await whatsAppNotificationService.sendLeaveApprovalNotification({
              ...updated,
              user: employeeData
            }, true);
          }
        } catch (waError) {
          console.error('❌ [Leave-Approve] Error sending WhatsApp notification:', waError);
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error approving leave request:', error);
      throw error;
    }
  }

  /**
   * رفض طلب إجازة
   */
  async rejectLeaveRequest(companyId, requestId, approverId, reason) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      // السماح برفض الطلبات قيد الانتظار أو الموافق عليها فقط
      if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
        throw new Error('لا يمكن رفض هذا الطلب - الطلب مرفوض مسبقاً');
      }

      // إذا كان الطلب موافق عليه مسبقاً، نحذف سجلات الحضور
      if (request.status === 'APPROVED') {
        try {
          await this.prisma.attendance.deleteMany({
            where: {
              userId: request.userId,
              date: {
                gte: request.startDate,
                lte: request.endDate
              },
              status: 'ON_LEAVE'
            }
          });
          console.log(`✅ [LEAVE-REJECT] Deleted attendance records for approved leave`);
        } catch (attendanceError) {
          console.error('❌ Error deleting attendance records:', attendanceError);
          // Don't throw - continue with rejection
        }
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: reason
        }
      });

      // 📝 Audit Log: تسجيل الرفض
      await auditService.logAction(
        companyId,
        approverId,
        'REJECT',
        'LEAVE',
        requestId,
        {
          leaveType: request.type,
          totalDays: request.totalDays,
          rejectionReason: reason,
          employeeId: request.userId
        }
      );


      // 📢 إرسال إشعار الواتساب للموظف (في الخلفية لتجنب التأخير للمسؤول)
      setImmediate(async () => {
        try {
          // جلب بيانات الموظف (بما في ذلك الهاتف)
          const employeeData = await this.prisma.user.findUnique({
            where: { id: updated.userId },
            select: { id: true, firstName: true, phone: true }
          });

          if (employeeData && employeeData.phone) {
            await whatsAppNotificationService.sendLeaveApprovalNotification({
              ...updated,
              user: employeeData
            }, false);
          }
        } catch (waError) {
          console.error('❌ [Leave-Reject] Error sending WhatsApp notification:', waError);
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error rejecting leave request:', error);
      throw error;
    }
  }

  /**
   * إعادة فتح طلب إجازة مرفوض
   */
  async reopenLeaveRequest(companyId, requestId, approverId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      if (request.status !== 'REJECTED') {
        throw new Error('لا يمكن إعادة فتح هذا الطلب - يجب أن يكون مرفوضاً');
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'PENDING',
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null
        }
      });

      // 📝 Audit Log: تسجيل إعادة فتح الطلب
      await auditService.logAction(
        companyId,
        approverId,
        'REOPEN',
        'LEAVE',
        requestId,
        {
          leaveType: request.type,
          totalDays: request.totalDays,
          employeeId: request.userId
        }
      );

      return updated;
    } catch (error) {
      console.error('❌ Error reopening leave request:', error);
      throw error;
    }
  }

  /**
   * تحديث طلب إجازة
   */
  async updateLeaveRequest(companyId, requestId, data, approverId) {
    try {
      // التحقق من صحة البيانات
      validateLeaveData(data);

      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // حساب عدد الأيام
      const totalDays = await this.calculateWorkingDays(companyId, startDate, endDate, data.isHalfDay);

      // التحقق من عدم وجود تداخل مع إجازات أخرى
      const overlapping = await this.prisma.leaveRequest.findFirst({
        where: {
          userId: request.userId,
          id: { not: requestId }, // استثناء الطلب الحالي
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      if (overlapping) {
        throw new LeaveOverlapError(
          new Date(overlapping.startDate).toLocaleDateString(),
          new Date(overlapping.endDate).toLocaleDateString()
        );
      }

      // تحديث الطلب
      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          type: data.type,
          startDate: startDate,
          endDate: endDate,
          totalDays: totalDays,
          reason: data.reason,
          isHalfDay: data.isHalfDay || false,
          halfDayPeriod: data.halfDayPeriod || null
        }
      });

      // 📝 Audit Log: تسجيل تحديث الطلب
      await auditService.logAction(
        companyId,
        approverId,
        'UPDATE',
        'LEAVE',
        requestId,
        {
          leaveType: data.type,
          totalDays: totalDays,
          startDate: startDate,
          endDate: endDate,
          employeeId: request.userId
        }
      );

      return updated;
    } catch (error) {
      console.error('❌ Error updating leave request:', error);
      throw error;
    }
  }

  /**
   * إلغاء طلب إجازة
   */
  async cancelLeaveRequest(companyId, requestId, employeeId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId, userId: employeeId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      if (request.status === 'CANCELLED') {
        throw new Error('الطلب ملغي مسبقاً');
      }

      // إذا كان معتمداً، نرجع الرصيد ونحذف سجلات الحضور
      if (request.status === 'APPROVED') {
        await this.prisma.attendance.deleteMany({
          where: {
            userId: employeeId,
            date: {
              gte: request.startDate,
              lte: request.endDate
            },
            status: 'ON_LEAVE'
          }
        });
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' }
      });

      // 📝 Audit Log: تسجيل الإلغاء
      try {
        await auditService.logAction(
          companyId,
          employeeId,
          'CANCEL',
          'LEAVE',
          requestId,
          {
            leaveType: request.type,
            totalDays: request.totalDays,
            startDate: request.startDate,
            endDate: request.endDate,
            employeeId: request.userId
          }
        );
      } catch (auditError) {
        console.error('❌ Error creating audit log for leave cancellation:', auditError);
      }

      return updated;
    } catch (error) {
      console.error('❌ Error cancelling leave request:', error);
      throw error;
    }
  }

  /**
   * حذف طلب إجازة نهائياً
   */
  async deleteLeaveRequest(companyId, requestId, actorUserId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        const notFoundError = new Error('طلب الإجازة غير موجود');
        notFoundError.statusCode = 404;
        throw notFoundError;
      }

      if (request.status === 'APPROVED') {
        await this.prisma.attendance.deleteMany({
          where: {
            userId: request.userId,
            date: {
              gte: request.startDate,
              lte: request.endDate
            },
            status: 'ON_LEAVE'
          }
        });
      }

      await this.prisma.manualDeduction.deleteMany({
        where: {
          companyId,
          notes: { contains: `LeaveRequest:${request.id}` }
        }
      });

      const deletedRequest = await this.prisma.leaveRequest.delete({
        where: { id: requestId }
      });

      try {
        await auditService.logAction(
          companyId,
          actorUserId,
          'DELETE',
          'LEAVE',
          requestId,
          {
            leaveType: request.type,
            totalDays: request.totalDays,
            startDate: request.startDate,
            endDate: request.endDate,
            employeeId: request.userId,
            previousStatus: request.status
          }
        );
      } catch (auditError) {
        console.error('❌ Error creating audit log for leave deletion:', auditError);
      }

      return deletedRequest;
    } catch (error) {
      console.error('❌ Error deleting leave request:', error);
      throw error;
    }
  }

  /**
   * جلب رصيد الإجازات
   */
  async getLeaveBalance(companyId, employeeId) {
    try {
      // Calculate leave balance from LeaveRequest records
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      // Calculate balances from actual leave requests
      const approvedLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          userId: employeeId,
          companyId,
          status: 'APPROVED'
        },
        select: {
          type: true,
          totalDays: true
        }
      });

      const annualLeaveBalance = 21 - approvedLeaves
        .filter(l => l.type === 'ANNUAL')
        .reduce((sum, l) => sum + l.totalDays, 0);

      const sickLeaveBalance = 7 - approvedLeaves
        .filter(l => l.type === 'SICK')
        .reduce((sum, l) => sum + l.totalDays, 0);

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      // حساب الإجازات المستخدمة هذا العام
      const year = new Date().getFullYear();
      const usedLeaves = await this.prisma.leaveRequest.groupBy({
        by: ['type'],
        where: {
          userId: employeeId,
          status: 'APPROVED',
          startDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        },
        _sum: { totalDays: true }
      });

      const usedAnnual = usedLeaves.find(l => l.type === 'ANNUAL')?._sum.totalDays || 0;
      const usedSick = usedLeaves.find(l => l.type === 'SICK')?._sum.totalDays || 0;

      return {
        annual: {
          balance: employee.annualLeaveBalance,
          used: usedAnnual,
          total: employee.annualLeaveBalance + usedAnnual
        },
        sick: {
          balance: employee.sickLeaveBalance,
          used: usedSick,
          total: employee.sickLeaveBalance + usedSick
        }
      };
    } catch (error) {
      console.error('❌ Error getting leave balance:', error);
      throw error;
    }
  }

  /**
   * تقويم الإجازات
   */
  async getLeaveCalendar(companyId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const leaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          status: 'APPROVED',
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      return leaves;
    } catch (error) {
      console.error('❌ Error getting leave calendar:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الإجازات
   */
  async getLeaveStats(companyId, year) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const [
        byType,
        byStatus,
        byMonth,
        pendingCount
      ] = await Promise.all([
        this.prisma.leaveRequest.groupBy({
          by: ['type'],
          where: {
            companyId,
            status: 'APPROVED',
            startDate: { gte: startDate, lte: endDate }
          },
          _sum: { totalDays: true },
          _count: true
        }),
        this.prisma.leaveRequest.groupBy({
          by: ['status'],
          where: {
            companyId,
            createdAt: { gte: startDate, lte: endDate }
          },
          _count: true
        }),
        this.prisma.$queryRaw`
          SELECT MONTH(startDate) as month, SUM(totalDays) as days
          FROM hr_leave_requests
          WHERE companyId = ${companyId}
            AND status = 'APPROVED'
            AND startDate >= ${startDate}
            AND startDate <= ${endDate}
          GROUP BY MONTH(startDate)
        `,
        this.prisma.leaveRequest.count({
          where: { companyId, status: 'PENDING' }
        })
      ]);

      return {
        year,
        byType,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byMonth,
        pendingCount
      };
    } catch (error) {
      console.error('❌ Error getting leave stats:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  async calculateWorkingDays(companyId, startDate, endDate, isHalfDay) {
    if (isHalfDay) return 0.5;

    // استرجاع أيام العمل من الإعدادات
    // الافتراضي هو استبعاد الجمعة والسبت [1,2,3,4,0] إذا لم توجد إعدادات
    let workDaysArray = [1, 2, 3, 4, 0];

    try {
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });
      if (settings && settings.workDays) {
        workDaysArray = JSON.parse(settings.workDays);
      }
    } catch (error) {
      console.warn('⚠️ [LeaveService] Could not fetch HR settings, using default work days:', error.message);
    }

    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // تحقق مما إذا كان اليوم هو يوم عمل حسب الإعدادات
      if (workDaysArray.includes(dayOfWeek)) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Reset time to midnight for accurate date comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  getLeaveTypeName(type) {
    const types = {
      ANNUAL: 'سنوية',
      SICK: 'مرضية',
      UNPAID: 'بدون راتب',
      MATERNITY: 'أمومة',
      PATERNITY: 'أبوة',
      BEREAVEMENT: 'عزاء',
      MARRIAGE: 'زواج',
      HAJJ: 'حج',
      STUDY: 'دراسية',
      EMERGENCY: 'طارئة',
      OTHER: 'أخرى'
    };
    return types[type] || type;
  }
}

module.exports = new LeaveService();
