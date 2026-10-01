/**
 * 🕐 Lateness Calculation Service
 * خدمة حساب التأخير والمرونة الشهرية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class LatenessCalculationService {
  constructor() {
    this._customPrisma = null;
  }

  set prisma(client) {
    this._customPrisma = client;
  }

  get prisma() {
    return this._customPrisma || getSharedPrismaClient();
  }

  set prisma(client) {
    this._customPrisma = client;
  }

  /**
   * حساب دقائق التأخير بناءً على وقت الدخول المحدد ووقت الدخول الفعلي
   */
  calculateLateMinutes(scheduledTime, actualCheckIn) {
    if (!scheduledTime || !actualCheckIn) {
      return 0;
    }

    const scheduled = new Date(scheduledTime);
    const actual = new Date(actualCheckIn);

    const diffMs = actual - scheduled;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes > 0 ? diffMinutes : 0;
  }

  /**
   * الحصول على أو إنشاء رصيد المرونة للموظف في الشهر الحالي
   */
  async getOrCreateMonthlyBalance(companyId, employeeId, month, year) {
    try {
      let balance = await this.prisma.latenessBalance.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month,
            year
          }
        }
      });

      if (!balance) {
        if (typeof this.prisma.latenessBalance?.create === 'function') {
          balance = await this.prisma.latenessBalance.create({
            data: {
              companyId,
              employeeId,
              month,
              year,
              totalLateMinutes: 0,
              graceMinutesUsed: 0,
              deductedMinutes: 0,
              totalDeductionAmount: 0,
              lateCount: 0
            }
          });
        } else {
          balance = {
            companyId,
            employeeId,
            month,
            year,
            totalLateMinutes: 0,
            graceMinutesUsed: 0,
            deductedMinutes: 0,
            totalDeductionAmount: 0,
            lateCount: 0
          };
        }
      }

      return balance;
    } catch (error) {
      console.error('❌ Error getting/creating monthly balance:', error);
      throw error;
    }
  }

  /**
   * حساب الخصم المطلوب بناءً على التأخير والمرونة المتاحة
   * @returns {Object} { deductMinutes, useGraceMinutes, exceedsDaily, totalDeduction }
   */
  async calculateDeduction(companyId, employeeId, lateMinutes, date) {
    try {
      // 1. جلب إعدادات الشركة (النظام الجديد)
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      // 2. جلب إعدادات الموظف (للتوافق مع النظام القديم أو الاستثناءات)
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          monthlyGraceMinutes: true,
          maxDailyLateMinutes: true,
          lateDeductionRate: true,
          enableAutoDeduction: true,
          baseSalary: true // Fix: Include baseSalary for daily rate calculation
        }
      });

      // التحقق من تفعيل الخصم التلقائي
      // 1. يجب أن يكون النظام مفعلاً للشركة
      // 2. يجب ألا يكون الموظف مستثنى يدوياً (enableAutoDeduction)
      const isCompanyEnabled = settings ? settings.autoDeductionEnabled : true;
      const isEmployeeEnabled = employee?.enableAutoDeduction !== false;

      if (!isCompanyEnabled || !isEmployeeEnabled) {
        return {
          deductMinutes: 0,
          useGraceMinutes: 0,
          exceedsDaily: false,
          totalDeduction: 0,
          skipDeduction: true,
          skipReason: !isCompanyEnabled ? 'DISABLED_GLOBALLY' : 'EMPLOYEE_EXCLUDED'
        };
      }

      // 🛡️ Pre-calculate daily and hourly rates for use in tiers or as fallbacks
      const workingDays = settings?.workingDaysPerMonth || 22;
      const workingHours = settings?.workingHoursPerDay || 8;
      const dailySalary = parseFloat(employee?.baseSalary || 0) / workingDays;
      const minuteSalary = dailySalary / (workingHours * 60);

      // تحديد القيم المستخدمة (تفضيل إعدادات الشركة)
      const monthlyGrace = settings ? settings.gracePeriodMinutes : (employee?.monthlyGraceMinutes || 60);

      // ✅ TO-DO UNITY: Use lateGracePeriod (reporting) if lateThresholdMinutes is not set
      // Currently merging them into a unified concept for better UX
      const maxDailyThreshold = settings
        ? (settings.lateThresholdMinutes || settings.lateGracePeriod || 15)
        : (employee?.maxDailyLateMinutes || 10);

      // تحديد معدل الخصم لكل دقيقة
      // إذا لم يكن محدداً للموظف، نستخدم المعدل المحسوب من الراتب
      let baseDeductionRate = parseFloat(employee?.lateDeductionRate || 0);
      let isDefaultRate = false;

      if (baseDeductionRate <= 0 && minuteSalary > 0) {
        baseDeductionRate = minuteSalary;
        isDefaultRate = true;
      }

      const maxDailyDeductionDays = settings ? parseFloat(settings.maxDailyDeductionDays || 1.0) : 1.0;
      const maxDeductionAmount = dailySalary * maxDailyDeductionDays;

      // الحصول على رصيد المرونة الشهري الحالي
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(companyId, employeeId, month, year);
      const remainingGrace = monthlyGrace - balance.graceMinutesUsed;

      // حساب المضاعف (Multiplier) بناءً على عدد مرات التأخير هذا الشهر (تجميد مضاعفات سبتمبر 2026 بقرار المالك)
      let multiplier = 1.0;
      const isSep2026 = month === 9 && year === 2026;
      if (settings && !isSep2026) {
        if (balance.lateCount === 0) multiplier = parseFloat(settings.firstViolationMultiplier || 1.0);
        else if (balance.lateCount === 1) multiplier = parseFloat(settings.secondViolationMultiplier || 2.0);
        else multiplier = parseFloat(settings.thirdViolationMultiplier || 3.0);
      }

      // 🕒 فحص الأذونات المعتمدة لهذا الموظف في هذا اليوم والشهر
      const dayStart = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate(), 23, 59, 59);

      let dayApprovedPermissions = [];
      try {
        if (this.prisma.hrPermissionRequest) {
          dayApprovedPermissions = await this.prisma.hrPermissionRequest.findMany({
            where: {
              companyId,
              status: 'APPROVED',
              date: { gte: dayStart, lte: dayEnd },
              OR: [
                { employeeId },
                { employee: { userId: employeeId } },
                { employee: { id: employeeId } }
              ]
            }
          });
        }
      } catch (permErr) {
        console.warn('⚠️ [LatenessCalc] Error querying day permissions:', permErr.message);
      }

      const dayPermissionMinutes = dayApprovedPermissions.reduce((sum, p) => {
        const mins = p.minutes !== undefined ? Number(p.minutes) : Math.round((parseFloat(p.totalHours) || 0) * 60);
        return sum + mins;
      }, 0);

      let permissionDeduction = 0;
      let permissionMinutesExceeded = 0;
      let isFullyCoveredByPermission = false;
      let countsAsLateOccurrence = true;
      let effectiveLateMinutes = lateMinutes;
      let remainingPaidQuota = (settings?.paidPermissionMinutesPerMonth !== undefined && settings?.paidPermissionMinutesPerMonth !== null)
        ? Number(settings.paidPermissionMinutesPerMonth)
        : (companyId === 'h2m-1' ? 120 : 0);
      let extraMinutesToday = 0;
      let isCompensatedToday = false;

      if (dayPermissionMinutes > 0) {
        // فحص رصيد الأذونات المدفوعة الشهري (افتراضي 120 دقيقة لشركة H2M)
        const monthlyPaidQuota = remainingPaidQuota;

        const monthStart = new Date(year, month - 1, 1, 0, 0, 0);

        let priorMonthPermissions = [];
        try {
          if (this.prisma.hrPermissionRequest) {
            priorMonthPermissions = await this.prisma.hrPermissionRequest.findMany({
              where: {
                companyId,
                status: 'APPROVED',
                date: { gte: monthStart, lt: dayStart },
                OR: [
                  { employeeId },
                  { employee: { userId: employeeId } },
                  { employee: { id: employeeId } }
                ]
              }
            });
          }
        } catch (permMonthErr) {
          console.warn('⚠️ [LatenessCalc] Error querying prior permissions:', permMonthErr.message);
        }

        const priorUsedMinutes = priorMonthPermissions.reduce((sum, p) => {
          const mins = p.minutes !== undefined ? Number(p.minutes) : Math.round((parseFloat(p.totalHours) || 0) * 60);
          return sum + mins;
        }, 0);

        remainingPaidQuota = Math.max(0, monthlyPaidQuota - priorUsedMinutes);
        const paidMinutesToday = Math.min(dayPermissionMinutes, remainingPaidQuota);
        extraMinutesToday = Math.max(0, dayPermissionMinutes - paidMinutesToday);

        isCompensatedToday = dayApprovedPermissions.some(p =>
          p.isCompensated || p.type === 'COMPENSATORY' || p.compensationDate
        );

        if (extraMinutesToday > 0 && !isCompensatedToday) {
          // خيار الخصم دقيقة بدقيقة بسعر الدقيقة العادي دون مضاعفات
          permissionDeduction = extraMinutesToday * minuteSalary;
          permissionMinutesExceeded = extraMinutesToday;
        }

        // الأذونات تغطي دقائق التأخير
        const coveredPortion = Math.min(lateMinutes, dayPermissionMinutes);
        effectiveLateMinutes = Math.max(0, lateMinutes - coveredPortion);

        if (effectiveLateMinutes === 0) {
          isFullyCoveredByPermission = true;
          countsAsLateOccurrence = false; // لا تُحسب مرة تأخير ولا تزيد المضاعف ولا تولّد إنذاراً
        }
      }

      if (isFullyCoveredByPermission) {
        return {
          deductMinutes: permissionMinutesExceeded,
          useGraceMinutes: 0,
          exceedsDaily: false,
          totalDeduction: Number(permissionDeduction.toFixed(2)),
          isCapped: false,
          originalAmount: permissionDeduction,
          multiplier: 1.0,
          appliedTier: null,
          skipDeduction: false,
          isFullyCoveredByPermission: true,
          countsAsLateOccurrence: false,
          dayPermissionMinutes,
          coveredByPermission: Math.min(lateMinutes, dayPermissionMinutes),
          effectiveLateMinutes: 0,
          paidQuotaRemaining: remainingPaidQuota,
          extraPermissionMinutes: extraMinutesToday,
          permissionDeductionAmount: Number(permissionDeduction.toFixed(2)),
          isCompensated: isCompensatedToday,
          breakdown: {
            lateMinutes,
            effectiveLateMinutes: 0,
            dayPermissionMinutes,
            permissionDeduction,
            maxDaily: maxDailyThreshold,
            dailyAllowedPortion: 0,
            immediateExcessMinutes: 0,
            remainingGrace,
            useGraceMinutes: 0,
            graceExhaustedMinutes: 0,
            totalDeductMinutes: permissionMinutesExceeded,
            baseRate: baseDeductionRate,
            isDefaultRate,
            multiplier: 1.0,
            effectiveRate: baseDeductionRate,
            dailySalary,
            minuteSalary,
            maxDailyDeductionDays,
            maxDeductionAmount
          }
        };
      }

      // 🛡️ تحديد دقائق السماح المؤهلة ودقائق الخصم المباشر
      // إذا كان التأخير ضمن حد التسامح اليومي (maxDailyThreshold مثلاً 10د):
      // يستهلك من رصيد السماح الشهري (monthlyGrace مثلاً 60د) بدون خصم مالي ما دام الرصيد كافياً.
      // إذا تجاوز التأخير حد التسامح اليومي:
      // الحد اليومي فقط (maxDailyThreshold) مؤهل للسماح الشهري، وما زاد عنه يعد تجاوزاً غير مسموح يُخصم مباشرة.
      const dailyAllowedPortion = Math.min(effectiveLateMinutes, maxDailyThreshold);
      const immediateExcessMinutes = Math.max(0, effectiveLateMinutes - maxDailyThreshold);
      const exceedsDaily = effectiveLateMinutes > maxDailyThreshold;

      // حساب ما يمكن استخدامه من رصيد المرونة الشهري (يمتص حتى dailyAllowedPortion)
      let useGraceMinutes = 0;
      let graceExhaustedMinutes = 0;

      if (remainingGrace > 0) {
        useGraceMinutes = Math.min(dailyAllowedPortion, remainingGrace);
        graceExhaustedMinutes = dailyAllowedPortion - useGraceMinutes;
      } else {
        useGraceMinutes = 0;
        graceExhaustedMinutes = dailyAllowedPortion;
      }

      // إجمالي الدقائق المخصومة = ما تجاوز الرصيد الشهري + ما تجاوز الحد اليومي + أي إذن إضافي غير معوض
      const totalDeductMinutes = graceExhaustedMinutes + immediateExcessMinutes + permissionMinutesExceeded;
      const effectiveDeductionRate = baseDeductionRate * multiplier;
      let totalDeduction = (graceExhaustedMinutes + immediateExcessMinutes) * effectiveDeductionRate + permissionDeduction;

      // 🕒 Apply Tiered Penalties (if configured)
      let appliedTier = null;
      if (settings && settings.delayPenaltyTiers) {
        try {
          const tiers = typeof settings.delayPenaltyTiers === 'string'
            ? JSON.parse(settings.delayPenaltyTiers)
            : settings.delayPenaltyTiers;

          if (Array.isArray(tiers) && tiers.length > 0) {
            // Sort tiers by minMinutes descending to find the highest applicable tier
            const applicableTiers = tiers
              .filter(t => effectiveLateMinutes >= t.minMinutes)
              .sort((a, b) => b.minMinutes - a.minMinutes);

            if (applicableTiers.length > 0) {
              appliedTier = applicableTiers[0];
              // Tier-based deduction overrides per-minute deduction
              totalDeduction = appliedTier.deductionDays * dailySalary + permissionDeduction;
            }
          }
        } catch (e) {
          console.error('❌ [LatenessCalc] Error parsing delayPenaltyTiers:', e);
        }
      }

      // 🛡️ Apply Deduction Cap (Max Daily Deduction)
      // Cap is expressed in "days". We need to convert it to actual amount.
      let isCapped = false;
      let originalAmount = totalDeduction;

      if (totalDeduction > maxDeductionAmount && maxDeductionAmount > 0) {
        totalDeduction = maxDeductionAmount;
        isCapped = true;
      }

      return {
        deductMinutes: totalDeductMinutes,
        useGraceMinutes,
        exceedsDaily,
        totalDeduction,
        isCapped,
        originalAmount,
        multiplier,
        appliedTier,
        skipDeduction: false,
        isFullyCoveredByPermission: false,
        countsAsLateOccurrence: true,
        dayPermissionMinutes,
        coveredByPermission: Math.min(lateMinutes, dayPermissionMinutes),
        effectiveLateMinutes,
        paidQuotaRemaining: remainingPaidQuota,
        extraPermissionMinutes: extraMinutesToday,
        permissionDeductionAmount: Number(permissionDeduction.toFixed(2)),
        isCompensated: isCompensatedToday,
        breakdown: {
          lateMinutes,
          effectiveLateMinutes,
          dayPermissionMinutes,
          maxDaily: maxDailyThreshold,
          dailyAllowedPortion,
          immediateExcessMinutes,
          remainingGrace,
          useGraceMinutes,
          graceExhaustedMinutes,
          totalDeductMinutes,
          baseRate: baseDeductionRate,
          isDefaultRate,
          multiplier,
          effectiveRate: effectiveDeductionRate,
          dailySalary,
          minuteSalary,
          maxDailyDeductionDays,
          maxDeductionAmount
        }
      };
    } catch (error) {
      console.error('❌ Error calculating deduction:', error);
      throw error;
    }
  }

  /**
   * تحديث رصيد المرونة الشهري بعد تسجيل الحضور
   */
  async updateMonthlyBalance(companyId, employeeId, date, calculation) {
    try {
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(companyId, employeeId, month, year);

      const countIncrement = calculation.countsAsLateOccurrence === false ? 0 : 1;

      const updated = await this.prisma.latenessBalance.update({
        where: { id: balance.id },
        data: {
          totalLateMinutes: {
            increment: calculation.breakdown?.lateMinutes || 0
          },
          graceMinutesUsed: {
            increment: calculation.useGraceMinutes || 0
          },
          deductedMinutes: {
            increment: calculation.deductMinutes || 0
          },
          totalDeductionAmount: {
            increment: calculation.totalDeduction || 0
          },
          lateCount: {
            increment: countIncrement
          }
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error updating monthly balance:', error);
      throw error;
    }
  }

  /**
   * حساب الخصم المطلوب للانصراف المبكر
   */
  async calculateEarlyCheckoutDeduction(companyId, employeeId, earlyMinutes, date) {
    try {
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          baseSalary: true,
          lateDeductionRate: true,
          enableAutoDeduction: true
        }
      });

      const isCompanyEnabled = settings ? settings.earlyCheckoutEnabled : true;
      const isEmployeeEnabled = employee?.enableAutoDeduction !== false;
      const threshold = settings ? settings.earlyCheckoutThresholdMinutes : 0;

      // حساب معدل الخصم لكل دقيقة
      const workingDays = settings?.workingDaysPerMonth || 22;
      const workingHours = settings?.workingHoursPerDay || 8;
      const dailySalary = parseFloat(employee?.baseSalary || 0) / workingDays;
      const minuteSalary = dailySalary / (workingHours * 60);

      let baseDeductionRate = parseFloat(employee?.lateDeductionRate || 0);
      if (baseDeductionRate <= 0 && minuteSalary > 0) {
        baseDeductionRate = minuteSalary;
      }

      // 🕒 فحص الأذونات المعتمدة للانصراف المبكر في هذا اليوم
      const checkoutDate = new Date(date);
      const dayStart = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate(), 23, 59, 59);

      let dayApprovedPermissions = [];
      try {
        if (this.prisma.hrPermissionRequest) {
          dayApprovedPermissions = await this.prisma.hrPermissionRequest.findMany({
            where: {
              companyId,
              status: 'APPROVED',
              date: { gte: dayStart, lte: dayEnd },
              OR: [
                { employeeId },
                { employee: { userId: employeeId } },
                { employee: { id: employeeId } }
              ]
            }
          });
        }
      } catch (permErr) {
        console.warn('⚠️ [EARLY_CALC] Error querying permissions:', permErr.message);
      }

      const dayPermMinutes = dayApprovedPermissions.reduce((sum, p) => sum + Math.round((parseFloat(p.totalHours) || 0) * 60), 0);
      const effectiveEarlyMinutes = Math.max(0, earlyMinutes - dayPermMinutes);

      console.log(`🔍 [EARLY_CALC] Checking early leave: ${earlyMinutes} mins (perms: ${dayPermMinutes} mins, net: ${effectiveEarlyMinutes} mins). Threshold: ${threshold}, Rate: ${baseDeductionRate}, CompanyEnabled: ${isCompanyEnabled}, EmployeeEnabled: ${isEmployeeEnabled}`);

      if (!isCompanyEnabled || !isEmployeeEnabled || effectiveEarlyMinutes <= threshold) {
        console.log(`🛑 [EARLY_CALC] Skipping deduction. Reason: ${!isCompanyEnabled ? 'DISABLED_GLOBALLY' : (!isEmployeeEnabled ? 'EMPLOYEE_EXCLUDED' : (effectiveEarlyMinutes <= threshold ? 'COVERED_BY_PERMISSION_OR_THRESHOLD' : 'BELOW_THRESHOLD'))}`);
        return {
          deductMinutes: 0,
          totalDeduction: 0,
          skipDeduction: true,
          skipReason: !isCompanyEnabled ? 'DISABLED_GLOBALLY' : (!isEmployeeEnabled ? 'EMPLOYEE_EXCLUDED' : (dayPermMinutes > 0 ? 'COVERED_BY_PERMISSION' : 'BELOW_THRESHOLD'))
        };
      }

      // الانصراف المبكر يخصم الدقائق غير المغطاة بالإذن
      const deductMinutes = effectiveEarlyMinutes;
      const totalDeduction = deductMinutes * baseDeductionRate;

      return {
        deductMinutes,
        totalDeduction,
        skipDeduction: false,
        breakdown: {
          earlyMinutes,
          effectiveEarlyMinutes,
          dayPermMinutes,
          threshold,
          deductMinutes,
          baseRate: baseDeductionRate
        }
      };
    } catch (error) {
      console.error('❌ Error calculating early checkout deduction:', error);
      throw error;
    }
  }

  /**
   * الحصول على رصيد المرونة المتبقي للموظف في الشهر الحالي
   */
  async getRemainingGraceMinutes(employeeId) {
    try {
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          monthlyGraceMinutes: true,
          companyId: true
        }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(
        employee.companyId,
        employeeId,
        month,
        year
      );

      const monthlyGrace = employee.monthlyGraceMinutes || 60;
      const remaining = monthlyGrace - balance.graceMinutesUsed;

      return {
        total: monthlyGrace,
        used: balance.graceMinutesUsed,
        remaining: remaining > 0 ? remaining : 0,
        lateCount: balance.lateCount,
        totalDeducted: balance.deductedMinutes,
        totalDeductionAmount: parseFloat(balance.totalDeductionAmount)
      };
    } catch (error) {
      console.error('❌ Error getting remaining grace minutes:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير التأخير الشهري للموظف
   */
  async getMonthlyLatenessReport(companyId, employeeId, month, year) {
    try {
      const balance = await this.prisma.latenessBalance.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month,
            year
          }
        }
      });

      if (!balance) {
        return {
          month,
          year,
          totalLateMinutes: 0,
          graceMinutesUsed: 0,
          deductedMinutes: 0,
          totalDeductionAmount: 0,
          lateCount: 0
        };
      }

      return {
        month: balance.month,
        year: balance.year,
        totalLateMinutes: balance.totalLateMinutes,
        graceMinutesUsed: balance.graceMinutesUsed,
        deductedMinutes: balance.deductedMinutes,
        totalDeductionAmount: parseFloat(balance.totalDeductionAmount),
        lateCount: balance.lateCount
      };
    } catch (error) {
      console.error('❌ Error getting monthly lateness report:', error);
      throw error;
    }
  }

  /**
   * إعادة تعيين رصيد المرونة في بداية كل شهر (يتم استدعاؤه تلقائياً)
   */
  async resetMonthlyBalances(companyId) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // لا نحتاج لإعادة تعيين - النظام ينشئ رصيد جديد تلقائياً لكل شهر
      console.log(`✅ Monthly balances are auto-created for ${currentMonth}/${currentYear}`);

      return { success: true, month: currentMonth, year: currentYear };
    } catch (error) {
      console.error('❌ Error resetting monthly balances:', error);
      throw error;
    }
  }
}

module.exports = new LatenessCalculationService();
