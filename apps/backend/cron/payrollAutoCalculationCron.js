const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { payrollService } = require('../services/hr');
const hrNotificationService = require('../services/hr/hrNotificationService');
const { getNowInTimezone, normalizeDateForDb } = require('../utils/dateUtils');

/**
 * 💰 Payroll & Attendance Auto-Calculation Cron Service
 * أتمتة حساب وخصم المرتبات تلقائياً وفقاً للغياب والتأخيرات وساعات العمل وسجلات الحضور
 */
class PayrollAutoCalculationCron {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('⏰ [PAYROLL-CRON] Starting Payroll Auto-Calculation & Attendance Deduction Cron...');

    // يعمل يومياً الساعة 02:15 فجراً لمزامنة الخصومات وحساب الرواتب عند حلول يوم الصرف
    cron.schedule('15 2 * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ [PAYROLL-CRON] Previous auto-calculation job still running, skipping...');
        return;
      }

      this.isRunning = true;
      console.log('🔄 [PAYROLL-CRON] Running daily payroll & attendance deduction sync...');

      try {
        await this.processDailyReconciliationAndPayrolls();
        console.log('✅ [PAYROLL-CRON] Daily payroll sync completed successfully');
      } catch (error) {
        console.error('❌ [PAYROLL-CRON] Error during daily payroll auto-calculation job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ [PAYROLL-CRON] Payroll Auto-Calculation Service started (scheduled at 02:15 AM daily)');
  }

  /**
   * معالجة مزامنة الخصومات وحساب كشوف الرواتب عند حلول يوم الصرف
   */
  async processDailyReconciliationAndPayrolls() {
    const prisma = getSharedPrismaClient();

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        timezone: true
      }
    });

    for (const company of companies) {
      try {
        const timezone = company.timezone || 'Africa/Cairo';
        const now = getNowInTimezone(timezone);
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const hrSettings = await prisma.hRSettings.findUnique({
          where: { companyId: company.id }
        });

        // إذا لم تكن إعدادات الموارد البشرية مفعلة
        const isAutoDeductionEnabled = hrSettings?.autoDeductionEnabled !== false;
        const payrollDay = hrSettings?.payrollDay || 25;
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        // هل اليوم هو يوم صرف الرواتب المحدد أو نهاية الشهر؟
        const isPayrollDay = (currentDay === payrollDay) || (payrollDay > daysInMonth && currentDay === daysInMonth);

        // 1. إذا كان اليوم هو يوم الصرف: حساب وتوليد كشوف الرواتب والخصومات تلقائياً
        if (isPayrollDay && isAutoDeductionEnabled) {
          console.log(`🚀 [PAYROLL-CRON] Today is payroll day (${currentDay}) for company: ${company.name} (${company.id}) - auto-calculating salaries & deductions...`);

          const result = await payrollService.autoCalculateAndDeductPayrolls(
            company.id,
            currentMonth,
            currentYear,
            { autoTriggered: true }
          );

          console.log(`✅ [PAYROLL-CRON] Auto-calculated payrolls for ${company.name}:`, {
            processed: result.processed,
            created: result.created,
            updated: result.updated,
            totalAbsence: result.totalAbsenceDeductions,
            totalLate: result.totalLateDeductions,
            totalDeficit: result.totalDeficitDeductions
          });
        } else {
          // 2. مزامنة يومية: إذا وُجد كشف راتب مسودة (DRAFT) للشهر الحالي، نحدث الحسابات تلقائياً بأحدث سجلات الحضور
          const draftPayrollsCount = await prisma.payroll.count({
            where: {
              companyId: company.id,
              month: currentMonth,
              year: currentYear,
              status: 'DRAFT'
            }
          });

          if (draftPayrollsCount > 0 && isAutoDeductionEnabled) {
            console.log(`🔄 [PAYROLL-CRON] Refreshing draft payrolls (${draftPayrollsCount}) with latest attendance logs for company: ${company.name}`);
            await payrollService.autoCalculateAndDeductPayrolls(
              company.id,
              currentMonth,
              currentYear,
              { autoTriggered: true, silent: true }
            );
          }
        }
      } catch (companyError) {
        console.error(`❌ [PAYROLL-CRON] Failed to process company ${company.id}:`, companyError);
      }
    }
  }
}

module.exports = new PayrollAutoCalculationCron();
