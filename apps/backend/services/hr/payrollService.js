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
    return this._mockPrisma || getSharedPrismaClient();
  }

  set prisma(client) {
    this._mockPrisma = client;
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
              { userCompanies: { some: { companyId, isActive: true } } },
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
      // Include both direct companyId and userCompanies for proper multi-tenant filtering
      const validUserIds = await this.prisma.user.findMany({
        where: {
          OR: [
            { companyId: companyId },
            { userCompanies: { some: { companyId, isActive: true } } }
          ]
        },
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

      // جلب بيانات المستخدمين بشكل منفصل للحصول على أقسامهم والراتب الأساسي الكامل
      const userIds = [...new Set(payrolls.map(p => p.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          baseSalary: true,
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
        const user = usersMap.get(p.userId);
        // Use user's full baseSalary (not pro-rated payroll baseSalary) for accurate totals
        const fullBaseSalary = user?.baseSalary ? Number(user.baseSalary) : Number(p.baseSalary);
        summary.totalBaseSalary += fullBaseSalary || 0;
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
    // جلب بيانات الموظف (User أو Employee)
    let employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        employees: true
      }
    });

    if (!employee) {
      const empRecord = await this.prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            { id: employeeId },
            { employeeNumber: employeeId },
            { userId: employeeId }
          ]
        },
        include: { user: { include: { employees: true } } }
      });

      if (empRecord?.user) {
        employee = empRecord.user;
        employeeId = employee.id;
      } else if (empRecord) {
        employee = {
          id: empRecord.userId || empRecord.id,
          companyId: empRecord.companyId,
          firstName: empRecord.firstName,
          lastName: empRecord.lastName,
          employeeNumber: empRecord.employeeNumber,
          baseSalary: empRecord.baseSalary,
          employees: [empRecord]
        };
        employeeId = employee.id;
      }
    }

    if (!employee) {
      throw new NotFoundError('الموظف', employeeId);
    }

    // جلب إعدادات HR
    const settings = await this.prisma.hRSettings.findUnique({
      where: { companyId }
    });

    // Parse workDays and publicHolidays
    let workingDaysConfig = [0, 1, 2, 3, 4, 6]; // Default: Sat-Thu working, Friday rest
    try {
      if (settings?.workDays) {
        workingDaysConfig = typeof settings.workDays === 'string'
          ? JSON.parse(settings.workDays)
          : settings.workDays;
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
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));

    const periodStartAdjusted = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const periodEndAdjusted = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

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

    // فلترة حازمة للشهر لمنع تسرب أيام الشهور المجاورة (مثل 31 أغسطس إلى سبتمبر)
    const monthKeyPrefix = `${year}-${String(month).padStart(2, '0')}`;
    attendance = attendance.filter(a => this.toLocalDateKey(a.date).startsWith(monthKeyPrefix));

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
    const hrEmployeeId = Array.isArray(employee.employees) ? employee.employees[0]?.id : employee.employees?.id;
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

    // تصنيف سجلات الحضور وساعات العمل
    const attendedFullDatesSet = new Set();
    const halfDayDatesSet = new Set();
    const restOrHolidayDatesSet = new Set();
    const attendanceMapByDate = new Map();

    attendance.forEach(a => {
      const dateKey = this.toLocalDateKey(a.date);
      attendanceMapByDate.set(dateKey, a);
      if (['PRESENT', 'LATE', 'REMOTE', 'OVERTIME'].includes(a.status)) {
        attendedFullDatesSet.add(dateKey);
      } else if (a.status === 'HALF_DAY') {
        halfDayDatesSet.add(dateKey);
      } else if (['HOLIDAY', 'REST_DAY', 'ON_LEAVE', 'WEEKEND'].includes(a.status)) {
        restOrHolidayDatesSet.add(dateKey);
      }
    });

    // إجازات نصف يوم
    const halfDayLeaveDatesSet = new Set();
    leaves.forEach(leave => {
      if (leave.isHalfDay) {
        const dates = this.getDateRange(leave.startDate, leave.endDate);
        dates.forEach(d => {
          const dateStr = this.toLocalDateKey(d);
          if (workingDatesSet.has(dateStr)) {
            halfDayLeaveDatesSet.add(dateStr);
          }
        });
      }
    });

    // أيام الغياب غير المبررة (لا حضور ولا إجازة ولا راحة/عطلة ولا تسبق تاريخ التعيين)
    const empHireDate = employee.hireDate || (Array.isArray(employee.employees) ? employee.employees[0]?.hireDate : employee.employees?.hireDate);
    const hireDateStr = empHireDate ? this.toLocalDateKey(empHireDate) : null;

    const trulyAbsentDates = workingDates.filter(d =>
      (!hireDateStr || d >= hireDateStr) &&
      !attendedFullDatesSet.has(d) &&
      !halfDayDatesSet.has(d) &&
      !paidLeaveDates.has(d) &&
      !unpaidLeaveDates.has(d) &&
      !restOrHolidayDatesSet.has(d)
    );

    // إجمالي أيام الغياب (الأيام الكاملة + 0.5 لكل نصف يوم غير مغطى بإجازة)
    const absentDays = trulyAbsentDates.length + (halfDayDatesSet.size * 0.5);

    // أيام الحضور الفعلي والمدفوعة
    const paidDatesCount = workingDates.filter(d =>
      attendedFullDatesSet.has(d) ||
      paidLeaveDates.has(d) ||
      restOrHolidayDatesSet.has(d)
    ).length + (halfDayDatesSet.size * 0.5);
    const presentDays = paidDatesCount;

    // حساب ساعات العمل الإضافي
    const totalOvertimeHours = attendance.reduce((sum, a) =>
      sum + (parseFloat(a.overtimeHours) || 0), 0
    );

    // حساب دقائق التأخير والخروج المبكر (استبعاد أيام الراحة وحالة OVERTIME)
    const totalLateMinutes = attendance.reduce((sum, a) => {
      if (a.status === 'OVERTIME') return sum;
      const recordDate = new Date(a.date);
      if (!workingDaysConfig.includes(recordDate.getDay())) return sum;
      return sum + (a.lateMinutes || 0);
    }, 0);
    const totalEarlyMinutes = attendance.reduce((sum, a) => {
      if (a.status === 'OVERTIME') return sum;
      const recordDate = new Date(a.date);
      if (!workingDaysConfig.includes(recordDate.getDay())) return sum;
      return sum + (a.earlyLeaveMinutes || 0);
    }, 0);

    // الراتب الأساسي وسعر اليوم والساعة والدقيقة
    const empRecord = Array.isArray(employee.employees) ? employee.employees[0] : employee.employees;
    const fullMonthBaseSalary = parseFloat(
      data.overrides?.baseSalary ??
      (empRecord?.baseSalary ?? employee.baseSalary)
    ) || 0;
    const dailyRate = fullMonthBaseSalary / totalWorkingDaysInMonth;
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const hourlyRate = dailyRate / workingHoursPerDay;
    const minuteRate = hourlyRate / 60;

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

    // حساب الراتب والبدلات المستحقة مع التقسيم على تاريخ التعيين (سواء للشهر الحالي أو الشهور السابقة)
    let baseSalary = fullMonthBaseSalary;
    let totalAllowances = fullMonthAllowances;
    let isProratedHire = false;
    let hireProrationNote = null;

    if (empHireDate) {
      const hireDateObj = new Date(empHireDate);
      if (
        hireDateObj.getUTCFullYear() === parseInt(year) &&
        (hireDateObj.getUTCMonth() + 1) === parseInt(month) &&
        hireDateObj.getUTCDate() > 1
      ) {
        // حساب أيام العمل المستحقة من تاريخ التعيين وحتى نهاية الشهر
        const workingDaysFromHire = workingDates.filter(d => d >= hireDateStr).length;
        if (workingDaysFromHire < totalWorkingDaysInMonth) {
          const hireRatio = workingDaysFromHire / totalWorkingDaysInMonth;
          baseSalary = Math.round(fullMonthBaseSalary * hireRatio * 100) / 100;
          totalAllowances = Math.round(fullMonthAllowances * hireRatio * 100) / 100;
          isProratedHire = true;
          const hireDay = hireDateObj.getUTCDate();
          const hireMonth = hireDateObj.getUTCMonth() + 1;
          hireProrationNote = `أساسي مُقسَّم (تعيين ${hireDay}/${hireMonth}): ${baseSalary.toFixed(2)}`;
          console.log(`📅 [PAYROLL-PRORATION] Mid-month hire (${hireDay}/${hireMonth}): ${workingDaysFromHire}/${totalWorkingDaysInMonth} work days. Prorated base: ${baseSalary}`);
        }
      }
    }

    if (isCurrentMonth && !isProratedHire) {
      const daysPassedWorking = this.getWorkingDaysInMonth(year, month, now.getDate(), workingDaysConfig, publicHolidays);
      const earnedRatio = daysPassedWorking / totalWorkingDaysInMonth;
      baseSalary = Math.round(fullMonthBaseSalary * earnedRatio * 100) / 100;
      totalAllowances = Math.round(fullMonthAllowances * earnedRatio * 100) / 100;

      console.log('📊 [PAYROLL-CALC] Current month - calculating earned salary:', {
        totalWorkingDays: totalWorkingDaysInMonth,
        daysPassedWorking,
        earnedRatio: earnedRatio.toFixed(4),
        fullMonthBaseSalary,
        earnedBaseSalary: baseSalary.toFixed(2)
      });
    }

    // ---------------------------------------------------------
    // 💸 DEDUCTIONS INTEGRATION (الخصومات التلقائية واليدوية)
    // ---------------------------------------------------------

    const isCompanyAutoDeductionEnabled = settings?.autoDeductionEnabled !== false;
    const isEmployeeAutoDeductionEnabled = employee.enableAutoDeduction !== false;
    const isAutoDeductionEnabled = isCompanyAutoDeductionEnabled && isEmployeeAutoDeductionEnabled;

    const dailyPenaltyMap = new Map();
    const deductions = {};
    let attendanceDeduction = 0;
    let latePenalty = 0;

    const maxDailyDeductionDays = parseFloat(settings?.maxDailyDeductionDays) || 0;
    const dailyCapLimit = maxDailyDeductionDays > 0 ? (dailyRate * maxDailyDeductionDays) : Infinity;

    const addDailyPenalty = (date, amount, reason, type = 'auto') => {
      const dateStr = this.toLocalDateKey(date);
      if (!dailyPenaltyMap.has(dateStr)) {
        dailyPenaltyMap.set(dateStr, { total: 0, attendanceTotal: 0, manualTotal: 0, details: [], types: [] });
      }
      const dayData = dailyPenaltyMap.get(dateStr);
      dayData.total += amount;
      if (type === 'manual') {
        dayData.manualTotal = (dayData.manualTotal || 0) + amount;
      } else {
        dayData.attendanceTotal = (dayData.attendanceTotal || 0) + amount;
      }
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
    } else {
      const manualDeductionCategoryFilter = isAutoDeductionEnabled
        ? { not: 'UNPAID_LEAVE' }
        : { notIn: ['UNPAID_LEAVE', 'AUTO_DEDUCTION'] };

      manualDeductions = await this.prisma.manualDeduction.findMany({
        where: {
          employeeId,
          companyId,
          effectiveMonth: parseInt(month),
          effectiveYear: parseInt(year),
          status: 'APPROVED',
          category: manualDeductionCategoryFilter
        }
      });
    }

    // استبعاد الخصومات التلقائية القديمة أو الشبحية التي تم تصحيح سجل حضورها أو إلغاؤه
    manualDeductions = manualDeductions.filter(d => {
      if (d.status === 'CANCELLED' || d.status === 'REJECTED') return false;
      if (d.category === 'AUTO_DEDUCTION') {
        const attIdMatch = d.notes ? d.notes.match(/Attendance ID:\s*([a-zA-Z0-9_-]+)/) : null;
        if (attIdMatch) {
          const linkedAttId = attIdMatch[1];
          const linkedAtt = attendance.find(a => a.id === linkedAttId);
          if (!linkedAtt) {
            // السجل ملغى أو محذوف
            return false;
          }
          const dayOfWeek = new Date(linkedAtt.date).getDay();
          if (!workingDaysConfig.includes(dayOfWeek)) {
            // بصمة حضور في يوم راحة أسبوعية
            return false;
          }
          if (d.type === 'LATE' && ((linkedAtt.lateMinutes || 0) === 0 || linkedAtt.status === 'PRESENT' || linkedAtt.status === 'OVERTIME')) {
            // تم تصحيح التأخير لصفر أو أصبحت الحالة حاضر أو ساعات إضافية
            return false;
          }
          if (d.type === 'EARLY_LEAVE') {
            const durationMs = (linkedAtt.checkIn && linkedAtt.checkOut)
              ? (new Date(linkedAtt.checkOut).getTime() - new Date(linkedAtt.checkIn).getTime())
              : 0;
            if ((linkedAtt.earlyLeaveMinutes || 0) === 0 || durationMs < 5 * 60 * 1000) {
              // خطأ بصمة مزدوجة أقل من 5 دقائق أو تم تصفير دقائق الانصراف المبكر
              return false;
            }
          }
        }
      }
      return true;
    });

    // إذا كان الراتب الأساسي مقسماً بالفعل على تاريخ التعيين، نتأكد من عدم ازدواج خصم التناسب اليدوي
    if (isProratedHire) {
      manualDeductions = manualDeductions.filter(d => {
        const reasonLower = (d.reason || '').toLowerCase();
        if (reasonLower.includes('تناسب') || reasonLower.includes('تاريخ التعيين')) {
          console.log(`ℹ️ [PAYROLL] Skipping manual deduction ${d.id} because baseSalary was already prorated on hireDate`);
          return false;
        }
        return true;
      });
    }

    manualDeductions.forEach(d => {
      // الخصومات التلقائية AUTO_DEDUCTION تُعالج عبر محرك التأخير والانصراف المبكر لتفادي الازدواج وتصنيفها كـ "خصم يدوي"
      if (d.category === 'AUTO_DEDUCTION') return;
      addDailyPenalty(d.date, parseFloat(d.amount), `يدوي: ${d.reason}`, 'manual');
    });

    // 1.05. Permissions Accounting (حساب الأذونات: المدفوع حتى 120 دقيقة، والإضافي خصم أو تعويض)
    const monthlyPaidPermissionQuota = (settings?.paidPermissionMinutesPerMonth !== undefined && settings?.paidPermissionMinutesPerMonth !== null)
      ? Number(settings.paidPermissionMinutesPerMonth)
      : 0;

    let cumulativePermissionMins = 0;
    const permissionLines = [];
    let totalExtraPermissionDeduction = 0;
    const permissionsByDate = new Map();

    const sortedApprovedPermissions = [...approvedPermissions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedApprovedPermissions.forEach(p => {
      const pDateStr = this.toLocalDateKey(p.date);
      const pMins = Math.round((parseFloat(p.totalHours || p.hours) || 0) * 60);
      if (pMins <= 0) return;

      if (!permissionsByDate.has(pDateStr)) {
        permissionsByDate.set(pDateStr, { totalMinutes: 0, items: [] });
      }
      const dayData = permissionsByDate.get(pDateStr);
      dayData.totalMinutes += pMins;
      dayData.items.push(p);

      // إذا كان الإذن مصنفاً كغير خاضع للخصم صراحةً (NON_DEDUCTIBLE)
      const isNonDeductible = p.type === 'NON_DEDUCTIBLE' || p.isNonDeductible === true;
      if (isNonDeductible) {
        permissionLines.push(`${pDateStr}: إذن معتمد (${p.reason || 'إذن غير خاضع للخصم'}) ${pMins}د — بدون خصم`);
        return;
      }

      const quotaRemaining = Math.max(0, monthlyPaidPermissionQuota - cumulativePermissionMins);
      const paidPortion = Math.min(pMins, quotaRemaining);
      const extraPortion = Math.max(0, pMins - paidPortion);
      cumulativePermissionMins += pMins;

      const isCompensated = p.isCompensated || p.type === 'COMPENSATORY' || Boolean(p.compensationDate);
      const compDateStr = p.compensationDate ? this.toLocalDateKey(p.compensationDate) : null;

      if (paidPortion > 0) {
        permissionLines.push(`${pDateStr}: إذن معتمد ${paidPortion} دقيقة — بدون خصم`);
      }

      if (extraPortion > 0) {
        if (isCompensated) {
          permissionLines.push(`${pDateStr}: إذن إضافي ${extraPortion} دقيقة — تعويض بتاريخ ${compDateStr || 'شفت بديل'}`);
        } else {
          const permDeduct = extraPortion * minuteRate;
          totalExtraPermissionDeduction += permDeduct;
          permissionLines.push(`${pDateStr}: إذن إضافي ${extraPortion} دقيقة — خصم (${permDeduct.toFixed(2)} ج.م)`);
          addDailyPenalty(p.date, permDeduct, `إذن إضافي ${extraPortion}د (${permDeduct.toFixed(2)} ج.م)`, 'permission');
        }
      }
    });

    // 1.1 Unpaid Leave Deduction (خصم إجازة بدون راتب - قيمة اليوم العادية بدون مضاعف)
    unpaidLeaveDates.forEach(dateStr => {
      addDailyPenalty(new Date(dateStr), dailyRate, 'إجازة بدون راتب');
    });

    // 2. Absence Penalty (حساب وخصم الغياب تلقائياً)
    const absenceMultiplier = parseFloat(settings?.absencePenaltyRate) || 1.0;
    const deductAbsenceInCurrentMonth = settings?.deductAbsenceInCurrentMonth !== false;

    let totalAbsencePenalty = 0;
    const absenceDetails = [];

    workingDates.forEach(dateStr => {
      const dayDate = new Date(dateStr);
      const isPastDay = isCurrentMonth ? dayDate <= now : true;

      if (isPastDay && trulyAbsentDates.includes(dateStr)) {
        if (!isCurrentMonth || deductAbsenceInCurrentMonth) {
          const dayAbsenceAmount = dailyRate * absenceMultiplier;
          totalAbsencePenalty += dayAbsenceAmount;
          absenceDetails.push(`${dateStr} (غياب كامل × ${absenceMultiplier} = ${dayAbsenceAmount.toFixed(2)})`);
          addDailyPenalty(new Date(dateStr), dayAbsenceAmount, `غياب كامل (معامل ${absenceMultiplier}x)`, 'absence');
        }
      }
    });

    halfDayDatesSet.forEach(dateStr => {
      const dayDate = new Date(dateStr);
      const isPastDay = isCurrentMonth ? dayDate <= now : true;

      if (isPastDay && !halfDayLeaveDatesSet.has(dateStr)) {
        if (!isCurrentMonth || deductAbsenceInCurrentMonth) {
          const halfDayAbsenceAmount = (dailyRate * 0.5) * absenceMultiplier;
          totalAbsencePenalty += halfDayAbsenceAmount;
          absenceDetails.push(`${dateStr} (غياب نصف يوم × ${absenceMultiplier} = ${halfDayAbsenceAmount.toFixed(2)})`);
          addDailyPenalty(new Date(dateStr), halfDayAbsenceAmount, `غياب نصف يوم (معامل ${absenceMultiplier}x)`, 'absence');
        }
      }
    });

    // 3. Late Penalty (حساب وخصم التأخيرات تلقائياً)
    let totalLatePenalty = 0;
    const lateDetails = [];

    const lateOccurrences = attendance
      .filter(a => {
        if (a.status === 'OVERTIME') return false;
        const recordDate = new Date(a.date);
        if (!workingDaysConfig.includes(recordDate.getDay())) return false;
        return (a.lateMinutes > 0 || a.status === 'LATE');
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const isSep2026 = parseInt(month) === 9 && parseInt(year) === 2026;
    const firstViolationMultiplier = isSep2026 ? 1.0 : (parseFloat(settings?.firstViolationMultiplier) || 1.0);
    const secondViolationMultiplier = isSep2026 ? 1.0 : (parseFloat(settings?.secondViolationMultiplier) || 2.0);
    const thirdViolationMultiplier = isSep2026 ? 1.0 : (parseFloat(settings?.thirdViolationMultiplier) || 3.0);

    const autoDeductionMap = new Map();
    manualDeductions.forEach(d => {
      if (d.category === 'AUTO_DEDUCTION' && d.type === 'LATE' && d.status === 'APPROVED' && !isSep2026) {
        const key = this.toLocalDateKey(d.date);
        autoDeductionMap.set(key, d);
      }
    });

    const latenessBalance = await this.prisma.latenessBalance.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    const monthlyGrace = settings?.gracePeriodMinutes !== undefined ? settings.gracePeriodMinutes : 60;
    let remainingGrace = monthlyGrace;
    const maxDailyThreshold = settings?.lateThresholdMinutes || settings?.lateGracePeriod || 10;
    const delayPenaltyTiers = settings?.delayPenaltyTiers
      ? (typeof settings.delayPenaltyTiers === 'string' ? JSON.parse(settings.delayPenaltyTiers) : settings.delayPenaltyTiers)
      : [];

    lateOccurrences.forEach((occ, index) => {
      const dateStr = this.toLocalDateKey(occ.date);
      const mins = occ.lateMinutes || 0;

      // إذا وُجد خصم تلقائي محفوظ مسبقاً ومعتمد صراحةً في ManualDeduction، نعتمد قيمته (خارج تجميد سبتمبر 2026)
      if (autoDeductionMap.has(dateStr)) {
        const existingDeduction = autoDeductionMap.get(dateStr);
        if (existingDeduction.status === 'APPROVED' && !isSep2026) {
          const amount = parseFloat(existingDeduction.amount) || 0;
          totalLatePenalty += amount;
          lateDetails.push(`${dateStr}: تأخير ${mins}د = ${amount.toFixed(2)} ج.م (تلقائي معتمد)`);
          return;
        }
      }

      // حساب ديناميكي للتأخير غير المحفوظ مسبقاً (فقط إذا كان الخصم التلقائي مفعلاً)
      if (!isAutoDeductionEnabled) {
        return;
      }

      // الأذونات المعتمدة لهذا اليوم تخصم من دقائق التأخير لتفادي الخصم أو استهلاك السماح
      const dayPermInfo = permissionsByDate.get(dateStr);
      const dayPermMins = dayPermInfo ? dayPermInfo.totalMinutes : 0;
      const effectiveMins = Math.max(0, mins - dayPermMins);

      if (effectiveMins === 0) {
        // مغطى بالكامل بالإذن المعتمد — لا يُخصم كتأخير ولا يستهلك رصيد السماح
        return;
      }

      // رصيد السماح الشهري (مثلاً 60 دقيقة) يمتص دقائق التأخير أولاً بأول حتى نفاده
      let graceUsed = 0;
      if (remainingGrace > 0) {
        graceUsed = Math.min(effectiveMins, remainingGrace);
        remainingGrace -= graceUsed;
      }

      const effectiveLateMinutes = Math.max(0, effectiveMins - graceUsed);

      if (effectiveLateMinutes <= 0) {
        lateDetails.push(`${dateStr}: تأخير ${mins}د (مغطى برصيد السماح الشهري)`);
        return;
      }

      let dayLatePenalty = 0;

      // تطبيق شرائح التأخير إن وُجدت
      if (Array.isArray(delayPenaltyTiers) && delayPenaltyTiers.length > 0) {
        const applicableTier = [...delayPenaltyTiers]
          .sort((a, b) => b.minMinutes - a.minMinutes)
          .find(t => effectiveLateMinutes >= t.minMinutes);
        if (applicableTier) {
          dayLatePenalty = dailyRate * (parseFloat(applicableTier.deductionDays) || 0);
        }
      }

      // إذا لم تنطبق شريحة، الحساب بالدقيقة مع مضاعف التكرار
      if (dayLatePenalty === 0) {
        let multiplier = firstViolationMultiplier;
        if (index === 1) multiplier = secondViolationMultiplier;
        else if (index >= 2) multiplier = thirdViolationMultiplier;

        dayLatePenalty = effectiveLateMinutes * minuteRate * multiplier;
      }

      if (dayLatePenalty > 0) {
        totalLatePenalty += dayLatePenalty;
        const coveredNote = dayPermMins > 0 ? ` (مغطى بإذن ${dayPermMins}د)` : '';
        const graceNote = graceUsed > 0 ? ` (سماح ${graceUsed}د)` : '';
        lateDetails.push(`${dateStr}: تأخير ${mins}د${coveredNote}${graceNote} (مخصوم ${effectiveLateMinutes}د) = ${dayLatePenalty.toFixed(2)} ج.م`);
        addDailyPenalty(occ.date, dayLatePenalty, `تأخير ${mins}د (${dayLatePenalty.toFixed(2)} ج.م)`, 'late');
      }
    });

    latePenalty = totalLatePenalty;

    // 4. Work Hours Deficit & Early Checkout (حساب وخصم عجز ساعات العمل والانصراف المبكر)
    let totalDeficitPenalty = 0;
    const deficitDetails = [];

    attendance.forEach(a => {
      if (!['PRESENT', 'LATE', 'REMOTE', 'HALF_DAY'].includes(a.status)) return;

      const dateStr = this.toLocalDateKey(a.date);
      const expectedHours = a.status === 'HALF_DAY' ? (workingHoursPerDay / 2) : workingHoursPerDay;

      let actualHours = Math.max(0, parseFloat(a.workHours || a.workingHours) || 0);
      const checkOutTime = a.checkOut || a.check_out;
      const checkInTime = a.checkIn || a.check_in;

      let isDoublePunch = false;
      if (checkInTime && checkOutTime) {
        const checkInDate = new Date(checkInTime);
        const checkOutDate = new Date(checkOutTime);
        if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
          const presenceMs = checkOutDate.getTime() - checkInDate.getTime();
          if (presenceMs >= 0 && presenceMs < 5 * 60 * 1000) {
            isDoublePunch = true;
            // البصمة المزدوجة (< 5 دقائق): الموظف بصم حضوراً وحدث ارتداد/خروج خاطئ بالثواني
            actualHours = Math.max(actualHours, expectedHours);
          }
          if (presenceMs > 0 && !isDoublePunch) {
            const grossHours = presenceMs / (1000 * 60 * 60);
            if (grossHours > actualHours) {
              actualHours = grossHours;
            }
          }
        }
      }

      // إذا كان السجل مغلقاً تلقائياً أو منقولاً من حساب المكتب مع صفر انصراف مبكر
      if ((a.earlyLeaveMinutes || 0) === 0 && (a.notes?.includes('Auto-checkout') || a.notes?.includes('Reassigned'))) {
        actualHours = Math.max(actualHours, expectedHours);
      }

      // إذن الخروج المصرح به في هذا اليوم
      const dayPermissions = approvedPermissions.filter(p => this.toLocalDateKey(p.date) === dateStr);
      const permittedHours = dayPermissions.reduce((sum, p) => sum + (parseFloat(p.totalHours || p.hours) || 0), 0);

      // ساعات التأخير المحسوبة مسبقاً لتفادي الخصم المزدوج
      const lateHoursAlreadyPenalized = (a.lateMinutes || 0) / 60;

      const rawDeficit = Math.max(0, expectedHours - actualHours);
      const unexcusedDeficit = Math.max(0, rawDeficit - lateHoursAlreadyPenalized - permittedHours);

      // إذا كان هناك عجز غير مبرر يتجاوز 15 دقيقة (0.25 ساعة)
      if (unexcusedDeficit > 0.25) {
        const deficitAmount = unexcusedDeficit * hourlyRate;
        totalDeficitPenalty += deficitAmount;
        deficitDetails.push(`${dateStr}: عجز ${unexcusedDeficit.toFixed(2)}س = ${deficitAmount.toFixed(2)} ج.م`);
        addDailyPenalty(a.date, deficitAmount, `عجز ساعات عمل ${unexcusedDeficit.toFixed(1)}س`, 'deficit');
      } else if (!isDoublePunch) {
        const unexcusedEarlyMinutes = Math.max(0, (a.earlyLeaveMinutes || 0) - (permittedHours * 60));
        if (unexcusedEarlyMinutes > 15) {
          const earlyHours = unexcusedEarlyMinutes / 60;
          const earlyAmount = earlyHours * hourlyRate;
          totalDeficitPenalty += earlyAmount;
          deficitDetails.push(`${dateStr}: انصراف مبكر ${unexcusedEarlyMinutes}د = ${earlyAmount.toFixed(2)} ج.م`);
          addDailyPenalty(a.date, earlyAmount, `انصراف مبكر ${unexcusedEarlyMinutes}د`, 'deficit');
        }
      }
    });

    // 🛡️ APPLY DAILY CAP AND SUMMARIZE
    let totalCappedAttendancePenalty = 0;
    let totalCappedManualPenalty = 0;
    let capAuditTrail = [];
    let deductionBreakdown = [];
    let dailyDeductions = [];

    dailyPenaltyMap.forEach((dayData, dateStr) => {
      let attendanceDailyTotal = dayData.attendanceTotal || 0;
      const manualDailyTotal = dayData.manualTotal || 0;

      // سقف الخصم اليومي يطبق حصراً على خصومات الحضور والغياب (وليس الخصومات اليدوية أو التسويات)
      const isCapped = dailyCapLimit > 0 && attendanceDailyTotal > dailyCapLimit;

      if (isCapped) {
        capAuditTrail.push(`${dateStr}: تم خفض خصم الحضور من ${attendanceDailyTotal.toFixed(2)} إلى ${dailyCapLimit.toFixed(2)} (سقف)`);
        attendanceDailyTotal = dailyCapLimit;
      }

      const dailyTotal = attendanceDailyTotal + manualDailyTotal;
      const deductionTypes = dayData.types || [];
      const isManual = deductionTypes.some(t => t === 'manual');
      const typeLabel = isManual ? 'يدوي' : 'تلقائي';

      deductionBreakdown.push(`${dateStr}: ${dailyTotal.toFixed(2)} (${dayData.details.join(', ')}) - [${typeLabel}]`);

      dailyDeductions.push({
        date: dateStr,
        amount: Number(dailyTotal.toFixed(2)),
        rawAmount: Number(dayData.total.toFixed(2)),
        isCapped,
        type: typeLabel,
        reasons: dayData.details,
        types: dayData.types
      });

      totalCappedManualPenalty += manualDailyTotal;
      totalCappedAttendancePenalty += attendanceDailyTotal;
    });

    // تصنيف الخصومات وحفظها بوضوح
    if (totalCappedManualPenalty > 0) {
      deductions['خصم يدوي'] = totalCappedManualPenalty;
      const trueManualDeductions = manualDeductions.filter(d => d.category !== 'AUTO_DEDUCTION');
      deductions.manualDetails = trueManualDeductions.map(d => `${d.reason}(${d.amount})`).join(' | ');
    }

    attendanceDeduction = totalCappedAttendancePenalty;
    if (attendanceDeduction > 0) {
      deductions['غياب وتأخير'] = attendanceDeduction;
    }
    deductions.details = deductionBreakdown.join(' | ');
    if (absenceDetails.length > 0) deductions.absenceDetails = absenceDetails.join(' | ');
    if (lateDetails.length > 0) deductions.lateDetails = lateDetails.join(' | ');
    if (deficitDetails.length > 0) deductions.deficitDetails = deficitDetails.join(' | ');
    if (totalAbsencePenalty > 0) deductions.absenceAmount = Number(totalAbsencePenalty.toFixed(2));
    if (totalLatePenalty > 0) deductions.lateAmount = Number(totalLatePenalty.toFixed(2));
    if (totalDeficitPenalty > 0) deductions.deficitAmount = Number(totalDeficitPenalty.toFixed(2));
    if (permissionLines.length > 0) deductions.permissionDetails = permissionLines.join(' | ');
    if (totalExtraPermissionDeduction > 0) deductions.permissionAmount = Number(totalExtraPermissionDeduction.toFixed(2));
    if (hireProrationNote) deductions.prorationNote = hireProrationNote;

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

    // حساب إجمالي الخصومات بدقة وتجنب الازدواجية بين البنود التفصيلية والمجمعة
    let calculatedTotalDeductions = totalCappedAttendancePenalty + totalCappedManualPenalty + totalAdvanceDeduction;
    if (data.deductions && typeof data.deductions === 'object') {
      const skipKeys = new Set([
        'details', 'manualDetails', 'capNotes', 'advanceDetails',
        'absenceDetails', 'lateDetails', 'deficitDetails',
        'absenceAmount', 'lateAmount', 'deficitAmount',
        'غياب', 'تأخيرات', 'عجز ساعات العمل', 'خصم يدوي', 'غياب وتأخير', 'سلف',
        'prorationNote', 'permissionDetails', 'permissionAmount'
      ]);
      Object.entries(data.deductions).forEach(([k, v]) => {
        if (!skipKeys.has(k)) {
          calculatedTotalDeductions += (parseFloat(v) || 0);
        }
      });
    }

    const totalDeductions = Math.round(calculatedTotalDeductions * 100) / 100;

    // حساب الإضافي (بدون مضاعف إلا لو مُفعّل من الإعدادات)
    const parsedOvertimeRate = parseFloat(settings?.overtimeRate);
    const overtimeRate = (!isNaN(parsedOvertimeRate) && parsedOvertimeRate > 0) ? parsedOvertimeRate : 1.0;
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
      absenceDeduction: Number(totalAbsencePenalty.toFixed(2)),
      lateMinutes: totalLateMinutes,
      totalLateMinutes,
      earlyMinutes: totalEarlyMinutes,
      totalEarlyMinutes,
      allowances,
      totalAllowances,
      deductions,
      dailyDeductions,
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


  getWorkingDaysInMonth(year, month, uptoDay = null, workDays = [0, 1, 2, 3, 4, 6], publicHolidays = []) {
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
  getWorkingDaysDates(year, month, uptoDay = null, workDays = [0, 1, 2, 3, 4, 6], publicHolidays = []) {
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

    let workingDaysConfig = [0, 1, 2, 3, 4, 6];
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

  /**
   * أتمتة حساب وخصم الرواتب تلقائياً لجميع الموظفين
   * Auto Calculate & Deduct Payrolls for all active employees
   */
  async autoCalculateAndDeductPayrolls(companyId, month, year, options = {}) {
    try {
      const targetMonth = parseInt(month) || (new Date().getMonth() + 1);
      const targetYear = parseInt(year) || new Date().getFullYear();
      const isAutoTriggered = options.autoTriggered === true;

      const employees = await this.prisma.user.findMany({
        where: {
          isActive: true,
          AND: {
            OR: [
              { companyId: companyId },
              { userCompanies: { some: { companyId, isActive: true } } }
            ]
          }
        },
        include: {
          employees: true
        }
      });

      const summary = {
        companyId,
        month: targetMonth,
        year: targetYear,
        totalEmployees: employees.length,
        processed: 0,
        created: 0,
        updated: 0,
        skippedPaid: 0,
        failed: 0,
        totalGross: 0,
        totalNet: 0,
        totalAbsenceDeductions: 0,
        totalLateDeductions: 0,
        totalDeficitDeductions: 0,
        totalManualDeductions: 0,
        totalAdvancesDeductions: 0,
        results: []
      };

      for (const employee of employees) {
        try {
          // فحص كشف الراتب القائم
          const existing = await this.prisma.payroll.findFirst({
            where: {
              userId: employee.id,
              month: targetMonth,
              year: targetYear
            }
          });

          // حماية الكشوف المدفوعة من التعديل
          if (existing && existing.status === 'PAID') {
            summary.skippedPaid++;
            summary.results.push({
              userId: employee.id,
              name: `${employee.firstName} ${employee.lastName}`,
              status: 'SKIPPED_PAID',
              payrollId: existing.id
            });
            continue;
          }

          // حساب بيانات الراتب والخصومات التلقائية
          const payrollData = await this.calculatePayrollData(companyId, employee.id, targetMonth, targetYear, {});

          // إحصائيات الخصم
          const parsedDeductions = payrollData.deductions || {};
          const absenceAmt = parseFloat(parsedDeductions['غياب'] || 0);
          const lateAmt = parseFloat(parsedDeductions['تأخيرات'] || 0);
          const deficitAmt = parseFloat(parsedDeductions['عجز ساعات العمل'] || 0);
          const manualAmt = parseFloat(parsedDeductions['خصم يدوي'] || 0);
          const advanceAmt = parseFloat(parsedDeductions['سلف'] || 0);

          summary.totalAbsenceDeductions += absenceAmt;
          summary.totalLateDeductions += lateAmt;
          summary.totalDeficitDeductions += deficitAmt;
          summary.totalManualDeductions += manualAmt;
          summary.totalAdvancesDeductions += advanceAmt;
          summary.totalGross += parseFloat(payrollData.grossSalary || 0);
          summary.totalNet += parseFloat(payrollData.netSalary || 0);

          let savedPayroll;
          if (existing) {
            // تحديث كشف الراتب القائم في المسودة بالقيم المحسوبة الجديدة
            savedPayroll = await this.prisma.payroll.update({
              where: { id: existing.id },
              data: {
                baseSalary: payrollData.baseSalary,
                workingDays: payrollData.totalWorkingDaysInMonth,
                actualWorkDays: payrollData.presentDays,
                absentDays: Math.round(payrollData.absentDays),
                allowances: JSON.stringify(payrollData.allowances),
                totalAllowances: payrollData.totalAllowances,
                deductions: JSON.stringify(payrollData.deductions),
                totalDeductions: payrollData.totalDeductions,
                attendanceDeduction: payrollData.attendanceDeduction,
                latePenalty: payrollData.latePenalty,
                overtimeHours: payrollData.totalOvertimeHours,
                overtimeRate: payrollData.overtimeRate,
                overtimeAmount: payrollData.overtimeAmount,
                bonuses: payrollData.bonuses,
                socialInsurance: payrollData.socialInsurance,
                taxAmount: payrollData.taxAmount,
                grossSalary: payrollData.grossSalary,
                netSalary: payrollData.netSalary,
                periodStart: payrollData.periodStart,
                periodEnd: payrollData.periodEnd
              }
            });
            summary.updated++;
          } else {
            // إنشاء كشف راتب جديد
            const employeeRecord = employee.employees?.[0];
            savedPayroll = await this.prisma.payroll.create({
              data: {
                companyId,
                userId: employee.id,
                employeeRelId: employeeRecord ? employeeRecord.id : null,
                month: targetMonth,
                year: targetYear,
                periodStart: payrollData.periodStart,
                periodEnd: payrollData.periodEnd,
                baseSalary: payrollData.baseSalary,
                workingDays: payrollData.totalWorkingDaysInMonth,
                actualWorkDays: payrollData.presentDays,
                absentDays: Math.round(payrollData.absentDays),
                allowances: JSON.stringify(payrollData.allowances),
                totalAllowances: payrollData.totalAllowances,
                deductions: JSON.stringify(payrollData.deductions),
                totalDeductions: payrollData.totalDeductions,
                attendanceDeduction: payrollData.attendanceDeduction,
                latePenalty: payrollData.latePenalty,
                overtimeHours: payrollData.totalOvertimeHours,
                overtimeRate: payrollData.overtimeRate,
                overtimeAmount: payrollData.overtimeAmount,
                bonuses: payrollData.bonuses,
                socialInsurance: payrollData.socialInsurance,
                taxAmount: payrollData.taxAmount,
                grossSalary: payrollData.grossSalary,
                netSalary: payrollData.netSalary,
                status: 'DRAFT',
                notes: isAutoTriggered ? 'تم الحساب والخصم تلقائياً بواسطة نظام الحضور' : 'تم الحساب والخصم الآلي عند الطلب'
              }
            });
            summary.created++;
          }

          if (payrollData.approvedRewards && payrollData.approvedRewards.length > 0) {
            await rewardPayrollIntegrationService.applyRewardsToPayroll(savedPayroll.id, payrollData.approvedRewards);
          }

          summary.processed++;
          summary.results.push({
            userId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            status: existing ? 'UPDATED' : 'CREATED',
            payrollId: savedPayroll.id,
            baseSalary: payrollData.baseSalary,
            absentDays: payrollData.absentDays,
            attendanceDeduction: payrollData.attendanceDeduction,
            netSalary: payrollData.netSalary
          });
        } catch (empErr) {
          console.error(`❌ [AutoCalculatePayroll] Error processing employee ${employee.id}:`, empErr);
          summary.failed++;
          summary.results.push({
            userId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            status: 'FAILED',
            error: empErr.message
          });
        }
      }

      // إرسال إشعار للمديرين
      if (summary.processed > 0 && !options.silent) {
        setImmediate(async () => {
          try {
            await hrNotificationService.notifyHrEvent({
              companyId,
              notificationKey: 'notifyOnPayrollGeneration',
              includeManagers: true,
              includeAllManagers: true,
              title: 'تم حساب وخصم الرواتب تلقائياً',
              message: `تم حساب وخصم رواتب شهر ${targetMonth}/${targetYear} تلقائياً لـ ${summary.processed} موظف بنجاح (جديد: ${summary.created}، محدث: ${summary.updated}). إجمالي الخصومات: ${(summary.totalAbsenceDeductions + summary.totalLateDeductions + summary.totalDeficitDeductions).toFixed(2)} ج.م.`,
              type: 'HR_PAYROLL_GENERATED',
              data: summary,
              whatsApp: {
                employeeName: 'نظام الرواتب الآلي',
                actionId: 'PAYROLL_AUTO',
                actionName: 'أتمتة الرواتب والخصومات',
                details: `تم حساب وخصم رواتب ${targetMonth}/${targetYear} تلقائياً:\n- الموظفين: ${summary.processed}\n- خصومات الغياب: ${summary.totalAbsenceDeductions.toFixed(2)} ج.م\n- خصومات التأخير: ${summary.totalLateDeductions.toFixed(2)} ج.م\n- خصومات عجز الساعات: ${summary.totalDeficitDeductions.toFixed(2)} ج.م\n- إجمالي الصافي: ${summary.totalNet.toFixed(2)} ج.م`,
                requiresApproval: false
              }
            });
          } catch (notifErr) {
            console.error('❌ [AutoCalculatePayroll] Notification failed:', notifErr);
          }
        });
      }

      return summary;
    } catch (error) {
      console.error('❌ Error in autoCalculateAndDeductPayrolls:', error);
      throw error;
    }
  }

  /**
   * جلب حالة أتمتة الرواتب والخصومات للشركة
   */
  async getPayrollAutomationStatus(companyId, month, year) {
    try {
      const targetMonth = parseInt(month) || (new Date().getMonth() + 1);
      const targetYear = parseInt(year) || new Date().getFullYear();

      const [settings, payrollCount, draftCount, paidCount, attendanceCount] = await Promise.all([
        this.prisma.hRSettings.findUnique({
          where: { companyId }
        }),
        this.prisma.payroll.count({
          where: { companyId, month: targetMonth, year: targetYear }
        }),
        this.prisma.payroll.count({
          where: { companyId, month: targetMonth, year: targetYear, status: 'DRAFT' }
        }),
        this.prisma.payroll.count({
          where: { companyId, month: targetMonth, year: targetYear, status: 'PAID' }
        }),
        this.prisma.attendance.count({
          where: {
            companyId,
            date: {
              gte: new Date(targetYear, targetMonth - 1, 1),
              lte: new Date(targetYear, targetMonth, 0, 23, 59, 59)
            }
          }
        })
      ]);

      const payrollDay = settings?.payrollDay || 25;
      const autoDeductionEnabled = settings?.autoDeductionEnabled !== false;
      const absencePenaltyRate = parseFloat(settings?.absencePenaltyRate) || 1.0;
      const workingHoursPerDay = settings?.workingHoursPerDay || 8;
      const workingDaysPerMonth = settings?.workingDaysPerMonth || 22;

      const today = new Date();
      let nextRun = new Date(today.getFullYear(), today.getMonth(), payrollDay);
      if (today.getDate() > payrollDay) {
        nextRun = new Date(today.getFullYear(), today.getMonth() + 1, payrollDay);
      }

      return {
        companyId,
        month: targetMonth,
        year: targetYear,
        autoDeductionEnabled,
        payrollDay,
        nextRunDate: nextRun,
        workingHoursPerDay,
        workingDaysPerMonth,
        absencePenaltyRate,
        stats: {
          payrollCount,
          draftCount,
          paidCount,
          attendanceCount
        }
      };
    } catch (error) {
      console.error('❌ Error getting payroll automation status:', error);
      throw error;
    }
  }

  /**
   * معاينة مسير الرواتب (Dry-Run / Read-Only) بدون أي كتابة في قاعدة البيانات
   * @param {string} companyId 
   * @param {object} options { month, year, employeeId, employeeCode, employeeNumber, overrides }
   */
  async previewPayroll(companyId, options = {}) {
    const month = parseInt(options.month, 10);
    const year = parseInt(options.year, 10);

    if (!month || isNaN(month) || month < 1 || month > 12) {
      const err = new Error('الشهر مطلوب ويجب أن يكون بين 1 و 12');
      err.code = 'INVALID_MONTH';
      err.statusCode = 400;
      throw err;
    }

    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      const err = new Error('السنة مطلوبة ويجب أن تكون صالحة (مثال: 2026)');
      err.code = 'INVALID_YEAR';
      err.statusCode = 400;
      throw err;
    }

    const employeeIdentifier = options.employeeId || options.employeeCode || options.employeeNumber;

    // حالة 1: معاينة موظف محدد
    if (employeeIdentifier) {
      let targetEmployee = null;
      let targetEmployeeId = null;

      // 1. البحث في User
      const user = await this.prisma.user.findFirst({
        where: {
          id: employeeIdentifier,
          OR: [
            { companyId },
            { userCompanies: { some: { companyId, isActive: true } } }
          ]
        },
        include: { employees: true }
      });

      if (user) {
        targetEmployee = user;
        targetEmployeeId = user.id;
      } else {
        // 2. البحث في Employee (بـ id أو employeeNumber أو userId)
        const emp = await this.prisma.employee.findFirst({
          where: {
            companyId,
            OR: [
              { id: employeeIdentifier },
              { employeeNumber: employeeIdentifier },
              { userId: employeeIdentifier }
            ]
          },
          include: {
            user: { include: { employees: true } }
          }
        });

        if (emp?.user) {
          targetEmployee = emp.user;
          targetEmployeeId = emp.user.id;
        } else if (emp) {
          targetEmployee = {
            id: emp.userId || emp.id,
            companyId: emp.companyId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeNumber: emp.employeeNumber,
            baseSalary: emp.baseSalary,
            employees: emp
          };
          targetEmployeeId = targetEmployee.id;
        }
      }

      if (!targetEmployee) {
        const err = new Error(`الموظف بالمعرف/الكود "${employeeIdentifier}" غير موجود في هذه الشركة`);
        err.code = 'EMPLOYEE_NOT_FOUND';
        err.statusCode = 400;
        throw err;
      }

      const payrollData = await this.calculatePayrollData(
        companyId,
        targetEmployeeId,
        month,
        year,
        { overrides: options.overrides }
      );

      const previewItem = this._formatPayrollPreviewItem(payrollData, month, year);

      return {
        success: true,
        dryRun: true,
        readOnly: true,
        message: 'تمت معاينة الراتب بنجاح بدون كتابة في قاعدة البيانات',
        companyId,
        month,
        year,
        data: previewItem,
        employees: [previewItem]
      };
    }

    // حالة 2: معاينة جميع الموظفين في الشركة
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ]
      },
      include: {
        employees: true
      }
    });

    const standaloneEmployees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        userId: null
      }
    });

    const allTargets = [
      ...users.map(u => ({ id: u.id, user: u })),
      ...standaloneEmployees.map(e => ({
        id: e.id,
        user: {
          id: e.id,
          companyId: e.companyId,
          firstName: e.firstName,
          lastName: e.lastName,
          employeeNumber: e.employeeNumber,
          baseSalary: e.baseSalary,
          employees: [e]
        }
      }))
    ];

    const previews = [];
    const totals = {
      totalBaseSalary: 0,
      totalGrossSalary: 0,
      totalNetSalary: 0,
      totalDeductions: 0,
      totalAbsenceDeductions: 0,
      totalLatePenalties: 0,
      totalSocialInsurance: 0,
      totalTax: 0,
      totalBonuses: 0,
      totalAllowances: 0
    };

    for (const target of allTargets) {
      try {
        const payrollData = await this.calculatePayrollData(
          companyId,
          target.id,
          month,
          year,
          { overrides: options.overrides }
        );
        const item = this._formatPayrollPreviewItem(payrollData, month, year);
        previews.push(item);

        totals.totalBaseSalary += item.baseSalary;
        totals.totalGrossSalary += item.grossSalary;
        totals.totalNetSalary += item.netSalary;
        totals.totalDeductions += item.totalDeductions;
        totals.totalAbsenceDeductions += item.absenceDeduction;
        totals.totalLatePenalties += item.latePenalty;
        totals.totalSocialInsurance += item.socialInsurance;
        totals.totalTax += item.tax;
        totals.totalBonuses += item.bonuses;
        totals.totalAllowances += item.totalAllowances;
      } catch (err) {
        console.warn(`⚠️ [PAYROLL-PREVIEW] Failed to calculate for employee ${target.id}:`, err.message);
      }
    }

    Object.keys(totals).forEach(k => {
      totals[k] = Number(totals[k].toFixed(2));
    });

    return {
      success: true,
      dryRun: true,
      readOnly: true,
      message: 'تمت معاينة الرواتب لجميع الموظفين بنجاح بدون كتابة في قاعدة البيانات',
      companyId,
      month,
      year,
      count: previews.length,
      totals,
      employees: previews
    };
  }

  _formatPayrollPreviewItem(payrollData, month, year) {
    const emp = payrollData.employee || {};
    const empRecord = Array.isArray(emp.employees) ? emp.employees[0] : emp.employees;

    return {
      employeeId: empRecord?.id || emp.id,
      userId: emp.id,
      employeeNumber: empRecord?.employeeNumber || emp.employeeNumber || null,
      employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'موظف',
      month,
      year,
      baseSalary: Number(payrollData.baseSalary.toFixed(2)),
      fullMonthBaseSalary: Number(payrollData.fullMonthBaseSalary.toFixed(2)),
      totalWorkingDays: payrollData.totalWorkingDaysInMonth,
      presentDays: payrollData.presentDays,
      absentDays: payrollData.absentDays,
      absenceDeduction: Number((payrollData.absenceDeduction || 0).toFixed(2)),
      lateMinutes: payrollData.totalLateMinutes || 0,
      latePenalty: Number((payrollData.latePenalty || 0).toFixed(2)),
      earlyMinutes: payrollData.totalEarlyMinutes || 0,
      allowances: payrollData.allowances || {},
      totalAllowances: Number((payrollData.totalAllowances || 0).toFixed(2)),
      overtimeHours: payrollData.totalOvertimeHours || 0,
      overtimeAmount: Number((payrollData.overtimeAmount || 0).toFixed(2)),
      bonuses: Number((payrollData.bonuses || 0).toFixed(2)),
      totalDeductions: Number(payrollData.totalDeductions.toFixed(2)),
      socialInsurance: Number(payrollData.socialInsurance.toFixed(2)),
      tax: Number((payrollData.taxAmount || 0).toFixed(2)),
      grossSalary: Number(payrollData.grossSalary.toFixed(2)),
      netSalary: Number(payrollData.netSalary.toFixed(2)),
      dailyDeductions: payrollData.dailyDeductions || [],
      deductionsBreakdown: payrollData.deductions || {}
    };
  }

}

module.exports = new PayrollService();
