/**
 * 💰 Advance Request Service
 * خدمة إدارة السلف
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const auditService = require('./auditService');
const whatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');

class AdvanceService {
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
     * حساب مدة العمل بالأشهر
     */
    calculateEmploymentMonths(hireDate) {
        const joinDate = new Date(hireDate);
        const currentDate = new Date();
        return (currentDate.getFullYear() - joinDate.getFullYear()) * 12 + (currentDate.getMonth() - joinDate.getMonth());
    }

    /**
     * إنشاء طلب سلفة جديد مع التحقق من الشروط
     */
    async createRequest(companyId, data, options = {}) {
        try {
            const { employeeId, amount, reason, repaymentType, installmentsCount } = data;

            // 1. جلب إعدادات السلف
            const settings = await this.prisma.hRSettings.findUnique({
                where: { companyId }
            });

            if (!settings) throw new Error('يرجى ضبط إعدادات الموارد البشرية أولاً');

            // 2. جلب بيانات الموظف (البحث بـ userId والتأكد من عضويته في الشركة)
            const user = await this.prisma.user.findFirst({
                where: {
                    id: employeeId,
                    OR: [
                        { companyId },
                        { userCompanies: { some: { companyId } } }
                    ]
                },
                include: {
                    positionRelation: true,
                    employees: {
                        where: { companyId }
                    }
                }
            });

            if (!user) {
                console.error(`❌ [AdvanceService] User ${employeeId} not found in company ${companyId}`);
                throw new Error('الموظف غير موجود أو لا ينتمي لهذه الشركة');
            }

            const employeeTableRecord = user.employees?.[0] || null;
            const baseSalary = employeeTableRecord?.baseSalary || user.baseSalary || 0;

            console.log(`💰 [AdvanceService] Employee: ${user.firstName} ${user.lastName}, baseSalary: ${baseSalary}`);

            // 3. التحقق من السلف النشطة
            const activeAdvances = await this.prisma.advanceRequest.count({
                where: {
                    userId: user.id,
                    status: 'APPROVED',
                    isPaidOff: false
                }
            });

            if (activeAdvances >= settings.maxActiveAdvances) {
                throw new Error('لديك سلفة نشطة بالفعل. يجب سدادها أولاً');
            }

            // 5. التحقق من الحد الأقصى للمبلغ
            const requestedAmount = parseFloat(amount);

            // ✅ FIX: If baseSalary is 0, skip max-amount check (admin override)
            if (baseSalary > 0) {
                const maxAllowedCheck = (parseFloat(baseSalary) * settings.maxAdvancePercentage) / 100;
                if (requestedAmount > maxAllowedCheck) {
                    throw new Error(`الحد الأقصى للسلفة هو ${maxAllowedCheck.toFixed(2)} جنيه (${settings.maxAdvancePercentage}% من الراتب الأساسي ${baseSalary} جنيه)`);
                }
            } else {
                console.warn(`⚠️ [AdvanceService] baseSalary is 0 for user ${user.id} - skipping max amount check`);
            }

            const maxAllowed = baseSalary > 0
                ? (parseFloat(baseSalary) * settings.maxAdvancePercentage) / 100
                : requestedAmount; // fallback: allow the requested amount

            // 6. التحقق من فترة السداد
            if (repaymentType === 'INSTALLMENTS' && parseInt(installmentsCount) > settings.advanceRepaymentMonths) {
                throw new Error(`الحد الأقصى لفترة السداد هو ${settings.advanceRepaymentMonths} أشهر`);
            }

            // 7. حساب القسط الشهري
            const monthlyAmount = repaymentType === 'INSTALLMENTS'
                ? requestedAmount / parseInt(installmentsCount)
                : requestedAmount;

            // 8. إنشاء الطلب
            const request = await this.prisma.advanceRequest.create({
                data: {
                    companyId,
                    userId: user.id, // ✅ FIX: always use the resolved user.id
                    employeeRelId: employeeTableRecord?.id || null,
                    amount: requestedAmount,
                    reason,
                    repaymentType,
                    installmentsCount: repaymentType === 'INSTALLMENTS' ? parseInt(installmentsCount) : 1,
                    monthlyAmount,
                    employeeSalary: baseSalary,
                    maxAllowedAmount: maxAllowed,
                    installmentAmount: monthlyAmount,
                    remainingBalance: requestedAmount,
                    status: 'PENDING'
                }
            });
            
            console.log('✅ [HR] Advance request created successfully:', {
                id: request.id,
                userId: request.userId,
                amount: request.amount,
                status: request.status
            });

            // Fetch user data separately
            const requestUser = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    avatar: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            });

            // Log Audit
            await auditService.logAction(
                companyId,
                user.id || 'SYSTEM',
                'CREATE',
                'ADVANCE_REQUEST',
                request.id,
                { amount: requestedAmount, installments: installmentsCount }
            );

            console.log('✅ [HR] Advance request created:', request.id);

            // Map user to employee for frontend compatibility
            const result = {
                ...request,
                user: requestUser,
                employee: this.mapUserToEmployee(requestUser)
            };

            // Send WhatsApp Notification
            try {
                if (requestUser && requestUser.phone) {
                    await whatsAppNotificationService.sendLoanNotification(
                        { ...request, companyId },
                        requestUser,
                        'CREATED'
                    );
                }
            } catch (waError) {
                console.error('❌ [Advance-Create] Error sending WhatsApp notification:', waError);
            }

            // Send WhatsApp notification to owner
            setImmediate(async () => {
                try {
                    const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');
                    await hrOwnerNotificationAgent.sendOwnerNotification({
                        companyId,
                        employeeName: requestUser ? `${requestUser.firstName || ''} ${requestUser.lastName || ''}`.trim() : 'موظف',
                        actionId: 'ADVANCE',
                        actionName: 'طلب سلفة مالية',
                        details: `المبلغ المطلوب: ${Math.round(requestedAmount)} جنيه\nطريقة السداد: ${repaymentType === 'INSTALLMENTS' ? 'أقساط' : 'كاش'} - ${installmentsCount} شهر\nالسبب: ${reason || 'غير محدد'}`,
                        requiresApproval: true
                    });
                } catch (waOwnerError) {
                    console.error('❌ [Advance-Owner-Notify] Error:', waOwnerError);
                }
            });

            return result;
        } catch (error) {
            console.error('❌ Error creating advance request:', error);
            throw error;
        }
    }

    /**
     * الموافقة على طلب سلفة
     */
    async approveRequest(companyId, requestId, approvedBy, options = {}) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId },
                include: { user: true }
            });

            if (!request) throw new Error('الطلب غير موجود');
            if (request.status === 'APPROVED' && request.userId === approvedBy) {
                // Allow re-approval if needed, or simply update fields
                // But generally prevent self-approval if strict
            }

            // تحديث حالة الطلب
            const updatedRequest = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedBy,
                    approvedAt: new Date(),
                    rejectedReason: null // Reset rejection reason if it was rejected before
                }
            });

            // 📝 Audit Log
            await auditService.logAction(
                companyId,
                approvedBy,
                'APPROVE',
                'ADVANCE_REQUEST',
                requestId,
                {
                    amount: request.amount,
                    monthlyAmount: request.monthlyAmount,
                    totalSalary: request.employeeSalary
                }
            );

            console.log('✅ [HR] Advance request approved:', requestId);

            // 📢 Send WhatsApp Notification (Background)
            setImmediate(async () => {
                try {
                    if (request.user && request.user.phone) {
                        await whatsAppNotificationService.sendLoanNotification(
                            updatedRequest,
                            request.user,
                            'APPROVED'
                        );
                    }
                } catch (waError) {
                    console.error('❌ [Advance-Approve] Error sending WhatsApp notification:', waError);
                }
            });

            return updatedRequest;
        } catch (error) {
            console.error('❌ Error approving advance request:', error);
            throw error;
        }
    }

    /**
     * رفض طلب سلفة
     */
    async rejectRequest(companyId, requestId, rejectionReason, options = {}) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId },
                include: { user: true }
            });

            if (!request) throw new Error('الطلب غير موجود');
            const updatedRequest = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectedReason: rejectionReason,
                    approvedBy: null, // Reset approval info
                    approvedAt: null
                }
            });

            // 📝 Audit Log
            await auditService.logAction(
                companyId,
                'SYSTEM',
                'REJECT',
                'ADVANCE_REQUEST',
                requestId,
                { reason: rejectionReason }
            );

            console.log('✅ [HR] Advance request rejected:', requestId);

            // 📢 Send WhatsApp Notification (Background)
            setImmediate(async () => {
                try {
                    if (request.user && request.user.phone) {
                        await whatsAppNotificationService.sendLoanNotification(
                            { ...updatedRequest, rejectedReason: rejectionReason },
                            request.user,
                            'REJECTED'
                        );
                    }
                } catch (waError) {
                    console.error('❌ [Advance-Reject] Error sending WhatsApp notification:', waError);
                }
            });

            return updatedRequest;
        } catch (error) {
            console.error('❌ Error rejecting advance request:', error);
            throw error;
        }
    }

    /**
     * جلب طلبات السلف للموظف
     */
    async getMyAdvances(companyId, employeeId, options = {}) {
        try {
            const { limit } = options;
            const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : undefined;
            const requests = await this.prisma.advanceRequest.findMany({
                where: { companyId, userId: employeeId }, // Use userId instead of employeeId
                orderBy: { createdAt: 'desc' },
                ...(safeLimit ? { take: safeLimit } : {})
            });

            // Fetch user data separately
            const user = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            });

            // Fetch approvers if needed
            const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];
            const approvers = approverIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: approverIds } },
                select: { id: true, firstName: true, lastName: true }
            }) : [];
            const approverMap = Object.fromEntries(approvers.map(a => [a.id, a]));

            console.log(`🔍 [HR] Found ${requests.length} advances for employeeId (userId): ${employeeId} in company: ${companyId}`);
            
            return requests.map(req => ({
                ...req,
                user,
                employee: this.mapUserToEmployee(user),
                approver: req.approvedBy ? approverMap[req.approvedBy] : null
            }));
        } catch (error) {
            console.error('❌ Error fetching employee advances:', error);
            throw error;
        }
    }

    /**
     * جلب جميع طلبات السلف
     */
    async getAllAdvances(companyId, options = {}) {
        try {
            const { status, page = 1, limit = 20 } = options;

            const where = { companyId };
            if (status && status !== 'all') where.status = status;

            // ✅ FIX: Collect valid user IDs from BOTH sources:
            // 1. UserCompany table (multi-company members)
            // 2. Users with direct companyId (primary company owners/members)
            const [ucMembers, directMembers] = await Promise.all([
                this.prisma.userCompany.findMany({
                    where: { companyId },
                    select: { userId: true }
                }),
                this.prisma.user.findMany({
                    where: { companyId },
                    select: { id: true }
                })
            ]);

            const ucIds = ucMembers.map(m => m.userId);
            const directIds = directMembers.map(u => u.id);
            // Merge and deduplicate
            const validUserIdList = [...new Set([...ucIds, ...directIds])];

            // Only include advances with valid user IDs that belong to the company
            if (validUserIdList.length > 0) {
                where.userId = { in: validUserIdList };
            } else {
                // No valid users found, return empty result
                return {
                    requests: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                };
            }

            const [requests, total] = await Promise.all([
                this.prisma.advanceRequest.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                this.prisma.advanceRequest.count({ where })
            ]);

            // Fetch all users for these requests
            const userIds = [...new Set(requests.map(r => r.userId).filter(Boolean))];
            const users = userIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    avatar: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            }) : [];
            const userMap = Object.fromEntries(users.map(u => [u.id, u]));

            // Fetch approvers
            const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];
            const approvers = approverIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: approverIds } },
                select: { id: true, firstName: true, lastName: true }
            }) : [];
            const approverMap = Object.fromEntries(approvers.map(a => [a.id, a]));

            // Map user to employee for frontend compatibility
            const mappedRequests = requests.map(req => ({
                ...req,
                user: userMap[req.userId],
                employee: this.mapUserToEmployee(userMap[req.userId]),
                approver: req.approvedBy ? approverMap[req.approvedBy] : null
            }));

            return {
                requests: mappedRequests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching all advances:', error);
            throw error;
        }
    }

    /**
     * حذف طلب سلفة
     */
    async deleteRequest(companyId, requestId, options = {}) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId }
            });

            if (!request) throw new Error('الطلب غير موجود');

            await this.prisma.advanceRequest.delete({
                where: { id: requestId }
            });

            // 📝 Audit Log
            await auditService.logAction(
                companyId,
                'SYSTEM',
                'DELETE',
                'ADVANCE_REQUEST',
                requestId,
                { amount: request.amount }
            );

            console.log('✅ [HR] Advance request deleted:', requestId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting advance request:', error);
            throw error;
        }
    }

    /**
     * تعليم السلفة كمسددة بالكامل
     */
    async markPaidOff(companyId, requestId, markedBy, role) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId },
                include: { user: true }
            });

            if (!request) throw new Error('الطلب غير موجود');

            const updated = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    isPaidOff: true,
                    remainingBalance: 0,
                    status: 'COMPLETED',
                    approvedBy: markedBy ?? request.approvedBy,
                    approvedAt: request.approvedAt || new Date()
                }
            });

            await auditService.logAction(
                companyId,
                markedBy ?? 'SYSTEM',
                'UPDATE',
                'ADVANCE_REQUEST',
                requestId,
                { markPaidOff: true, byRole: role }
            );

            return updated;
        } catch (error) {
            console.error('❌ Error marking advance paid off:', error);
            throw error;
        }
    }
}

module.exports = new AdvanceService();

