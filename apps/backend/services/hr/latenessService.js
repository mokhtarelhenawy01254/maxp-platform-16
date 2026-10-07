/**
 * 🕐 Lateness Deduction Service
 * Automatic lateness tracking and deduction system with strict business rules
 * 
 * Business Rules:
 * - Official work start time: 10:00 AM
 * - Latest allowed check-in: 10:10 AM
 * - Monthly allowance: 60 minutes (resets on 5th of each month)
 * - Check-ins after 10:10 AM are DIRECT VIOLATIONS (no allowance applies)
 * - Check-ins between 10:01-10:10 use monthly allowance
 * - All deductions are automatic with no manual manager intervention
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { combineDateAndTime } = require('../../utils/dateUtils');

class LatenessService {
  constructor() {
    this.WORK_START_TIME = '10:00';
    this.LATEST_ALLOWED_TIME = '10:10';
    this.DEFAULT_MONTHLY_ALLOWANCE = 60; // minutes
    this.ALLOWANCE_RESET_DAY = 5;
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * Parse time string (HH:mm) and apply to a date in company timezone
   */
  parseTimeToDate(date, timeString, timezone = 'Africa/Cairo') {
    return combineDateAndTime(date, timeString, timezone);
  }

  /**
   * Get or create company lateness rules
   */
  async getCompanyRules(companyId) {
    let rules = await this.prisma.latenessRules.findUnique({
      where: { companyId }
    });

    if (!rules) {
      // Create default rules for company
      rules = await this.prisma.latenessRules.create({
        data: {
          companyId,
          workStartTime: this.WORK_START_TIME,
          latestAllowedTime: this.LATEST_ALLOWED_TIME,
          monthlyAllowanceMinutes: this.DEFAULT_MONTHLY_ALLOWANCE,
          allowanceResetDay: this.ALLOWANCE_RESET_DAY,
          autoApplyDeductions: true,
          autoResetAllowances: true
        }
      });
    }

    return rules;
  }

  /**
   * Get or create employee's monthly allowance
   */
  async getOrCreateMonthlyAllowance(companyId, userId, date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    let allowance = await this.prisma.latenessAllowance.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month
        }
      }
    });

    if (!allowance) {
      const rules = await this.getCompanyRules(companyId);
      const resetDate = new Date(year, month - 1, rules.allowanceResetDay);

      allowance = await this.prisma.latenessAllowance.create({
        data: {
          companyId,
          userId,
          year,
          month,
          totalAllowanceMinutes: rules.monthlyAllowanceMinutes,
          usedMinutes: 0,
          remainingMinutes: rules.monthlyAllowanceMinutes,
          resetDate,
          isActive: true
        }
      });

      console.log(`✅ [LATENESS] Created monthly allowance for user ${userId}: ${rules.monthlyAllowanceMinutes} minutes`);
    }

    return allowance;
  }

  /**
   * Calculate lateness minutes and category
   * Returns: { latenessMinutes, category, isViolation }
   */
  calculateLateness(checkInTime, expectedStartTime, latestAllowedTime, remainingAllowance) {
    const checkInDate = new Date(checkInTime);
    const expectedStartDate = new Date(expectedStartTime);
    const latestAllowedDate = new Date(latestAllowedTime);

    // On time or early (before or at expected start time)
    if (checkInDate <= expectedStartDate) {
      return {
        latenessMinutes: 0,
        category: 'ON_TIME',
        isViolation: false,
        allowanceUsed: 0,
        excessMinutes: 0
      };
    }

    // Direct violation - after latest allowed time (e.g. 10:10 AM)
    if (checkInDate > latestAllowedDate) {
      const latenessMinutes = Math.floor((checkInDate.getTime() - latestAllowedDate.getTime()) / 60000);
      return {
        latenessMinutes,
        category: 'DIRECT_VIOLATION',
        isViolation: true,
        allowanceUsed: 0,
        excessMinutes: latenessMinutes,
        violationReason: `Check-in exceeds latest allowed time`
      };
    }

    // Between expected start and latest allowed time (e.g. 10:01 and 10:10)
    const minutesPastStart = Math.floor((checkInDate.getTime() - expectedStartDate.getTime()) / 60000);
    return {
      latenessMinutes: 0,
      category: 'ALLOWANCE_USED',
      isViolation: false,
      allowanceUsed: minutesPastStart,
      excessMinutes: 0
    };
  }

  /**
   * Process attendance check-in for lateness
   * This is called automatically when an employee checks in
   */
  async processAttendanceCheckIn(attendanceId, companyId, userId, checkInTime, date) {
    try {
      console.log(`🕐 [LATENESS] Processing check-in for user ${userId} at ${checkInTime}`);

      // Get company rules and timezone
      const rules = await this.getCompanyRules(companyId);
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      });
      const timezone = company?.timezone || 'Africa/Cairo';

      // Get or create monthly allowance
      const allowance = await this.getOrCreateMonthlyAllowance(companyId, userId, date);

      // Calculate expected times in company timezone
      const expectedStartTime = this.parseTimeToDate(date, rules.workStartTime, timezone);
      const latestAllowedTime = this.parseTimeToDate(date, rules.latestAllowedTime, timezone);

      // Calculate lateness
      const latenessData = this.calculateLateness(
        checkInTime,
        expectedStartTime,
        latestAllowedTime,
        allowance.remainingMinutes
      );

      console.log(`📊 [LATENESS] Calculation result:`, latenessData);

      // Create lateness record
      const latenessRecord = await this.prisma.latenessRecord.create({
        data: {
          companyId,
          userId,
          attendanceId,
          date,
          checkInTime,
          expectedStartTime,
          latestAllowedTime,
          latenessMinutes: latenessData.latenessMinutes,
          latenessCategory: latenessData.category,
          allowanceUsedMinutes: latenessData.allowanceUsed,
          allowanceRemainingBefore: allowance.remainingMinutes,
          allowanceRemainingAfter: allowance.remainingMinutes - latenessData.allowanceUsed,
          excessMinutes: latenessData.excessMinutes,
          isViolation: latenessData.isViolation,
          violationReason: latenessData.violationReason || null,
          isProcessed: false
        }
      });

      // Update allowance if used
      if (latenessData.allowanceUsed > 0) {
        await this.prisma.latenessAllowance.update({
          where: { id: allowance.id },
          data: {
            usedMinutes: allowance.usedMinutes + latenessData.allowanceUsed,
            remainingMinutes: allowance.remainingMinutes - latenessData.allowanceUsed
          }
        });

        console.log(`📉 [LATENESS] Allowance updated: ${latenessData.allowanceUsed} minutes used, ${allowance.remainingMinutes - latenessData.allowanceUsed} remaining`);
      }

      // Apply automatic deductions if configured
      if (rules.autoApplyDeductions) {
        await this.applyAutomaticDeductions(latenessRecord, rules);
      }

      return latenessRecord;
    } catch (error) {
      console.error('❌ [LATENESS] Error processing check-in:', error);
      throw error;
    }
  }

  /**
   * Apply automatic deductions based on lateness record
   */
  async applyAutomaticDeductions(latenessRecord, rules) {
    try {
      const deductions = [];

      // Direct violation (after 10:10 AM)
      if (latenessRecord.isViolation) {
        const deduction = await this.createDeduction({
          companyId: latenessRecord.companyId,
          userId: latenessRecord.userId,
          latenessRecordId: latenessRecord.id,
          deductionType: rules.violationDeductionType,
          deductionReason: 'DIRECT_VIOLATION',
          violationDate: latenessRecord.date,
          violationDescription: `Direct violation: Check-in after 10:10 AM (${latenessRecord.latenessMinutes} minutes late)`,
          latenessMinutes: latenessRecord.latenessMinutes,
          financialAmount: rules.violationFinancialAmount,
          timeDeductionMinutes: rules.violationTimeMinutes,
          warningLevel: rules.violationWarningLevel
        });

        deductions.push(deduction);
        console.log(`⚠️ [LATENESS] Direct violation deduction applied for ${latenessRecord.latenessMinutes} minutes`);
      }

      // Excess minutes (allowance exceeded)
      if (latenessRecord.excessMinutes > 0 && !latenessRecord.isViolation) {
        const deduction = await this.createDeduction({
          companyId: latenessRecord.companyId,
          userId: latenessRecord.userId,
          latenessRecordId: latenessRecord.id,
          deductionType: rules.allowanceExceededDeductionType,
          deductionReason: 'ALLOWANCE_EXCEEDED',
          violationDate: latenessRecord.date,
          violationDescription: `Allowance exceeded: ${latenessRecord.excessMinutes} minutes beyond monthly allowance`,
          latenessMinutes: latenessRecord.excessMinutes,
          financialAmount: rules.allowanceExceededFinancialAmount,
          timeDeductionMinutes: rules.allowanceExceededTimeMinutes,
          warningLevel: rules.allowanceExceededWarningLevel
        });

        deductions.push(deduction);
        console.log(`📉 [LATENESS] Allowance exceeded deduction applied for ${latenessRecord.excessMinutes} minutes`);
      }

      // Mark lateness record as processed
      await this.prisma.latenessRecord.update({
        where: { id: latenessRecord.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          processedBy: 'SYSTEM',
          deductionApplied: deductions.length > 0
        }
      });

      return deductions;
    } catch (error) {
      console.error('❌ [LATENESS] Error applying deductions:', error);
      throw error;
    }
  }

  /**
   * Create a deduction record
   */
  async createDeduction(data) {
    const deduction = await this.prisma.latenessDeduction.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        latenessRecordId: data.latenessRecordId,
        deductionType: data.deductionType,
        deductionReason: data.deductionReason,
        violationDate: data.violationDate,
        violationDescription: data.violationDescription,
        latenessMinutes: data.latenessMinutes,
        financialAmount: data.financialAmount,
        timeDeductionMinutes: data.timeDeductionMinutes,
        timeDeductionHours: data.timeDeductionMinutes ? data.timeDeductionMinutes / 60 : null,
        warningLevel: data.warningLevel,
        warningMessage: this.generateWarningMessage(data.deductionReason, data.latenessMinutes),
        isAppliedToPayroll: false,
        requiresApproval: false // Automatic deductions don't require approval
      }
    });

    return deduction;
  }

  /**
   * Generate warning message
   */
  generateWarningMessage(reason, minutes) {
    const messages = {
      DIRECT_VIOLATION: `Direct violation: You checked in ${minutes} minutes late (after 10:10 AM). This is an automatic deduction.`,
      ALLOWANCE_EXCEEDED: `Your monthly lateness allowance has been exceeded by ${minutes} minutes. This results in an automatic deduction.`,
      MISSING_ATTENDANCE: 'Missing attendance record for a scheduled work day.',
      MANIPULATION: 'Attendance data manipulation detected.',
      EXCESSIVE_LATENESS: 'Excessive lateness violations threshold exceeded.'
    };

    return messages[reason] || 'Lateness deduction applied.';
  }

  /**
   * Reset monthly allowances (runs on 5th of each month)
   */
  async resetMonthlyAllowances(companyId = null) {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      console.log(`🔄 [LATENESS] Starting monthly allowance reset for ${currentMonth}/${currentYear}`);

      // Build where clause
      const where = { isActive: true };
      if (companyId) {
        where.companyId = companyId;
      }

      // Get all active allowances from previous months
      const oldAllowances = await this.prisma.latenessAllowance.findMany({
        where: {
          ...where,
          OR: [
            { year: { lt: currentYear } },
            { year: currentYear, month: { lt: currentMonth } }
          ]
        }
      });

      // Deactivate old allowances
      for (const allowance of oldAllowances) {
        await this.prisma.latenessAllowance.update({
          where: { id: allowance.id },
          data: { isActive: false }
        });
      }

      console.log(`✅ [LATENESS] Deactivated ${oldAllowances.length} old allowances`);

      // Get all employees who need new allowances
      const employeeWhere = { isActive: true };
      if (companyId) {
        employeeWhere.companyId = companyId;
      }

      const employees = await this.prisma.user.findMany({
        where: employeeWhere,
        select: { id: true, companyId: true }
      });

      let created = 0;
      for (const employee of employees) {
        const rules = await this.getCompanyRules(employee.companyId);
        
        // Check if allowance already exists for current month
        const existing = await this.prisma.latenessAllowance.findUnique({
          where: {
            userId_year_month: {
              userId: employee.id,
              year: currentYear,
              month: currentMonth
            }
          }
        });

        if (!existing) {
          const resetDate = new Date(currentYear, currentMonth - 1, rules.allowanceResetDay);
          
          await this.prisma.latenessAllowance.create({
            data: {
              companyId: employee.companyId,
              userId: employee.id,
              year: currentYear,
              month: currentMonth,
              totalAllowanceMinutes: rules.monthlyAllowanceMinutes,
              usedMinutes: 0,
              remainingMinutes: rules.monthlyAllowanceMinutes,
              resetDate,
              isActive: true
            }
          });
          created++;
        }
      }

      console.log(`✅ [LATENESS] Created ${created} new monthly allowances`);

      return { deactivated: oldAllowances.length, created };
    } catch (error) {
      console.error('❌ [LATENESS] Error resetting monthly allowances:', error);
      throw error;
    }
  }

  /**
   * Get employee lateness summary for a period
   */
  async getEmployeeLatenessSummary(companyId, userId, startDate, endDate) {
    try {
      const records = await this.prisma.latenessRecord.findMany({
        where: {
          companyId,
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' }
      });

      const deductions = await this.prisma.latenessDeduction.findMany({
        where: {
          companyId,
          userId,
          violationDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const summary = {
        totalLateDays: records.filter(r => r.latenessMinutes > 0).length,
        totalLatenessMinutes: records.reduce((sum, r) => sum + r.latenessMinutes, 0),
        onTimeDays: records.filter(r => r.latenessCategory === 'ON_TIME').length,
        gracePeriodDays: records.filter(r => r.latenessCategory === 'GRACE_PERIOD' || r.latenessCategory === 'ALLOWANCE_USED').length,
        violationDays: records.filter(r => r.isViolation).length,
        totalAllowanceUsed: records.reduce((sum, r) => sum + r.allowanceUsedMinutes, 0),
        totalExcessMinutes: records.reduce((sum, r) => sum + r.excessMinutes, 0),
        totalFinancialDeductions: deductions.reduce((sum, d) => sum + (parseFloat(d.financialAmount) || 0), 0),
        totalTimeDeductions: deductions.reduce((sum, d) => sum + (d.timeDeductionMinutes || 0), 0),
        totalWarnings: deductions.filter(d => d.deductionType === 'WARNING').length,
        records,
        deductions
      };

      return summary;
    } catch (error) {
      console.error('❌ [LATENESS] Error getting employee summary:', error);
      throw error;
    }
  }

  /**
   * Generate monthly summary report for an employee
   */
  async generateMonthlySummary(companyId, userId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const summary = await this.getEmployeeLatenessSummary(companyId, userId, startDate, endDate);

      const allowance = await this.prisma.latenessAllowance.findUnique({
        where: {
          userId_year_month: {
            userId,
            year,
            month
          }
        }
      });

      // Get attendance summary
      const attendance = await this.prisma.attendance.findMany({
        where: {
          companyId,
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const monthlySummary = await this.prisma.latenessMonthlySummary.upsert({
        where: {
          userId_year_month: {
            userId,
            year,
            month
          }
        },
        create: {
          companyId,
          userId,
          year,
          month,
          totalAllowanceMinutes: allowance?.totalAllowanceMinutes || 0,
          usedAllowanceMinutes: allowance?.usedMinutes || 0,
          remainingAllowanceMinutes: allowance?.remainingMinutes || 0,
          totalLateDays: summary.totalLateDays,
          totalLatenessMinutes: summary.totalLatenessMinutes,
          gracePeriodDays: summary.gracePeriodDays,
          violationDays: summary.violationDays,
          totalFinancialDeductions: summary.totalFinancialDeductions,
          totalTimeDeductions: summary.totalTimeDeductions,
          totalWarnings: summary.totalWarnings,
          totalWorkDays: attendance.length,
          presentDays: attendance.filter(a => a.checkIn).length,
          absentDays: attendance.filter(a => !a.checkIn).length,
          reportGenerated: true,
          reportGeneratedAt: new Date()
        },
        update: {
          totalAllowanceMinutes: allowance?.totalAllowanceMinutes || 0,
          usedAllowanceMinutes: allowance?.usedMinutes || 0,
          remainingAllowanceMinutes: allowance?.remainingMinutes || 0,
          totalLateDays: summary.totalLateDays,
          totalLatenessMinutes: summary.totalLatenessMinutes,
          gracePeriodDays: summary.gracePeriodDays,
          violationDays: summary.violationDays,
          totalFinancialDeductions: summary.totalFinancialDeductions,
          totalTimeDeductions: summary.totalTimeDeductions,
          totalWarnings: summary.totalWarnings,
          totalWorkDays: attendance.length,
          presentDays: attendance.filter(a => a.checkIn).length,
          absentDays: attendance.filter(a => !a.checkIn).length,
          reportGenerated: true,
          reportGeneratedAt: new Date()
        }
      });

      return monthlySummary;
    } catch (error) {
      console.error('❌ [LATENESS] Error generating monthly summary:', error);
      throw error;
    }
  }

  /**
   * Get current month allowance for employee
   */
  async getCurrentAllowance(companyId, userId) {
    const today = new Date();
    return this.getOrCreateMonthlyAllowance(companyId, userId, today);
  }

  /**
   * Detect missing attendance and create violations
   */
  async detectMissingAttendance(companyId, date) {
    try {
      // Get all active employees
      const employees = await this.prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          employeeNumber: { not: null }
        }
      });

      const violations = [];

      for (const employee of employees) {
        // Check if attendance exists for this date
        const attendance = await this.prisma.attendance.findFirst({
          where: {
            companyId,
            userId: employee.id,
            date
          }
        });

        if (!attendance) {
          // Create missing attendance violation
          const rules = await this.getCompanyRules(companyId);
          
          const deduction = await this.createDeduction({
            companyId,
            userId: employee.id,
            latenessRecordId: null,
            deductionType: rules.missingAttendanceDeductionType,
            deductionReason: 'MISSING_ATTENDANCE',
            violationDate: date,
            violationDescription: 'No attendance record found for scheduled work day',
            latenessMinutes: null,
            financialAmount: rules.missingAttendanceFinancialAmount,
            timeDeductionMinutes: rules.missingAttendanceTimeMinutes,
            warningLevel: null
          });

          violations.push(deduction);
        }
      }

      console.log(`✅ [LATENESS] Detected ${violations.length} missing attendance violations`);
      return violations;
    } catch (error) {
      console.error('❌ [LATENESS] Error detecting missing attendance:', error);
      throw error;
    }
  }

  /**
   * Get daily lateness report for company
   */
  async getDailyReport(companyId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const records = await this.prisma.latenessRecord.findMany({
        where: {
          companyId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              departmentRelation: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { checkInTime: 'asc' }
      });

      const summary = {
        date,
        totalEmployees: records.length,
        onTime: records.filter(r => r.latenessCategory === 'ON_TIME').length,
        lateWithinGrace: records.filter(r => r.latenessCategory === 'GRACE_PERIOD' || r.latenessCategory === 'ALLOWANCE_USED').length,
        violations: records.filter(r => r.isViolation).length,
        totalLatenessMinutes: records.reduce((sum, r) => sum + r.latenessMinutes, 0),
        totalAllowanceUsed: records.reduce((sum, r) => sum + r.allowanceUsedMinutes, 0),
        records
      };

      return summary;
    } catch (error) {
      console.error('❌ [LATENESS] Error getting daily report:', error);
      throw error;
    }
  }
}

module.exports = new LatenessService();
