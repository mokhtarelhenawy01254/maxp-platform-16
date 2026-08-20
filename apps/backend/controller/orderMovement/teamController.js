const core = require('../../services/orderMovementCore');

const filterByMode = (transitions, mode) =>
  mode === 'manual'
    ? transitions.filter((t) => !t.auto)
    : mode === 'auto'
      ? transitions.filter((t) => t.auto)
      : transitions;

const parseAllowedNextStatuses = (value) => {
  if (value === null || value === undefined) return null;
  let list = Array.isArray(value) ? value : null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) list = parsed;
    } catch (error) {
      list = null;
    }
  }
  if (!list || !list.length) return null;
  const normalized = list.map((s) => String(s ?? '').trim().toUpperCase()).filter(Boolean);
  return normalized.length ? normalized : null;
};

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, mode } = req.query;
    const { start, end } = core.normalizeDateRange({ startDate, endDate });

    const { orders, truncated } = await core.fetchOrderMovementData({ companyId, startDate, endDate });

    const ordersById = new Map();
    const orderTotals = new Map();
    for (const order of orders) {
      ordersById.set(order.id, order);
      orderTotals.set(order.id, Number(order.total ?? 0));
    }

    const rawTransitions = [];
    for (const order of orders) {
      rawTransitions.push(...core.buildTransitions(order, { start, end }));
    }

    const transitions = filterByMode(rawTransitions, mode);

    const allowedMap = new Map();
    if (transitions.length) {
      const prisma = core.getSharedPrismaClient();
      const configs = await prisma.orderStatusConfig.findMany({
        where: { companyId, isActive: true },
        select: { code: true, allowedNextStatuses: true }
      });
      for (const config of configs) {
        const code = core.normalizeStatus(config.code);
        const allowed = parseAllowedNextStatuses(config.allowedNextStatuses);
        if (code && allowed) allowedMap.set(code, allowed);
      }
    }

    const isInvalid = (t) => {
      if (!t.oldStatus) return false;
      const allowed = allowedMap.get(t.oldStatus);
      if (!allowed) return false;
      return !allowed.includes(t.status);
    };

    const membersMap = new Map();

    const getMember = (key, name) => {
      let member = membersMap.get(key);
      if (!member) {
        member = {
          name,
          changedBy: key,
          isSystem: false,
          transitions: 0,
          manualTransitions: 0,
          autoTransitions: 0,
          confirms: 0,
          cancels: 0,
          deliveries: 0,
          invalidTransitions: 0,
          revenue: 0,
          orderIds: new Set(),
          confirmPerOrder: new Map(),
          cancelPerOrder: new Map()
        };
        membersMap.set(key, member);
      }
      return member;
    };

    const applyTransition = (member, t, auto) => {
      member.transitions += 1;
      if (auto) member.autoTransitions += 1;
      else member.manualTransitions += 1;

      const order = ordersById.get(t.orderId);

      if (t.status === 'CONFIRMED') {
        member.confirms += 1;
        if (order && !member.confirmPerOrder.has(t.orderId)) {
          member.confirmPerOrder.set(t.orderId, core.hoursBetween(order.createdAt, t.createdAt));
        }
      }

      if (core.FAILURE_STATUSES.has(t.status)) {
        member.cancels += 1;
        if (order && !member.cancelPerOrder.has(t.orderId)) {
          member.cancelPerOrder.set(t.orderId, core.hoursBetween(order.createdAt, t.createdAt));
        }
      }

      if (t.status === 'DELIVERED') member.deliveries += 1;
      if (isInvalid(t)) member.invalidTransitions += 1;

      member.orderIds.add(t.orderId);
    };

    const manualTransitions = transitions.filter((t) => !t.auto);
    const autoTransitions = transitions.filter((t) => t.auto);

    for (const t of manualTransitions) {
      const key = t.userName || t.changedBy || 'غير معروف';
      applyTransition(getMember(key, key), t, false);
    }

    if (autoTransitions.length) {
      const systemMember = getMember('SYSTEM_AUTO', 'النظام (تلقائي)');
      systemMember.isSystem = true;
      for (const t of autoTransitions) {
        applyTransition(systemMember, t, true);
      }
    }

    const members = Array.from(membersMap.values()).map((member) => {
      let revenue = 0;
      for (const orderId of member.orderIds) {
        revenue += orderTotals.get(orderId) ?? 0;
      }
      const confirmTimes = Array.from(member.confirmPerOrder.values());
      const cancelTimes = Array.from(member.cancelPerOrder.values());
      const round2 = (v) => Math.round(v * 100) / 100;
      return {
        name: member.name,
        changedBy: member.changedBy,
        transitions: member.transitions,
        manualTransitions: member.manualTransitions,
        autoTransitions: member.autoTransitions,
        confirms: member.confirms,
        cancels: member.cancels,
        deliveries: member.deliveries,
        invalidTransitions: member.invalidTransitions,
        avgHoursToConfirm: confirmTimes.length ? round2(core.calcMean(confirmTimes)) : 0,
        avgHoursToCancel: cancelTimes.length ? round2(core.calcMean(cancelTimes)) : 0,
        revenue,
        isSystem: member.isSystem
      };
    });

    members.sort((a, b) => b.transitions - a.transitions);

    res.json({
      success: true,
      data: {
        truncated,
        summary: {
          totalTransitions: transitions.length,
          manualTransitions: manualTransitions.length,
          autoTransitions: autoTransitions.length,
          activeMembers: members.filter((m) => !m.isSystem).length
        },
        members
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حساب تحليلات أداء الفريق' });
  }
};

module.exports = handler;
