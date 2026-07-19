/**
 * 🌟 Kudos Service
 * خدمة التقدير المتبادل بين الموظفين (Peer-to-Peer Recognition)
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { ValidationError, NotFoundError } = require('../../utils/hrErrors');

class KudosService {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * إرسال تقدير (Kudos) لزميل
     */
    async sendKudos(companyId, fromUserId, toUserId, reason, points = 1) {
        if (fromUserId === toUserId) {
            throw new ValidationError('لا يمكنك إرسال تقدير لنفسك');
        }

        // Validate reason
        if (!reason || reason.trim().length < 5) {
            throw new ValidationError('يرجى ذكر سبب التقدير (على الأقل 5 أحرف)');
        }

        // Check if both users exist and belong to the same company
        const [fromUser, toUser] = await Promise.all([
            this.prisma.user.findFirst({ where: { id: fromUserId, companyId } }),
            this.prisma.user.findFirst({ where: { id: toUserId, companyId } })
        ]);

        if (!fromUser || !toUser) {
            throw new NotFoundError('أحد الموظفين غير موجود في هذه الشركة');
        }

        const kudos = await this.prisma.kudos.create({
            data: {
                companyId,
                fromUserId,
                toUserId,
                reason,
                points
            },
            include: {
                fromUser: {
                    select: { firstName: true, lastName: true, avatar: true }
                },
                toUser: {
                    select: { firstName: true, lastName: true, avatar: true }
                }
            }
        });

        // Send WhatsApp notification to owner
        setImmediate(async () => {
            try {
                const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');
                await hrOwnerNotificationAgent.sendOwnerNotification({
                    companyId,
                    employeeName: kudos.fromUser ? `${kudos.fromUser.firstName || ''} ${kudos.fromUser.lastName || ''}`.trim() : 'موظف',
                    actionId: 'KUDOS',
                    actionName: 'إرسال تقدير لزميل',
                    details: `تقدير لـ: ${kudos.toUser ? `${kudos.toUser.firstName || ''} ${kudos.toUser.lastName || ''}`.trim() : 'موظف'}\nالسبب: ${reason}\nالنقاط: ${points}`,
                    requiresApproval: false
                });
            } catch (waOwnerError) {
                console.error('❌ [Kudos-Owner-Notify] Error:', waOwnerError);
            }
        });

        return kudos;
    }

    /**
     * جلب سجلات التقدير مع الفلترة
     */
    async getKudos(companyId, options = {}) {
        const {
            page = 1,
            limit = 20,
            userId,
            direction = 'received' // 'received' or 'given'
        } = options;

        const where = { companyId };
        if (userId) {
            if (direction === 'received') {
                where.toUserId = userId;
            } else {
                where.fromUserId = userId;
            }
        }

        const [items, total] = await Promise.all([
            this.prisma.kudos.findMany({
                where,
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    fromUser: {
                        select: { id: true, firstName: true, lastName: true, avatar: true }
                    },
                    toUser: {
                        select: { id: true, firstName: true, lastName: true, avatar: true }
                    }
                }
            }),
            this.prisma.kudos.count({ where })
        ]);

        return {
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * إحصائيات التقدير لشركة أو لموظف
     */
    async getKudosStats(companyId, userId = null) {
        try {
            const where = { companyId };
            if (userId) where.toUserId = userId;

            const aggregations = await this.prisma.kudos.aggregate({
                where,
                _count: { id: true },
                _sum: { points: true }
            });

            const topReceivers = await this.prisma.kudos.groupBy({
                by: ['toUserId'],
                where: { companyId },
                _count: { id: true },
                _sum: { points: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            });

            // Map to user details
            const userIds = topReceivers.map(r => r.toUserId);
            const users = await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, avatar: true }
            });

            const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

            return {
                totalKudos: aggregations._count.id || 0,
                totalPoints: aggregations._sum.points || 0,
                topReceivers: topReceivers.map(r => ({
                    user: userMap[r.toUserId],
                    count: r._count.id,
                    points: r._sum.points || 0
                }))
            };
        } catch (error) {
            console.error('❌ [KudosService] Error getting stats:', error);
            throw error;
        }
    }
}

module.exports = new KudosService();
