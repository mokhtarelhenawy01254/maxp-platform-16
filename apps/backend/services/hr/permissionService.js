/**
 * 🕒 Permission Service
 * خدمة إدارة الأذونات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validatePermissionData } = require('../../utils/hrValidation');
const auditService = require('./auditService');
const { NotFoundError, ValidationError } = require('../../utils/hrErrors');
const whatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');

class PermissionService {
    constructor() {
        // Don't initialize prisma here - get it dynamically
    }

    get prisma() {
        return this._prisma || getSharedPrismaClient();
    }

    /**
     * إنشاء طلب إذن
     */
    async createPermissionRequest(companyId, employeeId, data) {
        try {
            // تطبيع أوقات البداية والنهاية ونوع الإذن
            if (!data.startTime && data.fromTime) data.startTime = data.fromTime;
            if (!data.endTime && data.toTime) data.endTime = data.toTime;
            if (!data.type) data.type = 'NON_DEDUCTIBLE';

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

            // 🕒 فحص مهلة التقديم (48 ساعة على الأقل قبل موعد الإذن)
            const settings = await this.prisma.hRSettings.findUnique({
                where: { companyId }
            });
            const leadDays = (settings?.permissionLeadDays !== undefined && settings?.permissionLeadDays !== null)
                ? Number(settings.permissionLeadDays)
                : 2;
            const minLeadHours = leadDays * 24;

            const requestDateTime = new Date(data.date);
            if (data.startTime) {
                const [h, m] = data.startTime.split(':').map(Number);
                requestDateTime.setHours(h, m, 0, 0);
            } else {
                requestDateTime.setHours(0, 0, 0, 0);
            }

            const now = new Date();
            const diffHours = (requestDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            let isUrgent = Boolean(data.isUrgent || data.isExceptional);
            let notes = data.notes || '';

            if (diffHours < minLeadHours) {
                if (!isUrgent) {
                    throw new ValidationError(`يجب تقديم طلب الإذن قبل الموعد بـ ${minLeadHours} ساعة على الأقل (${leadDays} يوم)`);
                } else {
                    notes = (notes ? notes + ' ' : '') + '[طلب استثنائي بتجاوز مهلة الـ 48 ساعة]';
                }
            }

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

            // تحديد نوع الإذن وخيار التعويض / الخصم
            let type = data.type || 'NON_DEDUCTIBLE';
            let isCompensated = Boolean(data.isCompensated);
            if (data.extraOption === 'compensate') {
                type = 'COMPENSATORY';
                isCompensated = true;
            } else if (data.extraOption === 'deduct') {
                type = 'DEDUCTIBLE';
            }

            const permissionRequest = await this.prisma.hrPermissionRequest.create({
                data: {
                    companyId,
                    employeeId: employee.id,
                    type,
                    date: requestDate,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    totalHours: totalHours,
                    reason: data.reason,
                    details: data.details,
                    notes,
                    attachments: data.attachments,
                    isUrgent,
                    isCompensated,
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
            setImmediate(() => {
                Promise.resolve().then(async () => {
                    const notifyFn = hrOwnerNotificationAgent?.sendOwnerNotification || hrOwnerNotificationAgent?.default?.sendOwnerNotification;
                    if (typeof notifyFn === 'function') {
                        await notifyFn({
                            companyId,
                            employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'موظف',
                            actionType: 'طلب إذن (خروج/تأخير)',
                            details: `التاريخ: ${new Date(requestDate).toLocaleDateString('ar-EG')}\nالوقت: من ${data.startTime} إلى ${data.endTime} (${totalHours} ساعة)\nالسبب: ${data.reason || 'غير محدد'}`,
                            requiresApproval: true
                        });
                    }
                }).catch((waOwnerError) => {
                    console.warn('⚠️ [Permission-Owner-Notify] Error:', waOwnerError.message);
                });
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
    async approvePermissionRequest(companyId, requestId, approverEmployeeId, options = {}) {
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

            const updateData = {
                status: 'APPROVED',
                approvedById: approverEmployeeId,
                approvedAt: new Date()
            };

            if (options.isCompensated !== undefined) {
                updateData.isCompensated = Boolean(options.isCompensated);
                if (options.isCompensated) updateData.type = 'COMPENSATORY';
            }
            if (options.compensationDate) {
                updateData.compensationDate = new Date(options.compensationDate);
            }
            if (options.compensationNotes) {
                updateData.compensationNotes = options.compensationNotes;
            }
            if (options.notes) {
                updateData.notes = options.notes;
            }

            const updated = await this.prisma.hrPermissionRequest.update({
                where: { id: requestId },
                data: updateData,
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
                    type: updated.type,
                    hours: updated.totalHours,
                    date: updated.date,
                    isCompensated: updated.isCompensated
                }
            );

            // ⚠️ فحص تجاوز حد الأذونات الإضافية (4 إذونات بعد استنفاد الـ 120 دقيقة) وإصدار إنذار تلقائي
            try {
                await this.checkAndIssueExtraPermissionWarning(companyId, updated.employeeId, updated.employee?.userId, updated.date);
            } catch (warnErr) {
                console.warn('⚠️ [Permission Service] Error checking extra permission warning:', warnErr.message);
            }

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

    /**
     * ⚠️ فحص تجاوز حد الأذونات الإضافية في الشهر (4 إذونات بعد استنفاد الـ 120 دقيقة المدفوعة) وإصدار إنذار تلقائي
     */
    async checkAndIssueExtraPermissionWarning(companyId, employeeId, userId, date) {
        try {
            const reqDate = new Date(date);
            const month = reqDate.getMonth() + 1;
            const year = reqDate.getFullYear();
            const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
            const monthEnd = new Date(year, month, 0, 23, 59, 59);

            const settings = await this.prisma.hRSettings.findUnique({
                where: { companyId }
            });

            const paidQuota = (settings?.paidPermissionMinutesPerMonth !== undefined && settings?.paidPermissionMinutesPerMonth !== null)
                ? Number(settings.paidPermissionMinutesPerMonth)
                : (companyId === 'h2m-1' ? 120 : 0);

            const warningThreshold = (settings?.permissionWarningAfter !== undefined && settings?.permissionWarningAfter !== null)
                ? Number(settings.permissionWarningAfter)
                : 4;

            if (warningThreshold <= 0) return;

            // جلب الأذونات المعتمدة في هذا الشهر للموظف
            const monthApproved = await this.prisma.hrPermissionRequest.findMany({
                where: {
                    companyId,
                    status: 'APPROVED',
                    date: { gte: monthStart, lte: monthEnd },
                    OR: [
                        { employeeId },
                        ...(userId ? [{ employee: { userId } }] : [])
                    ]
                },
                orderBy: { date: 'asc' }
            });

            let accumulatedMinutes = 0;
            let extraPermissionsCount = 0;

            for (const perm of monthApproved) {
                const mins = perm.minutes !== undefined ? Number(perm.minutes) : Math.round((parseFloat(perm.totalHours) || 0) * 60);
                accumulatedMinutes += mins;
                if (accumulatedMinutes > paidQuota) {
                    extraPermissionsCount++;
                }
            }

            if (extraPermissionsCount >= warningThreshold) {
                let targetUserId = userId;
                if (!targetUserId && this.prisma.employee) {
                    const emp = await this.prisma.employee.findUnique({
                        where: { id: employeeId },
                        select: { userId: true }
                    });
                    targetUserId = emp?.userId;
                }
                if (!targetUserId) return null;

                // التحقق من عدم تكرار الإنذار لنفس الشهر (يُصدر مرة واحدة فقط)
                if (this.prisma.employeeWarning) {
                    const existingWarning = await this.prisma.employeeWarning.findFirst({
                        where: {
                            companyId,
                            userId: targetUserId,
                            title: { contains: 'إنذار تجاوز حد الأذونات الإضافية' },
                            incidentDate: { gte: monthStart, lte: monthEnd }
                        }
                    });

                    if (existingWarning) {
                        return null;
                    }

                    const warning = await this.prisma.employeeWarning.create({
                        data: {
                            companyId,
                            userId: targetUserId,
                            type: 'ATTENDANCE',
                            warningType: 'PERMISSIONS_EXCEEDED',
                            severity: 'minor',
                            title: 'إنذار تجاوز حد الأذونات الإضافية الشهري',
                            description: `تم إصدار إنذار تلقائي لتجاوز الحد الأقصى للأذونات الإضافية (${extraPermissionsCount} إذونات بعد استنفاد رصيد الـ ${paidQuota} دقيقة المدفوعة) لشهر ${month}/${year}.`,
                            incidentDate: new Date(),
                            actionTaken: 'إنذار تلقائي',
                            issuedBy: 'SYSTEM'
                        }
                    });
                    console.log(`⚠️ [Permission] Auto-warning created for employee ${targetUserId}: ${extraPermissionsCount} extra permissions in month ${month}`);
                    return warning;
                }
            }
            return null;
        } catch (err) {
            console.warn('⚠️ [Permission] Error in checkAndIssueExtraPermissionWarning:', err.message);
            return null;
        }
    }
}

module.exports = new PermissionService();
