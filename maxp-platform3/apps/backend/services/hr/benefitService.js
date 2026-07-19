/**
 * 💎 Benefit Service
 * خدمة إدارة المزايا
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class BenefitService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async createBenefit(companyId, data) {
    try {
      const benefit = await this.prisma.benefit.create({
        data: {
          companyId,
          name: data.name,
          description: data.description,
          type: data.type,
          cost: data.cost,
          currency: data.currency || 'EGP',
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
      return benefit;
    } catch (error) {
      console.error('❌ Error creating benefit:', error);
      throw error;
    }
  }

  async getBenefits(companyId, options = {}) {
    try {
      let {
        includeInactive = true,
        search = '',
        type = '',
        page = 1,
        limit = 10
      } = options;

      // Ensure page and limit are valid numbers
      page = Math.max(1, parseInt(page) || 1);
      limit = Math.max(1, parseInt(limit) || 10);

      const where = { companyId };

      if (!includeInactive) {
        where.isActive = true;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (type && type !== 'all' && type !== '') {
        where.type = String(type).trim();
      }

      const skip = (page - 1) * limit;

      const [benefits, total] = await Promise.all([
        this.prisma.benefit.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.benefit.count({ where })
      ]);

      // حساب عدد الاشتراكات النشطة لكل ميزة بكفاءة أكبر
      const benefitIds = benefits.map(b => b.id);
      const enrollmentCounts = await this.prisma.benefitEnrollment.groupBy({
        by: ['benefitId'],
        where: {
          benefitId: { in: benefitIds },
          status: 'ACTIVE'
        },
        _count: true
      });

      const countMap = enrollmentCounts.reduce((acc, curr) => {
        acc[curr.benefitId] = curr._count;
        return acc;
      }, {});

      const benefitsWithCounts = benefits.map(benefit => ({
        ...benefit,
        activeEnrollments: countMap[benefit.id] || 0
      }));

      return {
        benefits: benefitsWithCounts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting benefits:', error);
      throw error;
    }
  }

  async getBenefitById(companyId, benefitId) {
    try {
      const benefit = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId },
        include: {
          benefitEnrollments: {
            include: {
              employeeRel: {
                select: { id: true, firstName: true, lastName: true, employeeNumber: true }
              }
            },
            orderBy: { startDate: 'desc' }
          }
        }
      });

      if (!benefit) return null;

      // Map benefitEnrollments to enrollments and employeeRel to employee
      return {
        ...benefit,
        enrollments: benefit.benefitEnrollments.map(en => ({
          ...en,
          employee: en.employeeRel
        }))
      };
    } catch (error) {
      console.error('❌ Error getting benefit:', error);
      throw error;
    }
  }

  async updateBenefit(companyId, benefitId, data) {
    try {
      const existing = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId }
      });
      if (!existing) throw new Error('الميزة غير موجودة');

      const benefit = await this.prisma.benefit.update({
        where: { id: benefitId },
        data
      });
      return benefit;
    } catch (error) {
      console.error('❌ Error updating benefit:', error);
      throw error;
    }
  }

  async deleteBenefit(companyId, benefitId) {
    try {
      const existing = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId }
      });
      if (!existing) throw new Error('الميزة غير موجودة');

      await this.prisma.benefit.delete({ where: { id: benefitId } });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting benefit:', error);
      throw error;
    }
  }

  async enrollEmployee(companyId, employeeId, benefitId, data) {
    try {
      const [employee, benefit] = await Promise.all([
        this.prisma.employee.findFirst({
          where: {
            companyId,
            OR: [
              { id: employeeId },
              { userId: employeeId }
            ]
          }
        }),
        this.prisma.benefit.findFirst({ where: { id: benefitId, companyId } })
      ]);

      if (!employee) {
        console.error(`❌ Employee not found: ${employeeId} in company ${companyId}`);
        throw new Error('الموظف غير موجود');
      }
      if (!benefit) throw new Error('الميزة غير موجودة');

      // تحقق مما إذا كان الموظف مشتركاً بالفعل في هذه الميزة ولها حالة نشطة
      const existingEnrollment = await this.prisma.benefitEnrollment.findFirst({
        where: {
          employeeRelId: employee.id,
          benefitId,
          status: 'ACTIVE'
        }
      });

      if (existingEnrollment) {
        throw new Error('الموظف مشترك بالفعل في هذه الميزة وحالة اشتراكه نشطة');
      }

      const enrollment = await this.prisma.benefitEnrollment.create({
        data: {
          companyId,
          employeeRelId: employee.id,
          userId: employee.userId || '',
          benefitId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || 'ACTIVE',
          notes: data.notes
        },
        include: {
          employeeRel: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
          },
          benefit: true
        }
      });

      return {
        ...enrollment,
        employee: enrollment.employeeRel
      };
    } catch (error) {
      console.error('❌ Error enrolling employee:', error);
      throw error;
    }
  }

  async getEmployeeEnrollments(companyId, employeeId) {
    try {
      // Search by both potential ID types for robustness
      const employee = await this.prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            { id: employeeId },
            { userId: employeeId }
          ]
        }
      });

      if (!employee) return [];

      const enrollments = await this.prisma.benefitEnrollment.findMany({
        where: {
          companyId,
          employeeRelId: employee.id
        },
        include: {
          benefit: true
        },
        orderBy: { startDate: 'desc' }
      });
      return enrollments;
    } catch (error) {
      console.error('❌ Error getting enrollments:', error);
      throw error;
    }
  }

  async updateEnrollment(companyId, enrollmentId, data) {
    try {
      const existing = await this.prisma.benefitEnrollment.findFirst({
        where: { id: enrollmentId, companyId }
      });
      if (!existing) throw new Error('الاشتراك غير موجود');

      const updateData = {};
      if (data.status) updateData.status = data.status;
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.notes !== undefined) updateData.notes = data.notes;

      const enrollment = await this.prisma.benefitEnrollment.update({
        where: { id: enrollmentId },
        data: updateData,
        include: {
          employeeRel: {
            select: { id: true, firstName: true, lastName: true }
          },
          benefit: true
        }
      });

      return {
        ...enrollment,
        employee: enrollment.employeeRel
      };
    } catch (error) {
      console.error('❌ Error updating enrollment:', error);
      throw error;
    }
  }

  async getBenefitStats(companyId) {
    try {
      const [total, active, totalEnrollments, byType] = await Promise.all([
        this.prisma.benefit.count({ where: { companyId } }),
        this.prisma.benefit.count({ where: { companyId, isActive: true } }),
        this.prisma.benefitEnrollment.count({ where: { companyId, status: 'ACTIVE' } }),
        this.prisma.benefit.groupBy({
          by: ['type'],
          where: { companyId },
          _count: true
        })
      ]);

      return { total, active, totalEnrollments, byType };
    } catch (error) {
      console.error('❌ Error getting benefit stats:', error);
      throw error;
    }
  }
}

module.exports = new BenefitService();

