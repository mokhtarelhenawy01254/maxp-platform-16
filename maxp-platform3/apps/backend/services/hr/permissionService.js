/**
 * 🕒 Permission Service
 * خدمة إدارة الأذونات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validatePermissionData } = require('../../utils/hrValidation');
const auditService = require('./auditService');
const { NotFoundError, ValidationError } = require('../../utils/hrErrors');
const whatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');

class PermissionService {
    constructor() {
        // Don't initialize prisma here - get it dynamically
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * إنشاء طلب إذن
     */
    async createPermissionRequest(companyId, employeeId, data) {
        try {
            // التحقق من صحة البيانات
            validatePermissionData(data);

            const requestDate = new Date(data.date);

            // ✅ FIX: البحث عن الموظف - أولاً بالـ id، ثم بالـ userId
            let employee = await this.prisma.employee.findFirst({
                where: {
                    id: employeeId,
                    companyId: companyId
                }
            });

            // ✅ FIX: إذا لم يتم العثور عليه، ابحث بناءً على userId
            if (!employee) {
                console.log(`⚠️ [Permission] Employee not found by id: ${employeeId}, trying userId...`);
                employee = await this.prisma.employee.findFirst({
                    where: {
                        userId: employeeId,
                        companyId: companyId
                    }
                });

                // 🛑 FIX: Throw an error instructing to complete employee profile instead of phantom creation.
                if (!employee) {
                    throw new ValidationError('بيانات الموظف غير مكتملة، يرجى استكمال الملف الوظيفي (Onboarding) أولاً.');
                }
            }

            if (!employee) {
                throw new NotFoundError('الموظف', employeeId);
            }

            console.log(`✅ [Permission] Found employee: ${employee.id} (${employee.firstName} ${employee.lastName})`);

            // حساب عدد الساعات وتأمين حساب الوقت الصحيح
            let totalHours = data.totalHours;
            if (!totalHours) {
                if (!data.startTime || !data.endTime) {
                    throw new ValidationError('وقت البداية ووقت النهاية مطلوبان');
                }
                const start = data.startTime.split(':').map(Number);
                const end = data.endTime.split(':').map(Number);
                const startMin = start[0] * 60 + start[1];
                const endMin = end[0] * 60 + end[1];
                totalHours = parseFloat(((endMin - startMin) / 60).toFixed(2));
                
                if (totalHours <= 0) {
                     throw new ValidationError('وقت النهاية يجب أن يكون بعد وقت البداية، وتداخل الأيام غير مسموح حالياً');
                }
            }

            const permissionRequest = await this.prisma.hrPermissionRequest.create({
                data: {
                    companyId,
                    employeeId: employee.id,
                    type: data.type,
                    date: requestDate,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    totalHours: totalHours,
                    reason: data.reason,
                    details: data.details,
                    notes: data.notes,
                    attachments: data.attachments,
                    isUrgent: data.isUrgent || false,
                    isCompensated: data.isCompensated || false,
                    compensationDate: data.compensationDate ? new Date(data.compensationDate) : null,
                    compensationNotes: data.compensationNotes,
                    status: 'PENDING'
                },
                include: {
                    employee: {
                        select: {
                            firstName: true,
                            lastName: true,
                            employeeNumber: true,
                            department: { select: { name: true } }
                        }
                    }
                }
            });

            // Send WhatsApp notification to owner
            setImmediate(async () => {
                try {
                    const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');
                    await hrOwnerNotificationAgent.sendOwnerNotification({
                        companyId,
                        employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'موظف',
                        actionType: 'طلب إذن (خروج/تأخير)',
                        details: `التاريخ: ${new Date(requestDate).toLocaleDateString('ar-EG')}\nالوقت: من ${data.startTime} إلى ${data.endTime} (${totalHours} ساعة)\nالسبب: ${data.reason || 'غير محدد'}`,
                        requiresApproval: true
                    });
                } catch (waOwnerError) {
                    console.error('❌ [Permission-Owner-Notify] Error:', waOwnerError);
                }
            });

            return permissionRequest;
        } catch (error) {
            console.error('❌ Error creating permission request:', error);
            throw error;
        }
    }

    /**
     * جلب طلبات الأذونات
     */
    async getPermissionRequests(companyId, options = {}) {
        try {
            const {
                employeeId,
                status,
                type,
                startDate,
                endDate,
                page = 1,
                limit = 20
            } = options;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            const where = { companyId };

            if (status) where.status = status;
            if (type) where.type = type;
            if (employeeId) where.employeeId = employeeId;

            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }

            const [requests, total] = await Promise.all([
                this.prisma.hrPermissionRequest.findMany({
                    where,
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                employeeNumber: true,
                                avatar: true,
                                department: { select: { name: true } }
                            }
                        },
                        approvedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum
                }),
                this.prisma.hrPermissionRequest.count({ where })
            ]);

            return {
                requests,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            };
        } catch (error) {
            console.error('❌ Error getting permission requests:', error);
            throw error;
        }
    }

    /**
     * جلب طلب إذن بالـ ID
     */
    async getPermissionRequestById(companyId, requestId) {
        try {
            const request = await this.prisma.hrPermissionRequest.findFirst({
                where: { id: requestId, companyId },
                include: {
                    employee: true,
                    approvedBy: true
                }
            });

            if (!request) {
                throw new NotFoundError('طلب الإذن', requestId);
            }

            return request;
        } catch (error) {
            console.error('❌ Error getting permission request:', error);
            throw error;
        }
    }

    /**
     * الموافقة على طلب إذن
     */
    async approvePermissionRequest(companyId, requestId, approverEmployeeId) {
        try {
            const request = await this.prisma.hrPermissionRequest.findFirst({
                where: { id: requestId, companyId }
            });

            if (!request) {
                throw new NotFoundError('طلب الإذن', requestId);
            }

            if (request.status !== 'PENDING') {
                throw new ValidationError('لا يمكن الموافقة على طلب ليس في حالة الانتظار');
            }

            const updated = await this.prisma.hrPermissionRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedById: approverEmployeeId,
                    approvedAt: new Date()
                },
                include: {
                    employee: true
                }
            });

            // إضافة الإذن المخصوم فوراً إلى جدول خصومات التأخير / الغياب لتقرأه كشوف الرواتب
            if (updated.type === 'DEDUCTIBLE') {
                try {
                    await this.prisma.latenessDeduction.create({
                        data: {
                            companyId: companyId,
                            userId: updated.employee.userId, // Requires userId
                            deductionType: 'TIME', 
                            deductionReason: request.reason || 'إذن خروج بخصم',
                            violationDate: new Date(request.date),
                            violationDescription: `إذن مغادرة مخصوم من ${request.startTime} إلى ${request.endTime} (${request.totalHours} ساعة)`,
                            timeDeductionHours: request.totalHours,
                            timeDeductionMinutes: Math.round(request.totalHours * 60),
                            warningLevel: 0,
                            isAppliedToPayroll: false,
                            requiresApproval: false,
                            approvedBy: approverEmployeeId,
                            approvedAt: new Date(),
                        }
                    });
                    console.log(`✅ [Permission Service] Created Time Deduction for request ${requestId}`);
                } catch (deductionError) {
                    console.error('❌ [Permission Service] Error creating automatic deduction:', deductionError);
                    // Do not block the approval response, but log it.
                }
            }

            // تسجيل في سجل العمليات
            await auditService.logAction(
                companyId,
                approverEmployeeId,
                'APPROVE',
                'PERMISSION',
                requestId,
                {
                    type: request.type,
                    hours: request.totalHours,
                    date: request.date
                }
            );

            // 📢 إرسال إشعار الواتساب للموظف (في الخلفية لتجنب التأخير)
            setImmediate(async () => {
                try {
                    // جلب بيانات الحساب (User) للحصول على رقم الهاتف
                    const userData = await this.prisma.user.findUnique({
                        where: { id: updated.employee.userId },
                        select: { id: true, firstName: true, phone: true }
                    });

                    if (userData && userData.phone) {
                        await whatsAppNotificationService.sendPermissionApprovalNotification({
                            ...updated,
                            user: userData
                        }, true);
                    }
                } catch (waError) {
                    console.error('❌ [Permission-Approve] Error sending WhatsApp notification:', waError);
                }
            });

            return updated;
        } catch (error) {
            console.error('❌ Error approving permission request:', error);
            throw error;
        }
    }

    /**
     * رفض طلب إذن
     */
    async rejectPermissionRequest(companyId, requestId, approverEmployeeId, reason) {
        try {
            const request = await this.prisma.hrPermissionRequest.findFirst({
                where: { id: requestId, companyId }
            });

            if (!request) {
                throw new NotFoundError('طلب الإذن', requestId);
            }

            const updated = await this.prisma.hrPermissionRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    approvedById: approverEmployeeId,
                    approvedAt: new Date(),
                    rejectionReason: reason
                }
            });

            await auditService.logAction(
                companyId,
                approverEmployeeId,
                'REJECT',
                'PERMISSION',
                requestId,
                { reason }
            );

            // 📢 إرسال إشعار الواتساب للموظف (في الخلفية لتجنب التأخير)
            setImmediate(async () => {
                try {
                    // جلب بيانات طلب الإذن مع بيانات الموظف والمستخدم
                    const requestWithUser = await this.prisma.hrPermissionRequest.findUnique({
                        where: { id: updated.id },
                        include: {
                            employee: {
                                include: {
                                    user: {
                                        select: { id: true, firstName: true, phone: true }
                                    }
                                }
                            }
                        }
                    });

                    if (requestWithUser?.employee?.user?.phone) {
                        await whatsAppNotificationService.sendPermissionApprovalNotification({
                            ...updated,
                            user: requestWithUser.employee.user
                        }, false);
                    }
                } catch (waError) {
                    console.error('❌ [Permission-Reject] Error sending WhatsApp notification:', waError);
                }
            });

            return updated;
        } catch (error) {
            console.error('❌ Error rejecting permission request:', error);
            throw error;
        }
    }

    /**
     * جلب إحصائيات الأذونات
     */
    async getPermissionStats(companyId, employeeId = null) {
        try {
            const baseWhere = { companyId };
            if (employeeId) baseWhere.employeeId = employeeId;

            const [approvedRequests, pendingCount] = await Promise.all([
                this.prisma.hrPermissionRequest.findMany({
                    where: { ...baseWhere, status: 'APPROVED' },
                    select: {
                        type: true,
                        totalHours: true
                    }
                }),
                this.prisma.hrPermissionRequest.count({
                    where: { ...baseWhere, status: 'PENDING' }
                })
            ]);

            const stats = {
                totalRequests: approvedRequests.length,
                pendingCount: pendingCount,
                totalHours: approvedRequests.reduce((sum, r) => sum + Number(r.totalHours), 0),
                byType: {
                    DEDUCTIBLE: 0,
                    NON_DEDUCTIBLE: 0,
                    FIXED_HOURS: 0,
                    COMPENSATORY: 0
                }
            };

            approvedRequests.forEach(r => {
                stats.byType[r.type] = (stats.byType[r.type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('❌ Error getting permission stats:', error);
            throw error;
        }
    }

    /**
     * حذف طلب إذن
     */
    async deletePermissionRequest(companyId, requestId) {
        try {
            const request = await this.prisma.hrPermissionRequest.findFirst({
                where: { id: requestId, companyId }
            });

            if (!request) {
                throw new NotFoundError('طلب الإذن', requestId);
            }

            // منع حذف الطلبات المعتمدة بأي شكل لتأمين الـ سجلات وحماية قواعد البيانات من الخلل المحاسبي
            if (request.status === 'APPROVED' && process.env.ALLOW_DELETE_APPROVED !== 'true') {
                throw new ValidationError('لا يمكن حذف طلب إذن تم الموافقة عليه بالفعل. يُرجى إلغاء الموافقة (Revoke) بدلاً من الحذف لتسجيل الحركة في الكشوفات.');
            }

            await this.prisma.hrPermissionRequest.delete({
                where: { id: requestId }
            });

            return { success: true, message: 'تم حذف الطلب بنجاح' };
        } catch (error) {
            console.error('❌ Error deleting permission request:', error);
            throw error;
        }
    }
}

module.exports = new PermissionService();
