/**
 * 🕐 Lateness Calculation Service
 * خدمة حساب التأخير والمرونة الشهرية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class LatenessCalculationService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
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

      // الحصول على رصيد المرونة الشهري الحالي
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(companyId, employeeId, month, year);
      const remainingGrace = monthlyGrace - balance.graceMinutesUsed;

      // حساب المضاعف (Multiplier) بناءً على عدد مرات التأخير هذا الشهر
      let multiplier = 1.0;
      if (settings) {
        if (balance.lateCount === 0) multiplier = parseFloat(settings.firstViolationMultiplier || 1.0);
        else if (balance.lateCount === 1) multiplier = parseFloat(settings.secondViolationMultiplier || 2.0);
        else multiplier = parseFloat(settings.thirdViolationMultiplier || 3.0);
      }

      // نجعل كل دقائق التأخير تمر أولاً على رصيد السماح الشهري
      let immediateDeduct = 0;
      let graceEligibleMinutes = lateMinutes;
      let exceedsDaily = lateMinutes > maxDailyThreshold;

      // حساب ما يمكن استخدامه من رصيد المرونة
      let useGraceMinutes = 0;
      let additionalDeduct = 0;

      if (graceEligibleMinutes <= remainingGrace) {
        useGraceMinutes = graceEligibleMinutes;
        additionalDeduct = 0;
      } else {
        useGraceMinutes = remainingGrace > 0 ? remainingGrace : 0;
        additionalDeduct = graceEligibleMinutes - useGraceMinutes;
      }

      const totalDeductMinutes = immediateDeduct + additionalDeduct;
      const effectiveDeductionRate = baseDeductionRate * multiplier;
      let totalDeduction = totalDeductMinutes * effectiveDeductionRate;

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
              .filter(t => lateMinutes >= t.minMinutes)
              .sort((a, b) => b.minMinutes - a.minMinutes);

            if (applicableTiers.length > 0) {
              appliedTier = applicableTiers[0];
              // Tier-based deduction overrides per-minute deduction
              totalDeduction = appliedTier.deductionDays * dailySalary;
            }
          }
        } catch (e) {
          console.error('❌ [LatenessCalc] Error parsing delayPenaltyTiers:', e);
        }
      }

      // 🛡️ Apply Deduction Cap (Max Daily Deduction)
      // Cap is expressed in "days". We need to convert it to actual amount.
      const maxDeductionAmount = dailySalary * maxDailyDeductionDays;

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
        breakdown: {
          lateMinutes,
          maxDaily: maxDailyThreshold,
          immediateDeduct,
          graceEligibleMinutes,
          remainingGrace,
          useGraceMinutes,
          additionalDeduct,
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

      const updated = await this.prisma.latenessBalance.update({
        where: { id: balance.id },
        data: {
          totalLateMinutes: {
            increment: calculation.breakdown.lateMinutes
          },
          graceMinutesUsed: {
            increment: calculation.useGraceMinutes
          },
          deductedMinutes: {
            increment: calculation.deductMinutes
          },
          totalDeductionAmount: {
            increment: calculation.totalDeduction
          },
          lateCount: {
            increment: 1
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

      console.log(`🔍 [EARLY_CALC] Checking early leave: ${earlyMinutes} mins. Threshold: ${threshold}, Rate: ${baseDeductionRate}, CompanyEnabled: ${isCompanyEnabled}, EmployeeEnabled: ${isEmployeeEnabled}`);

      if (!isCompanyEnabled || !isEmployeeEnabled || earlyMinutes <= threshold) {
        console.log(`🛑 [EARLY_CALC] Skipping deduction. Reason: ${!isCompanyEnabled ? 'DISABLED_GLOBALLY' : (!isEmployeeEnabled ? 'EMPLOYEE_EXCLUDED' : 'BELOW_THRESHOLD')}`);
        return {
          deductMinutes: 0,
          totalDeduction: 0,
          skipDeduction: true,
          skipReason: !isCompanyEnabled ? 'DISABLED_GLOBALLY' : (!isEmployeeEnabled ? 'EMPLOYEE_EXCLUDED' : 'BELOW_THRESHOLD')
        };
      }

      // الانصراف المبكر يخصم كامل الدقائق
      const deductMinutes = earlyMinutes;
      const totalDeduction = deductMinutes * baseDeductionRate;

      return {
        deductMinutes,
        totalDeduction,
        skipDeduction: false,
        breakdown: {
          earlyMinutes,
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

  /**
   * إعادة احتساب وضبط التأخير والخصومات التلقائية لموظف عن شهر كامل
   */
  async syncLatenessAndDeductionsForMonth(companyId, employeeId, month, year) {
    const prisma = this.prisma;
    const { combineDateAndTime } = require('../../utils/dateUtils');
    const { getEffectiveShiftForDate } = require('./shiftAssignmentResolver');

    console.log(`🔄 [LatenessSync] Syncing lateness and deductions for employee ${employeeId} for ${month}/${year}`);

    // 1. جلب إعدادات الشركة
    const settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });

    // 2. جلب بيانات الموظف
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        enableAutoDeduction: true,
        baseSalary: true,
        monthlyGraceMinutes: true,
        maxDailyLateMinutes: true,
        lateDeductionRate: true
      }
    });

    if (!employee) {
      throw new Error('الموظف غير موجود');
    }

    // تحديد التوقيت للشركة
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });
    const timezone = company?.timezone || 'Africa/Cairo';

    const isCompanyEnabled = settings ? settings.autoDeductionEnabled : true;
    const isEmployeeEnabled = employee.enableAutoDeduction !== false;

    // إذا كانت الخصومات معطلة للشركة أو الموظف، نحذف جميع الخصومات التلقائية للشهر ونصفر الرصيد
    if (!isCompanyEnabled || !isEmployeeEnabled) {
      console.log(`⚠️ [LatenessSync] Auto deductions disabled for employee or company. Deleting existing auto deductions.`);
      await prisma.manualDeduction.deleteMany({
        where: {
          companyId,
          employeeId,
          effectiveMonth: month,
          effectiveYear: year,
          category: 'AUTO_DEDUCTION'
        }
      });

      // تصفير أو إنشاء رصيد المرونة
      await prisma.latenessBalance.upsert({
        where: {
          employeeId_month_year: { employeeId, month, year }
        },
        create: {
          companyId,
          employeeId,
          month,
          year,
          totalLateMinutes: 0,
          graceMinutesUsed: 0,
          deductedMinutes: 0,
          totalDeductionAmount: 0,
          lateCount: 0
        },
        update: {
          totalLateMinutes: 0,
          graceMinutesUsed: 0,
          deductedMinutes: 0,
          totalDeductionAmount: 0,
          lateCount: 0
        }
      });

      return;
    }

    // 3. جلب جميع سجلات الحضور للشهر مرتبة تصاعدياً
    const periodStart = new Date(year, month - 1, 1, 0, 0, 0);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: employeeId,
        companyId,
        date: { gte: periodStart, lte: periodEnd }
      },
      orderBy: { date: 'asc' }
    });

    // 4. جلب الخصومات التلقائية الموجودة للشهر
    const existingDeductions = await prisma.manualDeduction.findMany({
      where: {
        companyId,
        employeeId,
        effectiveMonth: month,
        effectiveYear: year,
        category: 'AUTO_DEDUCTION'
      }
    });

    // خريطة للخصومات الحالية مفهرسة بـ Attendance ID
    const existingDeductionsMap = new Map();
    existingDeductions.forEach(d => {
      if (d.notes && d.notes.includes('Attendance ID:')) {
        const attId = d.notes.replace('Attendance ID:', '').trim();
        existingDeductionsMap.set(attId, d);
      }
    });

    // 5. البدء بالاحتساب يوماً بيوم وتجميع رصيد المرونة
    let totalLateMinutes = 0;
    let graceMinutesUsed = 0;
    let deductedMinutes = 0;
    let totalDeductionAmount = 0;
    let lateCount = 0;

    const monthlyGrace = settings ? settings.gracePeriodMinutes : (employee.monthlyGraceMinutes || 60);
    const maxDailyThreshold = settings
      ? (settings.lateThresholdMinutes || settings.lateGracePeriod || 15)
      : (employee.maxDailyLateMinutes || 10);

    const workingDays = settings?.workingDaysPerMonth || 22;
    const workingHours = settings?.workingHoursPerDay || 8;
    const dailySalary = parseFloat(employee.baseSalary || 0) / workingDays;
    const minuteSalary = dailySalary / (workingHours * 60);

    let baseDeductionRate = parseFloat(employee.lateDeductionRate || 0);
    if (baseDeductionRate <= 0 && minuteSalary > 0) {
      baseDeductionRate = minuteSalary;
    }

    const maxDailyDeductionDays = settings ? parseFloat(settings.maxDailyDeductionDays || 1.0) : 1.0;
    const maxDeductionAmount = dailySalary * maxDailyDeductionDays;

    const autoDeductionService = require('./autoDeductionService');

    // مصفوفة للاحتفاظ بالخصومات التي يجب الاحتفاظ بها أو تحديثها أو إنشائها
    const deductionsToUpsert = [];
    const deductionsToDelete = [];

    for (const att of attendances) {
      const isLate = att.lateMinutes > 0 || att.status === 'LATE';
      const hasEarlyLeave = att.earlyLeaveMinutes > 0 || att.status === 'EARLY_LEAVE';

      if (!isLate && !hasEarlyLeave) {
        // إذا لم يكن متأخراً ولم ينصرف مبكراً، نتأكد من عدم وجود خصم مرتبط
        if (existingDeductionsMap.has(att.id)) {
          deductionsToDelete.push(existingDeductionsMap.get(att.id).id);
        }
        if (existingDeductionsMap.has(`${att.id}-early`)) {
          deductionsToDelete.push(existingDeductionsMap.get(`${att.id}-early`).id);
        }
        continue;
      }

      const attDate = new Date(att.date);
      const shift = await getEffectiveShiftForDate(prisma, companyId, employeeId, attDate, timezone);
      const workStartTime = shift?.startTime || settings?.workStartTime || "10:00";
      const workEndTime = shift?.endTime || settings?.workEndTime || "17:00";
      const workStart = combineDateAndTime(attDate, workStartTime, timezone);
      const workEnd = combineDateAndTime(attDate, workEndTime, timezone);

      // --- أ. حساب خصم التأخير ---
      const remainingGrace = monthlyGrace - graceMinutesUsed;
      let lateDeductionAmount = 0;
      let dayLateMinutes = att.lateMinutes || 0;
      let dayUseGraceMinutes = 0;
      let dayDeductMinutes = 0;
      let isCapped = false;
      let originalAmount = 0;
      let multiplier = 1.0;
      let appliedTier = null;

      if (isLate && dayLateMinutes > 0) {
        lateCount++;

        // حساب رصيد المرونة المستخدم والمتبقي
        if (dayLateMinutes <= remainingGrace) {
          dayUseGraceMinutes = dayLateMinutes;
          dayDeductMinutes = 0;
        } else {
          dayUseGraceMinutes = remainingGrace > 0 ? remainingGrace : 0;
          dayDeductMinutes = dayLateMinutes - dayUseGraceMinutes;
        }

        // حساب قيمة الخصم بناءً على المضاعف أو الفئات
        if (settings) {
          if (lateCount === 1) multiplier = parseFloat(settings.firstViolationMultiplier || 1.0);
          else if (lateCount === 2) multiplier = parseFloat(settings.secondViolationMultiplier || 2.0);
          else multiplier = parseFloat(settings.thirdViolationMultiplier || 3.0);
        }

        const effectiveDeductionRate = baseDeductionRate * multiplier;
        lateDeductionAmount = dayDeductMinutes * effectiveDeductionRate;

        // تطبيق الفئات (Tiers)
        if (settings && settings.delayPenaltyTiers) {
          try {
            const tiers = typeof settings.delayPenaltyTiers === 'string'
              ? JSON.parse(settings.delayPenaltyTiers)
              : settings.delayPenaltyTiers;

            if (Array.isArray(tiers) && tiers.length > 0) {
              const applicableTiers = tiers
                .filter(t => dayLateMinutes >= t.minMinutes)
                .sort((a, b) => b.minMinutes - a.minMinutes);

              if (applicableTiers.length > 0) {
                appliedTier = applicableTiers[0];
                lateDeductionAmount = parseFloat(appliedTier.deductionDays) * dailySalary;
              }
            }
          } catch (e) {
            console.error('❌ [LatenessSync] Error parsing tiers:', e);
          }
        }

        // تطبيق الحد الأقصى اليومي للخصم
        originalAmount = lateDeductionAmount;
        if (lateDeductionAmount > maxDeductionAmount && maxDeductionAmount > 0) {
          lateDeductionAmount = maxDeductionAmount;
          isCapped = true;
        }

        // تحديث التجميعة
        totalLateMinutes += dayLateMinutes;
        graceMinutesUsed += dayUseGraceMinutes;
        deductedMinutes += dayDeductMinutes;
        totalDeductionAmount += lateDeductionAmount;
      }

      // --- ب. حساب خصم الانصراف المبكر ---
      let earlyDeductionAmount = 0;
      let dayEarlyMinutes = att.earlyLeaveMinutes || 0;
      const isEarlyCheckoutEnabled = settings ? settings.earlyCheckoutEnabled : true;
      const earlyThreshold = settings ? settings.earlyCheckoutThresholdMinutes : 0;

      if (hasEarlyLeave && isEarlyCheckoutEnabled && dayEarlyMinutes > earlyThreshold) {
        earlyDeductionAmount = dayEarlyMinutes * baseDeductionRate;
      }

      // --- ج. حفظ الخصومات في قاعدة البيانات ---
      // نتحقق إذا كان هناك خصم للتأخير
      if (lateDeductionAmount > 0) {
        const existing = existingDeductionsMap.get(att.id);
        const calculation = {
          totalDeduction: lateDeductionAmount,
          deductMinutes: dayDeductMinutes,
          useGraceMinutes: dayUseGraceMinutes,
          exceedsDaily: dayLateMinutes > maxDailyThreshold,
          isCapped,
          originalAmount,
          multiplier,
          appliedTier,
          breakdown: {
            lateMinutes: dayLateMinutes,
            maxDaily: maxDailyThreshold,
            immediateDeduct: dayLateMinutes > maxDailyThreshold ? dayLateMinutes - remainingGrace : 0,
            graceEligibleMinutes: dayLateMinutes,
            remainingGrace: monthlyGrace - (graceMinutesUsed - dayUseGraceMinutes),
            useGraceMinutes: dayUseGraceMinutes,
            additionalDeduct: dayDeductMinutes,
            baseRate: baseDeductionRate,
            multiplier,
            effectiveRate: baseDeductionRate * multiplier,
            dailySalary,
            minuteSalary,
            maxDailyDeductionDays,
            maxDeductionAmount
          }
        };

        const description = autoDeductionService.buildDeductionDescription(calculation, 'LATE');
        const reason = `خصم تلقائي - تأخير ${dayLateMinutes} دقيقة`;
        const defaultStatus = settings?.requireDeductionReview !== false ? 'PENDING' : 'APPROVED';

        if (existing) {
          // إذا كانت القيمة مطابقة تماماً، نحافظ على السجل وحالته
          const oldAmount = parseFloat(existing.amount);
          if (Math.abs(oldAmount - lateDeductionAmount) < 0.01) {
            // لا نغير شيئاً ونزيله من قائمة الحذف
            existingDeductionsMap.delete(att.id);
          } else {
            // تغيرت القيمة، نقوم بالتحديث وإعادة الضبط إلى PENDING
            deductionsToUpsert.push({
              id: existing.id,
              companyId,
              employeeId,
              type: 'LATE',
              category: 'AUTO_DEDUCTION',
              amount: lateDeductionAmount,
              reason,
              description,
              date: attDate,
              effectiveMonth: month,
              effectiveYear: year,
              status: defaultStatus,
              notes: `Attendance ID: ${att.id}`,
              createdBy: 'SYSTEM'
            });
            existingDeductionsMap.delete(att.id);
          }
        } else {
          // إنشاء خصم جديد
          deductionsToUpsert.push({
            companyId,
            employeeId,
            type: 'LATE',
            category: 'AUTO_DEDUCTION',
            amount: lateDeductionAmount,
            reason,
            description,
            date: attDate,
            effectiveMonth: month,
            effectiveYear: year,
            status: defaultStatus,
            notes: `Attendance ID: ${att.id}`,
            createdBy: 'SYSTEM'
          });
        }
      } else {
        // إذا كان هناك خصم تأخير قديم مرتبط ولكنه الآن 0، نحذفه
        const existing = existingDeductionsMap.get(att.id);
        if (existing && existing.type === 'LATE') {
          deductionsToDelete.push(existing.id);
          existingDeductionsMap.delete(att.id);
        }
      }

      // نتحقق إذا كان هناك خصم انصراف مبكر
      if (earlyDeductionAmount > 0) {
        // بما أن notes مميز، يمكن أن نبحث عن خصم انصراف مبكر مرتبط
        const existing = existingDeductionsMap.get(`${att.id}-early`);
        const calculation = {
          totalDeduction: earlyDeductionAmount,
          deductMinutes: dayEarlyMinutes,
          breakdown: {
            earlyMinutes: dayEarlyMinutes,
            threshold: earlyThreshold,
            deductMinutes: dayEarlyMinutes,
            baseRate: baseDeductionRate
          }
        };

        const description = autoDeductionService.buildDeductionDescription(calculation, 'EARLY_LEAVE');
        const reason = `خصم تلقائي - انصراف مبكر ${dayEarlyMinutes} دقيقة`;
        const defaultStatus = settings?.requireDeductionReview !== false ? 'PENDING' : 'APPROVED';

        if (existing) {
          const oldAmount = parseFloat(existing.amount);
          if (Math.abs(oldAmount - earlyDeductionAmount) < 0.01) {
            existingDeductionsMap.delete(`${att.id}-early`);
          } else {
            deductionsToUpsert.push({
              id: existing.id,
              companyId,
              employeeId,
              type: 'EARLY_LEAVE',
              category: 'AUTO_DEDUCTION',
              amount: earlyDeductionAmount,
              reason,
              description,
              date: attDate,
              effectiveMonth: month,
              effectiveYear: year,
              status: defaultStatus,
              notes: `Attendance ID: ${att.id}-early`,
              createdBy: 'SYSTEM'
            });
            existingDeductionsMap.delete(`${att.id}-early`);
          }
        } else {
          deductionsToUpsert.push({
            companyId,
            employeeId,
            type: 'EARLY_LEAVE',
            category: 'AUTO_DEDUCTION',
            amount: earlyDeductionAmount,
            reason,
            description,
            date: attDate,
            effectiveMonth: month,
            effectiveYear: year,
            status: defaultStatus,
            notes: `Attendance ID: ${att.id}-early`,
            createdBy: 'SYSTEM'
          });
        }
      } else {
        const existing = existingDeductionsMap.get(`${att.id}-early`);
        if (existing && existing.type === 'EARLY_LEAVE') {
          deductionsToDelete.push(existing.id);
          existingDeductionsMap.delete(`${att.id}-early`);
        }
      }
    }

    // 6. حذف أي خصم متبقي في الخريطة لم يعد مستحقاً
    existingDeductionsMap.forEach(d => {
      deductionsToDelete.push(d.id);
    });

    // 7. تنفيذ العمليات في قاعدة البيانات
    if (deductionsToDelete.length > 0) {
      await prisma.manualDeduction.deleteMany({
        where: { id: { in: deductionsToDelete } }
      });
      console.log(`🗑️ [LatenessSync] Deleted ${deductionsToDelete.length} stale auto deductions`);
    }

    for (const d of deductionsToUpsert) {
      const { id, ...data } = d;
      if (id) {
        await prisma.manualDeduction.update({
          where: { id },
          data
        });
      } else {
        await prisma.manualDeduction.create({
          data
        });
      }
    }
    console.log(`💾 [LatenessSync] Saved/Updated ${deductionsToUpsert.length} auto deductions`);

    // 8. تحديث رصيد المرونة الشهري (LatenessBalance)
    await prisma.latenessBalance.upsert({
      where: {
        employeeId_month_year: { employeeId, month, year }
      },
      create: {
        companyId,
        employeeId,
        month,
        year,
        totalLateMinutes,
        graceMinutesUsed,
        deductedMinutes,
        totalDeductionAmount,
        lateCount
      },
      update: {
        totalLateMinutes,
        graceMinutesUsed,
        deductedMinutes,
        totalDeductionAmount,
        lateCount
      }
    });

    console.log(`✅ [LatenessSync] Lateness balance updated: graceUsed=${graceMinutesUsed}, totalLate=${totalLateMinutes}`);
  }
}

module.exports = new LatenessCalculationService();
