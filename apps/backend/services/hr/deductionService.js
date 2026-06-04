/**
 * 💰 Deduction Service
 * خدمة إدارة الخصومات اليدوية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { ValidationError, NotFoundError } = require('../../utils/hrErrors');
const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');

class DeductionService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء خصم يدوي جديد
   */
  async createDeduction(companyId, userId, data) {
    try {
      // التحقق من صحة البيانات
      this.validateDeductionData(data);

      // التحقق من وجود الموظف
      const employee = await this.prisma.user.findFirst({
        where: {
          id: data.employeeId,
          companyId
        }
      });

      if (!employee) {
        throw new NotFoundError('الموظف غير موجود');
      }

      // إنشاء الخصم
      const deduction = await this.prisma.manualDeduction.create({
        data: {
          companyId,
          employeeId: data.employeeId,
          type: data.type || 'OTHER',
          category: data.category,
          amount: parseFloat(data.amount),
          reason: data.reason,
          description: data.description,
          date: data.date ? new Date(data.date) : new Date(),
          effectiveMonth: data.effectiveMonth || new Date().getMonth() + 1,
          effectiveYear: data.effectiveYear || new Date().getFullYear(),
          status: 'PENDING',
          attachments: data.attachments ? JSON.stringify(data.attachments) : null,
          notes: data.notes,
          createdBy: userId,
          updatedAt: new Date() // إضافة حقل updatedAt المطلوب
        },
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // جلب بيانات الموظف (كاملة للإشعار)
      const employeeData = await this.prisma.user.findUnique({
        where: { id: data.employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          employeeNumber: true
        }
      });

      // إرسال إشعار WhatsApp للموظف
      try {
        const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
        await WhatsAppNotificationService.sendManualDeductionNotification(
          deduction,
          employeeData,
          companyId
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to send deduction notification:', notificationError.message);
        // Don't fail the deduction creation if notification fails
      }

      // Send WhatsApp notification to owner
      setImmediate(async () => {
        try {
          const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');
          await hrOwnerNotificationAgent.sendOwnerNotification({
            companyId,
            employeeName: employeeData ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() : 'موظف',
            actionId: 'DEDUCTION',
            actionName: 'خصم يدوي جديد',
            details: `المبلغ: ${data.amount} EGP\nالنوع: ${data.type || 'أخرى'}\nالسبب: ${data.reason || 'غير محدد'}\nالشهر: ${data.effectiveMonth || new Date().getMonth() + 1}/${data.effectiveYear || new Date().getFullYear()}`,
            requiresApproval: true
          });
        } catch (waOwnerError) {
          console.error('❌ [Deduction-Owner-Notify] Error:', waOwnerError);
        }
      });

      return {
        ...deduction,
        employee: employeeData
      };
    } catch (error) {
      console.error('❌ Error creating deduction:', error);
      throw error;
    }
  }

  /**
   * جلب جميع الخصومات للشركة
   */
  async getDeductions(companyId, filters = {}) {
    try {
      const where = { companyId };

      // فلترة حسب الموظف
      if (filters.employeeId) {
        where.employeeId = filters.employeeId;
      }

      // فلترة حسب الحالة
      if (filters.status) {
        where.status = filters.status;
      }

      // فلترة حسب النوع
      if (filters.type) {
        where.type = filters.type;
      }

      // فلترة حسب الشهر والسنة
      if (filters.month && filters.year) {
        const month = parseInt(filters.month);
        const year = parseInt(filters.year);
        if (!isNaN(month) && !isNaN(year)) {
          where.effectiveMonth = month;
          where.effectiveYear = year;
        }
      }

      const deductions = await this.prisma.manualDeduction.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // جلب بيانات الموظفين
      const employeeIds = [...new Set(deductions.map(d => d.employeeId))];
      const employees = await this.prisma.user.findMany({
        where: {
          id: { in: employeeIds }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeNumber: true
        }
      });

      const employeeMap = {};
      employees.forEach(emp => {
        employeeMap[emp.id] = emp;
      });

      // إضافة بيانات الموظف لكل خصم
      return deductions.map(deduction => ({
        ...deduction,
        employee: employeeMap[deduction.employeeId] || null
      }));
    } catch (error) {
      console.error('❌ Error fetching deductions:', error);
      throw error;
    }
  }

  /**
   * جلب خصم واحد
   */
  async getDeductionById(companyId, deductionId) {
    try {
      const deduction = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId
        },
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!deduction) {
        throw new NotFoundError('الخصم غير موجود');
      }

      // جلب بيانات الموظف
      const employee = await this.prisma.user.findUnique({
        where: { id: deduction.employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeNumber: true
        }
      });

      return {
        ...deduction,
        employee
      };
    } catch (error) {
      console.error('❌ Error fetching deduction:', error);
      throw error;
    }
  }

  /**
   * تحديث خصم
   */
  async updateDeduction(companyId, deductionId, data) {
    try {
      // التحقق من وجود الخصم
      const existing = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId
        }
      });

      if (!existing) {
        throw new NotFoundError('الخصم غير موجود');
      }

      // لا يمكن تعديل خصم تم تطبيقه
      if (existing.appliedToPayroll) {
        throw new ValidationError('لا يمكن تعديل خصم تم تطبيقه على الراتب');
      }

      const updateData = {};

      if (data.type !== undefined) updateData.type = data.type;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
      if (data.reason !== undefined) updateData.reason = data.reason;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.date !== undefined) updateData.date = new Date(data.date);
      if (data.effectiveMonth !== undefined) updateData.effectiveMonth = parseInt(data.effectiveMonth);
      if (data.effectiveYear !== undefined) updateData.effectiveYear = parseInt(data.effectiveYear);
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.attachments !== undefined) updateData.attachments = JSON.stringify(data.attachments);

      // تحديث حقل updatedAt في كل عملية تعديل
      updateData.updatedAt = new Date();

      const deduction = await this.prisma.manualDeduction.update({
        where: { id: deductionId },
        data: updateData,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // جلب بيانات الموظف
      const employee = await this.prisma.user.findUnique({
        where: { id: deduction.employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeNumber: true
        }
      });

      return {
        ...deduction,
        employee
      };
    } catch (error) {
      console.error('❌ Error updating deduction:', error);
      throw error;
    }
  }

  /**
   * الموافقة على خصم
   */
  async approveDeduction(companyId, deductionId, userId) {
    try {
      const deduction = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId
        }
      });

      if (!deduction) {
        throw new NotFoundError('الخصم غير موجود');
      }

      if (deduction.status !== 'PENDING') {
        throw new ValidationError('لا يمكن الموافقة على خصم تمت معالجته بالفعل');
      }

      const updated = await this.prisma.manualDeduction.update({
        where: { id: deductionId },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date() // إضافة حقل updatedAt
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error approving deduction:', error);
      throw error;
    }
  }

  /**
   * رفض خصم
   */
  async rejectDeduction(companyId, deductionId, userId, reason) {
    try {
      const deduction = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId
        }
      });

      if (!deduction) {
        throw new NotFoundError('الخصم غير موجود');
      }

      if (deduction.status !== 'PENDING') {
        throw new ValidationError('لا يمكن رفض خصم تمت معالجته بالفعل');
      }

      const updated = await this.prisma.manualDeduction.update({
        where: { id: deductionId },
        data: {
          status: 'REJECTED',
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date() // إضافة حقل updatedAt
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error rejecting deduction:', error);
      throw error;
    }
  }

  /**
   * حذف خصم
   */
  async deleteDeduction(companyId, deductionId) {
    try {
      const deduction = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId
        }
      });

      if (!deduction) {
        throw new NotFoundError('الخصم غير موجود');
      }

      // لا يمكن حذف خصم تم تطبيقه
      if (deduction.appliedToPayroll) {
        throw new ValidationError('لا يمكن حذف خصم تم تطبيقه على الراتب');
      }

      await this.prisma.manualDeduction.delete({
        where: { id: deductionId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting deduction:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات الخصومات
   */
  async getDeductionStats(companyId, filters = {}) {
    try {
      const where = { companyId };

      if (filters.employeeId) {
        where.employeeId = filters.employeeId;
      }

      if (filters.month && filters.year) {
        const month = parseInt(filters.month);
        const year = parseInt(filters.year);
        if (!isNaN(month) && !isNaN(year)) {
          where.effectiveMonth = month;
          where.effectiveYear = year;
        }
      }

      // إجمالي الخصومات
      const totalDeductions = await this.prisma.manualDeduction.count({ where });

      // الخصومات حسب الحالة
      const byStatus = await this.prisma.manualDeduction.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: {
          amount: true
        }
      });

      // الخصومات حسب النوع
      const byType = await this.prisma.manualDeduction.groupBy({
        by: ['type'],
        where,
        _count: true,
        _sum: {
          amount: true
        }
      });

      // إجمالي المبالغ
      const totalAmount = await this.prisma.manualDeduction.aggregate({
        where,
        _sum: {
          amount: true
        }
      });

      return {
        total: totalDeductions,
        totalAmount: totalAmount._sum.amount || 0,
        byStatus: byStatus.map(s => ({
          status: s.status,
          count: s._count,
          amount: s._sum.amount || 0
        })),
        byType: byType.map(t => ({
          type: t.type,
          count: t._count,
          amount: t._sum.amount || 0
        }))
      };
    } catch (error) {
      console.error('❌ Error fetching deduction stats:', error);
      throw error;
    }
  }

  /**
   * التحقق من صحة بيانات الخصم
   */
  validateDeductionData(data) {
    const errors = [];

    if (!data.employeeId) {
      errors.push({ field: 'employeeId', message: 'معرف الموظف مطلوب' });
    }

    if (!data.amount || parseFloat(data.amount) <= 0) {
      errors.push({ field: 'amount', message: 'المبلغ يجب أن يكون أكبر من صفر' });
    }

    if (!data.reason || data.reason.trim().length < 5) {
      errors.push({ field: 'reason', message: 'السبب يجب أن يكون 5 أحرف على الأقل' });
    }

    if (errors.length > 0) {
      throw new ValidationError('فشل التحقق من صحة البيانات', errors);
    }

    return true;
  }
}

module.exports = new DeductionService();
