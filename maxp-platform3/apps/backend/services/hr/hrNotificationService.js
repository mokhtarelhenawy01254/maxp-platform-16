const { getSharedPrismaClient } = require('../sharedDatabase');
const socketService = require('../socketService');
const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');

const HR_NOTIFICATION_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];
const DEFAULT_CONTRACT_RENEWAL_NOTICE_DAYS = 30;
const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  notifyOnLeaveRequest: true,
  notifyOnAttendanceIssue: true,
  notifyOnPayrollGeneration: true,
  notifyManagers: true,
  notifyOnWarning: true,
  notifyOnProbationEnd: true,
  notifyOnContractExpiry: true,
  contractRenewalNoticeDays: DEFAULT_CONTRACT_RENEWAL_NOTICE_DAYS
});

class HRNotificationService {
  get prisma() {
    return getSharedPrismaClient();
  }

  async getNotificationSettings(companyId, prisma = this.prisma) {
    if (!companyId) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }

    let settings = await prisma.hRSettings.findUnique({
      where: { companyId },
      select: {
        notifyOnLeaveRequest: true,
        notifyOnAttendanceIssue: true,
        notifyOnPayrollGeneration: true,
        notifyManagers: true,
        notifyOnWarning: true,
        notifyOnProbationEnd: true,
        notifyOnContractExpiry: true,
        contractRenewalNoticeDays: true
      }
    });

    if (!settings) {
      settings = await prisma.hRSettings.create({
        data: { companyId },
        select: {
          notifyOnLeaveRequest: true,
          notifyOnAttendanceIssue: true,
          notifyOnPayrollGeneration: true,
          notifyManagers: true,
          notifyOnWarning: true,
          notifyOnProbationEnd: true,
          notifyOnContractExpiry: true,
          contractRenewalNoticeDays: true
        }
      });
    }

    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...settings,
      contractRenewalNoticeDays:
        Number.isFinite(Number(settings?.contractRenewalNoticeDays))
          ? Number(settings.contractRenewalNoticeDays)
          : DEFAULT_CONTRACT_RENEWAL_NOTICE_DAYS
    };
  }

  async createInAppNotification(prisma, { companyId, userId, title, message, type, data = {} }) {
    if (!companyId || !userId) {
      return null;
    }

    try {
      const notification = await prisma.notification.create({
        data: {
          companyId,
          userId,
          title,
          message,
          type,
          data
        }
      });

      socketService.sendToUser(userId, 'notification:new', notification);
      return notification;
    } catch (error) {
      console.error('❌ [HR-NOTIFY] Failed to create in-app notification:', error);
      return null;
    }
  }

  async getHrRecipientIds(companyId, prisma = this.prisma) {
    if (!companyId) {
      return [];
    }

    const [userCompanyRecipients, directRecipients] = await Promise.all([
      prisma.userCompany.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: HR_NOTIFICATION_ROLES }
        },
        select: {
          userId: true
        }
      }),
      prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: HR_NOTIFICATION_ROLES }
        },
        select: {
          id: true
        }
      })
    ]);

    return [...new Set([
      ...userCompanyRecipients.map(entry => entry.userId),
      ...directRecipients.map(entry => entry.id)
    ])];
  }

  async getAllDepartmentManagerIds(companyId, prisma = this.prisma) {
    if (!companyId) {
      return [];
    }

    const departments = await prisma.department.findMany({
      where: {
        companyId,
        managerId: { not: null }
      },
      select: {
        managerId: true
      }
    });

    return [...new Set(departments.map(department => department.managerId).filter(Boolean))];
  }

  async getManagerRecipientIds(companyId, employeeUserId, prisma = this.prisma) {
    if (!companyId || !employeeUserId) {
      return [];
    }

    const [employee, user] = await Promise.all([
      prisma.employee.findFirst({
        where: {
          companyId,
          userId: employeeUserId
        },
        select: {
          userId: true,
          manager: {
            select: {
              userId: true
            }
          },
          department: {
            select: {
              managerId: true
            }
          }
        }
      }),
      prisma.user.findUnique({
        where: { id: employeeUserId },
        select: {
          id: true,
          departmentRelation: {
            select: {
              managerId: true
            }
          }
        }
      })
    ]);

    const managerIds = new Set();

    if (employee?.manager?.userId) {
      managerIds.add(employee.manager.userId);
    }

    if (employee?.department?.managerId) {
      managerIds.add(employee.department.managerId);
    }

    if (user?.departmentRelation?.managerId) {
      managerIds.add(user.departmentRelation.managerId);
    }

    managerIds.delete(employeeUserId);

    if (managerIds.size === 0) {
      return [];
    }

    const activeManagers = await prisma.user.findMany({
      where: {
        id: { in: [...managerIds] },
        isActive: true
      },
      select: {
        id: true
      }
    });

    return activeManagers.map(manager => manager.id);
  }

  async buildRecipientIds({
    companyId,
    employeeUserId = null,
    directUserIds = [],
    managerUserIds = [],
    includeManagers = false,
    includeAllManagers = false,
    excludeUserIds = []
  }, prisma = this.prisma) {
    const recipientIds = new Set((directUserIds || []).filter(Boolean));

    const hrRecipients = await this.getHrRecipientIds(companyId, prisma);
    hrRecipients.forEach(userId => recipientIds.add(userId));

    if (includeManagers) {
      for (const managerId of managerUserIds || []) {
        if (managerId) {
          recipientIds.add(managerId);
        }
      }

      if (employeeUserId) {
        const employeeManagers = await this.getManagerRecipientIds(companyId, employeeUserId, prisma);
        employeeManagers.forEach(userId => recipientIds.add(userId));
      } else if (includeAllManagers) {
        const departmentManagers = await this.getAllDepartmentManagerIds(companyId, prisma);
        departmentManagers.forEach(userId => recipientIds.add(userId));
      }
    }

    for (const excludedUserId of excludeUserIds || []) {
      if (excludedUserId) {
        recipientIds.delete(excludedUserId);
      }
    }

    if (recipientIds.size === 0) {
      return [];
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: [...recipientIds] }
      },
      select: {
        id: true
      }
    });

    return existingUsers.map(user => user.id);
  }

  async notifyHrEvent({
    companyId,
    notificationKey,
    employeeUserId = null,
    directUserIds = [],
    managerUserIds = [],
    includeManagers = false,
    includeAllManagers = false,
    excludeUserIds = [],
    title,
    message,
    type,
    data = {},
    whatsApp = null
  }, prisma = this.prisma) {
    if (!companyId || !title || !message || !type) {
      return { delivered: 0, skipped: 'invalid_payload' };
    }

    try {
      const settings = await this.getNotificationSettings(companyId, prisma);
      if (notificationKey && settings[notificationKey] === false) {
        return { delivered: 0, skipped: 'disabled_in_settings' };
      }

      const recipients = await this.buildRecipientIds({
        companyId,
        employeeUserId,
        directUserIds,
        managerUserIds,
        includeManagers: includeManagers && settings.notifyManagers !== false,
        includeAllManagers: includeAllManagers && settings.notifyManagers !== false,
        excludeUserIds
      }, prisma);

      let delivered = 0;
      let inAppSkipped = null;

      if (recipients.length > 0) {
        const serializedData = {
          ...data,
          notificationKey,
          employeeUserId: employeeUserId || null,
          recipientsCount: recipients.length
        };

        const results = await Promise.allSettled(
          recipients.map(userId =>
            this.createInAppNotification(prisma, {
              companyId,
              userId,
              title,
              message,
              type,
              data: serializedData
            })
          )
        );

        delivered = results.filter(result => result.status === 'fulfilled' && result.value).length;
      } else {
        inAppSkipped = 'no_recipients';
      }

      let whatsAppResult = null;
      if (whatsApp) {
        try {
          const payload = typeof whatsApp === 'function'
            ? await whatsApp()
            : whatsApp;

          if (payload?.actionId) {
            whatsAppResult = await hrOwnerNotificationAgent.sendOwnerNotification({
              companyId,
              employeeName: payload.employeeName || 'الموظف',
              actionId: payload.actionId,
              actionName: payload.actionName || title,
              details: payload.details || message,
              requiresApproval: Boolean(payload.requiresApproval),
              ownerPhone: payload.ownerPhone
            });
          } else {
            whatsAppResult = { success: false, reason: 'invalid_whatsapp_payload' };
          }
        } catch (whatsAppError) {
          console.error('❌ [HR-NOTIFY] Failed to dispatch owner WhatsApp notification:', whatsAppError);
          whatsAppResult = {
            success: false,
            reason: 'dispatch_failed',
            error: whatsAppError.message
          };
        }
      }

      const whatsappDelivered = Boolean(whatsAppResult?.success);
      if (delivered === 0 && !whatsappDelivered) {
        return {
          delivered: 0,
          attempted: recipients.length,
          skipped: inAppSkipped || whatsAppResult?.reason || 'no_recipients',
          whatsApp: whatsAppResult
        };
      }

      return {
        delivered,
        attempted: recipients.length,
        inAppSkipped,
        whatsApp: whatsAppResult
      };
    } catch (error) {
      console.error('❌ [HR-NOTIFY] Failed to dispatch HR event notification:', error);
      return { delivered: 0, skipped: 'dispatch_failed', error: error.message };
    }
  }
}

module.exports = new HRNotificationService();
