const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const hrNotificationService = require('../services/hr/hrNotificationService');
const {
  getStartOfDayInTimezone,
  getEndOfDayInTimezone
} = require('../utils/dateUtils');

const DEFAULT_PROBATION_REMINDER_DAYS = 7;
const DEFAULT_NOTIFICATION_HOUR = 9;

function getLocalHourParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  return {
    hour: Number(parts.find(part => part.type === 'hour')?.value || DEFAULT_NOTIFICATION_HOUR),
    minute: Number(parts.find(part => part.type === 'minute')?.value || 0)
  };
}

class HRLifecycleNotificationCron {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('🕘 [HR-LIFECYCLE-CRON] Starting HR lifecycle notification cron...');

    cron.schedule('5 * * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ [HR-LIFECYCLE-CRON] Previous lifecycle job still running, skipping...');
        return;
      }

      this.isRunning = true;
      console.log('🔄 [HR-LIFECYCLE-CRON] Running lifecycle reminder job...');

      try {
        await this.processCompanies();
        console.log('✅ [HR-LIFECYCLE-CRON] Lifecycle reminder job completed successfully');
      } catch (error) {
        console.error('❌ [HR-LIFECYCLE-CRON] Lifecycle reminder job failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ [HR-LIFECYCLE-CRON] HR lifecycle notification cron started (checks hourly at minute 5)');
  }

  async processCompanies() {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        timezone: true
      }
    });

    const now = new Date();

    for (const company of companies) {
      const timezone = company.timezone || 'Africa/Cairo';
      const localTime = getLocalHourParts(now, timezone);

      if (localTime.hour !== DEFAULT_NOTIFICATION_HOUR) {
        continue;
      }

      try {
        await this.processCompany(company.id, timezone, now);
      } catch (error) {
        console.error(`❌ [HR-LIFECYCLE-CRON] Failed processing company ${company.id}:`, error);
      }
    }
  }

  async processCompany(companyId, timezone, now = new Date()) {
    const prisma = getSharedPrismaClient();
    const settings = await hrNotificationService.getNotificationSettings(companyId, prisma);

    if (
      settings.notifyOnProbationEnd === false
      && settings.notifyOnContractExpiry === false
    ) {
      return;
    }

    if (settings.notifyOnProbationEnd !== false) {
      await this.sendProbationReminders(companyId, timezone, now, prisma);
    }

    if (settings.notifyOnContractExpiry !== false) {
      await this.sendContractExpiryReminders(companyId, timezone, now, settings.contractRenewalNoticeDays, prisma);
    }
  }

  async sendProbationReminders(companyId, timezone, now, prisma) {
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + DEFAULT_PROBATION_REMINDER_DAYS);

    const start = getStartOfDayInTimezone(targetDate, timezone);
    const end = getEndOfDayInTimezone(targetDate, timezone);

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        probationEndDate: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        probationEndDate: true,
        department: {
          select: {
            name: true,
            managerId: true
          }
        },
        manager: {
          select: {
            userId: true
          }
        }
      }
    });

    for (const employee of employees) {
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'الموظف';
      const managerUserIds = [
        employee.manager?.userId,
        employee.department?.managerId
      ].filter(Boolean);

      await hrNotificationService.notifyHrEvent({
        companyId,
        notificationKey: 'notifyOnProbationEnd',
        employeeUserId: employee.userId || null,
        managerUserIds,
        includeManagers: true,
        title: 'تنبيه قرب انتهاء فترة الاختبار',
        message: `تنتهي فترة الاختبار للموظف ${employeeName} بتاريخ ${new Date(employee.probationEndDate).toLocaleDateString('ar-EG', { timeZone: timezone })}.`,
        type: 'HR_PROBATION_END_REMINDER',
        data: {
          employeeRecordId: employee.id,
          employeeUserId: employee.userId || null,
          probationEndDate: employee.probationEndDate?.toISOString() || null,
          departmentName: employee.department?.name || null,
          reminderDays: DEFAULT_PROBATION_REMINDER_DAYS
        },
        whatsApp: {
          employeeName,
          actionId: 'PROBATION_END',
          actionName: 'تنبيه قرب انتهاء فترة الاختبار',
          details: `تنتهي فترة الاختبار للموظف ${employeeName} بتاريخ ${new Date(employee.probationEndDate).toLocaleDateString('ar-EG', { timeZone: timezone })}.${employee.department?.name ? `\nالقسم: ${employee.department.name}` : ''}`,
          requiresApproval: false
        }
      }, prisma);
    }
  }

  async sendContractExpiryReminders(companyId, timezone, now, reminderDays, prisma) {
    const normalizedReminderDays = Number.isFinite(Number(reminderDays))
      ? Math.max(0, Number(reminderDays))
      : 30;

    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + normalizedReminderDays);

    const start = getStartOfDayInTimezone(targetDate, timezone);
    const end = getEndOfDayInTimezone(targetDate, timezone);

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        contractEndDate: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        contractEndDate: true,
        contractType: true,
        department: {
          select: {
            name: true,
            managerId: true
          }
        },
        manager: {
          select: {
            userId: true
          }
        }
      }
    });

    for (const employee of employees) {
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'الموظف';
      const managerUserIds = [
        employee.manager?.userId,
        employee.department?.managerId
      ].filter(Boolean);

      await hrNotificationService.notifyHrEvent({
        companyId,
        notificationKey: 'notifyOnContractExpiry',
        employeeUserId: employee.userId || null,
        managerUserIds,
        includeManagers: true,
        title: 'تنبيه قرب انتهاء العقد',
        message: `ينتهي عقد الموظف ${employeeName} بتاريخ ${new Date(employee.contractEndDate).toLocaleDateString('ar-EG', { timeZone: timezone })}.`,
        type: 'HR_CONTRACT_EXPIRY_REMINDER',
        data: {
          employeeRecordId: employee.id,
          employeeUserId: employee.userId || null,
          contractEndDate: employee.contractEndDate?.toISOString() || null,
          contractType: employee.contractType || null,
          departmentName: employee.department?.name || null,
          reminderDays: normalizedReminderDays
        },
        whatsApp: {
          employeeName,
          actionId: 'CONTRACT_EXPIRY',
          actionName: 'تنبيه قرب انتهاء العقد',
          details: `ينتهي عقد الموظف ${employeeName} بتاريخ ${new Date(employee.contractEndDate).toLocaleDateString('ar-EG', { timeZone: timezone })}.${employee.contractType ? `\nنوع العقد: ${employee.contractType}` : ''}${employee.department?.name ? `\nالقسم: ${employee.department.name}` : ''}`,
          requiresApproval: false
        }
      }, prisma);
    }
  }
}

module.exports = new HRLifecycleNotificationCron();
