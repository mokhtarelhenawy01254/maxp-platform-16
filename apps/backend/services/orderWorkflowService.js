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

            // Try finding by ID first, then by Code
            let nextStatusDef = await this.prisma.orderStatusDefinition.findUnique({
                where: { id: statusOrId }
            }).catch(() => null);

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

            if (!userCompany) throw new Error('المستخدم غير مصرح له لهذه الشركة');
            const userRole = userCompany.role;

            // 4. Handle OVERRIDE
            let auditType = 'normal';
            if (isOverride) {
                // Check if user has override permission
                const overrideRoles = config.overrideRoles
                    ? JSON.parse(config.overrideRoles)
                    : ['OWNER', 'SUPER_ADMIN'];
                const canOverride = overrideRoles.includes(userRole);
                if (!canOverride) throw new Error('عذراً، لا تملك صلاحية تجاوز قيود المسار (Override)');

                auditType = 'override';
            }

            // 5. Check if CURRENT status is LOCKED
            if (!isOverride && currentStatusDef && currentStatusDef.lockAfterEntry) {
                throw new Error(`الحالة الحالية (${currentStatusDef.name}) مغلقة، لا يمكن التغيير منها إلا لصلاحية التجاوز (Override)`);
            }

            // 6. Find Transition Rule
            const transition = await this.prisma.orderWorkflowTransition.findFirst({
                where: {
                    companyId,
                    fromStatusId: currentStatusDef ? currentStatusDef.id : null,
                    toStatusId: nextStatusDef.id
                }
            });

            if (!isOverride && !transition && config.enforceTransitions) {
                throw new Error(`هذا الانتقال من "${currentStatusDef?.name || 'بداية'}" إلى "${nextStatusDef.name}" غير مسموح به في إعدادات المسار`);
            }

            // 7. Check Role Permission in Transition
            if (!isOverride && transition) {
                const allowedRoles = JSON.parse(transition.allowedRoles || '[]');
                if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                    throw new Error('دورك الحالي لا يملك صلاحية تنفيذ هذا الانتقال');
                }

                // 8. Check Approval requirement
                if (transition.requiresApproval || (currentStatusDef && currentStatusDef.requiresApprovalToExit)) {
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
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: nextStatusDef.code }
            });

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
        const request = await this.prisma.orderStatusChangeRequest.findUnique({
            where: { id: requestId, companyId },
            include: { order: true, toStatus: true }
        });

        if (!request) throw new Error('طلب الموافقة غير موجود');
        if (request.status !== 'pending') throw new Error('تمت معالجة هذا الطلب مسبقاً');

        // permission check for reviewer
        const reviewer = await this.prisma.userCompany.findUnique({
            where: { userId_companyId: { userId, companyId } }
        });
        if (!['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(reviewer.role)) {
            throw new Error('لا تملك صلاحية مراجعة طلبات تغيير الحالة');
        }

        if (action === 'approve') {
            // 1. Update the order
            await this.prisma.order.update({
                where: { id: request.orderId },
                data: { status: request.toStatus.code }
            });

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
                trackingLink: order.turboTrackingNumber
                    ? `https://${process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online'}/track/${order.orderNumber}`
                    : `https://${process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online'}/track/${order.orderNumber}`,
                orderId: order.id
            };

            // ✅ Check for duplicate notification in last 10 seconds
            const { getSharedPrismaClient } = require('./sharedDatabase');
            const prisma = getSharedPrismaClient();
            const recentNotification = await prisma.whatsAppNotificationLog.findFirst({
              where: {
                orderId: order.id,
                eventType: { contains: statusCode.toUpperCase() },
                createdAt: { gte: new Date(Date.now() - 10000) } // Last 10 seconds
              }
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
     * Get Global Audit Logs (Recent activity)
     */
    async getGlobalAuditLogs(companyId, limit = 20, offset = 0) {
        return await this.prisma.orderWorkflowAuditLog.findMany({
            where: { companyId },
            include: {
                fromStatus: true,
                toStatus: true,
                order: { select: { orderNumber: true } },
                user: { select: { firstName: true, lastName: true } },
                approver: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
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
        const canOverride = overrideRoles.includes(userRole);

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
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
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
