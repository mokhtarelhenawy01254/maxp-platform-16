/**
 * 💰 Payroll Service
 * خدمة إدارة الرواتب
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validatePayrollData } = require('../../utils/hrValidation');
const rewardPayrollIntegrationService = require('./rewardPayrollIntegrationService');
const {
  NotFoundError,
  DuplicatePayrollError,
  PayrollAlreadyPaidError,
  PayrollError
} = require('../../utils/hrErrors');
const whatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
const hrNotificationService = require('./hrNotificationService');

class PayrollService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء كشف راتب
   */
  async createPayroll(companyId, employeeId, data, options = {}) {
    try {
      const { month, year } = data;
      const shouldNotify = options.notify !== false;

      // التحقق من صحة البيانات
      validatePayrollData({ month, year });

      // التحقق من عدم وجود كشف راتب لنفس الشهر
      const existing = await this.prisma.payroll.findFirst({
        where: { userId: employeeId, month, year }
      });

      if (existing) {
        throw new DuplicatePayrollError(month, year);
      }

      // حساب بيانات الراتب
      const payrollData = await this.calculatePayrollData(companyId, employeeId, month, year, data);

      // Find the employee record to link if it exists
      const [employeeRecord, employeeUser] = await Promise.all([
        this.prisma.employee.findFirst({
          where: { userId: employeeId, companyId }
        }),
        this.prisma.user.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        })
      ]);

      const payroll = await this.prisma.payroll.create({
        data: {
          companyId,
          userId: employeeId,
          employeeRelId: employeeRecord ? employeeRecord.id : null,
          month,
          year,
          periodStart: payrollData.periodStart,
          periodEnd: payrollData.periodEnd,
          baseSalary: payrollData.baseSalary,
          workingDays: payrollData.totalWorkingDaysInMonth,
          actualWorkDays: payrollData.presentDays,
          allowances: JSON.stringify(payrollData.allowances),
          totalAllowances: payrollData.totalAllowances,
          deductions: JSON.stringify(payrollData.deductions),
          totalDeductions: payrollData.totalDeductions,
          attendanceDeduction: payrollData.attendanceDeduction,
          absentDays: payrollData.absentDays,
          latePenalty: payrollData.latePenalty,
          overtimeHours: payrollData.totalOvertimeHours,
          overtimeRate: payrollData.overtimeRate,
          overtimeAmount: payrollData.overtimeAmount,
          bonuses: payrollData.bonuses,
          bonusNotes: data.bonusNotes,
          socialInsurance: payrollData.socialInsurance,
          taxAmount: payrollData.taxAmount,
          grossSalary: payrollData.grossSalary,
          netSalary: payrollData.netSalary,
          status: 'DRAFT',
          notes: data.notes
        }
      });

      // Link rewards to payroll and update their status
      if (payrollData.approvedRewards && payrollData.approvedRewards.length > 0) {
        await rewardPayrollIntegrationService.applyRewardsToPayroll(payroll.id, payrollData.approvedRewards);
      }

      if (shouldNotify) {
        setImmediate(async () => {
          try {
            const employeeName = employeeUser
              ? `${employeeUser.firstName || ''} ${employeeUser.lastName || ''}`.trim()
              : 'الموظف';

            await hrNotificationService.notifyHrEvent({
              companyId,
              notificationKey: 'notifyOnPayrollGeneration',
              employeeUserId: employeeId,
              includeManagers: true,
              title: 'تم إنشاء كشف راتب جديد',
              message: `تم إنشاء كشف راتب للموظف ${employeeName} عن ${month}/${year}.`,
              type: 'HR_PAYROLL_GENERATED',
              data: {
                payrollId: payroll.id,
                employeeId,
                month,
                year,
                generationMode: 'SINGLE'
              },
              whatsApp: {
                employeeName,
                actionId: 'PAYROLL',
                actionName: 'إنشاء كشف راتب',
                details: `تم إنشاء كشف راتب جديد للموظف ${employeeName} عن ${month}/${year}.`,
                requiresApproval: false
              }
            });
          } catch (notificationError) {
            console.error('❌ [Payroll] Failed to send HR payroll creation notification:', notificationError);
          }
        });
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error creating payroll:', error);
      throw error;
    }
  }

  /**
   * توليد كشوف رواتب لجميع الموظفين
   * @param {boolean} forceRegenerate - إذا كان true، يتم حذف كشوف الرواتب الموجودة وإعادة توليدها
   */
  async generateMonthlyPayroll(companyId, month, year, forceRegenerate = false) {
    try {
      const firstDayOfMonth = new Date(year, month - 1, 1);

      const employees = await this.prisma.user.findMany({
        where: {
          isActive: true, // Account itself must be active
          // ✅ FIX: Only include users who are ACTIVE in this company
          AND: {
            OR: [
              { companyId: companyId },
              { userCompanies: { some: { companyId, isActive: true } } }
            ]
          }
        }
      });

      const results = {
        success: [],
        failed: [],
        skipped: [],
        regenerated: []
      };

      // إذا كان forceRegenerate = true، نحذف كشوف الرواتب الموجودة أولاً
      if (forceRegenerate) {
        const deletedCount = await this.prisma.payroll.deleteMany({
          where: { companyId, month, year }
        });
        console.log(`🗑️ Deleted ${deletedCount.count} existing payrolls for ${month}/${year}`);
      }

      for (const employee of employees) {
        try {
          // تحقق من وجود كشف راتب سابق
          const existing = await this.prisma.payroll.findFirst({
            where: { userId: employee.id, month, year }
          });

          if (existing && !forceRegenerate) {
            // تخطي الموظف إذا كان لديه كشف راتب مسبقاً
            results.skipped.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              existingPayrollId: existing.id,
              message: 'كشف الراتب موجود مسبقاً'
            });
            continue;
          }

          const payroll = await this.createPayroll(companyId, employee.id, { month, year }, { notify: false });

          if (forceRegenerate && existing) {
            results.regenerated.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              payrollId: payroll.id
            });
          } else {
            results.success.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              payrollId: payroll.id
            });
          }
        } catch (error) {
          results.failed.push({
            userId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            error: error.message
          });
        }
      }

      if (results.success.length > 0 || results.regenerated.length > 0) {
        setImmediate(async () => {
          try {
            await hrNotificationService.notifyHrEvent({
              companyId,
              notificationKey: 'notifyOnPayrollGeneration',
              includeManagers: true,
              includeAllManagers: true,
              title: 'تم توليد كشوف الرواتب الشهرية',
              message: `تم توليد كشوف رواتب ${month}/${year} بنجاح. جديد: ${results.success.length}، معاد توليده: ${results.regenerated.length}، متخطى: ${results.skipped.length}، فشل: ${results.failed.length}.`,
              type: 'HR_PAYROLL_GENERATED',
              data: {
                month,
                year,
                generationMode: forceRegenerate ? 'BULK_REGENERATE' : 'BULK',
                successCount: results.success.length,
                regeneratedCount: results.regenerated.length,
                skippedCount: results.skipped.length,
                failedCount: results.failed.length
              },
              whatsApp: {
                employeeName: 'نظام الرواتب',
                actionId: 'PAYROLL',
                actionName: 'توليد كشوف الرواتب',
                details: `تم توليد كشوف رواتب ${month}/${year}.\nجديد: ${results.success.length}\nمعاد توليده: ${results.regenerated.length}\nمتخطى: ${results.skipped.length}\nفشل: ${results.failed.length}`,
                requiresApproval: false
              }
            });
          } catch (notificationError) {
            console.error('❌ [Payroll] Failed to send HR payroll generation notification:', notificationError);
          }
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Error generating monthly payroll:', error);
      throw error;
    }
  }

  /**
   * جلب كشوف الرواتب
   */
  async getPayrolls(companyId, options = {}) {
    try {
      const {
        employeeId,
        month,
        year,
        status,
        page = 1,
        limit = 20
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = { companyId };

      if (month) where.month = parseInt(month);
      if (year) where.year = parseInt(year);
      if (status) where.status = status;

      // ✅ ENHANCED: Only use validUserIdList to filter if companyId is NOT enough
      // The companyId in the Payroll table is already an RLS filter, but validUserIdList
      // ensures we don't show orphaned records from other companies if RLS is off.
      // HOWEVER, we should NOT filter out users who were terminated (removed from userCompanies)
      // but have historical records.

      let validUserIdList = [];
      try {
        const validUsers = await this.prisma.user.findMany({
          where: {
            OR: [
              { userCompanies: { some: { companyId } } },
              { companyId: companyId } // Some users might have direct companyId
            ]
          },
          select: { id: true }
        });
        validUserIdList = validUsers.map(u => u.id);
      } catch (e) {
        console.warn('⚠️ [getPayrolls] Failed to fetch valid user list:', e.message);
      }

      // Only filter by validUserIdList if it's not empty
      if (employeeId) {
        where.userId = employeeId;
      } else if (validUserIdList.length > 0) {
        // We still use this to prevent cross-tenant leakage if RLS is bypassed
        where.userId = { in: validUserIdList };
      }

      const [payrolls, total] = await Promise.all([
        this.prisma.payroll.findMany({
          where,
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        this.prisma.payroll.count({ where })
      ]);

      // Fetch user data separately since user relation is commented out in schema
      const userIds = [...new Set(payrolls.map(p => p.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          avatar: true,
          baseSalary: true,
          departmentRelation: {
            select: { name: true }
          },
          positionRelation: {
            select: { title: true }
          }
        }
      });

      // Fetch employee details (bank info)
      const employeeDetails = await this.prisma.employee.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          bankName: true,
          bankAccountNumber: true,
          bankIban: true
        }
      });

      const employeeMap = new Map(employeeDetails.map(e => [e.userId, e]));
      const usersMap = new Map(users.map(u => [u.id, u]));

      // Map user data to payrolls
      const mappedPayrolls = payrolls.map(payroll => {
        const user = usersMap.get(payroll.userId);
        const empDetails = employeeMap.get(payroll.userId);

        // Robust conversion from Decimal to Number
        const userBaseSalary = user?.baseSalary ? Number(user.baseSalary) : null;

        if (user?.firstName === 'Habiba' && user?.lastName === 'Sobhy') {
          console.log('🔍 [PAYROLL-HABIBA] Found Habiba Sobhy:', {
            payrollId: payroll.id,
            payrollBaseSalary: payroll.baseSalary,
            userBaseSalary: user.baseSalary,
            convertedUserBaseSalary: userBaseSalary
          });
        }

        return {
          ...payroll,
          fullMonthBaseSalary: userBaseSalary || Number(payroll.baseSalary),
          employee: user ? {
            ...user,
            department: user.departmentRelation,
            position: user.positionRelation,
            bankName: empDetails?.bankName || null,
            bankAccountNumber: empDetails?.bankAccountNumber || null,
            bankIban: empDetails?.bankIban || null
          } : null
        };
      });

      return {
        payrolls: mappedPayrolls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting payrolls:', error);
      throw error;
    }
  }

  /**
   * جلب كشف راتب بالـ ID
   */
  async getPayrollById(companyId, payrollId) {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (payroll) {
        // تحويل JSON strings إلى objects
        payroll.allowances = JSON.parse(payroll.allowances || '{}');
        payroll.deductions = JSON.parse(payroll.deductions || '{}');
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error getting payroll:', error);
      throw error;
    }
  }

  // ---

  async getEmployeePayrollByMonth(companyId, employeeId, month, year) {
    try {
      const prisma = this.prisma; // Capture prisma reference

      console.log(`🔍 [getEmployeePayrollByMonth] Looking for payroll: companyId=${companyId}, employeeId=${employeeId}, month=${month}, year=${year}`);

      const payroll = await prisma.payroll.findFirst({
        where: {
          companyId,
          userId: employeeId,
          month,
          year
        },
        include: {
          employeeRel: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              baseSalary: true,
              bankName: true,
              bankAccountNumber: true,
              bankIban: true,
              department: { select: { name: true } },
              position: { select: { title: true } }
            }
          }
        }
      });

      if (!payroll) {
        console.log(`⚠️ [getEmployeePayrollByMonth] No payroll found for employee ${employeeId} for ${month}/${year}`);
        return null;
      }

      // ✅ FIX: Fallback to User table if employeeRel is missing
      if (!payroll.employeeRel) {
        const user = await prisma.user.findUnique({
          where: { id: payroll.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            avatar: true,
            baseSalary: true,
            bankName: true,
            bankAccountNumber: true
          }
        });

        if (user) {
          // Map User to the expected Employee format for frontend
          payroll.employee = {
            ...user,
            department: { name: '-' },
            position: { title: '-' }
          };
        }
      } else {
        payroll.employee = payroll.employeeRel;
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error getting payroll by month for employee:', error);
      throw error;
    }
  }

  /**
   * تحديث كشف راتب
   */
  async updatePayroll(companyId, payrollId, data) {
    try {
      const existing = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (!existing) {
        throw new Error('كشف الراتب غير موجود');
      }

      if (existing.status === 'PAID') {
        throw new Error('لا يمكن تعديل كشف راتب مدفوع');
      }

      // إعادة حساب الإجماليات إذا تغيرت البدلات أو الخصومات
      let updateData = { ...data };

      if (data.allowances) {
        updateData.allowances = JSON.stringify(data.allowances);
        updateData.totalAllowances = Object.values(data.allowances).reduce((sum, val) =>
          sum + (parseFloat(val) || 0), 0
        );
      }

      if (data.deductions) {
        let existingDeductions = {};
        try {
          existingDeductions = existing.deductions ? JSON.parse(existing.deductions) : {};
        } catch (e) {
          console.warn('⚠️ [updatePayroll] Failed to parse existing deductions');
        }

        const newDeductions = typeof data.deductions === 'string' ? JSON.parse(data.deductions) : data.deductions;

        const mergedDeductions = { ...newDeductions };

        // Preserve auto-calculated keys that should never be lost on manual edit
        const preserveKeys = ['details', 'manualDetails', 'capNotes', 'advanceDetails', 'غياب وتأخير', 'سلف'];
        preserveKeys.forEach(key => {
          const isMissingFromNew = mergedDeductions[key] === undefined || mergedDeductions[key] === null || (typeof mergedDeductions[key] === 'number' && isNaN(mergedDeductions[key]));
          if (isMissingFromNew && existingDeductions[key] !== undefined) {
            mergedDeductions[key] = existingDeductions[key];
          }
        });

        // Clean up any NaN values that may come from the frontend
        Object.keys(mergedDeductions).forEach(key => {
          if (typeof mergedDeductions[key] === 'number' && isNaN(mergedDeductions[key])) {
            delete mergedDeductions[key];
          }
        });

        updateData.deductions = JSON.stringify(mergedDeductions);
        updateData.totalDeductions = Object.values(mergedDeductions).reduce((sum, val) => {
          if (Array.isArray(val) || typeof val === 'string') return sum;
          return sum + (parseFloat(val) || 0);
        }, 0);
      }

      // إعادة حساب الإجماليات
      const baseSalary = parseFloat(data.baseSalary !== undefined ? data.baseSalary : existing.baseSalary);
      const totalAllowances = updateData.totalAllowances !== undefined ? updateData.totalAllowances : parseFloat(existing.totalAllowances || 0);
      const totalDeductions = updateData.totalDeductions !== undefined ? updateData.totalDeductions : parseFloat(existing.totalDeductions || 0);
      const overtimeAmount = parseFloat(data.overtimeAmount !== undefined ? data.overtimeAmount : existing.overtimeAmount);
      const bonuses = parseFloat(data.bonuses !== undefined ? data.bonuses : existing.bonuses);
      const socialInsurance = parseFloat(data.socialInsurance !== undefined ? data.socialInsurance : existing.socialInsurance);
      const taxAmount = parseFloat(data.taxAmount !== undefined ? data.taxAmount : existing.taxAmount);

      updateData.grossSalary = baseSalary + totalAllowances + overtimeAmount + bonuses;
      updateData.netSalary = Math.max(0, updateData.grossSalary - totalDeductions - socialInsurance - taxAmount);

      const payroll = await this.prisma.payroll.update({
        where: { id: payrollId },
        data: updateData,
        include: {
          employeeRel: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              avatar: true,
              department: { select: { name: true } },
              position: { select: { title: true } }
            }
          }
        }
      });

      // Map employeeRel to employee for frontend compatibility
      if (payroll && payroll.employeeRel) {
        payroll.employee = payroll.employeeRel;
        // delete payroll.employeeRel; // Optional, but keeps it clean
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error updating payroll:', error);
      throw error;
    }
  }

  /**
   * اعتماد كشف راتب
   */
  async approvePayroll(companyId, payrollId) {
    try {
      const payroll = await this.prisma.payroll.update({
        where: { id: payrollId },
        data: { status: 'PROCESSED' }
      });

      return payroll;
    } catch (error) {
      console.error('❌ Error approving payroll:', error);
      throw error;
    }
  }

  /**
   * صرف الراتب
   */
  async markAsPaid(companyId, payrollId, paymentData = {}) {
    try {
      const payroll = await this.prisma.payroll.findUnique({
        where: { id: payrollId },
        include: { user: true }
      });

      if (!payroll) throw new Error('Payroll not found');
      if (payroll.status === 'PAID') throw new Error('Payroll already paid');

      const updatedPayroll = await this.prisma.$transaction(async (tx) => {
        // 1. Update Payroll Status
        const p = await tx.payroll.update({
          where: { id: payrollId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: paymentData.method || 'bank_transfer',
            paymentReference: paymentData.reference
          }
        });

        // 2. Proccess Advances Deductions
        const deductions = JSON.parse(payroll.deductions || '{}');
        if (deductions.advanceDetails && Array.isArray(deductions.advanceDetails)) {
          for (const item of deductions.advanceDetails) {
            const advance = await tx.advanceRequest.findUnique({
              where: { id: item.advanceId }
            });

            if (advance) {
              const newBalance = parseFloat(advance.remainingBalance) - parseFloat(item.amount);
              const isPaidOff = newBalance <= 0.01; // Tolerance for float precision

              await tx.advanceRequest.update({
                where: { id: item.advanceId },
                data: {
                  remainingBalance: newBalance > 0 ? newBalance : 0,
                  isPaidOff: isPaidOff,
                  status: isPaidOff ? 'COMPLETED' : advance.status
                }
              });
            }
          }
        }

        return p;
      });

      // إرسال إشعار للموظف
      try {
        await whatsAppNotificationService.sendPayrollNotification({
          ...updatedPayroll,
          user: payroll.user // Pass the user object which contains phone
        });
      } catch (waError) {
        console.error('❌ [Payroll] Failed to send WhatsApp notification:', waError);
      }

      return updatedPayroll;
    } catch (error) {
      console.error('❌ Error marking payroll as paid:', error);
      throw error;
    }
  }

  /**
   * صرف رواتب متعددة
   */
  async bulkMarkAsPaid(companyId, payrollIds, paymentData = {}) {
    try {
      let successCount = 0;

      // Loop purely to reuse the logic in markAsPaid which handles transaction and advance updates
      for (const id of payrollIds) {
        try {
          await this.markAsPaid(companyId, id, paymentData);
          successCount++;
        } catch (err) {
          console.error(`Failed to mark payroll ${id} as paid:`, err);
        }
      }

      return { updated: successCount };
    } catch (error) {
      console.error('❌ Error bulk marking payrolls as paid:', error);
      throw error;
    }
  }

  /**
   * اعتماد رواتب متعددة
   */
  async bulkApprove(companyId, payrollIds) {
    try {
      const result = await this.prisma.payroll.updateMany({
        where: {
          id: { in: payrollIds },
          companyId,
          status: 'DRAFT'
        },
        data: {
          status: 'PROCESSED'
        }
      });
      return { updated: result.count };
    } catch (error) {
      console.error('❌ Error bulk approving payrolls:', error);
      throw error;
    }
  }

  /**
   * حذف كشف راتب
   */
  async deletePayroll(companyId, payrollId) {
    try {
      const existing = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (!existing) {
        throw new Error('كشف الراتب غير موجود');
      }

      if (existing.status === 'PAID') {
        throw new Error('لا يمكن حذف كشف راتب مدفوع');
      }

      await this.prisma.payroll.delete({
        where: { id: payrollId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting payroll:', error);
      throw error;
    }
  }

  /**
   * ملخص الرواتب الشهري
   */
  async getPayrollSummary(companyId, month, year, status) {
    try {
      // Filter out orphaned records by ensuring userId exists in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      const where = {
        companyId,
        month,
        year
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      // Only include payrolls with valid user IDs
      if (validUserIdList.length > 0) {
        where.userId = { in: validUserIdList };
      } else {
        // No valid users found, return empty summary
        return {
          month,
          year,
          totalEmployees: 0,
          totalBaseSalary: 0,
          totalAllowances: 0,
          totalDeductions: 0,
          totalOvertime: 0,
          totalBonuses: 0,
          totalSocialInsurance: 0,
          totalTax: 0,
          totalGross: 0,
          totalNet: 0,
          byStatus: {},
          byDepartment: {}
        };
      }

      const payrolls = await this.prisma.payroll.findMany({
        where
      });

      // جلب بيانات المستخدمين بشكل منفصل للحصول على أقسامهم
      const userIds = [...new Set(payrolls.map(p => p.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          departmentRelation: { select: { id: true, name: true } }
        }
      });
      const usersMap = new Map(users.map(u => [u.id, u]));

      const uniqueEmployeeIds = new Set(payrolls.map(p => p.userId));
      const summary = {
        month,
        year,
        totalEmployees: uniqueEmployeeIds.size,
        totalBaseSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalOvertime: 0,
        totalBonuses: 0,
        totalSocialInsurance: 0,
        totalTax: 0,
        totalGross: 0,
        totalNet: 0,
        byStatus: {},
        byDepartment: {}
      };

      payrolls.forEach(p => {
        summary.totalBaseSalary += parseFloat(p.baseSalary) || 0;
        summary.totalAllowances += parseFloat(p.totalAllowances) || 0;
        summary.totalDeductions += parseFloat(p.totalDeductions) || 0;
        summary.totalOvertime += parseFloat(p.overtimeAmount) || 0;
        summary.totalBonuses += parseFloat(p.bonuses) || 0;
        summary.totalSocialInsurance += parseFloat(p.socialInsurance) || 0;
        summary.totalTax += parseFloat(p.taxAmount) || 0;
        summary.totalGross += parseFloat(p.grossSalary) || 0;
        summary.totalNet += parseFloat(p.netSalary) || 0;

        // حسب الحالة
        summary.byStatus[p.status] = (summary.byStatus[p.status] || 0) + 1;

        // حسب القسم
        const user = usersMap.get(p.userId);
        const deptName = user?.departmentRelation?.name || 'بدون قسم';
        if (!summary.byDepartment[deptName]) {
          summary.byDepartment[deptName] = { count: 0, total: 0 };
        }
        summary.byDepartment[deptName].count++;
        summary.byDepartment[deptName].total += parseFloat(p.netSalary) || 0;
      });

      return summary;
    } catch (error) {
      console.error('❌ Error getting payroll summary:', error);
      throw error;
    }
  }

  /**
   * تقرير الرواتب السنوي
   */
  async getAnnualReport(companyId, year, employeeId = null) {
    try {
      const where = { companyId, year };
      if (employeeId) where.userId = employeeId;
      // For annual reports, typically we want processed or paid payrolls.
      // Assuming 'PROCESSED' is the status before 'PAID' and 'APPROVED' is not a final state for reports.
      where.status = { in: ['PROCESSED', 'PAID'] };

      const payrolls = await this.prisma.payroll.findMany({
        where,
        orderBy: { month: 'asc' },
        include: {
          employeeRel: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          }
        }
      });

      // Map employeeRel to employee/user for compatibility
      const mappedPayrolls = payrolls.map(p => {
        const mapped = { ...p };
        if (p.employeeRel) {
          mapped.employee = p.employeeRel;
          mapped.user = p.employeeRel; // Some parts might expect 'user'
        }
        return mapped;
      });

      // تجميع حسب الموظف
      const byEmployee = {};
      mappedPayrolls.forEach(p => {
        const empId = p.userId;
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employee: p.user,
            months: [],
            totals: {
              baseSalary: 0,
              allowances: 0,
              deductions: 0,
              overtime: 0,
              bonuses: 0,
              gross: 0,
              net: 0
            }
          };
        }

        byEmployee[empId].months.push({
          month: p.month,
          netSalary: p.netSalary,
          status: p.status
        });

        byEmployee[empId].totals.baseSalary += parseFloat(p.baseSalary) || 0;
        byEmployee[empId].totals.allowances += parseFloat(p.totalAllowances) || 0;
        byEmployee[empId].totals.deductions += parseFloat(p.totalDeductions) || 0;
        byEmployee[empId].totals.overtime += parseFloat(p.overtimeAmount) || 0;
        byEmployee[empId].totals.bonuses += parseFloat(p.bonuses) || 0;
        byEmployee[empId].totals.gross += parseFloat(p.grossSalary) || 0;
        byEmployee[empId].totals.net += parseFloat(p.netSalary) || 0;
      });

      return {
        year,
        employees: Object.values(byEmployee)
      };
    } catch (error) {
      console.error('❌ Error getting annual report:', error);
      throw error;
    }
  }


  /**
   * حساب تفاصيل الراتب (بدون حفظ)
   */
  async calculatePayrollData(companyId, employeeId, month, year, data = {}) {
    // جلب بيانات الموظف (User)
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        employees: true // جلب بيانات الموظف الإضافية (مثل metadata)
      }
    });

    if (!employee) {
      throw new NotFoundError('الموظف', employeeId);
    }

    // جلب إعدادات HR
    const settings = await this.prisma.hRSettings.findUnique({
      where: { companyId }
    });

    // Parse workDays and publicHolidays
    let workingDaysConfig = [0, 1, 2, 3, 4]; // Default: Sun-Thu (Standard in many MENA offices)
    try {
      if (settings?.workDays) {
        workingDaysConfig = JSON.parse(settings.workDays);
      }
    } catch (e) {
      console.error('⚠️ [PAYROLL] Error parsing workDays:', e);
    }

    let publicHolidays = [];
    try {
      if (settings?.publicHolidays) {
        // Expected format: ["2025-01-25", "2025-05-01"] or similar
        publicHolidays = JSON.parse(settings.publicHolidays);
      }
    } catch (e) {
      console.error('⚠️ [PAYROLL] Error parsing publicHolidays:', e);
    }

    // حساب فترة الراتب
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const periodStartAdjusted = new Date(year, month - 1, 1, 0, 0, 0);
    const periodEndAdjusted = new Date(year, month, 0, 23, 59, 59);

    // جلب بيانات الحضور (مع إمكانية المحاكاة)
    let attendance = [];
    if (data.overrides?.attendance) {
      attendance = data.overrides.attendance.map(a => ({
        ...a,
        date: new Date(a.date)
      }));
      console.log(`🧪 [PAYROLL-SIM] Using simulation attendance: ${attendance.length} records`);
    } else {
      attendance = await this.prisma.attendance.findMany({
        where: {
          userId: employeeId,
          date: { gte: periodStartAdjusted, lte: periodEndAdjusted }
        }
      });
    }

    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === parseInt(month) && now.getFullYear() === parseInt(year);

    // حساب أيام العمل الفعلية في الشهر (باستبعاد الويكيند والعطلات)
    const totalWorkingDaysInMonth = this.getWorkingDaysInMonth(year, month, null, workingDaysConfig, publicHolidays);

    // حساب أيام العمل المستحقة حتى الآن
    const workingDaysTarget = isCurrentMonth
      ? this.getWorkingDaysInMonth(year, month, now.getDate(), workingDaysConfig, publicHolidays)
      : totalWorkingDaysInMonth;

    const workingDates = this.getWorkingDaysDates(year, month, isCurrentMonth ? now.getDate() : null, workingDaysConfig, publicHolidays);
    const workingDatesSet = new Set(workingDates);

    // جلب طلبات الإجازة (مع إمكانية المحاكاة)
    let leaves = [];
    if (data.overrides?.leaves) {
      leaves = data.overrides.leaves.map(l => ({
        ...l,
        startDate: new Date(l.startDate),
        endDate: new Date(l.endDate)
      }));
      console.log(`🧪 [PAYROLL-SIM] Using simulation leaves: ${leaves.length} records`);
    } else {
      leaves = await this.prisma.leaveRequest.findMany({
        where: {
          userId: employeeId,
          companyId,
          status: 'APPROVED',
          OR: [
            { startDate: { lte: periodEndAdjusted }, endDate: { gte: periodStartAdjusted } }
          ]
        }
      });
    }

    // جلب أذونات الحضور (Exit Permits)
    const hrEmployeeId = employee.employees?.[0]?.id;
    let approvedPermissions = [];
    if (hrEmployeeId) {
      approvedPermissions = await this.prisma.hrPermissionRequest.findMany({
        where: {
          employeeId: hrEmployeeId,
          status: 'APPROVED',
          date: { gte: periodStartAdjusted, lte: periodEndAdjusted }
        }
      });
      console.log(`🕒 [PAYROLL] Found ${approvedPermissions.length} approved permissions for ${employee.employeeNumber}`);
    }

    const paidLeaveDates = new Set();
    const unpaidLeaveDates = new Set();

    leaves.forEach(leave => {
      const dates = this.getDateRange(leave.startDate, leave.endDate);
      dates.forEach(d => {
        const dateStr = this.toLocalDateKey(d);
        if (workingDatesSet.has(dateStr)) {
          if (leave.type === 'UNPAID') {
            unpaidLeaveDates.add(dateStr);
          } else {
            paidLeaveDates.add(dateStr);
          }
        }
      });
    });

    const attendedDatesMap = new Set(
      attendance
        .filter(a => ['PRESENT', 'LATE', 'REMOTE'].includes(a.status))
        .map(a => this.toLocalDateKey(a.date))
    );

    // أيام الحضور الفعلي + الإجازات المدفوعة
    const paidDatesCount = workingDates.filter(d => attendedDatesMap.has(d) || paidLeaveDates.has(d)).length;
    const presentDays = paidDatesCount;

    // أيام الغياب (لا حضور ولا إجازة ولا عطلة رسمية)
    const trulyAbsentDates = workingDates.filter(d => !attendedDatesMap.has(d) && !paidLeaveDates.has(d) && !unpaidLeaveDates.has(d));
    const absentDays = trulyAbsentDates.length;

    // حساب ساعات العمل الإضافي
    const totalOvertimeHours = attendance.reduce((sum, a) =>
      sum + (parseFloat(a.overtimeHours) || 0), 0
    );

    // حساب دقائق التأخير والخروج المبكر
    const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
    const totalEarlyMinutes = attendance.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);

    // الراتب الأساسي (مع إمكانية المحاكاة)
    const fullMonthBaseSalary = parseFloat(data.overrides?.baseSalary || employee.baseSalary) || 0;
    const dailyRate = fullMonthBaseSalary / totalWorkingDaysInMonth;
    const hourlyRate = dailyRate / 8;

    // البدلات (Allowances)
    let allowances = data.allowances || {};

    // إذا لم تُمرر بدلات في الطلب، نحاول جلبها من بيانات الموظف (البيانات الوصفية)
    if (Object.keys(allowances).length === 0 && employee.employees?.metadata) {
      try {
        const metadata = JSON.parse(employee.employees.metadata);
        if (metadata.allowances) {
          allowances = metadata.allowances;
          console.log(`✅ [PAYROLL] Found default allowances in employee metadata for ${employee.employeeNumber}`);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    const fullMonthAllowances = Object.values(allowances).reduce((sum, val) =>
      sum + (parseFloat(val) || 0), 0
    );

    // حساب الراتب والبدلات المستحقة بناءً على الأيام التي مرت (للشهر الحالي فقط)
    let baseSalary = fullMonthBaseSalary;
    let totalAllowances = fullMonthAllowances;

    if (isCurrentMonth) {
      const daysPassedWorking = this.getWorkingDaysInMonth(year, month, now.getDate());
      const earnedRatio = daysPassedWorking / totalWorkingDaysInMonth;
      baseSalary = fullMonthBaseSalary * earnedRatio;
      totalAllowances = fullMonthAllowances * earnedRatio;

      console.log('📊 [PAYROLL-CALC] Current month - calculating earned salary:', {
        totalWorkingDays: totalWorkingDaysInMonth,
        daysPassedWorking,
        earnedRatio: earnedRatio.toFixed(4),
        fullMonthBaseSalary,
        earnedBaseSalary: baseSalary.toFixed(2)
      });
    }

    // ---------------------------------------------------------
    // 💸 DEDUCTIONS INTEGRATION (الخصومات) - Daily Aware Logic
    // ---------------------------------------------------------

    // التحقق من تفعيل الخصم التلقائي (على مستوى الشركة والموظف)
    const isCompanyAutoDeductionEnabled = settings?.autoDeductionEnabled !== false;
    const isEmployeeAutoDeductionEnabled = employee.enableAutoDeduction !== false;
    const isAutoDeductionEnabled = isCompanyAutoDeductionEnabled && isEmployeeAutoDeductionEnabled;
    console.log('🔍 [PAYROLL-DEDUCTION] Auto deduction check:', {
      employeeId,
      companyAutoDeduction: settings?.autoDeductionEnabled,
      employeeAutoDeduction: employee.enableAutoDeduction,
      isAutoDeductionEnabled
    });

    const dailyPenaltyMap = new Map();
    const deductions = {};
    let attendanceDeduction = 0;
    let latePenalty = 0;
    let manualDeductionAmount = 0;

    const maxDailyDeductionDays = parseFloat(settings?.maxDailyDeductionDays) || 0;
    const dailyCapLimit = maxDailyDeductionDays > 0 ? (dailyRate * maxDailyDeductionDays) : Infinity;

    const addDailyPenalty = (date, amount, reason, type = 'auto') => {
      const dateStr = this.toLocalDateKey(date);
      if (!dailyPenaltyMap.has(dateStr)) {
        dailyPenaltyMap.set(dateStr, { total: 0, details: [], types: [] });
      }
      const dayData = dailyPenaltyMap.get(dateStr);
      dayData.total += amount;
      dayData.details.push(reason);
      dayData.types.push(type);
    };

    // 1. Manual Deductions
    let manualDeductions = [];
    if (data.overrides?.manualDeductions) {
      manualDeductions = data.overrides.manualDeductions.map(d => ({
        ...d,
        date: new Date(d.date)
      }));
      console.log(`🧪 [PAYROLL-SIM] Using simulation manual deductions: ${manualDeductions.length} records`);
    } else {
      // عند تعطيل الخصم التلقائي، نستبعد سجلات AUTO_DEDUCTION
      // لأن الخصم التلقائي ينشئ سجلاتها مع مراعاة المدة المسموحة،
      // وفي المسار اليدوي سنعيد حساب غرامات التأخير من الحضور مباشرة
      const manualDeductionCategoryFilter = isAutoDeductionEnabled
        ? { not: 'UNPAID_LEAVE' }
        : { notIn: ['UNPAID_LEAVE', 'AUTO_DEDUCTION'] };

      manualDeductions = await this.prisma.manualDeduction.findMany({
        where: {
          employeeId,
          companyId,
          effectiveMonth: parseInt(month),
          effectiveYear: parseInt(year),
          status: { in: ['APPROVED'] },
          category: manualDeductionCategoryFilter
        }
      });
    }

    // حساب قيمة latePenalty من الخصومات التلقائية للتأخير (للتخزين في حقل latePenalty)
    latePenalty = manualDeductions
      .filter(d => d.category === 'AUTO_DEDUCTION' && d.type === 'LATE')
      .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    manualDeductions.forEach(d => {
      addDailyPenalty(d.date, parseFloat(d.amount), `يدوي: ${d.reason}`, 'manual');
    });

    // 1.05. Deductible Permissions (أذونات الخروج بخصم)
    approvedPermissions.filter(p => p.type === 'DEDUCTIBLE').forEach(p => {
      const deductionAmount = parseFloat(p.totalHours) * hourlyRate;
      addDailyPenalty(p.date, deductionAmount, `إذن خروج مخصوم (${p.totalHours}س)`);
    });

    // 1.1 Unpaid Leave Deduction (خصم إجازة بدون راتب - قيمة اليوم العادية بدون مضاعف)
    unpaidLeaveDates.forEach(dateStr => {
      addDailyPenalty(new Date(dateStr), dailyRate, 'إجازة بدون راتب');
    });

    // 2. Absence Penalty (Find specific dates) - فقط للأيام التي لم يحضر فيها ولم يكن لديه إجازة
    // تم تعديل السلوك ليحسب خصم الغياب للشهر الحالي أيضاً بناءً على الإعدادات
    const absenceMultiplier = parseFloat(settings?.absencePenaltyRate) || 1.0;

    // التحقق من إعدادات خصم الغياب للشهر الحالي
    const deductAbsenceInCurrentMonth = settings?.deductAbsenceInCurrentMonth !== false; // القيمة الافتراضية هي true

    // حساب خصم الغياب
    workingDates.forEach(dateStr => {
      // نتأكد أن اليوم قد مر فعلاً (للشهر الحالي)
      const dayDate = new Date(dateStr);
      const isPastDay = isCurrentMonth ? dayDate <= now : true;

      // نطبق خصم الغياب فقط على الأيام التي مرت ولم يسجل فيها حضور أو إجازة
      // للشهر الحالي: نتحقق من إعداد deductAbsenceInCurrentMonth
      // للشهور السابقة: نحسب خصم الغياب دائماً
      if (isPastDay && !attendedDatesMap.has(dateStr) && !paidLeaveDates.has(dateStr) && !unpaidLeaveDates.has(dateStr)) {
        if (!isCurrentMonth || deductAbsenceInCurrentMonth) {
          addDailyPenalty(new Date(dateStr), dailyRate * absenceMultiplier, 'غياب');
        }
      }
    });

    // 3. Late Penalty - يتم تخطي إعادة الحساب إذا كان الخصم التلقائي مفعلاً
    // لأن الخصم التلقائي ينشئ سجلات ManualDeduction (مع مراعاة المدة المسموحة)
    // ويتم تضمينها تلقائياً في الخصومات أعلاه
    if (isAutoDeductionEnabled) {
      console.log('🔍 [PAYROLL-DEDUCTION] Auto deduction is enabled - skipping late penalty recalculation (already handled via ManualDeduction records with grace period)');
    } else {
      // إذا كان الخصم التلقائي معطلاً، نحتاج لحساب غرامات التأخير يدوياً
      // مع مراعاة المدة المسموحة (grace period) من رصيد المرونة
      console.log('🔍 [PAYROLL-DEDUCTION] Auto deduction disabled - calculating late penalties manually with grace period');

      const lateOccurrences = attendance.filter(a => (a.lateMinutes > 0 || a.status === 'LATE')).sort((a, b) => new Date(a.date) - new Date(b.date));
      const delayPenaltyTiers = settings?.delayPenaltyTiers ? JSON.parse(settings.delayPenaltyTiers) : [];
      const lateWarningLevels = settings?.lateWarningLevels ? JSON.parse(settings.lateWarningLevels) : [];
      const monthlyLateLimit = parseInt(settings?.monthlyLateLimit) || 3;
      const gracePeriodMinutes = settings?.gracePeriodMinutes || 60;

      console.log('🔍 [PAYROLL-DEDUCTION] Processing late penalties:', {
        lateOccurrencesCount: lateOccurrences.length,
        delayPenaltyTiersCount: delayPenaltyTiers.length,
        lateWarningLevelsCount: lateWarningLevels.length,
        monthlyLateLimit,
        gracePeriodMinutes
      });

      // جلب رصيد المرونة الحالي للموظف (المدة المسموحة)
      const latenessBalance = await this.prisma.latenessBalance.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month: parseInt(month),
            year: parseInt(year)
          }
        }
      });

      let remainingGrace = gracePeriodMinutes - (latenessBalance?.graceMinutesUsed || 0);
      if (remainingGrace < 0) remainingGrace = 0;
      let cumulativeLateMinutes = latenessBalance?.totalLateMinutes || 0;

      if (delayPenaltyTiers && delayPenaltyTiers.length > 0) {
        lateOccurrences.forEach(occ => {
          const mins = occ.lateMinutes || 0;
          // تطبيق المدة المسموحة: نحتسب فقط الدقائق التي تتجاوز رصيد المرونة المتبقي
          let effectiveLateMinutes = mins;
          if (remainingGrace > 0) {
            const graceUsed = Math.min(effectiveLateMinutes, remainingGrace);
            remainingGrace -= graceUsed;
            effectiveLateMinutes -= graceUsed;
          }
          if (effectiveLateMinutes <= 0) return;

          const applicableTier = [...delayPenaltyTiers].sort((a, b) => b.minMinutes - a.minMinutes).find(t => effectiveLateMinutes >= t.minMinutes);
          if (applicableTier) {
            const amount = dailyRate * (parseFloat(applicableTier.deductionDays) || 0);
            console.log('🔍 [PAYROLL-DEDUCTION] Applying tier penalty:', {
              date: occ.date,
              minutes: mins,
              effectiveMinutes: effectiveLateMinutes,
              tier: applicableTier,
              amount,
              remainingGrace
            });
            addDailyPenalty(occ.date, amount, `تأخير ${mins}د (بعد خصم ${mins - effectiveLateMinutes}د مسموحة)`);
          }
        });
      } else {
        lateOccurrences.forEach((occ, index) => {
          const rank = index + 1;
          const mins = occ.lateMinutes || 0;

          // تطبيق المدة المسموحة: نحتسب فقط الدقائق التي تتجاوز رصيد المرونة المتبقي
          let effectiveLateMinutes = mins;
          if (remainingGrace > 0) {
            const graceUsed = Math.min(effectiveLateMinutes, remainingGrace);
            remainingGrace -= graceUsed;
            effectiveLateMinutes -= graceUsed;
          }

          cumulativeLateMinutes += mins;
          // للمدة المسموحة نستخدم cumulative بدلاً من الفردي
          if (effectiveLateMinutes <= 0) return;

          if (rank > monthlyLateLimit) {
            const occurrenceSeq = rank - monthlyLateLimit;
            const level = lateWarningLevels.find(l => l.count === occurrenceSeq) || (lateWarningLevels.length > 0 ? lateWarningLevels[lateWarningLevels.length - 1] : null);
            if (level) {
              const amount = dailyRate * (parseFloat(level.deductionFactor) || 0);
              console.log('🔍 [PAYROLL-DEDUCTION] Applying escalation penalty:', {
                date: occ.date,
                rank,
                level,
                amount,
                remainingGrace
              });
              addDailyPenalty(occ.date, amount, `تأخير رقم ${rank} (بعد خصم المسموح)`);
            }
          }
        });
      }
    }

    // Early Leave
    if (totalEarlyMinutes > 60) {
      const earlyPenaltyHours = Math.floor(totalEarlyMinutes / 60);
      const amount = hourlyRate * earlyPenaltyHours;
      const lastCheckOut = attendance.filter(a => a.check_out).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (lastCheckOut) {
        addDailyPenalty(lastCheckOut.date, amount, `خروج مبكر ${earlyPenaltyHours}س`);
      }
    }

    // 🛡️ APPLY DAILY CAP AND SUMMARIZE
    let totalCappedAttendancePenalty = 0;
    let totalCappedManualPenalty = 0;
    let capAuditTrail = [];
    let deductionBreakdown = [];

    dailyPenaltyMap.forEach((dayData, dateStr) => {
      let dailyTotal = dayData.total;

      if (dailyTotal > dailyCapLimit) {
        capAuditTrail.push(`${dateStr}: تم خفض من ${dailyTotal.toFixed(2)} إلى ${dailyCapLimit.toFixed(2)} (سقف)`);
        dailyTotal = dailyCapLimit;
      }

      // اضافة معلومات عن نوع الخصم (يدوي أو تلقائي)
      const deductionTypes = dayData.types || [];
      const isManual = deductionTypes.some(t => t === 'manual');
      const typeLabel = isManual ? 'يدوي' : 'تلقائي';

      deductionBreakdown.push(`${dateStr}: ${dailyTotal.toFixed(2)} (${dayData.details.join(', ')}) - [${typeLabel}]`);

      if (isManual || dayData.details.some(d => d.includes('يدوي'))) {
        totalCappedManualPenalty += dailyTotal;
      } else {
        totalCappedAttendancePenalty += dailyTotal;
      }
    });

    // تصنيف الخصومات حسب النوع
    if (totalCappedManualPenalty > 0) {
      deductions['خصم يدوي'] = totalCappedManualPenalty;
      deductions.manualDetails = manualDeductions.map(d => `${d.reason}(${d.amount})`).join(' | ');
    }

    attendanceDeduction = totalCappedAttendancePenalty;
    if (attendanceDeduction > 0) {
      deductions['غياب وتأخير'] = attendanceDeduction;
    }
    deductions.details = deductionBreakdown.join(' | ');

    if (capAuditTrail.length > 0) {
      deductions.capNotes = capAuditTrail.join(' | ');
    }

    // 4. Advances Repayment (خصم السلف)
    const activeAdvances = await this.prisma.advanceRequest.findMany({
      where: {
        userId: employeeId,
        status: 'APPROVED',
        isPaidOff: false,
        remainingBalance: { gt: 0 }
      }
    });

    let totalAdvanceDeduction = 0;
    const advanceDetails = [];

    for (const advance of activeAdvances) {
      let deduction = 0;
      if (advance.repaymentType === 'INSTALLMENTS') {
        deduction = parseFloat(advance.installmentAmount) || 0;
      } else {
        deduction = parseFloat(advance.remainingBalance);
      }

      if (deduction > parseFloat(advance.remainingBalance)) {
        deduction = parseFloat(advance.remainingBalance);
      }

      // للشهر الحالي: نحسب السُلفة بنفس نسبة الأيام التي مرت
      if (isCurrentMonth && baseSalary !== fullMonthBaseSalary) {
        const earnedRatio = baseSalary / fullMonthBaseSalary;
        deduction = deduction * earnedRatio;
      }

      if (deduction > 0) {
        totalAdvanceDeduction += deduction;
        advanceDetails.push({
          advanceId: advance.id,
          amount: deduction
        });
      }
    }

    if (totalAdvanceDeduction > 0) {
      deductions['سلف'] = totalAdvanceDeduction;
      deductions.advanceDetails = advanceDetails;
    }

    // 5. Ad-hoc/Extra Deductions from manually created payroll form
    if (data.deductions) {
      Object.assign(deductions, data.deductions);
    }

    const totalDeductions = Object.values(deductions).reduce((sum, val) => {
      if (Array.isArray(val) || typeof val === 'string') return sum;
      return sum + (parseFloat(val) || 0);
    }, 0);

    // حساب الإضافي
    const overtimeRate = parseFloat(settings?.overtimeRate) || 1.5;
    const overtimeAmount = totalOvertimeHours * hourlyRate * overtimeRate;

    // Fetch approved rewards for this period
    const approvedRewards = await rewardPayrollIntegrationService.getApprovedRewardsForPayroll(
      companyId,
      employeeId,
      month,
      year
    );

    const rewardTotal = rewardPayrollIntegrationService.calculateTotalRewards(approvedRewards);

    // المكافآت (تدمج المكافآت اليدوية مع النظامية)
    const bonuses = (parseFloat(data.bonuses) || 0) + rewardTotal;

    // الإجماليات
    // الراتب الأساسي يظل ثابت (لا يتغير)
    // الراتب الإجمالي = الراتب الأساسي + البدلات + الإضافي + المكافآت
    const grossSalary = baseSalary + totalAllowances + overtimeAmount + bonuses;

    // التأمينات - فقط إذا كانت مفعلة في الإعدادات
    // يتم حسابها على الراتب الأساسي المستحق
    const socialInsuranceRate = parseFloat(settings?.socialInsuranceRate) || 0;
    // تحقق صارم من أن القيمة أكبر من الصفر (لضمان احترام إعداد الصفر)
    const socialInsurance = socialInsuranceRate > 0.001 ? (baseSalary * socialInsuranceRate) / 100 : 0;

    // الضرائب - فقط إذا كانت مفعلة في الإعدادات
    // Handle potential missing taxRate field safely
    let taxRate = 0;
    try {
      taxRate = parseFloat(settings?.taxRate) || 0;
    } catch (error) {
      console.warn('⚠️ [PAYROLL] taxRate field missing in HR settings, using default 0');
      taxRate = 0;
    }
    const taxAmount = taxRate > 0 ? this.calculateTax(baseSalary + totalAllowances, settings?.taxBrackets) : 0;

    // صافي الراتب = الراتب الإجمالي - الخصومات - التأمينات - الضرائب
    // صافي الراتب لا يمكن أن يكون سالباً (الحد الأدنى = 0)
    const calculatedNetSalary = grossSalary - totalDeductions - socialInsurance - taxAmount;
    const netSalary = Math.max(0, calculatedNetSalary);

    return {
      employee,
      periodStart,
      periodEnd,
      baseSalary,
      fullMonthBaseSalary, // الراتب الشهري الكامل
      totalWorkingDaysInMonth,
      presentDays,
      absentDays,
      allowances,
      totalAllowances,
      deductions,
      totalDeductions,
      attendanceDeduction,
      latePenalty,
      totalOvertimeHours,
      overtimeRate,
      overtimeAmount,
      bonuses,
      socialInsurance,
      taxAmount,
      grossSalary,
      netSalary,
      approvedRewards
    };
  }


  getWorkingDaysInMonth(year, month, uptoDay = null, workDays = [0, 1, 2, 3, 4], publicHolidays = []) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const limit = uptoDay ? Math.min(uptoDay, daysInMonth) : daysInMonth;
    let workingDays = 0;

    const holidaySet = new Set(publicHolidays.map(h => this.toLocalDateKey(h)));

    for (let day = 1; day <= limit; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = this.toLocalDateKey(date);

      // تحقق إذا كان اليوم ضمن أيام العمل وليس عطلة رسمية
      if (workDays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
        workingDays++;
      }
    }

    return workingDays;
  }

  /**
   * جلب نطاق تواريخ بين تاريخين
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  toLocalDateKey(date) {
    if (!date) return date;

    if (typeof date === 'string') {
      return date.split('T')[0];
    }

    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * جلب تواريخ أيام العمل المتوقعة في الشهر
   */
  getWorkingDaysDates(year, month, uptoDay = null, workDays = [0, 1, 2, 3, 4], publicHolidays = []) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const limit = uptoDay ? Math.min(uptoDay, daysInMonth) : daysInMonth;
    let dates = [];

    const holidaySet = new Set(publicHolidays.map(h => this.toLocalDateKey(h)));

    for (let day = 1; day <= limit; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = this.toLocalDateKey(date);

      if (workDays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
        dates.push(dateStr);
      }
    }

    return dates;
  }

  calculateTax(income, taxBracketsJson) {
    // حساب ضريبي مبسط - يمكن تطويره حسب قوانين الدولة
    try {
      const brackets = taxBracketsJson ? JSON.parse(taxBracketsJson) : [
        { min: 0, max: 15000, rate: 0 },
        { min: 15000, max: 30000, rate: 2.5 },
        { min: 30000, max: 45000, rate: 10 },
        { min: 45000, max: 60000, rate: 15 },
        { min: 60000, max: 200000, rate: 20 },
        { min: 200000, max: 400000, rate: 22.5 },
        { min: 400000, max: Infinity, rate: 25 }
      ];

      // تحويل الراتب الشهري إلى سنوي
      const annualIncome = income * 12;
      let tax = 0;

      for (const bracket of brackets) {
        if (annualIncome > bracket.min) {
          const taxableInBracket = Math.min(annualIncome, bracket.max) - bracket.min;
          tax += (taxableInBracket * bracket.rate) / 100;
        }
      }

      return tax / 12; // تحويل إلى ضريبة شهرية
    } catch (error) {
      console.error('❌ Error calculating tax:', error);
      return 0;
    }
  }

  /**
   * جلب توقع الراتب للشهر الحالي
   */
  async getPayrollProjection(companyId, employeeId) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // نستخدم الدالة الموحدة للحساب
    const payrollData = await this.calculatePayrollData(companyId, employeeId, month, year);

    // جلب الإعدادات لحساب أيام العمل بدقة (بما فيها العطلات)
    const settings = await this.prisma.hRSettings.findUnique({
      where: { companyId }
    });

    let workingDaysConfig = [0, 1, 2, 3, 4];
    let publicHolidays = [];
    try {
      if (settings?.workDays) workingDaysConfig = JSON.parse(settings.workDays);
      if (settings?.publicHolidays) publicHolidays = JSON.parse(settings.publicHolidays);
    } catch (e) { }

    // حساب الأيام التي مرت من الشهر
    const totalWorkingDays = payrollData.totalWorkingDaysInMonth;
    const daysPassedWorking = this.getWorkingDaysInMonth(year, month, now.getDate(), workingDaysConfig, publicHolidays);

    // حساب الراتب المستحق فقط للأيام التي مرت
    const earnedRatio = totalWorkingDays > 0 ? daysPassedWorking / totalWorkingDays : 0;

    // حساب المكونات المستحقة بناءً على الأيام التي مرت
    const earnedBaseSalary = payrollData.baseSalary * earnedRatio;
    const earnedAllowances = payrollData.totalAllowances * earnedRatio;

    // الإضافي والمكافآت تظل كما هي (لأنها فعلية)
    const earnedOvertimeAmount = payrollData.overtimeAmount;
    const earnedBonuses = payrollData.bonuses;

    // الإجمالي المستحق
    const earnedGrossSalary = earnedBaseSalary + earnedAllowances + earnedOvertimeAmount + earnedBonuses;

    // التأمينات والضرائب تحسب على الراتب المستحق
    const earnedSocialInsurance = payrollData.socialInsurance * earnedRatio;
    const earnedTaxAmount = payrollData.taxAmount * earnedRatio;

    // الخصومات تظل كما هي (لأنها فعلية)
    const earnedDeductions = payrollData.totalDeductions;

    // صافي الراتب المستحق
    const earnedNetSalary = earnedGrossSalary - earnedDeductions - earnedSocialInsurance - earnedTaxAmount;

    console.log('📊 [PAYROLL-PROJECTION] Calculation:', {
      totalWorkingDays,
      daysPassedWorking,
      earnedRatio: earnedRatio.toFixed(2),
      baseSalary: payrollData.baseSalary,
      earnedBaseSalary: earnedBaseSalary.toFixed(2),
      earnedNetSalary: earnedNetSalary.toFixed(2)
    });

    // نعيد البيانات بتنسيق يشبه كشف الراتب العادي
    return {
      id: 'projection',
      month,
      year,
      companyId,
      employeeId,
      periodStart: payrollData.periodStart,
      periodEnd: payrollData.periodEnd,

      baseSalary: earnedBaseSalary,
      workingDays: totalWorkingDays,
      actualWorkDays: payrollData.presentDays,

      allowances: payrollData.allowances,
      totalAllowances: earnedAllowances,

      deductions: payrollData.deductions,
      totalDeductions: earnedDeductions,

      attendanceDeduction: payrollData.attendanceDeduction,
      absentDays: payrollData.absentDays,

      latePenalty: payrollData.latePenalty,

      overtimeHours: payrollData.totalOvertimeHours,
      overtimeRate: payrollData.overtimeRate,
      overtimeAmount: earnedOvertimeAmount,

      bonuses: earnedBonuses,

      socialInsurance: earnedSocialInsurance,
      taxAmount: earnedTaxAmount,

      grossSalary: earnedGrossSalary,
      netSalary: Math.max(0, earnedNetSalary),

      status: 'PROJECTION',
      isProjection: true,

      daysPassedWorking,
      earnedRatio,

      employee: payrollData.employee,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * جلب آخر كشف راتب لموظف محدد
   */
  async getLastPayrollForEmployee(companyId, employeeId) {
    try {
      const { safeQuery } = require('../sharedDatabase');
      const prisma = this.prisma; // Capture prisma reference

      const payroll = await prisma.payroll.findFirst({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ],
        include: {
          employeeRel: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              department: true,
              position: true
            }
          }
        }
      });

      return payroll;
    } catch (error) {
      console.error('❌ Error getting last payroll for employee:', error);
      throw error;
    }
  }

}

module.exports = new PayrollService();
