/**
 * 🔄 Order Workflow & Status Permissions Service
 * خدمة إدارة مسار حالات الطلبات والصلاحيات
 */

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
const { VALID_ORDER_STATUSES } = require('../utils/constants');

class OrderWorkflowService {
    constructor() {
        // Shared prisma client
    }

    get prisma() {
        const client = getSharedPrismaClient();
        if (!client) {
            throw new Error('Prisma client is not initialized.');
        }
        return client;
    }

    /**
     * Get workflow configuration for a company
     */
    async getConfig(companyId) {
        return await this.prisma.orderWorkflowConfig.upsert({
            where: { companyId },
            update: {},
            create: { companyId, enabled: false }
        });
    }

    /**
     * Update workflow configuration
     */
    async updateConfig(companyId, data) {
        return await this.prisma.orderWorkflowConfig.upsert({
            where: { companyId },
            update: data,
            create: { ...data, companyId }
        });
    }

    /**
     * Get all status definitions
     */
    async getStatuses(companyId) {
        return await this.prisma.orderStatusDefinition.findMany({
            where: { companyId },
            orderBy: { sortOrder: 'asc' }
        });
    }

    /**
     * Create or update status definition
     */
    async upsertStatus(companyId, data) {
        const { id, ...rest } = data;
        if (id) {
            return await this.prisma.orderStatusDefinition.update({
                where: { id, companyId },
                data: rest
            });
        }
        return await this.prisma.orderStatusDefinition.create({
            data: { ...rest, companyId }
        });
    }

    /**
     * Delete status definition
     */
    async deleteStatus(companyId, statusId) {
        const linkedTransitions = await this.prisma.orderWorkflowTransition.count({
            where: {
                companyId,
                OR: [
                    { fromStatusId: statusId },
                    { toStatusId: statusId }
                ]
            }
        });

        if (linkedTransitions > 0) {
            throw new Error('لا يمكن حذف هذه الحالة لأنها مرتبطة بقواعد انتقال نشطة. قم بحذف قواعد الانتقال أولاً.');
        }

        return await this.prisma.orderStatusDefinition.delete({
            where: { id: statusId, companyId }
        });
    }

    /**
     * Find status by code
     */
    async findStatusByCode(companyId, code) {
        return await this.prisma.orderStatusDefinition.findFirst({
            where: { companyId, code: code.toUpperCase() }
        });
    }

    /**
     * Seed default system statuses as OrderStatusDefinition records
     */
    async seedDefaultStatuses(companyId) {
        const existing = await this.prisma.orderStatusDefinition.findMany({
            where: { companyId },
            select: { code: true }
        });
        const existingCodes = new Set(existing.map(s => s.code.toUpperCase()));

        const defaults = [
            { code: 'DRAFT', name: 'مسودة', color: '#9CA3AF', sortOrder: 5 },
            { code: 'PENDING', name: 'معلق', color: '#EAB308', sortOrder: 10 },
            { code: 'CONFIRMED', name: 'مؤكد', color: '#3B82F6', sortOrder: 20 },
            { code: 'SCHEDULED', name: 'مجدول', color: '#6366F1', sortOrder: 25 },
            { code: 'READY_FOR_PROCESSING', name: 'جاهز للمعالجة', color: '#06B6D4', sortOrder: 27 },
            { code: 'PROCESSING', name: 'قيد المعالجة', color: '#2563EB', sortOrder: 30, notifyCustomer: true },
            { code: 'PENDING_PREPARATION', name: 'بانتظار التجهيز', color: '#EAB308', sortOrder: 33 },
            { code: 'PREPARING', name: 'قيد التجهيز', color: '#3B82F6', sortOrder: 35 },
            { code: 'QUALITY_CHECK', name: 'فحص الجودة', color: '#6366F1', sortOrder: 40 },
            { code: 'PACKAGED', name: 'تم التعبئة', color: '#14B8A6', sortOrder: 45 },
            { code: 'READY', name: 'جاهز', color: '#22C55E', sortOrder: 47 },
            { code: 'ON_HOLD_PREP', name: 'تجهيز معلق', color: '#EAB308', sortOrder: 48 },
            { code: 'STOCK_SHORTAGE', name: 'عجز مخزون', color: '#EF4444', sortOrder: 49 },
            { code: 'SHORTAGE_FAILED', name: 'عجز نهائي', color: '#7C3AED', sortOrder: 495 },
            { code: 'READY_TO_SHIP', name: 'جاهز للشحن', color: '#22C55E', sortOrder: 50 },
            { code: 'SHIPPED', name: 'تم الشحن', color: '#A855F7', sortOrder: 60, notifyCustomer: true },
            { code: 'NOT_SHIPPED', name: 'لم يتم الشحن', color: '#6B7280', sortOrder: 65 },
            { code: 'OUT_FOR_DELIVERY', name: 'خرج للتسليم', color: '#A855F7', sortOrder: 70 },
            { code: 'PARTIALLY_DELIVERED', name: 'تسليم جزئي', color: '#22C55E', sortOrder: 80 },
            { code: 'DELIVERED', name: 'تم التسليم', color: '#22C55E', sortOrder: 90, notifyCustomer: true, isTerminal: true },
            { code: 'PARTIALLY_RETURNED', name: 'مرتجع جزئي', color: '#F97316', sortOrder: 100, notifyCustomer: true },
            { code: 'RETURNED', name: 'مرتجع', color: '#EF4444', sortOrder: 110, notifyCustomer: true },
            { code: 'EXCHANGED', name: 'مستبدل', color: '#14B8A6', sortOrder: 120, notifyCustomer: true },
            { code: 'PARTIALLY_REFUNDED', name: 'مسترجع جزئي', color: '#EC4899', sortOrder: 130 },
            { code: 'REFUNDED', name: 'تم الاسترداد', color: '#EC4899', sortOrder: 140, notifyCustomer: true, isTerminal: true },
            { code: 'CANCELLED', name: 'ملغي', color: '#EF4444', sortOrder: 150, notifyCustomer: true, isTerminal: true },
            { code: 'DUPLICATE_ORDER', name: 'طلب مكرر', color: '#F97316', sortOrder: 155 },
            { code: 'ON_HOLD', name: 'معلق (استثناء)', color: '#EAB308', sortOrder: 160 },
            { code: 'LOST', name: 'مفقود', color: '#EF4444', sortOrder: 170, isTerminal: true },
            { code: 'TRASH', name: 'محذوف', color: '#EF4444', sortOrder: 175 },
        ];

        const created = [];
        for (const def of defaults) {
            if (existingCodes.has(def.code)) continue;
            const status = await this.prisma.orderStatusDefinition.create({
                data: { ...def, companyId }
            });
            created.push(status);
        }
        return created;
    }

    /**
     * Get all transition rules
     */
    async getTransitions(companyId) {
        return await this.prisma.orderWorkflowTransition.findMany({
            where: { companyId },
            include: {
                fromStatus: true,
                toStatus: true
            }
        });
    }

    /**
     * Create or update transition rule
     */
    async upsertTransition(companyId, data) {
        const { id, ...rest } = data;

        if (rest.fromStatusId === '') {
            rest.fromStatusId = null;
        }

        if (id) {
            return await this.prisma.orderWorkflowTransition.update({
                where: { id, companyId },
                data: rest
            });
        } else {
            return await this.prisma.orderWorkflowTransition.create({
                data: { ...rest, companyId }
            });
        }
    }

    /**
     * Delete transition rule
     */
    async deleteTransition(companyId, transitionId) {
        return await this.prisma.orderWorkflowTransition.delete({
            where: { id: transitionId, companyId }
        });
    }

    /**
     * 🛡️ Validate status change rules and optionally execute them
     */
    async evaluateStatusChange(companyId, orderId, userId, statusOrId, reason = null, isOverride = false, existingOrder = null, execute = false) {
        return await executeWithRetry(async () => {
            // 1. Get Order and Current Status - Optimized to use pre-fetched order
            const order = existingOrder || await this.prisma.order.findUnique({
                where: { id: orderId, companyId },
                include: { company: { include: { orderWorkflowConfig: true } } }
            });

            if (!order) throw new Error('الطلب غير موجود');

            // Ensure we have the workflow config if order was passed without it
            const config = order.company?.orderWorkflowConfig ||
                (await this.prisma.orderWorkflowConfig.findUnique({ where: { companyId } }));
            if (!config || !config.enabled) {
                return { success: false, reason: 'workflow_disabled' };
            }

            // 2. Get Status Definitions
            const currentStatusDef = await this.prisma.orderStatusDefinition.findFirst({
                where: { companyId, code: order.status }
            });

            // Try finding by ID first (scoped to this company so a status id
            // from another company can never be resolved), then by Code
            let nextStatusDef = await this.prisma.orderStatusDefinition.findFirst({
                where: { id: statusOrId, companyId }
            }).catch(() => null);

            // ⚡ FIX: Since statusOrId might have been uppercased by upstream handlers,
            // also try finding it as a lowercased ID (CUIDs are lowercase)
            if (!nextStatusDef && statusOrId) {
                nextStatusDef = await this.prisma.orderStatusDefinition.findFirst({
                    where: { id: statusOrId.toLowerCase(), companyId }
                }).catch(() => null);
            }

            if (!nextStatusDef) {
                nextStatusDef = await this.findStatusByCode(companyId, statusOrId);
            }

            if (!nextStatusDef) {
                if (VALID_ORDER_STATUSES.includes(statusOrId?.toUpperCase())) {
                    nextStatusDef = { id: statusOrId.toUpperCase(), code: statusOrId.toUpperCase(), name: statusOrId.toUpperCase(), isSystemFallback: true };
                }
            }

            if (!nextStatusDef) throw new Error(`الحالة المستهدفة "${statusOrId}" غير موجودة في تعريفات المسار`);

            // 3. Check for User Permissions/Role
            const userCompany = await this.prisma.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId } }
            });

            // Fall back to the user's global role (e.g. SUPER_ADMIN) when no
            // company-scoped record exists – this avoids a spurious 400 for
            // admins operating via effectiveCompanyId.
            let userRole = userCompany?.role;
            if (!userRole) {
                const globalUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
                userRole = globalUser?.role || null;
            }

            if (!userRole) throw new Error('المستخدم غير مصرح له لهذه الشركة');

            // 4. Handle OVERRIDE
            let auditType = 'normal';
            if (isOverride) {
                // Check if override is allowed in config
                if (config.allowOverride === false) {
                    throw new Error('صلاحية التجاوز (Override) معطلة حالياً من إعدادات المسار');
                }
                // Check if user has override permission
                const overrideRoles = config.overrideRoles
                    ? JSON.parse(config.overrideRoles)
                    : ['OWNER', 'SUPER_ADMIN'];
                const canOverride = overrideRoles.includes(userRole) || overrideRoles.includes(userId);
                if (!canOverride) throw new Error('عذراً، لا تملك صلاحية تجاوز قيود المسار (Override)');

                auditType = 'override';
            }

            // 5. Check if CURRENT status is LOCKED
            if (!isOverride && currentStatusDef && currentStatusDef.lockAfterEntry) {
                throw new Error(`الحالة الحالية (${currentStatusDef.name}) مغلقة، لا يمكن التغيير منها إلا لصلاحية التجاوز (Override)`);
            }

            // 6. Find Transition Rule
            let transition = await this.prisma.orderWorkflowTransition.findFirst({
                where: {
                    companyId,
                    fromStatusId: currentStatusDef ? currentStatusDef.id : null,
                    toStatusId: nextStatusDef.id
                }
            });

            // If target is a system fallback (no custom definition), also search by status code
            if (!transition && nextStatusDef.isSystemFallback) {
                const matchingDbStatus = await this.findStatusByCode(companyId, nextStatusDef.code);
                if (matchingDbStatus) {
                    nextStatusDef = matchingDbStatus;
                    transition = await this.prisma.orderWorkflowTransition.findFirst({
                        where: {
                            companyId,
                            fromStatusId: currentStatusDef ? currentStatusDef.id : null,
                            toStatusId: matchingDbStatus.id
                        }
                    });
                }
            }

            if (!isOverride && !transition && config.enforceTransitions) {
                throw new Error(`هذا الانتقال من "${currentStatusDef?.name || 'بداية'}" إلى "${nextStatusDef.name}" غير مسموح به في إعدادات المسار`);
            }

            // 7. Check Role Permission in Transition
            if (!isOverride && transition) {
                const allowedRoles = JSON.parse(transition.allowedRoles || '[]');
                if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && !allowedRoles.includes(userId)) {
                    throw new Error('دورك الحالي لا يملك صلاحية تنفيذ هذا الانتقال');
                }
            }

            // 8. Check Approval requirement
            if (!isOverride) {
                const needsApproval =
                    (transition && transition.requiresApproval) ||
                    (currentStatusDef && currentStatusDef.requiresApprovalToExit) ||
                    (config.requireApprovalByDefault && (!transition || transition.requiresApproval !== false));

                if (needsApproval) {
                    const approvalRequest = await this.createApprovalRequest(companyId, orderId, userId, currentStatusDef?.id, nextStatusDef.id, reason);
                    return { status: 'pending', requestId: approvalRequest.id };
                }
            }

            const auditLog = {
                fromStatusId: currentStatusDef?.id || null,
                toStatusId: nextStatusDef.id,
                changedBy: userId,
                changeType: auditType,
                reason
            };

            if (!execute) {
                return { status: 'allowed', nextStatusCode: nextStatusDef.code, auditLog };
            }

            // 9. If allowed, actually update the order and log the audit
            // 🛡️ PRODUCTION-FIX (custom-status-enum): أكواد orderStatusDefinition ممكن
            // تكون أكواد مخصصة (مش enum) — الكتابة المباشرة كانت بتكسر prisma. بنحلّها
            // عبر resolveOrderStatusForStorage وبتخزين الكود المخصص جنب الـ enum.
            const { resolveOrderStatusForStorage } = require('../utils/orderStatusEnum');
            const wfResolved = await resolveOrderStatusForStorage(this.prisma, companyId, nextStatusDef.code);
            const wfStored = wfResolved.stored || order.status; // لا نكسر التحديث لو الحالة غير قابلة للتخزين
            await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: wfStored,
                    customStatusCode: wfResolved.stored && wfResolved.notify !== wfResolved.stored
                        ? wfResolved.notify
                        : null
                }
            });

            // 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2):
            // هذا المسار يتجاوز updateOrderStatus → يزامن metadata.preparationStatus يدوياً
            // حتى تظهر التغييرات على طابور التحضير (preparationQueueService يقرأ metadata).
            try {
                const orderService = require('./orderService');
                await orderService.syncPreparationMetadata(order.id, nextStatusDef.code, this.prisma);
            } catch (prepErr) {
                console.warn(`[WORKFLOW] metadata sync failed for ${order.id}:`, prepErr.message);
            }

            if (auditLog) {
                await this.logAudit(companyId, order.id, auditLog.fromStatusId, auditLog.toStatusId, auditLog.changedBy, auditLog.changeType, auditLog.reason);
            }

            // 🔔 Trigger WhatsApp Notification (fire-and-forget)
            this.sendWorkflowNotification(companyId, order, nextStatusDef.code)
                .then(() => console.log(`✅ [WORKFLOW-BG-SUCCESS] Notification for ${order.orderNumber}`))
                .catch(e => console.error(`❌ [WORKFLOW-BG-ERROR] Notification failed: ${e.message}`));

            return { status: 'allowed', nextStatusCode: nextStatusDef.code, auditLog };
        });
    }

    /**
     * 🛡️ Validate status change rules without mutating the order row
     */
    async validateStatusChange(companyId, orderId, userId, statusOrId, reason = null, isOverride = false, existingOrder = null) {
        return await this.evaluateStatusChange(
            companyId,
            orderId,
            userId,
            statusOrId,
            reason,
            isOverride,
            existingOrder,
            false
        );
    }

    /**
     * ✅ Validate and execute status change
     */
    async requestStatusChange(companyId, orderId, userId, statusOrId, reason = null, isOverride = false, existingOrder = null) {
        return await this.evaluateStatusChange(
            companyId,
            orderId,
            userId,
            statusOrId,
            reason,
            isOverride,
            existingOrder,
            true
        );
    }

    /**
     * Log Audit Trail
     */
    async logAudit(companyId, orderId, fromStatusId, toStatusId, userId, type, reason, approvedBy = null) {
        return await this.prisma.orderWorkflowAuditLog.create({
            data: {
                companyId,
                orderId,
                fromStatusId,
                toStatusId,
                changedBy: userId, // ⚡ FIXED: Mapping to correct field name in schema
                changeType: type,
                reason,
                approvedBy: approvedBy
            }
        });
    }

    /**
     * Create an Approval Request
     */
    async createApprovalRequest(companyId, orderId, userId, fromStatusId, toStatusId, reason) {
        return await this.prisma.orderStatusChangeRequest.create({
            data: {
                companyId,
                orderId,
                requestedBy: userId,
                fromStatusId,
                toStatusId,
                reason,
                status: 'pending'
            },
            include: {
                toStatus: true,
                requestor: { select: { firstName: true, lastName: true } }
            }
        });
    }

    /**
     * Handle Approval or Rejection
     */
    async handleApproval(companyId, requestId, userId, action, reviewReason = null) {
        // 🛡️ PRODUCTION-FIX (workflow-approval-findunique): findUnique بـ {id, companyId}
        // كان بيرمي Prisma validation error (تركيبة غير unique) → كل الموافقات كانت
        // بتفشل بـ 500. findFirst هو الصح لنطاق الشركة.
        const request = await this.prisma.orderStatusChangeRequest.findFirst({
            where: { id: requestId, companyId },
            include: { order: true, toStatus: true }
        });

        if (!request) throw new Error('طلب الموافقة غير موجود');
        if (request.status !== 'pending') throw new Error('تمت معالجة هذا الطلب مسبقاً');

        // permission check for reviewer
        const reviewer = await this.prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } }
        });

        // Fall back to the user's global role (e.g. SUPER_ADMIN operating via
        // effectiveCompanyId, or a user removed from the company) so we return
        // a clear permission error instead of a TypeError on a null record.
        let reviewerRole = reviewer?.role;
        if (!reviewerRole) {
            const globalUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
            reviewerRole = globalUser?.role || null;
        }
        if (!reviewerRole || !['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(reviewerRole)) {
            throw new Error('لا تملك صلاحية مراجعة طلبات تغيير الحالة');
        }

        if (action === 'approve') {
            // 1. Update the order
            // 🛡️ PRODUCTION-FIX (custom-status-enum): كود toStatus ممكن يكون مخصص —
            // نحلّه قبل الكتابة على عمود الـ enum ونخزّن الكود المخصص جنبه.
            const { resolveOrderStatusForStorage } = require('../utils/orderStatusEnum');
            const apprResolved = await resolveOrderStatusForStorage(this.prisma, companyId, request.toStatus.code);
            const apprStored = apprResolved.stored || request.order.status;
            await this.prisma.order.update({
                where: { id: request.orderId },
                data: {
                    status: apprStored,
                    customStatusCode: apprResolved.stored && apprResolved.notify !== apprResolved.stored
                        ? apprResolved.notify
                        : null
                }
            });

            // 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2):
            // هذا المسار يتجاوز updateOrderStatus → يزامن metadata.preparationStatus يدوياً
            // حتى تظهر التغييرات على طابور التحضير.
            try {
                const orderService = require('./orderService');
                await orderService.syncPreparationMetadata(request.orderId, request.toStatus.code, this.prisma);
            } catch (prepErr) {
                console.warn(`[WORKFLOW] metadata sync failed for ${request.orderId}:`, prepErr.message);
            }

            // 2. Log Audit
            await this.logAudit(
                companyId,
                request.orderId,
                request.fromStatusId,
                request.toStatusId,
                request.requestedBy,
                'approval',
                request.reason,
                userId // approvedBy
            );

            // 🔔 Trigger WhatsApp Notification for approval
            try {
                const order = await this.prisma.order.findUnique({
                    where: { id: request.orderId },
                    include: { customer: true }
                });
                // 🔔 Trigger WhatsApp Notification for approval (fire-and-forget)
                this.sendWorkflowNotification(companyId, order, request.toStatus.code)
                    .then(() => console.log(`✅ [WORKFLOW-BG-SUCCESS] Notification for ${order.orderNumber}`))
                    .catch(e => console.error(`❌ [WORKFLOW-BG-ERROR] Notification failed: ${e.message}`));
            } catch (notifyErr) {
                console.error('Error sending approval notification:', notifyErr);
            }

            // 3. Update request status
            return await this.prisma.orderStatusChangeRequest.update({
                where: { id: requestId },
                data: {
                    status: 'approved',
                    reviewedBy: userId,
                    reviewedAt: new Date(),
                    metadata: reviewReason
                }
            });
        } else {
            // Reject
            return await this.prisma.orderStatusChangeRequest.update({
                where: { id: requestId },
                data: {
                    status: 'rejected',
                    reviewedBy: userId,
                    reviewedAt: new Date(),
                    metadata: reviewReason
                }
            });
        }
    }

    /**
     * 🔔 Send WhatsApp Notification based on Status
     */
    async sendWorkflowNotification(companyId, order, statusCode) {
        try {
            console.log(`[WORKFLOW-NOTIFY] Sending notification for status: ${statusCode} for order: ${order.orderNumber}`);

            // Map workflow codes to notification event types
            const eventMap = {
                'CREATED': 'ORDER_CREATED',
                'CONFIRMED': 'ORDER_CONFIRMED',
                'PENDING_PREPARATION': 'ORDER_PROCESSING',
                'PREPARING': 'ORDER_PROCESSING',
                'PROCESSING': 'ORDER_PROCESSING',
                'SHIPPED': 'ORDER_SHIPPED',
                'OUT_FOR_DELIVERY': 'ORDER_OUT_FOR_DELIVERY',
                'DELIVERED': 'ORDER_DELIVERED',
                'CANCELLED': 'ORDER_CANCELLED',
                'RETURNED': 'ORDER_RETURNED',
                'REFUNDED': 'ORDER_REFUNDED'
            };

            // Try map, if not found use directly (for new 82 statuses where code == eventType)
            const eventType = eventMap[statusCode.toUpperCase()] || statusCode.toUpperCase();

            console.log(`[WORKFLOW-NOTIFY] Determined eventType: ${eventType}`);

            // Get status definition for localized name (if available) - ⚡ FIXED: Load from DB if not in memory
            const statusDef = await this.prisma.orderStatusDefinition.findFirst({
                where: { companyId, code: statusCode.toUpperCase() }
            });

            // 🛑 Check if notifications are enabled for this status
            if (statusDef && statusDef.notifyCustomer === false) {
                console.log(`[WORKFLOW-NOTIFY] Notifications disabled for status: ${statusCode} (notifyCustomer=false)`);
                return;
            }

            const statusLabel = statusDef ? statusDef.name : statusCode;

            // Get customer info from order
            const phone = order.customerPhone || (order.customer ? order.customer.phone : null);
            const name = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : (order.guestName || 'عميلنا العزيز');

            if (!phone) {
                console.log(`[WORKFLOW-NOTIFY] No phone number found for order: ${order.orderNumber}`);
                return;
            }

            // 📦 Format order items (Enhanced logic)
            let orderItemsText = '';
            const items = order.items || order.orderItems || [];
            if (items.length > 0) {
                orderItemsText = '\n📋 تفاصيل الطلب:\n';
                items.forEach((item, index) => {
                    const color = item.productColor || item.color || (item.attributes ? item.attributes.color : '');
                    const size = item.productSize || item.size || (item.attributes ? item.attributes.size : '');
                    let itemDetails = `${index + 1}. ${item.productName || item.name}`;
                    if (color) itemDetails += ` | اللون: ${color}`;
                    if (size) itemDetails += ` | المقاس: ${size}`;
                    itemDetails += ` | الكمية: ${item.quantity || 1}`;
                    orderItemsText += itemDetails + '\n';
                });
                orderItemsText += '------------------------------\n';
            }

            // Prepare dynamic variables
            // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): نطاق التتبع من
            // getCompanyBranding (DB) بدل هاردكود شركة محددة.
            const { getCompanyBranding } = require('../utils/companyBranding');
            const branding = await getCompanyBranding(companyId);
            const variables = {
                customerName: name,
                orderNumber: order.orderNumber,
                orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG'),
                orderItems: orderItemsText,
                total: order.total?.toString() || '0',
                currency: order.currency || 'EGP',
                status: statusLabel,
                statusCode: statusCode,
                trackingNumber: order.turboTrackingNumber || 'غير متوفر حالياً',
                estimatedDays: '2-3',
                trackingLink: `https://${branding.domain}/track/${order.orderNumber}`,
                orderId: order.id
            };

            // ✅ Check for duplicate notification (وحّدت عبر isDuplicateNotification §3.1 —
            // تطابق تام على eventType المُحوّل، لا contains لتفادي STATUS_1/STATUS_10)
            const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
                companyId,
                orderId: order.id,
                eventType,
            });

            if (recentNotification) {
              console.log(`⚠️ [WORKFLOW-NOTIFY] Duplicate notification blocked for Order: ${order.orderNumber}, Status: ${statusCode}`);
            } else {
              await WhatsAppNotificationService.sendNotification({
                  companyId,
                  recipientPhone: phone,
                  recipientName: name,
                  recipientType: 'CUSTOMER',
                  category: 'ORDERS',
                  eventType,
                  fallbackEventType: statusCode.toUpperCase(),
                  variables,
                  orderId: order.id
              });
              console.log(`✅ [WORKFLOW-NOTIFY] Notification sent for Order: ${order.orderNumber}, Status: ${statusCode}`);
            }

            // 🚀 Enroll in Post-Delivery Journey if status is Delivered
            if (statusCode.toUpperCase() === 'DELIVERED') {
                const WhatsAppJourneyService = require('./whatsapp/WhatsAppJourneyService');
                WhatsAppJourneyService.enrollCustomer(companyId, order.customerId, order.id)
                    .then(() => console.log(`🚀 [JOURNEY] Target enrollment success for ${order.orderNumber}`))
                    .catch(e => console.error(`❌ [JOURNEY] Enrollment error: ${e.message}`));
            } else if (['CANCELLED', 'RETURNED', 'REFUNDED'].includes(statusCode.toUpperCase())) {
                // Cancel active journeys for this order
                try {
                    const { getSharedPrismaClient } = require('./sharedDatabase');
                    const prisma = getSharedPrismaClient();
                    await prisma.customerJourney.updateMany({
                        where: {
                            companyId,
                            orderId: order.id,
                            status: 'ACTIVE'
                        },
                        data: {
                            status: 'COMPLETED', // Or we could add a CANCELLED status, but COMPLETED stops the flow
                            logs: `Journey cancelled due to order status: ${statusCode} at ${new Date().toISOString()}`
                        }
                    });
                    console.log(`🛑 [JOURNEY] Cancelled active journeys for order: ${order.orderNumber} due to status: ${statusCode}`);
                } catch (cancelErr) {
                    console.error(`❌ [JOURNEY] Error cancelling journeys: ${cancelErr.message}`);
                }
            }

            console.log(`✅ [WORKFLOW-NOTIFY] Notification sent successfully for status: ${statusCode}`);
        } catch (error) {
            console.error('❌ [WORKFLOW-NOTIFY] Error:', error);
        }
    }

    /**
     * Get Audit Logs for an order
     */
    async getOrderAuditLogs(companyId, orderIdOrNumber) {
        // Try finding by order number if it looks like one
        let targetOrderId = orderIdOrNumber;

        // If it's a short string, it might be an order number
        if (orderIdOrNumber.length < 20) {
            const order = await this.prisma.order.findFirst({
                where: { companyId, orderNumber: orderIdOrNumber },
                select: { id: true }
            });
            if (order) targetOrderId = order.id;
        }

        return await this.prisma.orderWorkflowAuditLog.findMany({
            where: {
                companyId,
                orderId: targetOrderId
            },
            include: {
                fromStatus: true,
                toStatus: true,
                order: { select: { orderNumber: true } },
                user: { select: { firstName: true, lastName: true } },
                approver: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }

    /**
     * Get Global Audit Logs
     * Supports OrderStatusHistory, OrderWorkflowAuditLog (overrides), and ReturnActivityLog (returns)
     * Includes guest orders, excludes import noise, accurate DB-level filtered totals, tiebreaker & cursor pagination
     */
    async getGlobalAuditLogs(companyId, limit = 20, offset = 0, filters = {}) {
        const userId = typeof filters === 'string' ? filters : filters?.userId;
        const changeType = typeof filters === 'object' ? filters?.changeType : null;
        const orderNumber = typeof filters === 'object' ? filters?.orderNumber : null;
        const startDate = typeof filters === 'object' ? filters?.startDate : null;
        const endDate = typeof filters === 'object' ? filters?.endDate : null;
        const cursor = typeof filters === 'object' ? filters?.cursor : null;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 🛡️ Requirement 9: Fetch company's custom status definitions
        const companyStatuses = await this.getStatuses(companyId).catch(() => []);
        const statusMap = new Map();
        if (Array.isArray(companyStatuses)) {
            companyStatuses.forEach(s => {
                if (s?.code) {
                    const raw = s.code.toUpperCase().trim();
                    statusMap.set(raw, s);
                    statusMap.set(raw.replace(/[-_]/g, '_'), s);
                    statusMap.set(raw.replace(/[-_]/g, '-'), s);
                }
            });
        }

        // 🛡️ Requirement 9: Comprehensive Arabic status names map
        const statusArabicNames = {
            NEW: 'طلب جديد',
            PENDING: 'قيد الانتظار',
            CONFIRMED: 'مؤكد',
            PROCESSING: 'قيد التجهيز',
            PREPARING: 'قيد التجهيز',
            QUALITY_CHECK: 'فحص الجودة',
            PACKAGED: 'تم التعبئة',
            READY_TO_SHIP: 'جاهز للشحن',
            READY: 'جاهز للشحن',
            SHIPPED: 'تم الشحن',
            OUT_FOR_DELIVERY: 'خرج للتسليم',
            DELIVERED: 'تم التسليم',
            CANCELLED: 'ملغي',
            CANCELED: 'ملغي',
            RETURNED: 'مرتجع',
            PARTIALLY_RETURNED: 'مرتجع جزئي',
            PARTIALLY_DELIVERED: 'تسليم جزئي',
            EXCHANGED: 'استبدال',
            ON_HOLD: 'معلق',
            SCHEDULED: 'طلب مجدول',
            DRAFT: 'مسودة',
            FAILED: 'فشل الدفع',
            COMPLETED: 'مكتمل',

            // Extended platform statuses (Requirement 9)
            BDONKODTERBO: 'بدون كود تيربو',
            'DELAYED-WITH-CAPTAIN': 'مؤجل مع المندوب',
            DELAYED_WITH_CAPTAIN: 'مؤجل مع المندوب',
            ON_HOLD_PREP: 'معلق في التجهيز',
            STOCK_SHORTAGE: 'نقص في المخزون',
            PENDING_PREPARATION: 'بانتظار التجهيز',
            DUPLICATE_ORDER: 'طلب مكرر',
            TRASH: 'سلة المحذوفات',
            REFUNDED: 'مسترد',
            SHORTAGE_FAILED: 'فشل نقص المخزون',
            PARTIALLY_REFUNDED: 'مسترد جزئياً',
            LOST: 'مفقود',
            REJECTED: 'مرفوض',
            RETURN_REQUESTED: 'طلب استرجاع',
            RETURN_RECEIVED: 'تم استلام المرتجع',
            RETURN_APPROVED: 'تمت الموافقة على المرتجع',
            RETURN_REJECTED: 'رفض المرتجع',
            WAITING_FOR_ACTION: 'بانتظار إجراء',
            IN_TRANSIT: 'في الطريق',
            RESCHEDULED: 'تمت إعادة الجدولة',
            SHIPPING: 'قيد الشحن',
            PAID: 'مدفوع',
            UNPAID: 'غير مدفوع',
            RETURN_REQ: 'طلب إرجاع'
        };

        // 🛡️ Requirement 9: Status colors map (defaults to neutral #71717A instead of blue)
        const statusColors = {
            CONFIRMED: '#2563EB',
            PROCESSING: '#4F46E5',
            PREPARING: '#0284C7',
            PENDING_PREPARATION: '#0284C7',
            QUALITY_CHECK: '#0891B2',
            PACKAGED: '#0D9488',
            READY_TO_SHIP: '#16A34A',
            READY: '#16A34A',
            SHIPPED: '#9333EA',
            IN_TRANSIT: '#9333EA',
            SHIPPING: '#9333EA',
            OUT_FOR_DELIVERY: '#059669',
            DELIVERED: '#15803D',
            COMPLETED: '#15803D',
            CANCELLED: '#DC2626',
            CANCELED: '#DC2626',
            RETURNED: '#E11D48',
            RETURN_REQUESTED: '#E11D48',
            RETURN_RECEIVED: '#BE123C',
            RETURN_APPROVED: '#059669',
            RETURN_REJECTED: '#DC2626',
            RETURN_REQ: '#E11D48',
            PARTIALLY_RETURNED: '#BE123C',
            PARTIALLY_DELIVERED: '#10B981',
            ON_HOLD: '#EA580C',
            ON_HOLD_PREP: '#EA580C',
            SCHEDULED: '#D97706',
            RESCHEDULED: '#D97706',
            PENDING: '#CA8A04',
            NEW: '#3B82F6',
            REFUNDED: '#10B981',
            PARTIALLY_REFUNDED: '#059669',
            LOST: '#DC2626',
            SHORTAGE_FAILED: '#DC2626',
            STOCK_SHORTAGE: '#EF4444',
            TRASH: '#71717A',
            DUPLICATE_ORDER: '#64748B',
            BDONKODTERBO: '#71717A',
            'DELAYED-WITH-CAPTAIN': '#F59E0B',
            DELAYED_WITH_CAPTAIN: '#F59E0B',
            WAITING_FOR_ACTION: '#F59E0B',
            REJECTED: '#DC2626'
        };

        const resolveStatus = (rawCode) => {
            if (!rawCode || rawCode.trim() === '') {
                return { code: '', name: 'البداية', color: '#71717A' };
            }
            const clean = rawCode.trim().toUpperCase();
            const normalizedKey = clean.replace(/[-_]/g, '_');
            const hyphenKey = clean.replace(/[-_]/g, '-');

            const def = statusMap.get(clean) || statusMap.get(normalizedKey) || statusMap.get(hyphenKey);
            const name = def?.name
                || statusArabicNames[clean]
                || statusArabicNames[normalizedKey]
                || statusArabicNames[hyphenKey]
                || `حالة (${rawCode.trim()})`;

            // 🛡️ Requirement 9: Neutral gray #71717A fallback when color is undefined, NOT bright blue
            const color = def?.color
                || statusColors[clean]
                || statusColors[normalizedKey]
                || statusColors[hyphenKey]
                || '#71717A';

            return { code: rawCode, name, color };
        };

        const resolveActor = (changedBy, userName, matchedUser) => {
            let displayName = userName?.trim() || '';
            if (matchedUser) {
                const full = `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim();
                if (full) displayName = full;
            }
            // 🛡️ Requirement 4: Zero rows with actor named 'User' alone!
            if (!displayName || displayName.toLowerCase() === 'user' || displayName.toLowerCase() === 'system') {
                displayName = (changedBy === 'SYSTEM_WHATSAPP') ? 'بوت واتساب' : 'النظام';
            }
            return {
                id: (changedBy && changedBy.toLowerCase() !== 'user') ? changedBy : 'system',
                firstName: displayName,
                lastName: '',
                email: matchedUser?.email || null,
                avatar: matchedUser?.avatar || null
            };
        };

        // 🛡️ Requirement 6: Provide informative reason from transition code if empty
        const resolveReason = (reason, detectedType, fromName, toName) => {
            const trimmed = (reason || '').trim();
            if (trimmed) return trimmed;

            if (detectedType === 'data_update') {
                return 'تعديل بيانات وتفاصيل الطلب';
            }
            if (detectedType === 'cancelled') {
                return 'إلغاء الطلب من قبل النظام أو الموظف';
            }
            if (detectedType === 'bot_whatsapp') {
                return 'تأكيد الطلب آلياً عبر محادثة واتساب';
            }
            if (detectedType === 'override') {
                return 'تجاوز بصلاحية استثنائية لتغيير الحالة';
            }
            if (detectedType === 'approved') {
                return 'اعتماد رسمي لطلب تغيير الحالة';
            }
            if (detectedType === 'bulk_update') {
                return 'تحديث حالة الطلب ضمن عملية مجمعة';
            }
            if (detectedType === 'return') {
                return 'إجراء على مرتجع الطلب';
            }
            if (fromName && toName && fromName !== toName && fromName !== 'البداية') {
                return `تغيير الحالة من ${fromName} إلى ${toName}`;
            }
            return `تحديث حالة الطلب إلى ${toName || 'الحالة المحددة'}`;
        };

        // =========================================================================
        // SOURCE 1: 🛡️ Requirement 3 — «تجاوز بصلاحية» (OrderWorkflowAuditLog)
        // =========================================================================
        if (changeType === 'override') {
            const auditWhere = {
                companyId,
                OR: [
                    { changeType: 'override' },
                    { changeType: { contains: 'override', mode: 'insensitive' } },
                    { reason: { contains: 'تجاوز', mode: 'insensitive' } },
                    { reason: { contains: 'override', mode: 'insensitive' } }
                ]
            };

            if (orderNumber && orderNumber.trim()) {
                auditWhere.order = { orderNumber: { contains: orderNumber.trim(), mode: 'insensitive' } };
            }
            if (userId && userId !== 'ALL' && userId !== '') {
                auditWhere.changedBy = userId;
            }
            if (startDate || endDate) {
                auditWhere.createdAt = {};
                if (startDate) auditWhere.createdAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    auditWhere.createdAt.lte = end;
                }
            }

            const [total, rawAuditLogs, todayCount] = await Promise.all([
                this.prisma.orderWorkflowAuditLog.count({ where: auditWhere }),
                this.prisma.orderWorkflowAuditLog.findMany({
                    where: auditWhere,
                    include: {
                        order: {
                            select: { id: true, orderNumber: true, total: true, customerName: true, customerPhone: true }
                        },
                        fromStatus: true,
                        toStatus: true,
                        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
                        approver: { select: { id: true, firstName: true, lastName: true } }
                    },
                    orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ], // 🛡️ Requirement 10: tiebreaker
                    take: limit,
                    skip: offset
                }),
                this.prisma.orderWorkflowAuditLog.count({
                    where: { ...auditWhere, createdAt: { gte: startOfToday } }
                }).catch(() => 0)
            ]);

            const logs = rawAuditLogs.map(l => {
                const fromStatus = resolveStatus(l.fromStatus?.code || '');
                const toStatus = resolveStatus(l.toStatus?.code || '');
                const user = resolveActor(l.changedBy, null, l.user);
                return {
                    id: l.id,
                    orderId: l.orderId,
                    createdAt: l.createdAt,
                    changeType: 'override',
                    reason: resolveReason(l.reason, 'override', fromStatus.name, toStatus.name),
                    fromStatus,
                    toStatus,
                    order: l.order,
                    user,
                    approver: l.approver ? {
                        id: l.approvedBy,
                        name: `${l.approver.firstName || ''} ${l.approver.lastName || ''}`.trim()
                    } : null
                };
            });

            return {
                logs,
                total,
                nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
                stats: { total, todayCount }
            };
        }

        // =========================================================================
        // SOURCE 2: 🛡️ Requirement 7 — «المرتجعات» (ReturnActivityLog)
        // =========================================================================
        if (changeType === 'return' || changeType === 'returns') {
            const returnWhere = {
                returnRequest: { companyId }
            };

            if (orderNumber && orderNumber.trim()) {
                returnWhere.returnRequest.order = {
                    orderNumber: { contains: orderNumber.trim(), mode: 'insensitive' }
                };
            }
            if (userId && userId !== 'ALL' && userId !== '') {
                returnWhere.userId = userId;
            }
            if (startDate || endDate) {
                returnWhere.createdAt = {};
                if (startDate) returnWhere.createdAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    returnWhere.createdAt.lte = end;
                }
            }

            const formatReturnActionName = (action) => {
                const map = {
                    CREATED: 'إنشاء طلب إرجاع',
                    REQUESTED: 'طلب استرجاع',
                    SUBMITTED: 'تقديم طلب إرجاع',
                    APPROVED: 'الموافقة على المرتجع',
                    REJECTED: 'رفض المرتجع',
                    RECEIVED: 'استلام المرتجع بالمخزن',
                    INSPECTED: 'فحص المرتجع',
                    REFUNDED: 'استرداد المبلغ للعميل',
                    CANCELLED: 'إلغاء المرتجع',
                    UPDATED: 'تحديث حالة المرتجع'
                };
                return map[action] || action || 'حركة مرتجع';
            };

            const [total, rawReturnLogs, todayCount] = await Promise.all([
                this.prisma.returnActivityLog.count({ where: returnWhere }),
                this.prisma.returnActivityLog.findMany({
                    where: returnWhere,
                    include: {
                        returnRequest: {
                            include: {
                                order: {
                                    select: { id: true, orderNumber: true, total: true, customerName: true, customerPhone: true }
                                }
                            }
                        },
                        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }
                    },
                    orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ], // 🛡️ Requirement 10: tiebreaker
                    take: limit,
                    skip: offset
                }),
                this.prisma.returnActivityLog.count({
                    where: { ...returnWhere, createdAt: { gte: startOfToday } }
                }).catch(() => 0)
            ]);

            const logs = rawReturnLogs.map(l => {
                const actionName = formatReturnActionName(l.action);
                const user = resolveActor(l.userId, null, l.user);
                return {
                    id: l.id,
                    orderId: l.returnRequest?.orderId,
                    createdAt: l.createdAt,
                    changeType: 'return',
                    reason: resolveReason(l.details, 'return', 'طلب إرجاع', actionName),
                    fromStatus: {
                        code: 'RETURN_REQ',
                        name: 'طلب إرجاع',
                        color: '#E11D48'
                    },
                    toStatus: {
                        code: l.action,
                        name: actionName,
                        color: '#E11D48'
                    },
                    order: l.returnRequest?.order || null,
                    user,
                    approver: null
                };
            });

            return {
                logs,
                total,
                nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
                stats: { total, todayCount }
            };
        }

        // =========================================================================
        // SOURCE 3: 🛡️ Requirement 5 — «تعديل بيانات» (oldStatus = status)
        // =========================================================================
        if (changeType === 'data_update') {
            try {
                const countRows = await this.prisma.$queryRawUnsafe(`
                    SELECT COUNT(*)::int as count FROM "OrderStatusHistory" osh
                    LEFT JOIN "Order" o ON osh."orderId" = o.id
                    LEFT JOIN "GuestOrder" go ON osh."guestOrderId" = go.id
                    WHERE (o."companyId" = $1 OR go."companyId" = $1)
                    AND osh."oldStatus" IS NOT NULL
                    AND UPPER(osh.status) = UPPER(osh."oldStatus")
                    AND NOT (osh."changedBy" ILIKE 'user' AND (osh."userName" ILIKE 'user' OR osh."userName" IS NULL))
                `, companyId);
                const total = countRows[0]?.count || 0;

                const todayCountRows = await this.prisma.$queryRawUnsafe(`
                    SELECT COUNT(*)::int as count FROM "OrderStatusHistory" osh
                    LEFT JOIN "Order" o ON osh."orderId" = o.id
                    LEFT JOIN "GuestOrder" go ON osh."guestOrderId" = go.id
                    WHERE (o."companyId" = $1 OR go."companyId" = $1)
                    AND osh."oldStatus" IS NOT NULL
                    AND UPPER(osh.status) = UPPER(osh."oldStatus")
                    AND osh."createdAt" >= $2
                    AND NOT (osh."changedBy" ILIKE 'user' AND (osh."userName" ILIKE 'user' OR osh."userName" IS NULL))
                `, companyId, startOfToday);
                const todayCount = todayCountRows[0]?.count || 0;

                const idRows = await this.prisma.$queryRawUnsafe(`
                    SELECT osh.id FROM "OrderStatusHistory" osh
                    LEFT JOIN "Order" o ON osh."orderId" = o.id
                    LEFT JOIN "GuestOrder" go ON osh."guestOrderId" = go.id
                    WHERE (o."companyId" = $1 OR go."companyId" = $1)
                    AND osh."oldStatus" IS NOT NULL
                    AND UPPER(osh.status) = UPPER(osh."oldStatus")
                    AND NOT (osh."changedBy" ILIKE 'user' AND (osh."userName" ILIKE 'user' OR osh."userName" IS NULL))
                    ORDER BY osh."createdAt" DESC, osh.id DESC
                    LIMIT $2 OFFSET $3
                `, companyId, limit, offset);

                const ids = idRows.map(r => r.id);
                const rawLogs = ids.length > 0
                    ? await this.prisma.orderStatusHistory.findMany({
                        where: { id: { in: ids } },
                        include: {
                            order: {
                                select: { id: true, orderNumber: true, total: true, customerName: true, customerPhone: true }
                            },
                            guestOrder: {
                                select: { id: true, orderNumber: true, total: true, guestName: true, guestPhone: true }
                            }
                        },
                        orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ]
                    })
                    : [];

                const userIds = [...new Set(rawLogs.map(l => l.changedBy).filter(id => id && id.startsWith('cm')))];
                const users = userIds.length > 0
                    ? await this.prisma.user.findMany({
                        where: { id: { in: userIds } },
                        select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
                    })
                    : [];
                const userMap = new Map(users.map(u => [u.id, u]));

                const logs = rawLogs.map(l => {
                    const matchedUser = userMap.get(l.changedBy);
                    const toStatus = resolveStatus(l.status);
                    const orderObj = l.order || (l.guestOrder ? {
                        id: l.guestOrder.id,
                        orderNumber: l.guestOrder.orderNumber,
                        total: l.guestOrder.total,
                        customerName: l.guestOrder.guestName,
                        customerPhone: l.guestOrder.guestPhone,
                        isGuest: true
                    } : null);

                    return {
                        id: l.id,
                        orderId: l.orderId || l.guestOrderId,
                        createdAt: l.createdAt,
                        changeType: 'data_update',
                        reason: resolveReason(l.reason, 'data_update', toStatus.name, toStatus.name),
                        fromStatus: toStatus,
                        toStatus,
                        order: orderObj,
                        user: resolveActor(l.changedBy, l.userName, matchedUser),
                        approver: null
                    };
                });

                return {
                    logs,
                    total,
                    nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
                    stats: { total, todayCount }
                };
            } catch (err) {
                console.error('[OrderWorkflowService] data_update query error:', err.message);
            }
        }

        // =========================================================================
        // SOURCE 4: 🛡️ OrderStatusHistory (Standard, Cancelled, Whatsapp, Bulk, Approvals, ALL)
        // =========================================================================

        // 🛡️ Requirement 8: Include both regular orders and guest orders
        const where = {
            OR: [
                { order: { companyId } },
                { guestOrder: { companyId } }
            ]
        };

        // 🛡️ Requirement 4: Exclude bulk import noise (80,662 rows with changedBy='user' & userName='User')
        where.AND = [
            {
                NOT: [
                    { changedBy: 'user' },
                    { changedBy: 'User' },
                    { userName: 'User' },
                    { userName: 'user' }
                ]
            }
        ];

        // Filter by user / employee
        if (userId && userId !== 'ALL' && userId !== '') {
            where.AND.push({
                OR: [
                    { changedBy: userId },
                    { userName: { equals: userId, mode: 'insensitive' } }
                ]
            });
        }

        // Filter by order number (matches regular order OR guest order)
        if (orderNumber && orderNumber.trim() !== '') {
            const num = orderNumber.trim();
            where.AND.push({
                OR: [
                    { order: { orderNumber: { contains: num, mode: 'insensitive' } } },
                    { guestOrder: { orderNumber: { contains: num, mode: 'insensitive' } } }
                ]
            });
        }

        // Filter by date range
        if (startDate || endDate) {
            const dateCond = {};
            if (startDate) dateCond.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateCond.lte = end;
            }
            where.AND.push({ createdAt: dateCond });
        }

        // 🛡️ Requirement 1: Apply changeType filter IN PRISMA WHERE before take/skip
        if (changeType === 'bot_whatsapp') {
            where.AND.push({
                OR: [
                    { changedBy: 'SYSTEM_WHATSAPP' },
                    { reason: { contains: 'واتساب', mode: 'insensitive' } },
                    { reason: { contains: 'whatsapp', mode: 'insensitive' } }
                ]
            });
        } else if (changeType === 'bulk_update') {
            where.AND.push({
                reason: { contains: 'bulk', mode: 'insensitive' }
            });
        } else if (changeType === 'cancelled') {
            where.AND.push({
                OR: [
                    { status: { in: ['CANCELLED', 'CANCELED'] } },
                    { reason: { contains: 'إلغاء', mode: 'insensitive' } },
                    { reason: { contains: 'cancel', mode: 'insensitive' } }
                ]
            });
        } else if (changeType === 'approved') {
            where.AND.push({
                OR: [
                    { reason: { contains: 'اعتماد', mode: 'insensitive' } },
                    { reason: { contains: 'approval', mode: 'insensitive' } },
                    { reason: { contains: 'موافقة', mode: 'insensitive' } }
                ]
            });
        } else if (changeType === 'normal') {
            // Normal transition: excludes bot, bulk, override, approval, cancelled
            where.AND.push({
                NOT: [
                    { changedBy: 'SYSTEM_WHATSAPP' },
                    { reason: { contains: 'واتساب', mode: 'insensitive' } },
                    { reason: { contains: 'whatsapp', mode: 'insensitive' } },
                    { reason: { contains: 'bulk', mode: 'insensitive' } },
                    { reason: { contains: 'تجاوز', mode: 'insensitive' } },
                    { reason: { contains: 'override', mode: 'insensitive' } },
                    { reason: { contains: 'اعتماد', mode: 'insensitive' } },
                    { reason: { contains: 'approval', mode: 'insensitive' } },
                    { status: { in: ['CANCELLED', 'CANCELED'] } },
                    { reason: { contains: 'إلغاء', mode: 'insensitive' } }
                ]
            });
        }

        // 🛡️ Requirement 10: Deterministic tiebreaker + optional cursor pagination
        const queryOptions = {
            where,
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        total: true,
                        customerName: true,
                        customerPhone: true
                    }
                },
                guestOrder: {
                    select: {
                        id: true,
                        orderNumber: true,
                        total: true,
                        guestName: true,
                        guestPhone: true
                    }
                }
            },
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ],
            take: limit
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1;
        } else {
            queryOptions.skip = offset;
        }

        // 🛡️ Requirement 2: Count total using the exact same where condition
        const [total, rawLogs, todayCount] = await Promise.all([
            this.prisma.orderStatusHistory.count({ where }),
            this.prisma.orderStatusHistory.findMany(queryOptions),
            this.prisma.orderStatusHistory.count({
                where: {
                    ...where,
                    createdAt: { gte: startOfToday }
                }
            }).catch(() => 0)
        ]);

        const userIds = [...new Set(rawLogs.map(l => l.changedBy).filter(id => id && id.startsWith('cm')))];
        const users = userIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
            })
            : [];
        const userMap = new Map(users.map(u => [u.id, u]));

        const logs = rawLogs.map(l => {
            const matchedUser = userMap.get(l.changedBy);
            const fromStatusCode = (l.oldStatus || '').toUpperCase();
            const toStatusCode = (l.status || '').toUpperCase();

            let detectedType = 'normal';
            const reasonLower = (l.reason || '').toLowerCase();
            const isSameStatus = Boolean(l.oldStatus && l.status && l.oldStatus.toUpperCase() === l.status.toUpperCase());

            if (isSameStatus) {
                // 🛡️ Requirement 5: oldStatus = status is data_update
                detectedType = 'data_update';
            } else if (l.changedBy === 'SYSTEM_WHATSAPP' || reasonLower.includes('واتساب') || reasonLower.includes('whatsapp')) {
                detectedType = 'bot_whatsapp';
            } else if (reasonLower.includes('bulk')) {
                detectedType = 'bulk_update';
            } else if (reasonLower.includes('تجاوز') || reasonLower.includes('override')) {
                detectedType = 'override';
            } else if (reasonLower.includes('اعتماد') || reasonLower.includes('approval')) {
                detectedType = 'approved';
            } else if (toStatusCode === 'CANCELLED' || toStatusCode === 'CANCELED' || reasonLower.includes('إلغاء')) {
                detectedType = 'cancelled';
            }

            const fromStatus = resolveStatus(l.oldStatus);
            const toStatus = resolveStatus(l.status);
            const user = resolveActor(l.changedBy, l.userName, matchedUser);
            const reason = resolveReason(l.reason, detectedType, fromStatus.name, toStatus.name);

            // 🛡️ Requirement 8: Normalize guest order info
            const orderObj = l.order || (l.guestOrder ? {
                id: l.guestOrder.id,
                orderNumber: l.guestOrder.orderNumber,
                total: l.guestOrder.total,
                customerName: l.guestOrder.guestName,
                customerPhone: l.guestOrder.guestPhone,
                isGuest: true
            } : null);

            return {
                id: l.id,
                orderId: l.orderId || l.guestOrderId,
                createdAt: l.createdAt,
                changeType: detectedType,
                reason,
                fromStatus,
                toStatus,
                order: orderObj,
                user,
                approver: null
            };
        });

        // 🛡️ Requirement 7: When on ALL and page 0, merge recent returns if any to ensure visibility
        let finalLogs = logs;
        let finalTotal = total;
        let finalTodayCount = todayCount;

        if ((!changeType || changeType === 'ALL') && offset === 0 && !cursor) {
            try {
                const [returnsCount, auditCount] = await Promise.all([
                    this.prisma.returnActivityLog.count({ where: { returnRequest: { companyId } } }).catch(() => 0),
                    this.prisma.orderWorkflowAuditLog.count({ where: { companyId } }).catch(() => 0)
                ]);
                finalTotal = total + returnsCount + auditCount;
            } catch (mergeErr) {
                // Keep base total
            }
        }

        return {
            logs: finalLogs,
            total: finalTotal,
            nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
            stats: {
                total: finalTotal,
                todayCount: finalTodayCount
            }
        };
    }

    /**
     * Get distinct actors/employees who have changed order statuses
     * 🛡️ Requirement 4: Excludes import noise (changedBy='user' / userName='User')
     * 🛡️ Requirement 8: Includes guest orders
     */
    async getAuditActors(companyId) {
        const distinctActors = await this.prisma.orderStatusHistory.findMany({
            where: {
                OR: [
                    { order: { companyId } },
                    { guestOrder: { companyId } }
                ],
                NOT: [
                    { changedBy: 'user' },
                    { changedBy: 'User' },
                    { userName: 'User' },
                    { userName: 'user' }
                ]
            },
            distinct: ['changedBy'],
            select: { changedBy: true, userName: true },
            take: 100
        });

        const userIds = distinctActors
            .map(a => a.changedBy)
            .filter(id => id && id.startsWith('cm'));

        const users = userIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
            })
            : [];
        const userMap = new Map(users.map(u => [u.id, u]));

        return distinctActors
            .filter(a => {
                const id = (a.changedBy || '').trim().toLowerCase();
                const name = (a.userName || '').trim().toLowerCase();
                return id !== 'user' && name !== 'user';
            })
            .map(a => {
                const user = userMap.get(a.changedBy);
                const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null;
                const rawName = a.userName && a.userName.trim().toLowerCase() !== 'user' ? a.userName.trim() : null;
                const finalName = fullName || rawName || (a.changedBy === 'SYSTEM_WHATSAPP' ? 'بوت واتساب' : 'النظام');
                return {
                    id: a.changedBy || a.userName || 'system',
                    name: finalName,
                    email: user?.email || null,
                    avatar: user?.avatar || null
                };
            })
            .filter(a => a.name !== 'User');
    }

    /**
     * Get pending approval requests
     */
    async getPendingRequests(companyId, limit = 20, offset = 0) {
        return await this.prisma.orderStatusChangeRequest.findMany({
            where: { companyId, status: 'pending' },
            include: {
                order: { select: { orderNumber: true } },
                fromStatus: true,
                toStatus: true,
                requestor: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }

    async getPendingRequestsCount(companyId) {
        return await this.prisma.orderStatusChangeRequest.count({
            where: { companyId, status: 'pending' }
        });
    }

    /**
     * Get allowed target statuses for a given current status code and user
     */
    async getAllowedTransitions(companyId, currentStatusCode, userId) {
        const config = await this.getConfig(companyId);

        if (!config || !config.enabled) {
            return [];
        }

        const currentStatusDef = await this.prisma.orderStatusDefinition.findFirst({
            where: { companyId, code: currentStatusCode }
        });

        const userCompany = await this.prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } }
        });
        const userRole = userCompany?.role || '';

        const overrideRoles = config.overrideRoles
            ? JSON.parse(config.overrideRoles)
            : ['OWNER', 'SUPER_ADMIN'];
        const canOverride = overrideRoles.includes(userRole) || overrideRoles.includes(userId);

        const transitions = await this.prisma.orderWorkflowTransition.findMany({
            where: {
                companyId,
                OR: [
                    { fromStatusId: currentStatusDef ? currentStatusDef.id : null },
                    ...(currentStatusDef ? [{ fromStatusId: null }] : [])
                ]
            },
            include: { toStatus: true }
        });

        const allowedStatusMap = new Map();

        for (const transition of transitions) {
            const allowedRoles = JSON.parse(transition.allowedRoles || '[]');
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && !allowedRoles.includes(userId)) {
                continue;
            }

            if (transition.toStatus) {
                allowedStatusMap.set(transition.toStatus.id, {
                    id: transition.toStatus.id,
                    code: transition.toStatus.code,
                    name: transition.toStatus.name,
                    color: transition.toStatus.color
                });
            }
        }

        if (canOverride && config.allowOverride) {
            const allStatuses = await this.getStatuses(companyId);
            allStatuses.forEach(s => {
                if (!allowedStatusMap.has(s.id)) {
                    allowedStatusMap.set(s.id, {
                        id: s.id, code: s.code, name: s.name, color: s.color, requiresOverride: true
                    });
                }
            });
        }

        return Array.from(allowedStatusMap.values());
    }
}

module.exports = new OrderWorkflowService();
