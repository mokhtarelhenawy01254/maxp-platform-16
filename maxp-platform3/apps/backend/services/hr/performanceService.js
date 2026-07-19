/**
 * 📊 Performance Review Service
 * خدمة تقييم الأداء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const socketService = require('../socketService');

class PerformanceService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * Helper function to map user object to employee format for frontend compatibility
   */
  mapUserToEmployee(user) {
    if (!user) return null;
    const employee = { ...user };
    // Map positionRelation to position
    if (user.positionRelation) {
      employee.position = user.positionRelation;
      delete employee.positionRelation;
    }
    // Map departmentRelation to department
    if (user.departmentRelation) {
      employee.department = user.departmentRelation;
      delete employee.departmentRelation;
    }
    return employee;
  }

  /**
   * إنشاء تقييم أداء جديد
   */
  async createPerformanceReview(companyId, employeeId, data) {
    try {
      // التحقق من وجود الموظف (User)
      const employeeUser = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId },
        include: { employees: true }
      });

      if (!employeeUser) {
        throw new Error('الموظف غير موجود');
      }

      // التحقق من وجود المقيم (User)
      const reviewerUser = await this.prisma.user.findFirst({
        where: { id: data.reviewerId, companyId },
        include: { employees: true }
      });

      if (!reviewerUser) {
        throw new Error('المقيم غير موجود');
      }

      // Get Employee IDs if they exist
      const employeeRelId = employeeUser.employees?.id || null;
      const reviewerRelId = reviewerUser.employees?.id || null;

      const review = await this.prisma.performanceReview.create({
        data: {
          companyId,
          userId: employeeUser.id,
          employeeEmployeeReviewsId: employeeRelId,
          reviewerId: reviewerUser.id,
          employeeReviewerReviewsId: reviewerRelId,
          reviewPeriod: data.reviewPeriod,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          overallRating: data.overallRating,
          ratings: data.ratings ? JSON.stringify(data.ratings) : null,
          goals: data.goals ? JSON.stringify(data.goals) : null,
          goalsAchievement: data.goalsAchievement,
          strengths: data.strengths,
          improvements: data.improvements,
          reviewerComments: data.reviewerComments,
          employeeComments: data.employeeComments,
          recommendations: data.recommendations ? JSON.stringify(data.recommendations) : null,
          status: data.status || 'DRAFT',
          updatedAt: new Date()
        }
      });

      // إرسال إشعار للمقيم
      await this._notifyReviewer(companyId, review, reviewerUser.id, `${employeeUser.firstName} ${employeeUser.lastName}`);

      // Parse JSON fields
      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      };
    } catch (error) {
      console.error('❌ Error creating performance review:', error);

      // Handle foreign key constraint errors specifically
      if (error.code === 'P2003') {
        const constraintField = error.meta?.field_name || error.meta?.constraint?.[0];
        console.error('❌ Foreign key constraint violation:', {
          code: error.code,
          field: constraintField,
          constraint: error.meta?.constraint,
          employeeId: employeeId,
          reviewerId: data.reviewerId
        });

        if (constraintField === 'userId' || error.meta?.constraint?.includes('userId')) {
          console.error('❌ User ID foreign key constraint failed');
          throw new Error(`الموظف غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات بالمعرف ${employeeId}`);
        } else if (constraintField === 'reviewerId' || error.meta?.constraint?.includes('reviewerId')) {
          console.error('❌ Reviewer ID foreign key constraint failed');
          throw new Error(`المقيم غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات بالمعرف ${data.reviewerId}`);
        }
      }

      throw error;
    }
  }

  /**
   * جلب تقييمات أداء موظف
   */
  async getEmployeeReviews(companyId, employeeId, options = {}) {
    try {
      const { status, limit = 50 } = options;

      const where = {
        companyId,
        OR: [
          { userId: employeeId },
          { employeeEmployeeReviewsId: employeeId }
        ]
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      const reviews = await this.prisma.performanceReview.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: parseInt(limit),
      });

      // Fetch user and employee details for all involved
      const userIds = [...new Set([
        ...reviews.map(r => r.userId).filter(Boolean),
        ...reviews.map(r => r.reviewerId).filter(Boolean)
      ])];

      const employeeIds = [...new Set([
        ...reviews.map(r => r.employeeEmployeeReviewsId).filter(Boolean),
        ...reviews.map(r => r.employeeReviewerReviewsId).filter(Boolean)
      ])];

      const [users, employees] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        }),
        this.prisma.employee.findMany({
          where: {
            OR: [
              { id: { in: [...employeeIds, ...userIds, ...employeeIds] } },
              { userId: { in: userIds } }
            ]
          },
          select: { id: true, userId: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        })
      ]);

      const map = {};
      users.forEach(u => { map[u.id] = u; });
      employees.forEach(e => {
        const person = { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar, employeeNumber: e.employeeNumber };
        map[e.id] = person;
        if (e.userId) map[e.userId] = person;
      });

      // Parse JSON fields and attach user objects
      return reviews.map(review => ({
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null,
        employee: map[review.employeeEmployeeReviewsId] || map[review.userId] || { firstName: 'مستخدم', lastName: 'غير معروف', employeeNumber: 'N/A' },
        reviewer: map[review.employeeReviewerReviewsId] || map[review.reviewerId] || { firstName: 'مقيم', lastName: 'غير معروف' }
      }));
    } catch (error) {
      console.error('❌ Error getting performance reviews:', error);
      throw error;
    }
  }

  /**
   * جلب جميع تقييمات الأداء للشركة
   */
  async getPerformanceReviews(companyId, options = {}) {
    try {
      const { status, employeeId, limit = 100 } = options;

      const where = { companyId };
      if (status && status !== 'all') where.status = status;
      if (employeeId) {
        where.OR = [
          { userId: employeeId },
          { employeeEmployeeReviewsId: employeeId }
        ];
      }

      const reviews = await this.prisma.performanceReview.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit)
      });

      // Fetch user and employee details for all involved
      const userIds = [...new Set([
        ...reviews.map(r => r.userId).filter(Boolean),
        ...reviews.map(r => r.reviewerId).filter(Boolean)
      ])];

      const employeeIds = [...new Set([
        ...reviews.map(r => r.employeeEmployeeReviewsId).filter(Boolean),
        ...reviews.map(r => r.employeeReviewerReviewsId).filter(Boolean)
      ])];

      const [users, employees] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        }),
        this.prisma.employee.findMany({
          where: {
            OR: [
              { id: { in: [...employeeIds, ...userIds] } },
              { userId: { in: userIds } }
            ]
          },
          select: { id: true, userId: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        })
      ]);

      const map = {};
      users.forEach(u => { map[u.id] = u; });
      employees.forEach(e => {
        const person = { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar, employeeNumber: e.employeeNumber };
        map[e.id] = person;
        if (e.userId) map[e.userId] = person;
      });

      return reviews.map(review => ({
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null,
        employee: map[review.employeeEmployeeReviewsId] || map[review.userId] || { firstName: 'مستخدم', lastName: 'غير معروف', employeeNumber: 'N/A' },
        reviewer: map[review.employeeReviewerReviewsId] || map[review.reviewerId] || { firstName: 'مقيم', lastName: 'غير معروف' }
      }));
    } catch (error) {
      console.error('❌ Error getting company performance reviews:', error);
      throw error;
    }
  }

  /**
   * جلب تقييم أداء بالـ ID
   */
  async getReviewById(companyId, reviewId) {
    try {
      const review = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!review) {
        throw new Error('التقييم غير موجود');
      }

      // Fetch user and employee details
      const userIds = [review.userId, review.reviewerId].filter(Boolean);
      const employeeIds = [review.employeeEmployeeReviewsId, review.employeeReviewerReviewsId].filter(Boolean);

      const [users, employees] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        }),
        this.prisma.employee.findMany({
          where: {
            OR: [
              { id: { in: [...employeeIds, ...userIds] } },
              { userId: { in: userIds } }
            ]
          },
          select: { id: true, userId: true, firstName: true, lastName: true, avatar: true, employeeNumber: true }
        })
      ]);

      const map = {};
      users.forEach(u => { map[u.id] = u; });
      employees.forEach(e => {
        const person = { id: e.id, firstName: e.firstName, lastName: e.lastName, avatar: e.avatar, employeeNumber: e.employeeNumber };
        map[e.id] = person;
        if (e.userId) map[e.userId] = person;
      });

      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null,
        employee: map[review.employeeEmployeeReviewsId] || map[review.userId] || { firstName: 'مستخدم', lastName: 'غير معروف', employeeNumber: 'N/A' },
        reviewer: map[review.employeeReviewerReviewsId] || map[review.reviewerId] || { firstName: 'مقيم', lastName: 'غير معروف' }
      };
    } catch (error) {
      console.error('❌ Error getting performance review:', error);
      throw error;
    }
  }


  /**
   * تحديث تقييم أداء
   */
  async updateReview(companyId, reviewId, data) {
    try {
      const existing = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!existing) {
        throw new Error('التقييم غير موجود');
      }

      const updateData = {};

      if (data.reviewerId) {
        // التحقق من وجود المقيم (User)
        const reviewerUser = await this.prisma.user.findFirst({
          where: { id: data.reviewerId, companyId },
          include: { employees: true }
        });

        if (reviewerUser) {
          updateData.reviewerId = reviewerUser.id;
          updateData.employeeReviewerReviewsId = reviewerUser.employees?.id || null;
        }
      }

      if (data.employeeId) {
        // التحقق من وجود الموظف (User)
        const employeeUser = await this.prisma.user.findFirst({
          where: { id: data.employeeId, companyId },
          include: { employees: true }
        });

        if (employeeUser) {
          updateData.userId = employeeUser.id;
          updateData.employeeEmployeeReviewsId = employeeUser.employees?.id || null;
        }
      }

      if (data.reviewPeriod !== undefined) updateData.reviewPeriod = data.reviewPeriod;
      if (data.periodStart !== undefined) updateData.periodStart = new Date(data.periodStart);
      if (data.periodEnd !== undefined) updateData.periodEnd = new Date(data.periodEnd);
      if (data.overallRating !== undefined) updateData.overallRating = data.overallRating;
      if (data.ratings) updateData.ratings = JSON.stringify(data.ratings);
      if (data.goals) updateData.goals = JSON.stringify(data.goals);
      if (data.goalsAchievement !== undefined) updateData.goalsAchievement = data.goalsAchievement;
      if (data.strengths !== undefined) updateData.strengths = data.strengths;
      if (data.improvements !== undefined) updateData.improvements = data.improvements;
      if (data.reviewerComments !== undefined) updateData.reviewerComments = data.reviewerComments;
      if (data.employeeComments !== undefined) updateData.employeeComments = data.employeeComments;
      if (data.recommendations) updateData.recommendations = JSON.stringify(data.recommendations);
      if (data.status) updateData.status = data.status;
      if (data.status === 'SUBMITTED') updateData.submittedAt = new Date();
      if (data.status === 'ACKNOWLEDGED') updateData.acknowledgedAt = new Date();

      const review = await this.prisma.performanceReview.update({
        where: { id: reviewId },
        data: updateData
      });

      // إذا تم تغيير المقيم، أرسل إشعاراً للمقيم الجديد
      if (data.reviewerId && data.reviewerId !== existing.reviewerId) {
        // جلب اسم الموظف للإشعار
        const employeeUser = await this.prisma.user.findUnique({
          where: { id: review.userId }
        });
        await this._notifyReviewer(companyId, review, data.reviewerId, `${employeeUser.firstName} ${employeeUser.lastName}`);
      }

      // Parse JSON fields
      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      };
    } catch (error) {
      console.error('❌ Error updating performance review:', error);
      throw error;
    }
  }

  /**
   * إرسال إشعار للمقيم
   */
  async _notifyReviewer(companyId, review, reviewerUserId, employeeName) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          companyId,
          userId: reviewerUserId,
          title: 'تقييم أداء جديد',
          message: `لقد تم تعيينك كمقيم لأداء الموظف ${employeeName}`,
          type: 'PERFORMANCE_REVIEW',
          data: { reviewId: review.id }
        }
      });

      // إرسال عبر السوكيت إذا كان المستخدم متصلاً
      if (socketService) {
        socketService.sendToUser(reviewerUserId, 'notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error sending performance notification:', error);
    }
  }


  /**
   * تقرير الأداء الشامل
   */
  async getPerformanceReport(companyId, options = {}) {
    try {
      const { month, year } = options;

      const where = { companyId };

      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        where.createdAt = {
          gte: startDate,
          lte: endDate
        };
      } else if (year) {
        where.createdAt = {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59`)
        };
      }

      // Only count completed/reviewed reviews for stats
      const statsWhere = {
        ...where,
        status: { in: ['COMPLETED', 'REVIEWED'] }
      };

      const reviews = await this.prisma.performanceReview.findMany({
        where: statsWhere,
        include: {
          employeeEmployeeReviews: {
            select: {
              firstName: true,
              lastName: true,
              department: {
                select: { name: true }
              }
            }
          }
        }
      });

      const totalReviews = reviews.length;
      let totalRatingSum = 0;
      let excellentCount = 0;
      let goodCount = 0;
      let needsImprovementCount = 0;
      const deptMap = {};
      const performers = [];

      reviews.forEach(review => {
        const rating = Number(review.overallRating) || 0;
        totalRatingSum += rating;

        if (rating >= 4.5) excellentCount++;
        else if (rating >= 3.5) goodCount++;
        else if (rating < 3.0) needsImprovementCount++;

        const deptName = review.employeeEmployeeReviews?.department?.name || 'بدون قسم';
        if (!deptMap[deptName]) {
          deptMap[deptName] = { totalRating: 0, count: 0 };
        }
        deptMap[deptName].totalRating += rating;
        deptMap[deptName].count++;

        performers.push({
          name: `${review.employeeEmployeeReviews?.firstName || ''} ${review.employeeEmployeeReviews?.lastName || ''}`.trim() || 'موظف مجهول',
          score: rating,
          department: deptName
        });
      });

      const averageScore = totalReviews > 0 ? totalRatingSum / totalReviews : 0;

      const byDepartment = Object.entries(deptMap).map(([name, stats]) => ({
        department: name,
        avgScore: stats.totalRating / stats.count,
        reviews: stats.count
      }));

      const topPerformers = performers
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Goals Achievement
      const goalsWhere = { companyId };
      if (where.createdAt) goalsWhere.createdAt = where.createdAt;

      const [totalGoals, goalGrouped] = await Promise.all([
        this.prisma.goal.count({ where: goalsWhere }),
        this.prisma.goal.groupBy({
          by: ['status'],
          where: goalsWhere,
          _count: true
        })
      ]);

      const goalsAchievement = {
        total: totalGoals,
        completed: goalGrouped.find(g => g.status === 'COMPLETED')?._count || 0,
        inProgress: goalGrouped.find(g => g.status === 'IN_PROGRESS' || g.status === 'ACTIVE')?._count || 0,
        notStarted: goalGrouped.find(g => g.status === 'NOT_STARTED' || g.status === 'PENDING')?._count || 0,
      };


      return {
        totalReviews,
        averageScore,
        excellentCount,
        goodCount,
        needsImprovementCount,
        byDepartment,
        topPerformers,
        goalsAchievement
      };
    } catch (error) {
      console.error('❌ Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * حذف تقييم أداء
   */
  async deleteReview(companyId, reviewId) {
    try {
      const existing = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!existing) {
        throw new Error('التقييم غير موجود');
      }

      await this.prisma.performanceReview.delete({
        where: { id: reviewId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting performance review:', error);
      throw error;
    }
  }

  /**
   * إحصائيات التقييمات
   */
  async getPerformanceStats(companyId, options = {}) {
    try {
      const { employeeId, year } = options;

      // Filter out orphaned records by ensuring userId and reviewerId exist in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      const where = { companyId };

      // Handle userId filter
      if (employeeId) {
        if (validUserIdList.includes(employeeId)) {
          where.userId = employeeId;
        } else {
          // Requested employeeId doesn't exist, return empty stats
          return {
            total: 0,
            byStatus: [],
            averageRating: 0,
            byPeriod: []
          };
        }
      } else {
        // Only include reviews with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          return {
            total: 0,
            byStatus: [],
            averageRating: 0,
            byPeriod: []
          };
        }
      }

      // Also filter by valid reviewerIds
      if (validUserIdList.length > 0) {
        where.reviewerId = { in: validUserIdList };
      } else {
        where.reviewerId = { in: [] };
      }

      if (year) {
        where.periodStart = { gte: new Date(`${year}-01-01`) };
        where.periodEnd = { lte: new Date(`${year}-12-31`) };
      }

      const [total, byStatus, averageRating, byPeriod] = await Promise.all([
        this.prisma.performanceReview.count({ where }),
        this.prisma.performanceReview.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.performanceReview.aggregate({
          where,
          _avg: { overallRating: true }
        }),
        this.prisma.performanceReview.groupBy({
          by: ['reviewPeriod'],
          where,
          _count: true,
          _avg: { overallRating: true }
        })
      ]);

      return {
        total,
        byStatus,
        averageRating: averageRating._avg.overallRating || 0,
        byPeriod
      };
    } catch (error) {
      console.error('❌ Error getting performance stats:', error);
      throw error;
    }
  }
}

module.exports = new PerformanceService();















































