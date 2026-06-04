/**
 * 🏢 Department Service
 * خدمة إدارة الأقسام
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const auditService = require('./auditService');

class DepartmentService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء قسم جديد مع موظفين بالجملة
   */
  async createDepartmentWithEmployees(companyId, data, employeeService, actorId) {
    const { employees, ...departmentData } = data;

    try {
      // إنشاء القسم أولاً
      const department = await this.prisma.department.create({
        data: {
          companyId,
          ...departmentData,
          updatedAt: new Date()
        },
        include: {
          parent: {
            select: { id: true, name: true }
          }
        }
      });

      const results = {
        successCount: 0,
        failedCount: 0,
        errors: [],
        employees: []
      };

      // إضافة الموظفين إذا وجدوا
      if (employees && employees.length > 0) {
        for (let i = 0; i < employees.length; i++) {
          const empData = employees[i];
          try {
            // تحديث departmentId للموظف
            const employeeData = {
              ...empData,
              departmentId: department.id
            };

            const employee = await employeeService.createEmployee(companyId, employeeData);
            results.successCount++;
            results.employees.push(employee);
          } catch (empError) {
            results.failedCount++;
            results.errors.push({
              row: i + 1,
              message: empError.message || 'خطأ غير معروف',
              email: empData.email
            });
          }
        }
      }

      // إعادة جلب القسم مع العدد الجديد للموظفين
      const departmentWithCount = await this.prisma.department.findUnique({
        where: { id: department.id },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { users: true, employees: true, positions: true, children: true } }
        }
      });

      // Audit Log
      if (actorId) {
        await auditService.logAction(
          companyId,
          actorId,
          'CREATE',
          'DEPARTMENT_BULK',
          department.id,
          {
            name: department.name,
            employeesCount: results.successCount,
            failedCount: results.failedCount
          }
        );
      }

      return {
        department: departmentWithCount,
        result: results
      };
    } catch (error) {
      console.error('❌ Error creating department with employees:', error);
      throw error;
    }
  }

  /**
   * إنشاء قسم جديد
   */
  async createDepartment(companyId, data, actorId) {
    try {
      const department = await this.prisma.department.create({
        data: {
          ...data,
          companyId
        },
        include: {
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { users: true, employees: true, positions: true, children: true }
          }
        }
      });

      // Hydrate Manager from User table
      let manager = null;
      if (department.managerId) {
        manager = await this.prisma.user.findUnique({
          where: { id: department.managerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        });
      }

      const result = {
        ...department,
        manager,
        _count: {
          ...department._count,
          users: department._count.users,
          employees: department._count.employees
        }
      };

      // Audit Log
      if (actorId) {
        await auditService.logAction(
          companyId,
          actorId,
          'CREATE',
          'DEPARTMENT',
          department.id,
          { name: department.name }
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating department:', error);
      throw error;
    }
  }

  /**
   * جلب جميع الأقسام
   */
  async getDepartments(companyId, options = {}) {
    try {
      const { includeInactive = false, tree = false } = options;

      const where = {};

      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }

      if (!includeInactive) {
        where.isActive = true;
      }

      console.log(`🔍 [DEPARTMENT-SERVICE] getDepartments - companyId: ${companyId}, where:`, JSON.stringify(where));

      const departments = await this.prisma.department.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          name: true,
          nameEn: true,
          description: true,
          managerId: true,
          parentId: true,
          color: true,
          icon: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          // updatedAt: true, // Excluding potential problem field
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: {
              users: true,
              employees: true,
              positions: true,
              children: true
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      const managerIds = [...new Set(departments.map(dept => dept.managerId).filter(Boolean))];
      let managersById = {};
      if (managerIds.length > 0) {
        // ✅ Look for managers in User table
        const managers = await this.prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true
          }
        });
        managersById = managers.reduce((acc, manager) => {
          acc[manager.id] = manager;
          return acc;
        }, {});
      }

      const hydratedDepartments = departments.map(dept => ({
        ...dept,
        manager: dept.managerId ? managersById[dept.managerId] || null : null,
        _count: {
          ...dept._count,
          users: dept._count.users,
          employees: dept._count.employees
        }
      }));

      if (tree) {
        // بناء شجرة الأقسام
        const buildTree = (parentId = null) => {
          return hydratedDepartments
            .filter(dept => dept.parentId === parentId)
            .sort((a, b) => {
              if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map(dept => ({
              ...dept,
              children: buildTree(dept.id)
            }));
        };
        return buildTree(null);
      }

      return hydratedDepartments;
    } catch (error) {
      console.error('❌ Error getting departments:', error);
      throw error;
    }
  }

  /**
   * جلب قسم بالـ ID
   */
  async getDepartmentById(companyId, departmentId) {
    try {
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId },
        include: {
          parent: true,
          children: {
            include: {
              _count: { select: { users: true, employees: true } }
            }
          },
          users: { // ✅ Use users relation
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
              positionRelation: { select: { title: true } }
            }
          },
          positions: {
            include: {
              _count: { select: { users: true } }
            }
          },
          _count: {
            select: {
              users: true,
              employees: true,
              positions: true,
              children: true
            }
          }
        }
      });

      if (!department) return null;

      // Hydrate Manager from User table
      let manager = null;
      if (department.managerId) {
        manager = await this.prisma.user.findUnique({
          where: { id: department.managerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true
          }
        });
      }

      // Format response
      return {
        ...department,
        manager,
        users: department.users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          avatar: u.avatar,
          email: u.email,
          positionRelation: u.positionRelation
        })),
        _count: {
          ...department._count,
          users: department._count.users
        },
        children: department.children.map(child => ({
          ...child,
          _count: {
            ...child._count,
            users: child._count.users
          }
        }))
      };
    } catch (error) {
      console.error('❌ Error getting department:', error);
      throw error;
    }
  }

  /**
   * تحديث قسم
   */
  async updateDepartment(companyId, departmentId, data, actorId) {
    try {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId }
      });

      if (!existing) {
        throw new Error('القسم غير موجود');
      }

      // منع جعل القسم أباً لنفسه
      if (data.parentId === departmentId) {
        throw new Error('لا يمكن جعل القسم أباً لنفسه');
      }

      const department = await this.prisma.department.update({
        where: { id: departmentId },
        data: { ...data, updatedAt: new Date() },
        include: {
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { users: true, employees: true, positions: true, children: true }
          }
        }
      });

      // Hydrate Manager from User table
      let manager = null;
      if (department.managerId) {
        manager = await this.prisma.user.findUnique({
          where: { id: department.managerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        });
      }

      const result = {
        ...department,
        manager,
        _count: {
          ...department._count,
          users: department._count.users,
          employees: department._count.employees
        }
      };

      // Audit Log
      if (actorId) {
        await auditService.logAction(
          companyId,
          actorId,
          'UPDATE',
          'DEPARTMENT',
          department.id,
          { name: department.name, changes: data }
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Error updating department:', error);
      throw error;
    }
  }

  /**
   * حذف قسم
   */
  async deleteDepartment(companyId, departmentId, actorId) {
    try {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId },
        include: {
          _count: { select: { users: true, children: true } }
        }
      });

      if (!existing) {
        throw new Error('القسم غير موجود');
      }

      console.log(`🗑️ [DEPARTMENT-SERVICE] Attempting to delete department: ${departmentId} (${existing.name})`);

      // استخدام Transaction لضمان سلامة البيانات
      await this.prisma.$transaction(async (tx) => {
        // 1. تحديث الموظفين لفك ارتباطهم بالقسم
        await tx.employee.updateMany({
          where: { departmentId, companyId },
          data: { departmentId: null }
        });

        // 2. تحديث المستخدمين لفك ارتباطهم بالقسم
        await tx.user.updateMany({
          where: { departmentId, companyId },
          data: { departmentId: null }
        });

        // 3. تحديث المناصب لفك ارتباطها بالقسم
        await tx.position.updateMany({
          where: { departmentId, companyId },
          data: { departmentId: null }
        });

        // 4. تحديث الأهداف لفك ارتباطها بالقسم
        await tx.goal.updateMany({
          where: { departmentId, companyId },
          data: { departmentId: null }
        });

        // 5. تحديث الأقسام الفرعية لربطها بالأب للقسم الحالي (أو null)
        if (existing._count.children > 0) {
          await tx.department.updateMany({
            where: { parentId: departmentId, companyId },
            data: { parentId: existing.parentId || null }
          });
        }

        // 6. حذف القسم نفسه
        await tx.department.delete({
          where: { id: departmentId }
        });
      });

      // Audit Log
      if (actorId) {
        await auditService.logAction(
          companyId,
          actorId,
          'DELETE',
          'DEPARTMENT',
          departmentId,
          { name: existing.name }
        );
      }

      console.log(`✅ [DEPARTMENT-SERVICE] Department ${departmentId} deleted successfully`);
      return { success: true, message: 'تم حذف القسم بنجاح' };
    } catch (error) {
      console.error('❌ Error deleting department:', error);
      if (error.code === 'P2003') {
        throw new Error('لا يمكن حذف القسم لوجود سجلات مرتبطة به (مثل رواتب أو طلبات إجازة تاريخية). يرجى أرشفة القسم بدلاً من حذفه.');
      }
      throw error;
    }
  }

  /**
   * إحصائيات الأقسام
   */
  async getDepartmentStats(companyId) {
    try {
      const departments = await this.prisma.department.findMany({
        where: { companyId, isActive: true },
        include: {
          _count: {
            select: { users: true, positions: true }
          },
          users: {
            where: { isActive: true },
            select: { baseSalary: true }
          }
        }
      });

      const stats = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        color: dept.color,
        employeeCount: dept._count.users,
        positionCount: dept._count.positions,
        totalSalary: dept.users.reduce((sum, user) =>
          sum + (parseFloat(user.baseSalary) || 0), 0
        )
      }));

      return {
        totalDepartments: departments.length,
        departments: stats
      };
    } catch (error) {
      console.error('❌ Error getting department stats:', error);
      throw error;
    }
  }
}

module.exports = new DepartmentService();
