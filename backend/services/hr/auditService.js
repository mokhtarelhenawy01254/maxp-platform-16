/**
 * 📝 Audit Service
 * خدمة سجل التدقيق
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class AuditService {
    constructor() {
        // Don't initialize prisma here - get it dynamically
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تسجيل عملية في سجل التدقيق
     * @param {string} companyId - معرف الشركة
     * @param {string} actorId - معرف المستخدم الذي قام بالعملية
     * @param {string} action - نوع العملية (APPROVE, REJECT, UPDATE, etc)
     * @param {string} entityType - نوع الكيان (LEAVE, ADVANCE, etc)
     * @param {string} entityId - معرف الكيان
     * @param {object} details - تفاصيل إضافية
     * @param {string} actorName - اسم المستخدم (اختياري، سيتم جلبه إذا لم يتوفر)
     * @param {string} ipAddress - عنوان IP (اختياري)
     * @param {string} userAgent - User Agent (اختياري)
     */
    async logAction(companyId, actorId, action, entityType, entityId, details = {}, actorName = null, ipAddress = null, userAgent = null) {
        try {
            // إذا لم يتم توفير الاسم، نجلبه
            if (!actorName) {
                const user = await this.prisma.user.findUnique({
                    where: { id: actorId },
                    select: { firstName: true, lastName: true }
                });
                if (user) {
                    actorName = `${user.firstName} ${user.lastName}`;
                } else {
                    actorName = 'Unknown User';
                }
            }

            await this.prisma.hRAuditLog.create({
                data: {
                    companyId,
                    actorId,
                    action,
                    entityType,
                    entityId,
                    actorName,
                    details: details, // Now stored as Json
                    ipAddress,
                    userAgent
                }
            });

            console.log(`📝 [Audit] Logged: ${action} on ${entityType} by ${actorName} (${ipAddress || 'No IP'})`);
        } catch (error) {
            console.error('❌ Error creating audit log:', error);
            // لا نوقف العملية الأساسية إذا فشل التسجيل، ولكن نسجل الخطأ
        }
    }

    /**
     * جلب سجلات التدقيق
     */
    async getLogs(companyId, options = {}) {
        try {
            const {
                entityType,
                action,
                startDate,
                endDate,
                search,
                actorId,
                limit = 50,
                page = 1
            } = options;

            // Validation
            const validatedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
            const validatedPage = Math.max(parseInt(page) || 1, 1);
            const skip = (validatedPage - 1) * validatedLimit;

            const where = { companyId };

            // Filter by entity type
            if (entityType) where.entityType = entityType;

            // Filter by action
            if (action) where.action = action;

            // Filter by actor
            if (actorId) where.actorId = actorId;

            // Filter by date range
            if (startDate && endDate) {
                where.createdAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            } else if (startDate) {
                where.createdAt = { gte: new Date(startDate) };
            } else if (endDate) {
                where.createdAt = { lte: new Date(endDate) };
            }

            // Search functionality
            if (search && search.trim()) {
                where.OR = [
                    { actorName: { contains: search.trim(), mode: 'insensitive' } },
                    { entityId: { contains: search.trim(), mode: 'insensitive' } },
                    { ipAddress: { contains: search.trim(), mode: 'insensitive' } }
                ];
            }

            const [logs, total] = await Promise.all([
                this.prisma.hRAuditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: validatedLimit,
                    skip: skip,
                    include: {
                        actor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                avatar: true
                            }
                        }
                    }
                }),
                this.prisma.hRAuditLog.count({ where })
            ]);

            return {
                logs,
                pagination: {
                    total,
                    page: validatedPage,
                    limit: validatedLimit,
                    totalPages: Math.ceil(total / validatedLimit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching audit logs:', error);
            throw error;
        }
    }

    /**
     * Get audit log statistics
     */
    async getStats(companyId, options = {}) {
        try {
            const { startDate, endDate } = options;
            const where = { companyId };

            if (startDate && endDate) {
                where.createdAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const [
                totalLogs,
                actionStats,
                entityStats,
                recentActivity
            ] = await Promise.all([
                this.prisma.hRAuditLog.count({ where }),
                this.prisma.hRAuditLog.groupBy({
                    by: ['action'],
                    where,
                    _count: true
                }),
                this.prisma.hRAuditLog.groupBy({
                    by: ['entityType'],
                    where,
                    _count: true
                }),
                this.prisma.hRAuditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        actor: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    }
                })
            ]);

            return {
                totalLogs,
                actionStats: actionStats.map(stat => ({
                    action: stat.action,
                    count: stat._count
                })),
                entityStats: entityStats.map(stat => ({
                    entityType: stat.entityType,
                    count: stat._count
                })),
                recentActivity
            };
        } catch (error) {
            console.error('❌ Error fetching audit stats:', error);
            throw error;
        }
    }
}

module.exports = new AuditService();
