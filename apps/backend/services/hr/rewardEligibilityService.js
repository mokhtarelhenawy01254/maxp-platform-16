/**
 * 🎯 Reward Eligibility Service
 * خدمة التحقق من استحقاق المكافآت
 * 
 * Evaluates whether employees meet the conditions defined in RewardType.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError } = require('../../utils/hrErrors');

class RewardEligibilityService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return this._mockPrisma || getSharedPrismaClient();
    }

    set prisma(val) {
        this._mockPrisma = val;
    }

    /**
     * تقييم استحقاق موظف لمكافأة معينة
     * Evaluate eligibility for a single employee and reward type
     */
    async evaluateEligibility(companyId, userId, rewardTypeId, periodStart, periodEnd) {
        const rewardType = await this.prisma.rewardType.findFirst({
            where: { id: rewardTypeId, companyId }
        });

        if (!rewardType) {
            throw new Error('Reward Type not found');
        }

        if (!rewardType.isActive) {
            return { isEligible: false, reason: 'Reward type is inactive' };
        }

        // Parse conditions
        let conditions = {};
        try {
            conditions = rewardType.eligibilityConditions ? JSON.parse(rewardType.eligibilityConditions) : {};
        } catch (e) {
            console.error('Error parsing eligibility conditions:', e);
            return { isEligible: false, reason: 'Invalid eligibility conditions' };
        }

        // Evaluate based on category
        let result = { isEligible: true, details: {}, reason: '' };

        // Target Employee Check (if rule is tailored for a specific employee)
        if (conditions.targetUserId || conditions.targetEmployeeId || conditions.targetEmployeeNumber) {
            const isTargetUser = conditions.targetUserId && conditions.targetUserId === userId;
            let isTargetEmployee = false;
            if (!isTargetUser && (conditions.targetEmployeeId || conditions.targetEmployeeNumber)) {
                const emp = await this.prisma.employee.findFirst({
                    where: {
                        userId,
                        companyId,
                        OR: [
                            ...(conditions.targetEmployeeId ? [{ id: conditions.targetEmployeeId }] : []),
                            ...(conditions.targetEmployeeNumber ? [{ employeeNumber: conditions.targetEmployeeNumber }] : [])
                        ]
                    },
                    select: { id: true }
                });
                if (emp) isTargetEmployee = true;
            }

            if (!isTargetUser && !isTargetEmployee) {
                result.isEligible = false;
                result.reason = 'القاعدة مخصصة لموظف آخر';
                result.details = {
                    targetMismatch: true,
                    targetEmployeeId: conditions.targetEmployeeId || null,
                    targetEmployeeNumber: conditions.targetEmployeeNumber || null,
                    targetUserId: conditions.targetUserId || null
                };
                return result;
            }
        }

        // Common Checks
        if (conditions.minServiceDays) {
            // Check hire date
            const employee = await this.prisma.user.findUnique({ where: { id: userId } });
            if (employee && employee.hireDate) {
                const serviceDays = Math.floor((new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24));
                if (serviceDays < conditions.minServiceDays) {
                    result.isEligible = false;
                    result.details.serviceDays = serviceDays;
                    result.details.required = conditions.minServiceDays;
                    result.reason = `Service period ${serviceDays} days is less than required ${conditions.minServiceDays}`;
                }
            }
        }

        // Attendance Checks
        if (result.isEligible && this._hasAttendanceConditions(conditions)) {
            const attendanceResult = await this._checkAttendanceEligibility(companyId, userId, periodStart, periodEnd, conditions);
            if (!attendanceResult.isEligible) {
                result.isEligible = false;
                result.reason = result.reason ? result.reason + '; ' + attendanceResult.reason : attendanceResult.reason;
            }
            result.details.attendance = attendanceResult.details;
            result.details.absentDays = attendanceResult.details.absentDays;
            result.details.checkedDays = attendanceResult.details.checkedDays;
            result.details.totalWorkingDays = attendanceResult.details.checkedDays;
            result.details.maxAllowedAbsenceDays = attendanceResult.details.threshold;
            result.details.threshold = attendanceResult.details.threshold;
            result.details.absentDates = attendanceResult.details.absentDates;
        }

        // Performance Checks
        if (result.isEligible && this._hasPerformanceConditions(conditions)) {
            const performanceResult = await this._checkPerformanceEligibility(companyId, userId, periodStart, periodEnd, conditions);
            if (!performanceResult.isEligible) {
                result.isEligible = false;
                result.reason = result.reason ? result.reason + '; ' + performanceResult.reason : performanceResult.reason;
            }
            result.details.performance = performanceResult.details;
        }

        // Log the evaluation
        await this._logEvaluation(companyId, userId, rewardTypeId, periodStart, periodEnd, result, conditions);

        return result;
    }

    _hasAttendanceConditions(conditions) {
        if (!conditions) return false;
        return Boolean(
            conditions.noLateness ||
            conditions.noAbsences ||
            conditions.maxLateMinutes !== undefined ||
            conditions.minAttendanceRate !== undefined ||
            conditions.maxAllowedAbsenceDays !== undefined ||
            conditions.type === 'ATTENDANCE_COMMITMENT'
        );
    }

    _hasPerformanceConditions(conditions) {
        return conditions.minPerformanceScore !== undefined || conditions.minGoalsAchievement !== undefined;
    }

    async _checkAttendanceEligibility(companyId, userId, startDate, endDate, conditions) {
        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                userId,
                companyId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            }
        });

        const presentRecords = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY');
        const lateRecords = attendanceRecords.filter(a => (a.lateMinutes > 0) || (a.status === 'LATE'));
        const rawAbsentRecords = attendanceRecords.filter(a => a.status === 'ABSENT');

        const totalLateMinutes = attendanceRecords.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

        let isEligible = true;
        let reason = '';

        // Calculate real absences using attendanceService (missing punches on working days + explicit ABSENT rows)
        let realAbsentDays = rawAbsentRecords.length;
        let checkedDays = 0;
        let absentDates = [];
        try {
            const attendanceService = require('./attendanceService');
            const targetYear = new Date(startDate).getFullYear();
            const targetMonth = new Date(startDate).getMonth() + 1;
            const absentReport = await attendanceService.getAbsentDaysReport(companyId, targetYear, targetMonth, userId);
            checkedDays = absentReport?.totalWorkingDays || 0;
            const empReport = absentReport?.employees?.find(e => e.userId === userId || e.id === userId) || absentReport?.employees?.[0];
            if (empReport) {
                realAbsentDays = Number(empReport.absentDays ?? 0);
                absentDates = empReport.absentDates || [];
            }
        } catch (repErr) {
            console.warn('⚠️ [RewardEligibility] Could not fetch detailed absent report, falling back to db records:', repErr.message);
        }

        const maxAllowed = conditions.maxAllowedAbsenceDays !== undefined
            ? Number(conditions.maxAllowedAbsenceDays)
            : (conditions.type === 'ATTENDANCE_COMMITMENT' ? 2 : null);

        if (maxAllowed !== null) {
            if (realAbsentDays > maxAllowed) {
                isEligible = false;
                reason = `تجاوز أيام الغياب المسموحة (${realAbsentDays} يوم غياب > الحد المسموح ${maxAllowed} يوم)`;
            }
        }

        if (conditions.noLateness && lateRecords.length > 0) {
            isEligible = false;
            reason = reason ? `${reason}; موظف لديه سجلات تأخير` : 'موظف لديه سجلات تأخير';
        }

        if (conditions.noAbsences && realAbsentDays > 0) {
            isEligible = false;
            reason = reason ? `${reason}; موظف لديه أيام غياب (${realAbsentDays} يوم)` : `موظف لديه أيام غياب (${realAbsentDays} يوم)`;
        }

        if (conditions.maxLateMinutes !== undefined && totalLateMinutes > conditions.maxLateMinutes) {
            isEligible = false;
            const msg = `إجمالي دقائق التأخير ${totalLateMinutes} يتجاوز الحد ${conditions.maxLateMinutes}`;
            reason = reason ? `${reason}; ${msg}` : msg;
        }

        // Min Attendance Rate %
        if (conditions.minAttendanceRate !== undefined) {
            const baseDays = checkedDays > 0 ? checkedDays : attendanceRecords.length;
            if (baseDays > 0) {
                const attendedCount = Math.max(0, baseDays - realAbsentDays);
                const rate = (attendedCount / baseDays) * 100;
                if (rate < conditions.minAttendanceRate) {
                    isEligible = false;
                    const msg = `نسبة الحضور ${rate.toFixed(1)}% أقل من النسبة المطلوبة ${conditions.minAttendanceRate}%`;
                    reason = reason ? `${reason}; ${msg}` : msg;
                }
            }
        }

        return {
            isEligible,
            reason,
            details: {
                absentDays: realAbsentDays,
                checkedDays,
                threshold: maxAllowed,
                absentDates,
                totalLateMinutes,
                lateCount: lateRecords.length,
                absentCount: realAbsentDays,
                presentCount: presentRecords.length
            }
        };
    }

    async _checkPerformanceEligibility(companyId, userId, startDate, endDate, conditions) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: {
                userId,
                companyId,
                periodStart: { gte: new Date(startDate) },
                periodEnd: { lte: new Date(endDate) },
                // status: { in: ['COMPLETED', 'ACKNOWLEDGED', 'SUBMITTED'] } 
                // Assuming reviews in the period are valid sources
            }
        });

        if (reviews.length === 0) {
            return { isEligible: false, reason: 'No performance reviews in period', details: { reviewCount: 0 } };
        }

        const avgRating = reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / reviews.length;
        const avgGoals = reviews.reduce((sum, r) => sum + (Number(r.goalsAchievement) || 0), 0) / reviews.length;

        let isEligible = true;
        let reason = '';

        if (conditions.minPerformanceScore !== undefined && avgRating < conditions.minPerformanceScore) {
            isEligible = false;
            reason = `Average rating ${avgRating.toFixed(2)} is below ${conditions.minPerformanceScore}`;
        }

        if (conditions.minGoalsAchievement !== undefined && avgGoals < conditions.minGoalsAchievement) {
            isEligible = false;
            reason = `Goals achievement ${avgGoals.toFixed(2)}% is below ${conditions.minGoalsAchievement}%`;
        }

        return {
            isEligible,
            reason,
            details: {
                avgRating,
                avgGoals,
                reviewCount: reviews.length
            }
        };
    }

    async _logEvaluation(companyId, userId, rewardTypeId, periodStart, periodEnd, result, conditions) {
        await this.prisma.rewardEligibilityLog.create({
            data: {
                companyId,
                userId,
                rewardTypeId,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                isEligible: result.isEligible,
                eligibilityDetails: JSON.stringify({ ...result.details, reason: result.reason }),
                conditionsChecked: JSON.stringify(conditions)
            }
        });
    }

    /**
     * تقييم جماعي للموظفين
     * Batch evaluate all active employees
     */
    async evaluateAllEligibleEmployees(companyId, rewardTypeId, periodStart, periodEnd) {
        // Get all active employees
        const employees = await this.prisma.user.findMany({
            where: { companyId, isActive: true, employeeNumber: { not: null } },
            select: { id: true }
        });

        const results = [];
        for (const emp of employees) {
            const result = await this.evaluateEligibility(companyId, emp.id, rewardTypeId, periodStart, periodEnd);
            if (result.isEligible) {
                results.push({ userId: emp.id, result });
            }
        }
        return results;
    }
}

module.exports = new RewardEligibilityService();
