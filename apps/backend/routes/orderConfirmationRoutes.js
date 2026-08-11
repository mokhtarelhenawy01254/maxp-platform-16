const express = require('express');
const router = express.Router();
const orderConfirmationService = require('../services/orderConfirmationService');
const verifyToken = require("../utils/verifyToken");
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.use(verifyToken.authenticateToken);

const SETTINGS_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];
const QUEUE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT'];
const BULK_LIMIT = 100;

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

const logActivity = async ({ companyId, userId, action, description, targetId, metadata }) => {
  try {
    await getSharedPrismaClient().activityLog.create({
      data: {
        companyId,
        userId,
        category: 'orders',
        action,
        description,
        targetType: 'order',
        targetId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

const notifyUser = async ({ companyId, userId, title, message, data }) => {
  try {
    await getSharedPrismaClient().notification.create({
      data: {
        companyId,
        userId,
        title,
        message,
        type: 'order_assignment',
        data: data || null
      }
    });
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
};

const assignOrderInternal = async ({ companyId, orderId, userId, assignedBy, notes, strategy }) => {
  const prisma = getSharedPrismaClient();
  let order = await prisma.order.findFirst({
    where: { companyId, OR: [{ id: orderId }, { orderNumber: orderId }] }
  });

  let assignment = null;
  let guestOrder = null;

  if (order) {
    await prisma.orderAssignment.updateMany({
      where: { orderId: order.id, isActive: true },
      data: { isActive: false }
    });

    assignment = await prisma.orderAssignment.create({
      data: {
        companyId,
        orderId: order.id,
        assignedTo: userId,
        assignedBy: assignedBy || null,
        strategy: strategy || 'manual',
        metadata: notes ? JSON.stringify({ notes }) : null
      }
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        assignedTo: userId,
        assignedBy: assignedBy || null,
        assignedAt: new Date(),
        assignmentStrategy: strategy || 'manual'
      }
    });

    return { orderType: 'regular', order, assignment };
  }

  guestOrder = await prisma.guestOrder.findFirst({
    where: { companyId, OR: [{ id: orderId }, { orderNumber: orderId }] }
  });

  if (!guestOrder) {
    throw new Error('الطلب غير موجود');
  }

  await prisma.orderAssignment.updateMany({
    where: { guestOrderId: guestOrder.id, isActive: true },
    data: { isActive: false }
  });

  assignment = await prisma.orderAssignment.create({
    data: {
      companyId,
      guestOrderId: guestOrder.id,
      assignedTo: userId,
      assignedBy: assignedBy || null,
      strategy: strategy || 'manual',
      metadata: notes ? JSON.stringify({ notes }) : null
    }
  });

  return { orderType: 'guest', guestOrder, assignment };
};

router.get('/settings', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const settings = await orderConfirmationService.getSettings(companyId);
    res.json({ success: true, data: orderConfirmationService.normalizeSettings(settings) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/eligible-users', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const settings = orderConfirmationService.normalizeSettings(
      await orderConfirmationService.getSettings(companyId)
    );
    const includeAllCandidates = ['1', 'true', 'yes'].includes(
      String(req.query?.includeAll || '').toLowerCase()
    );
    const users = await orderConfirmationService.getEligibleUsers(
      companyId,
      settings,
      { ignoreUserFilter: includeAllCandidates }
    );
    const data = users.map((user) => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || null,
      role: user.role || null,
      availability: user.availability || null
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const settings = await orderConfirmationService.updateSettings(companyId, req.body || {});
    res.json({ success: true, data: orderConfirmationService.normalizeSettings(settings) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/queue', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const result = await orderConfirmationService.listConfirmationQueue(companyId, req.query || {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const result = await orderConfirmationService.getConfirmationStats(companyId, req.query || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/confirm', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const { orderId, notes } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'رقم الطلب مطلوب' });

    const result = await orderConfirmationService.confirmOrder(companyId, orderId, req.user?.id, notes || null);

    if (result?.status === 'pending') {
      return res.json({ success: true, data: result, message: 'تم إرسال الطلب للموافقة' });
    }

    await logActivity({
      companyId,
      userId: req.user?.id,
      action: 'ORDER_CONFIRMED',
      description: `تم تأكيد الطلب ${orderId}`,
      targetId: result.order?.id || null,
      metadata: { orderNumber: result.order?.orderNumber || orderId }
    });

    if (result.assignment && result.assignment.id) {
      await notifyUser({
        companyId,
        userId: result.assignment.id,
        title: 'تم توزيع طلب جديد',
        message: `تم توزيع الطلب ${result.order?.orderNumber || orderId} عليك`,
        data: { orderId: result.order?.id || null, orderNumber: result.order?.orderNumber || orderId }
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/confirm/bulk', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const { orderIds, notes } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
    }
    if (orderIds.length > BULK_LIMIT) {
      return res.status(400).json({ success: false, message: 'لا يمكن معالجة أكثر من 100 طلب دفعة واحدة' });
    }

    const results = [];
    for (const orderId of orderIds) {
      try {
        const result = await orderConfirmationService.confirmOrder(companyId, orderId, req.user?.id, notes || null);

        if (result?.status === 'pending') {
          results.push({ orderId, status: 'pending' });
          continue;
        }

        await logActivity({
          companyId,
          userId: req.user?.id,
          action: 'ORDER_CONFIRMED',
          description: `تم تأكيد الطلب ${orderId}`,
          targetId: result.order?.id || null,
          metadata: { orderNumber: result.order?.orderNumber || orderId }
        });

        if (result.assignment && result.assignment.id) {
          await notifyUser({
            companyId,
            userId: result.assignment.id,
            title: 'تم توزيع طلب جديد',
            message: `تم توزيع الطلب ${result.order?.orderNumber || orderId} عليك`,
            data: { orderId: result.order?.id || null, orderNumber: result.order?.orderNumber || orderId }
          });
        }

        results.push({ orderId, status: 'confirmed', orderNumber: result.order?.orderNumber || orderId });
      } catch (error) {
        results.push({ orderId, status: 'failed', message: error.message });
      }
    }

    const summary = {
      total: results.length,
      confirmed: results.filter((r) => r.status === 'confirmed').length,
      pending: results.filter((r) => r.status === 'pending').length,
      failed: results.filter((r) => r.status === 'failed').length
    };

    res.json({ success: true, data: { summary, results } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/assign', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const { orderId, userId, notes, strategy } = req.body || {};
    if (!orderId || !userId) {
      return res.status(400).json({ success: false, message: 'رقم الطلب والمستخدم مطلوبان' });
    }

    const settings = orderConfirmationService.normalizeSettings(
      await orderConfirmationService.getSettings(companyId)
    );
    const eligibleUsers = await orderConfirmationService.getEligibleUsers(companyId, settings);
    const eligibleUserIds = new Set(eligibleUsers.map((user) => user.id));
    if (!eligibleUserIds.has(userId)) {
      return res.status(403).json({ success: false, message: 'المستخدم غير مؤهل للتوزيع' });
    }

    let result = null;
    try {
      result = await assignOrderInternal({
        companyId,
        orderId,
        userId,
        assignedBy: req.user?.id,
        notes,
        strategy
      });
    } catch (error) {
      if (error.message === 'الطلب غير موجود') {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      }
      throw error;
    }

    await logActivity({
      companyId,
      userId: req.user?.id,
      action: 'ORDER_ASSIGNED',
      description: `تم تعيين الطلب ${orderId}`,
      targetId: result?.order?.id || result?.guestOrder?.id || null,
      metadata: { orderNumber: result?.order?.orderNumber || result?.guestOrder?.orderNumber || orderId, assignedTo: userId }
    });

    await notifyUser({
      companyId,
      userId,
      title: 'تم تعيين طلب جديد',
      message: `تم تعيين الطلب ${result?.order?.orderNumber || result?.guestOrder?.orderNumber || orderId} لك`,
      data: { orderId: result?.order?.id || result?.guestOrder?.id || null, orderNumber: result?.order?.orderNumber || result?.guestOrder?.orderNumber || orderId }
    });

    res.json({ success: true, data: result?.assignment || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/assign/bulk', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const { orderIds, userId, notes, strategy } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0 || !userId) {
      return res.status(400).json({ success: false, message: 'قائمة الطلبات والمستخدم مطلوبة' });
    }
    if (orderIds.length > BULK_LIMIT) {
      return res.status(400).json({ success: false, message: 'لا يمكن معالجة أكثر من 100 طلب دفعة واحدة' });
    }

    const settings = orderConfirmationService.normalizeSettings(
      await orderConfirmationService.getSettings(companyId)
    );
    const eligibleUsers = await orderConfirmationService.getEligibleUsers(companyId, settings);
    const eligibleUserIds = new Set(eligibleUsers.map((user) => user.id));
    if (!eligibleUserIds.has(userId)) {
      return res.status(403).json({ success: false, message: 'المستخدم غير مؤهل للتوزيع' });
    }

    const results = [];
    for (const orderId of orderIds) {
      try {
        const result = await assignOrderInternal({
          companyId,
          orderId,
          userId,
          assignedBy: req.user?.id,
          notes,
          strategy
        });

        await logActivity({
          companyId,
          userId: req.user?.id,
          action: 'ORDER_ASSIGNED',
          description: `تم تعيين الطلب ${orderId}`,
          targetId: result?.order?.id || result?.guestOrder?.id || null,
          metadata: { orderNumber: result?.order?.orderNumber || result?.guestOrder?.orderNumber || orderId, assignedTo: userId }
        });

        results.push({
          orderId,
          status: 'assigned',
          orderNumber: result?.order?.orderNumber || result?.guestOrder?.orderNumber || orderId
        });
      } catch (error) {
        results.push({ orderId, status: 'failed', message: error.message });
      }
    }

    await notifyUser({
      companyId,
      userId,
      title: 'تم تعيين طلبات جديدة',
      message: `تم تعيين ${results.filter((r) => r.status === 'assigned').length} طلبات لك`,
      data: { count: results.filter((r) => r.status === 'assigned').length }
    });

    const summary = {
      total: results.length,
      assigned: results.filter((r) => r.status === 'assigned').length,
      failed: results.filter((r) => r.status === 'failed').length
    };

    res.json({ success: true, data: { summary, results } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/log-call', verifyToken.requireRole(QUEUE_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const { orderId, result, notes } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'رقم الطلب مطلوب' });

    const data = await orderConfirmationService.logCallResult(
      companyId,
      orderId,
      req.user?.id,
      result || 'unreached',
      notes || null
    );

    await logActivity({
      companyId,
      userId: req.user?.id,
      action: 'CALL_ATTEMPT',
      description: `تم تسجيل محاولة اتصال (${result || 'unreached'}) للطلب ${orderId}`,
      targetId: data.order?.id || null,
      metadata: { orderNumber: data.order?.orderNumber || orderId, result: result || 'unreached', callAttempts: data.callAttempts }
    });

    res.json({ success: true, data });
  } catch (error) {
    const status = error.message === 'الطلب غير موجود' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

module.exports = router;
