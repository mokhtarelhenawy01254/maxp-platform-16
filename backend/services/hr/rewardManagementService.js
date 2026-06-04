/**
 * 🎁 Reward Management Service
 * خدمة إدارة المكافآت الشاملة - Production Ready
 * 
 * Features:
 * - Complete CRUD for reward records
 * - Advanced filtering and search
 * - Pagination support
 * - Status management
 * - History tracking
 * - Audit logging
 * - Role-based access
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { ValidationError, NotFoundError, PermissionError } = require('../../utils/hrErrors');

class RewardManagementService {
    constructor() {
        this.prisma = null;
    }

    getPrisma() {
        if (!this.prisma) {
            this.prisma = getSharedPrismaClient();
        }
        return this.prisma;
    }

    /**
     * Get all reward records with advanced filtering
     */
    async getRewardRecords(companyId, filters = {}, pagination = {}) {
        try {
            const prisma = this.getPrisma();
            const {
                userId,
                rewardTypeId,
                category,
                status,
                month,
                year,
                startDate,
                endDate,
                search,
                isIncludedInPayroll
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = pagination;

            // Build where clause
            const where = { companyId };

            if (userId) where.userId = userId;
            if (rewardTypeId) where.rewardTypeId = rewardTypeId;
            if (category) where.rewardCategory = category;
            if (status) where.status = status;

            if (month && !isNaN(parseInt(month))) {
                where.appliedMonth = parseInt(month);
            }
            if (year && !isNaN(parseInt(year))) {
                where.appliedYear = parseInt(year);
            }
            if (isIncludedInPayroll !== undefined) where.isIncludedInPayroll = isIncludedInPayroll === 'true';

            // Date range filter
            if (startDate || endDate) {
                where.periodStart = {};
                if (startDate) where.periodStart.gte = new Date(startDate);
                if (endDate) where.periodStart.lte = new Date(endDate);
            }

            // Search filter
            if (search) {
                where.OR = [
                    { rewardName: { contains: search } },
                    { reason: { contains: search } }
                ];
            }

            // Execute queries
            const [records, total] = await Promise.all([
                prisma.rewardRecord.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                employeeNumber: true,
                                departmentRelation: {
                                    select: { name: true }
                                }
                            }
                        },
                        rewardType: {
                            select: {
                                id: true,
                                name: true,
                                nameAr: true,
                                category: true,
                                calculationMethod: true
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip: (parseInt(page) - 1) * parseInt(limit),
                    take: parseInt(limit)
                }),
                prisma.rewardRecord.count({ where })
            ]);

            return {
                records,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            console.error('❌ [RewardManagement] Error getting reward records:', error);
            throw error;
        }
    }

    /**
     * Get single reward record by ID
     */
    async getRewardRecordById(companyId, recordId) {
        try {
            const prisma = this.getPrisma();

            const record = await prisma.rewardRecord.findFirst({
                where: {
                    id: recordId,
                    companyId
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            employeeNumber: true,
                            phone: true,
                            departmentRelation: {
                                select: { name: true }
                            },
                            positionRelation: {
                                select: { title: true }
                            }
                        }
                    },
                    rewardType: {
                        select: {
                            id: true,
                            name: true,
                            nameAr: true,
                            description: true,
                            category: true,
                            calculationMethod: true,
                            value: true,
                            frequency: true,
                            triggerType: true
                        }
                    }
                }
            });

            if (!record) {
                throw new NotFoundError('المكافأة غير موجودة');
            }

            return record;
        } catch (error) {
            console.error('❌ [RewardManagement] Error getting reward record:', error);
            throw error;
        }
    }

    /**
     * Get reward history for an employee
     */
    async getEmployeeRewardHistory(companyId, userId, filters = {}) {
        try {
            const prisma = this.getPrisma();
            const { year, category, status } = filters;

            const where = {
                companyId,
                userId
            };

            if (year) where.appliedYear = parseInt(year);
            if (category) where.rewardCategory = category;
            if (status) where.status = status;

            const [records, summary] = await Promise.all([
                prisma.rewardRecord.findMany({
                    where,
                    include: {
                        rewardType: {
                            select: {
                                name: true,
                                nameAr: true,
                                category: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.rewardRecord.aggregate({
                    where: {
                        ...where,
                        status: { in: ['APPROVED', 'GIVEN'] }
                    },
                    _sum: { calculatedValue: true },
                    _count: true
                })
            ]);

            return {
                records,
                summary: {
                    totalRewards: summary._count,
                    totalValue: summary._sum.calculatedValue || 0
                }
            };
        } catch (error) {
            console.error('❌ [RewardManagement] Error getting employee history:', error);
            throw error;
        }
    }

    /**
     * Get reward statistics
     */
    async getRewardStatistics(companyId, filters = {}) {
        try {
            const prisma = this.getPrisma();
            const { month, year, startDate, endDate } = filters;

            const where = { companyId };

            if (month && !isNaN(parseInt(month)) && year && !isNaN(parseInt(year))) {
                where.appliedMonth = parseInt(month);
                where.appliedYear = parseInt(year);
            } else if (year && !isNaN(parseInt(year))) {
                where.appliedYear = parseInt(year);
                if (month && !isNaN(parseInt(month))) {
                    where.appliedMonth = parseInt(month);
                }
            } else if (startDate || endDate) {
                where.periodStart = {};
                if (startDate) where.periodStart.gte = new Date(startDate);
                if (endDate) where.periodStart.lte = new Date(endDate);
            }

            const [
                totalRecords,
                byStatus,
                byCategory,
                totalValue,
                topEmployees
            ] = await Promise.all([
                // Total count
                prisma.rewardRecord.count({ where }),

                // By status
                prisma.rewardRecord.groupBy({
                    by: ['status'],
                    where,
                    _count: true,
                    _sum: { calculatedValue: true }
                }),

                // By category
                prisma.rewardRecord.groupBy({
                    by: ['rewardCategory'],
                    where,
                    _count: true,
                    _sum: { calculatedValue: true }
                }),

                // Total value
                prisma.rewardRecord.aggregate({
                    where: {
                        ...where,
                        status: { in: ['APPROVED', 'GIVEN'] }
                    },
                    _sum: { calculatedValue: true }
                }),

                // Top employees
                prisma.rewardRecord.groupBy({
                    by: ['userId'],
                    where: {
                        ...where,
                        status: { in: ['APPROVED', 'GIVEN'] }
                    },
                    _count: true,
                    _sum: { calculatedValue: true },
                    orderBy: { _sum: { calculatedValue: 'desc' } },
                    take: 10
                })
            ]);

            // Get employee details for top employees
            const userIds = topEmployees.map(e => e.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true
                }
            });

            const userMap = {};
            users.forEach(u => { userMap[u.id] = u; });

            return {
                total: totalRecords,
                totalValue: totalValue._sum.calculatedValue || 0,
                byStatus: byStatus.map(s => ({
                    status: s.status,
                    count: s._count,
                    value: s._sum.calculatedValue || 0
                })),
                byCategory: byCategory.map(c => ({
                    category: c.rewardCategory,
                    count: c._count,
                    value: c._sum.calculatedValue || 0
                })),
                topEmployees: topEmployees.map(e => ({
                    employee: userMap[e.userId] || null,
                    rewardCount: e._count,
                    totalValue: e._sum.calculatedValue || 0
                }))
            };
        } catch (error) {
            console.error('❌ [RewardManagement] Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Create manual reward record
     */
    async createManualReward(companyId, data, createdBy) {
        try {
            const prisma = this.getPrisma();

            // Validate required fields
            this.validateRewardData(data);

            // Check if employee exists
            const employee = await prisma.user.findFirst({
                where: {
                    id: data.userId,
                    companyId
                }
            });

            if (!employee) {
                throw new NotFoundError('الموظف غير موجود');
            }

            // Check if reward type exists
            let rewardType = null;
            let rewardName = data.rewardName || 'مكافأة يدوية';
            let rewardCategory = data.rewardCategory || 'OTHER';

            if (data.rewardTypeId && data.rewardTypeId !== 'custom') {
                rewardType = await prisma.rewardType.findFirst({
                    where: {
                        id: data.rewardTypeId,
                        companyId,
                        isActive: true
                    }
                });

                if (!rewardType) {
                    throw new NotFoundError('نوع المكافأة غير موجود أو غير نشط');
                }

                rewardName = rewardType.name;
                rewardCategory = ['PERFORMANCE', 'ATTENDANCE', 'SERVICE_ANNIVERSARY', 'OTHER'].includes(rewardType.category) ? rewardType.category : 'OTHER';
            } else {
                // Ad-hoc reward
                if (!data.rewardName) {
                    throw new ValidationError('يجب إدخال اسم المكافأة عند اختيار نوع مخصص');
                }
                rewardName = data.rewardName;
                rewardCategory = ['PERFORMANCE', 'ATTENDANCE', 'SERVICE_ANNIVERSARY', 'OTHER'].includes(data.rewardCategory) ? data.rewardCategory : 'OTHER';
            }

            // Calculate value
            const calculatedValue = data.calculatedValue || (rewardType ? rewardType.value : 0);

            // Create record
            const record = await prisma.rewardRecord.create({
                data: {
                    company: { connect: { id: companyId } },
                    user: { connect: { id: data.userId } },
                    rewardType: rewardType ? { connect: { id: rewardType.id } } : undefined,
                    rewardName: rewardName,
                    rewardCategory: rewardCategory,
                    calculatedValue: parseFloat(calculatedValue),
                    calculationDetails: data.calculationDetails ? (typeof data.calculationDetails === 'string' ? data.calculationDetails : JSON.stringify(data.calculationDetails)) : null,
                    periodStart: new Date(data.periodStart),
                    periodEnd: new Date(data.periodEnd),
                    appliedMonth: parseInt(data.appliedMonth) || new Date().getMonth() + 1,
                    appliedYear: parseInt(data.appliedYear) || new Date().getFullYear(),
                    reason: data.reason || null,
                    eligibilityMet: data.eligibilityMet || null,
                    status: 'PENDING'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            employeeNumber: true
                        }
                    },
                    rewardType: {
                        select: {
                            name: true,
                            nameAr: true,
                            category: true
                        }
                    }
                }
            });

            console.log(`✅ [RewardManagement] Manual reward created: ${record.id}`);
            return record;
        } catch (error) {
            console.error('❌ [RewardManagement] Error creating manual reward:', error);
            throw error;
        }
    }

    /**
     * Update reward record
     */
    async updateRewardRecord(companyId, recordId, data, updatedBy) {
        try {
            const prisma = this.getPrisma();

            // Check if record exists
            const existing = await prisma.rewardRecord.findFirst({
                where: {
                    id: recordId,
                    companyId
                }
            });

            if (!existing) {
                throw new NotFoundError('المكافأة غير موجودة');
            }

            // Check if locked
            if (existing.isLocked) {
                throw new ValidationError('لا يمكن تعديل مكافأة مقفلة');
            }

            // Check if already applied
            if (existing.status === 'GIVEN') {
                throw new ValidationError('لا يمكن تعديل مكافأة تم تطبيقها');
            }

            // Update allowed fields
            const updateData = {};
            if (data.calculatedValue !== undefined) updateData.calculatedValue = parseFloat(data.calculatedValue);
            if (data.reason !== undefined) updateData.reason = data.reason;
            if (data.periodStart !== undefined) updateData.periodStart = new Date(data.periodStart);
            if (data.periodEnd !== undefined) updateData.periodEnd = new Date(data.periodEnd);
            if (data.appliedMonth !== undefined) updateData.appliedMonth = parseInt(data.appliedMonth);
            if (data.appliedYear !== undefined) updateData.appliedYear = parseInt(data.appliedYear);

            const updated = await prisma.rewardRecord.update({
                where: { id: recordId },
                data: updateData,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            employeeNumber: true
                        }
                    },
                    rewardType: {
                        select: {
                            name: true,
                            nameAr: true,
                            category: true
                        }
                    }
                }
            });

            console.log(`✅ [RewardManagement] Reward updated: ${recordId}`);
            return updated;
        } catch (error) {
            console.error('❌ [RewardManagement] Error updating reward:', error);
            throw error;
        }
    }


    /**
     * Delete reward record
     */
    async deleteRewardRecord(companyId, recordId, deletedBy) {
        try {
            const prisma = this.getPrisma();

            // Check if record exists
            const existing = await prisma.rewardRecord.findFirst({
                where: {
                    id: recordId,
                    companyId
                }
            });

            if (!existing) {
                throw new NotFoundError('المكافأة غير موجودة');
            }

            // Check if can be deleted
            if (existing.isLocked) {
                throw new ValidationError('لا يمكن حذف مكافأة مقفلة');
            }

            if (existing.isIncludedInPayroll) {
                throw new ValidationError('لا يمكن حذف مكافأة مدرجة في كشف الرواتب');
            }

            await prisma.rewardRecord.delete({
                where: { id: recordId }
            });

            console.log(`✅ [RewardManagement] Reward deleted: ${recordId}`);
            return { success: true, message: 'تم حذف المكافأة بنجاح' };
        } catch (error) {
            console.error('❌ [RewardManagement] Error deleting reward:', error);
            throw error;
        }
    }

    /**
     * Validate reward data
     */
    validateRewardData(data) {
        const errors = [];

        if (!data.userId) {
            errors.push({ field: 'userId', message: 'معرف الموظف مطلوب' });
        }

        if (!data.rewardTypeId) {
            errors.push({ field: 'rewardTypeId', message: 'نوع المكافأة مطلوب' });
        }

        if (!data.periodStart) {
            errors.push({ field: 'periodStart', message: 'تاريخ بداية الفترة مطلوب' });
        }

        if (!data.periodEnd) {
            errors.push({ field: 'periodEnd', message: 'تاريخ نهاية الفترة مطلوب' });
        }

        if (data.calculatedValue !== undefined && parseFloat(data.calculatedValue) < 0) {
            errors.push({ field: 'calculatedValue', message: 'قيمة المكافأة يجب أن تكون موجبة' });
        }

        if (errors.length > 0) {
            throw new ValidationError('فشل التحقق من صحة البيانات', errors);
        }

        return true;
    }

    /**
     * Check user permissions for reward operations
     */
    checkPermissions(user, operation) {
        const { role } = user;

        const permissions = {
            'view_all': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'HR'],
            'create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'HR'],
            'approve': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'],
            'delete': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'],
            'view_own': ['EMPLOYEE', 'MANAGER', 'HR', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN']
        };

        if (!permissions[operation] || !permissions[operation].includes(role)) {
            throw new PermissionError('ليس لديك صلاحية لتنفيذ هذه العملية');
        }

        return true;
    }
}

module.exports = new RewardManagementService();
