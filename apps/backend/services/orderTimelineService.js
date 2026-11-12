const { getSharedPrismaClient } = require('./sharedDatabase');

function safeParseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toIsoString(dateVal, fallback = null) {
  const target = dateVal || fallback || new Date();
  const d = target instanceof Date ? target : new Date(target);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function formatUserName(user, fallbackName = null) {
  if (user && (user.firstName || user.lastName)) {
    const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (full) return full;
  }
  return fallbackName || 'SYSTEM';
}

function classifyActivityLogType(action, meta = {}) {
  const normalized = String(action || '').trim().toLowerCase();
  if (normalized === 'order.created' || normalized === 'create') return 'create';
  if (normalized.startsWith('order.payment.') || normalized.includes('payment')) return 'payment';
  if (normalized.startsWith('order.discount.') || normalized.includes('discount')) return 'discount';
  if (normalized === 'order.status.change' || normalized.startsWith('order.status.')) return 'status';
  if (normalized === 'order.note.created' || normalized.startsWith('order.note.')) return 'note';
  if (normalized === 'order_assigned' || normalized.startsWith('order.assign')) return 'assign';
  if (normalized === 'call_attempt' || normalized.startsWith('order.call')) return 'call';
  if (normalized === 'order.update' && meta.status && !meta.before && !meta.after && !meta.updatedFields) {
    return 'status';
  }
  return 'edit';
}

function encodeCursor(event) {
  if (!event) return null;
  return Buffer.from(JSON.stringify({ at: event.at, eventKey: event.eventKey }), 'utf8').toString('base64');
}

function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (decoded && (decoded.at || decoded.eventKey)) {
      return decoded;
    }
  } catch {
    // Fallback: treat raw string as eventKey
  }
  return { eventKey: cursor };
}

class OrderTimelineService {
  constructor() {
    this._prisma = null;
  }

  get prisma() {
    return this._prisma || getSharedPrismaClient();
  }

  set prisma(client) {
    this._prisma = client;
  }

  /**
   * Unified read-only order timeline aggregating 6 DB sources + read-time synthesis.
   * Never performs any database writes.
   */
  async getOrderTimeline(companyId, orderIdOrNumber, options = {}) {
    const prisma = options.prisma || this.prisma;
    if (!companyId || !orderIdOrNumber) {
      return null;
    }

    const companyIds = Array.isArray(companyId) ? companyId.filter(Boolean) : [companyId].filter(Boolean);
    if (companyIds.length === 0) {
      return null;
    }
    const companyWhere = companyIds.length === 1 ? { companyId: companyIds[0] } : { companyId: { in: companyIds } };

    let order = await prisma.order.findFirst({
      where: {
        ...companyWhere,
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      },
    });
    let isGuest = false;

    if (!order && prisma.guestOrder?.findFirst) {
      order = await prisma.guestOrder.findFirst({
        where: {
          ...companyWhere,
          OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
        },
      });
      if (order) isGuest = true;
    }

    if (!order) {
      return null;
    }

    const orderMeta = safeParseJson(order.metadata);
    const idField = isGuest ? 'guestOrderId' : 'orderId';

    const activityLogWhere = {
      companyId: order.companyId,
      OR: [
        { targetType: { in: ['order', 'ORDER'] }, targetId: order.id },
        {
          AND: [
            { OR: [{ targetType: null }, { targetType: '' }, { targetType: 'APP' }] },
            {
              OR: [
                { metadata: { contains: order.id } },
                ...(order.orderNumber ? [{ metadata: { contains: order.orderNumber } }] : []),
              ],
            },
          ],
        },
      ],
    };

    const [
      statusHistoryRows,
      activityLogRows,
      orderNoteRows,
      assignmentRows,
      callAttemptRows,
      workflowAuditRows,
    ] = await Promise.all([
      prisma.orderStatusHistory?.findMany
        ? prisma.orderStatusHistory.findMany({
            where: { [idField]: order.id },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.activityLog?.findMany
        ? prisma.activityLog.findMany({
            where: activityLogWhere,
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.orderNote?.findMany
        ? prisma.orderNote.findMany({
            where: { [idField]: order.id },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.orderAssignment?.findMany
        ? prisma.orderAssignment.findMany({
            where: { companyId: order.companyId, [idField]: order.id },
            orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.callAttemptLog?.findMany
        ? prisma.callAttemptLog.findMany({
            where: { [idField]: order.id },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
      !isGuest && prisma.orderWorkflowAuditLog?.findMany
        ? prisma.orderWorkflowAuditLog.findMany({
            where: { companyId: order.companyId, orderId: order.id },
            include: {
              fromStatus: true,
              toStatus: true,
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              approver: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const scopedActivityLogs = (activityLogRows || []).filter((row) => {
      if (!row) return false;
      const tType = String(row.targetType || '').toLowerCase();
      if (tType === 'order' && row.targetId === order.id) return true;
      const meta = safeParseJson(row.metadata);
      return (
        meta.orderId === order.id ||
        (Boolean(order.orderNumber) && meta.orderNumber === order.orderNumber)
      );
    });

    const hasCreatedLog = scopedActivityLogs.some((r) => r.action === 'order.created');
    const hasPaymentLog = scopedActivityLogs.some((r) => String(r.action || '').startsWith('order.payment.'));
    const hasDiscountApprovedLog = scopedActivityLogs.some((r) => r.action === 'order.discount.approved');
    const hasDiscountRejectedLog = scopedActivityLogs.some((r) => r.action === 'order.discount.rejected');
    const normalizedPaymentStatus = String(order.paymentStatus || '').toUpperCase();
    const hasPaymentEvent =
      hasPaymentLog || Boolean(orderMeta.kashierPayment || normalizedPaymentStatus === 'COMPLETED');

    const updatedActivityLogs = scopedActivityLogs.filter((r) => r.action === 'order.updated');
    let hasStatusHistoryDiscountApproved = false;
    let hasStatusHistoryDiscountRejected = false;

    const events = [];

    // 1. OrderStatusHistory
    for (const row of statusHistoryRows || []) {
      const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
      const isSameStatus = Boolean(row.oldStatus) && row.status === row.oldStatus;
      const isDiscountApproveReason = isSameStatus && reason.startsWith('اعتماد الخصم');
      const isDiscountRejectReason = isSameStatus && reason.startsWith('إلغاء ورفض الخصم');

      if (isDiscountApproveReason) {
        hasStatusHistoryDiscountApproved = true;
        if (hasDiscountApprovedLog) continue;
      }
      if (isDiscountRejectReason) {
        hasStatusHistoryDiscountRejected = true;
        if (hasDiscountRejectedLog) continue;
      }

      if (isSameStatus && !isDiscountApproveReason && !isDiscountRejectReason) {
        const shTime = new Date(row.createdAt).getTime();
        const hasMatchingUpdatedActivity = updatedActivityLogs.some(
          (al) => Math.abs(new Date(al.createdAt).getTime() - shTime) <= 5000
        );
        if (hasMatchingUpdatedActivity) continue;
      }

      let type = 'status';
      let action = 'order.status.change';
      if (isDiscountApproveReason) {
        type = 'discount';
        action = 'order.discount.approved';
      } else if (isDiscountRejectReason) {
        type = 'discount';
        action = 'order.discount.rejected';
      } else if (isSameStatus || reason.startsWith('تعديل')) {
        type = 'edit';
        action = 'order.updated';
      }

      const defaultTitle = row.oldStatus
        ? `تغيير الحالة من ${row.oldStatus} إلى ${row.status}`
        : `تغيير الحالة إلى ${row.status}`;

      events.push({
        id: row.id,
        eventKey: `status_history:${row.id}`,
        type,
        action,
        source: 'status_history',
        actor: {
          id: row.changedBy || null,
          name: row.userName || row.changedBy || 'SYSTEM',
          type: row.changedBy ? 'user' : 'system',
        },
        at: toIsoString(row.createdAt),
        title: reason || defaultTitle,
        meta: {
          status: row.status,
          oldStatus: row.oldStatus || null,
          reason: reason || null,
        },
      });
    }

    // 2. ActivityLog
    for (const row of scopedActivityLogs) {
      const meta = safeParseJson(row.metadata);
      const type = classifyActivityLogType(row.action, meta);
      const rowTime = new Date(row.createdAt).getTime();

      // Suppress duplicate status event when OrderStatusHistory already recorded the transition
      if (type === 'status') {
        const targetStatus = meta.newStatus || meta.status || null;
        const hasMatchingStatusHistory = (statusHistoryRows || []).some((sh) => {
          const shTime = new Date(sh.createdAt).getTime();
          const closeInTime = Math.abs(shTime - rowTime) <= 5000;
          const sameStatus =
            !targetStatus ||
            String(sh.status || '').toUpperCase() === String(targetStatus).toUpperCase();
          return closeInTime && sameStatus;
        });
        if (hasMatchingStatusHistory) continue;
      }

      const actorName = formatUserName(row.user, meta.userName || meta.actorName || (row.userId ? row.userId : 'SYSTEM'));
      events.push({
        id: row.id,
        eventKey: `activity_log:${row.id}`,
        type,
        action: row.action,
        source: 'activity_log',
        actor: {
          id: row.userId || null,
          name: actorName,
          avatar: row.user?.avatar || null,
          type: row.userId ? 'user' : 'system',
        },
        at: toIsoString(row.createdAt),
        title: row.description || row.action,
        meta: {
          ...meta,
          category: row.category,
          severity: row.severity,
          isSuccess: row.isSuccess,
        },
      });
    }

    // 3. OrderNote
    for (const row of orderNoteRows || []) {
      if (row.authorName === 'Kashier Gateway' && hasPaymentEvent) {
        continue;
      }
      const actorId = row.authorId || row.user?.id || null;
      const actorName = row.authorName || formatUserName(row.user, 'مستخدم');
      events.push({
        id: row.id,
        eventKey: `order_note:${row.id}`,
        type: 'note',
        action: 'order.note.created',
        source: 'order_note',
        actor: {
          id: actorId,
          name: actorName,
          avatar: row.user?.avatar || null,
          type: actorId ? 'user' : 'system',
        },
        at: toIsoString(row.createdAt),
        title: row.content,
        meta: {
          noteId: row.id,
          content: row.content,
          authorId: actorId,
          authorName: actorName,
        },
      });
    }

    // 4. OrderAssignment
    for (const row of assignmentRows || []) {
      const assignMeta = safeParseJson(row.metadata);
      events.push({
        id: row.id,
        eventKey: `order_assignment:${row.id}`,
        type: 'assign',
        action: 'order.assigned',
        source: 'order_assignment',
        actor: {
          id: row.assignedBy || null,
          name: assignMeta.assignedByName || row.assignedBy || 'SYSTEM',
          type: row.assignedBy ? 'user' : 'system',
        },
        at: toIsoString(row.assignedAt),
        title: `تعيين الطلب إلى ${assignMeta.assignedToName || row.assignedTo}`,
        meta: {
          assignedTo: row.assignedTo,
          assignedBy: row.assignedBy || null,
          strategy: row.strategy || null,
          isActive: row.isActive,
          ...assignMeta,
        },
      });
    }

    // 5. CallAttemptLog
    for (const row of callAttemptRows || []) {
      const actorName = formatUserName(row.user, row.userId || 'SYSTEM');
      const statusLabel = row.result || row.callStatus || 'COMPLETED';
      events.push({
        id: row.id,
        eventKey: `call_attempt:${row.id}`,
        type: 'call',
        action: 'order.call.logged',
        source: 'call_attempt',
        actor: {
          id: row.userId || null,
          name: actorName,
          avatar: row.user?.avatar || null,
          type: row.userId ? 'user' : 'system',
        },
        at: toIsoString(row.startedAt || row.createdAt),
        title: `محاولة اتصال (${row.direction || 'OUTBOUND'}) — ${statusLabel}`,
        meta: {
          callStatus: row.callStatus,
          direction: row.direction,
          durationSeconds: row.durationSeconds,
          result: row.result || null,
          notes: row.notes || null,
          customerPhone: row.customerPhone || null,
          recordingUrl: row.recordingUrl || null,
        },
      });
    }

    // 6. OrderWorkflowAuditLog (read-only 4th log table)
    for (const row of workflowAuditRows || []) {
      const rowTime = new Date(row.createdAt).getTime();
      const toCode = row.toStatus?.code || null;
      const matchesStatusHistory = (statusHistoryRows || []).some((sh) => {
        const shTime = new Date(sh.createdAt).getTime();
        return Math.abs(shTime - rowTime) <= 5000 && (!toCode || sh.status === toCode) && row.changeType === 'normal';
      });
      if (matchesStatusHistory) continue;

      const actorName = formatUserName(row.user, row.changedBy || 'SYSTEM');
      const approverName = row.approver ? formatUserName(row.approver, null) : null;
      const fromLabel = row.fromStatus?.name || row.fromStatus?.code || '';
      const toLabel = row.toStatus?.name || row.toStatus?.code || '';
      events.push({
        id: row.id,
        eventKey: `workflow_audit:${row.id}`,
        type: 'status',
        action: `order.workflow.${row.changeType || 'normal'}`,
        source: 'workflow_audit',
        actor: {
          id: row.changedBy || null,
          name: actorName,
          avatar: row.user?.avatar || null,
          type: row.changedBy ? 'user' : 'system',
        },
        at: toIsoString(row.createdAt),
        title: row.reason || `تحديث مسار الطلب (${row.changeType || 'normal'}): ${fromLabel} ← ${toLabel}`,
        meta: {
          changeType: row.changeType,
          fromStatus: row.fromStatus?.code || null,
          toStatus: toCode,
          approvedBy: row.approvedBy || null,
          approverName,
          reason: row.reason || null,
        },
      });
    }

    // 7. Read-time Synthesis (zero DB writes)
    const resolvedOrderTotal = isGuest
      ? (order.finalTotal ?? order.total ?? null)
      : (order.total ?? order.finalTotal ?? null);

    // 7a. Synthesize order.created when no order.created log and no OrderStatusHistory exist
    if (!hasCreatedLog && (!statusHistoryRows || statusHistoryRows.length === 0)) {
      const creatorId = order.createdBy || null;
      const creatorName = order.createdByName || creatorId || 'SYSTEM';
      events.push({
        id: `created-${order.id}`,
        eventKey: `synthetic:created:${order.id}`,
        type: 'create',
        action: 'order.created',
        source: 'synthetic',
        actor: {
          id: creatorId,
          name: creatorName,
          type: creatorId ? 'user' : 'system',
        },
        at: toIsoString(order.createdAt),
        title: `إنشاء الطلب ${order.orderNumber || order.id}`,
        meta: {
          sourceType: order.sourceType || order.orderSource || null,
          extractionMethod: order.extractionMethod || null,
          status: order.status,
          total: resolvedOrderTotal,
          synthetic: true,
        },
      });
    }

    // 7b. Synthesize payment event from metadata.kashierPayment or paymentStatus='COMPLETED'
    if (!hasPaymentLog && (orderMeta.kashierPayment || normalizedPaymentStatus === 'COMPLETED')) {
      const kp = orderMeta.kashierPayment && typeof orderMeta.kashierPayment === 'object' ? orderMeta.kashierPayment : null;
      const txId = kp?.transactionId || orderMeta.kashierTransactionId || null;
      const kpStatus = String(kp?.status || '').toUpperCase();
      let paymentAction = 'order.payment.succeeded';
      let paymentTitle = `تم الدفع إلكترونياً بنجاح${txId ? ` (رقم العملية: ${txId})` : ''}`;

      if (kpStatus === 'REFUNDED' || normalizedPaymentStatus === 'REFUNDED') {
        paymentAction = 'order.payment.refunded';
        paymentTitle = `تم استرداد مبلغ الدفع${txId ? ` (رقم العملية: ${txId})` : ''}`;
      } else if (kpStatus === 'FAILED' && normalizedPaymentStatus !== 'COMPLETED') {
        paymentAction = 'order.payment.failed';
        paymentTitle = `فشلت عملية الدفع${txId ? ` (رقم العملية: ${txId})` : ''}`;
      }

      events.push({
        id: `payment-${order.id}-${txId || 'completed'}`,
        eventKey: `synthetic:payment:${order.id}:${txId || 'completed'}`,
        type: 'payment',
        action: paymentAction,
        source: 'synthetic',
        actor: {
          id: null,
          name: kp ? 'Kashier Gateway' : 'SYSTEM',
          type: 'system',
        },
        at: toIsoString(kp?.confirmedAt || orderMeta.kashierConfirmedAt || order.updatedAt || order.createdAt),
        title: paymentTitle,
        meta: {
          transactionId: txId,
          kashierTransactionId: txId,
          amount: kp?.amount ?? resolvedOrderTotal ?? null,
          currency: kp?.currency || order.currency || 'EGP',
          method: kp?.method || order.paymentMethod || null,
          paymentStatus: order.paymentStatus,
          kashierPayment: kp,
          synthetic: true,
        },
      });
    }

    // 7c. Synthesize discount approval/rejection from metadata
    if (
      !hasDiscountApprovedLog &&
      !hasDiscountRejectedLog &&
      !hasStatusHistoryDiscountApproved &&
      !hasStatusHistoryDiscountRejected
    ) {
      if (orderMeta.discountApprovalStatus === 'APPROVED' || orderMeta.discountApprovedAt) {
        const approverId = orderMeta.discountApprovedById || null;
        const approverName = orderMeta.discountApprovedBy || 'SYSTEM';
        const discountVal = order.discount ?? order.discountAmount ?? null;
        events.push({
          id: `discount-approved-${order.id}`,
          eventKey: `synthetic:discount_approved:${order.id}`,
          type: 'discount',
          action: 'order.discount.approved',
          source: 'synthetic',
          actor: {
            id: approverId,
            name: approverName,
            type: approverId ? 'user' : 'system',
          },
          at: toIsoString(orderMeta.discountApprovedAt || order.updatedAt || order.createdAt),
          title: `اعتماد الخصم${discountVal ? ` بقيمة ${discountVal} ج.م` : ''}`,
          meta: {
            discount: discountVal,
            approvedBy: approverName,
            synthetic: true,
          },
        });
      } else if (orderMeta.discountApprovalStatus === 'REJECTED' || orderMeta.discountRejectedAt) {
        const rejectorId = orderMeta.discountRejectedById || null;
        const rejectorName = orderMeta.discountRejectedBy || 'SYSTEM';
        events.push({
          id: `discount-rejected-${order.id}`,
          eventKey: `synthetic:discount_rejected:${order.id}`,
          type: 'discount',
          action: 'order.discount.rejected',
          source: 'synthetic',
          actor: {
            id: rejectorId,
            name: rejectorName,
            type: rejectorId ? 'user' : 'system',
          },
          at: toIsoString(orderMeta.discountRejectedAt || order.updatedAt || order.createdAt),
          title: `رفض الخصم${orderMeta.discountRejectionReason ? `: ${orderMeta.discountRejectionReason}` : ''}`,
          meta: {
            reason: orderMeta.discountRejectionReason || null,
            rejectedBy: rejectorName,
            synthetic: true,
          },
        });
      }
    }

    // Sort descending by `at` with deterministic `eventKey` tiebreaker & Set deduplication
    // Reuses pattern from orderWorkflowService.js:1646
    events.sort((a, b) => {
      const timeA = new Date(a.at).getTime();
      const timeB = new Date(b.at).getTime();
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return String(b.eventKey || '').localeCompare(String(a.eventKey || ''));
    });

    const seenKeys = new Set();
    const deduped = [];
    for (const item of events) {
      if (!item?.eventKey || !seenKeys.has(item.eventKey)) {
        if (item?.eventKey) seenKeys.add(item.eventKey);
        deduped.push(item);
      }
    }

    // Filter by type / actorId BEFORE pagination so `total` reflects filtered results
    let filtered = deduped;
    if (options.type && String(options.type).toUpperCase() !== 'ALL') {
      const allowedTypes = new Set(
        String(options.type)
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      );
      filtered = filtered.filter((e) => allowedTypes.has(String(e.type || '').toLowerCase()));
    }
    if (options.actorId) {
      const targetActorId = String(options.actorId);
      filtered = filtered.filter((e) => String(e.actor?.id || '') === targetActorId);
    }

    const total = filtered.length;
    const parsedLimit = Number(options.limit);
    const rawLimit =
      options.limit !== undefined &&
      options.limit !== null &&
      String(options.limit).trim() !== '' &&
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0
        ? parsedLimit
        : 50;
    const limit = Math.max(1, Math.min(200, rawLimit));

    let startIndex = 0;
    if (options.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded?.eventKey) {
        const idx = filtered.findIndex((e) => e.eventKey === decoded.eventKey);
        if (idx >= 0) {
          startIndex = idx + 1;
        } else if (decoded.at) {
          const cursorTime = new Date(decoded.at).getTime();
          const fallbackIdx = filtered.findIndex((e) => {
            const eTime = new Date(e.at).getTime();
            return eTime < cursorTime || (eTime === cursorTime && String(e.eventKey).localeCompare(String(decoded.eventKey)) < 0);
          });
          startIndex = fallbackIdx >= 0 ? fallbackIdx : filtered.length;
        }
      }
    }

    const pageItems = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + pageItems.length < total;
    const nextCursor = hasMore && pageItems.length > 0 ? encodeCursor(pageItems[pageItems.length - 1]) : null;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      isGuest,
      events: pageItems,
      total,
      nextCursor,
      hasMore,
    };
  }
}

const orderTimelineService = new OrderTimelineService();

module.exports = orderTimelineService;
module.exports.OrderTimelineService = OrderTimelineService;
module.exports.getOrderTimeline = orderTimelineService.getOrderTimeline.bind(orderTimelineService);
