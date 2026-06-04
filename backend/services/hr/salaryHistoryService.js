/**
 * 💵 Salary History Service
 * خدمة سجل الرواتب
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class SalaryHistoryService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * جلب سجل الرواتب لموظف
   */
  async getEmployeeSalaryHistory(companyId, employeeId, options = {}) {
    try {
      const { limit = 50 } = options;

      const history = await this.prisma.salaryHistory.findMany({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: { effectiveDate: 'desc' },
        take: parseInt(limit)
      });

      return history;
    } catch (error) {
      console.error('❌ Error getting salary history:', error);
      throw error;
    }
  }

  /**
   * جلب سجل راتب بالـ ID
   */
  async getSalaryHistoryById(companyId, historyId) {
    try {
      const history = await this.prisma.salaryHistory.findFirst({
        where: { id: historyId, companyId }
      });

      if (!history) {
        throw new Error('السجل غير موجود');
      }

      return history;
    } catch (error) {
      console.error('❌ Error getting salary history:', error);
      throw error;
    }
  }

  /**
   * إنشاء سجل راتب جديد (يدوي)
   */
  async createSalaryHistory(companyId, employeeId, data) {
    try {
      // التحقق من وجود الموظف
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const previousSalary = data.previousSalary || employee.baseSalary || 0;
      const newSalary = data.newSalary;
      const changePercentage = previousSalary > 0 
        ? Number(((newSalary - previousSalary) / previousSalary * 100))
        : 0;

      const history = await this.prisma.salaryHistory.create({
        data: {
          companyId,
          userId: employeeId,
          previousSalary,
          newSalary,
          changeType: data.changeType || 'adjustment',
          changePercentage,
          effectiveDate: new Date(data.effectiveDate || Date.now()),
          reason: data.reason,
          approvedBy: data.approvedBy
        }
      });

      // تحديث راتب الموظف
      await this.prisma.user.update({
        where: { id: employeeId },
        data: { baseSalary: newSalary }
      });

      return history;
    } catch (error) {
      console.error('❌ Error creating salary history:', error);
      throw error;
    }
  }

  /**
   * إحصائيات سجل الرواتب
   */
  async getSalaryHistoryStats(companyId, employeeId = null) {
    try {
      const where = { companyId };
      if (employeeId) where.employeeId = employeeId;

      const [total, byType, averageIncrease, totalIncrease] = await Promise.all([
        this.prisma.salaryHistory.count({ where }),
        this.prisma.salaryHistory.groupBy({
          by: ['changeType'],
          where,
          _count: true,
          _avg: { changePercentage: true }
        }),
        this.prisma.salaryHistory.aggregate({
          where: { ...where, changePercentage: { gt: 0 } },
          _avg: { changePercentage: true }
        }),
        this.prisma.salaryHistory.aggregate({
          where: { ...where, changePercentage: { gt: 0 } },
          _sum: { changePercentage: true }
        })
      ]);

      return {
        total,
        byType,
        averageIncrease: averageIncrease._avg.changePercentage || 0,
        totalIncrease: totalIncrease._sum.changePercentage || 0
      };
    } catch (error) {
      console.error('❌ Error getting salary history stats:', error);
      throw error;
    }
  }

  /**
   * تقرير الترقيات والزيادات
   */
  async getPromotionsReport(companyId, options = {}) {
    try {
      const { startDate, endDate, changeType } = options;

      const where = {
        companyId,
        changeType: changeType || { in: ['promotion', 'annual_increase'] }
      };

      if (startDate || endDate) {
        where.effectiveDate = {};
        if (startDate) where.effectiveDate.gte = new Date(startDate);
        if (endDate) where.effectiveDate.lte = new Date(endDate);
      }

      const promotions = await this.prisma.salaryHistory.findMany({
        where,
        orderBy: { effectiveDate: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              position: { select: { title: true } },
              department: { select: { name: true } }
            }
          }
        }
      });

      return promotions;
    } catch (error) {
      console.error('❌ Error getting promotions report:', error);
      throw error;
    }
  }
}

module.exports = new SalaryHistoryService();















































