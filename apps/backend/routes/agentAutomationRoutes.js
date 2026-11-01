const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const shippingFollowUpService = require('../services/shippingFollowUpService');
const stockAndTargetAlertService = require('../services/stockAndTargetAlertService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.use(verifyToken.authenticateToken, requireDbPermission('ai.automation.manage'));

const getCompanyId = (req) => req.user?.effectiveCompanyId || req.user?.companyId;

const SLUGS = {
  'shipping-agent': 'shipping_followup',
  'stock-target-monitor-agent': 'order_targets',
};

// 1) GET /shipping/delayed — inspect delayed orders without sending alerts
router.get('/shipping/delayed', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'No company context' });
    }

    let minDays;
    if (req.query.minDays !== undefined) {
      minDays = Number(req.query.minDays);
      if (isNaN(minDays) || minDays < 0) {
        return res.status(400).json({ success: false, error: 'عدد الأيام غير صالح' });
      }
    }

    let statuses;
    if (req.query.status) {
      statuses = String(req.query.status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 0) {
        return res.status(400).json({ success: false, error: 'قائمة الحالات لا يمكن أن تكون فارغة' });
      }
    }

    let limit;
    if (req.query.limit !== undefined) {
      limit = Number(req.query.limit);
      if (isNaN(limit) || limit <= 0 || limit > 100) {
        return res.status(400).json({ success: false, error: 'الحد الأقصى غير صالح' });
      }
    }

    const items = await shippingFollowUpService.listDelayed(companyId, {
      minDays,
      statuses,
      limit,
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error('❌ [agentAutomationRoutes] GET /shipping/delayed error:', err);
    return res.status(err.message.includes('غير صالح') ? 400 : 500).json({
      success: false,
      error: err.message,
    });
  }
});

// 2) GET /:slug/alerts — recent notifications
router.get('/:slug/alerts', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!SLUGS[slug]) {
      return res.status(400).json({ success: false, error: 'Invalid agent slug' });
    }

    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'No company context' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const prisma = getSharedPrismaClient();

    const typeCondition =
      slug === 'shipping-agent'
        ? 'AGENT_SHIPPING_DELAY'
        : { in: ['AGENT_STOCK_LOW', 'AGENT_TARGET_MILESTONE', 'AGENT_STOCK_TARGET_REPORT', 'STOCK_TARGET_DAILY_REPORT'] };

    const alerts = await prisma.aiNotification.findMany({
      where: {
        companyId,
        type: typeCondition,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.json({ success: true, alerts });
  } catch (err) {
    console.error('❌ [agentAutomationRoutes] GET /:slug/alerts error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3) POST /:slug/run — trigger manual automation run
router.post('/:slug/run', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!SLUGS[slug]) {
      return res.status(400).json({ success: false, error: 'Invalid agent slug' });
    }

    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'No company context' });
    }

    if (slug === 'shipping-agent') {
      const dryRun = req.body?.dryRun;
      const summary = await shippingFollowUpService.runCompany(companyId, {
        dryRun,
        force: true,
      });
      return res.json({ success: true, summary });
    }

    if (slug === 'stock-target-monitor-agent') {
      const dryRun = req.body?.dryRun;
      const dailyReportRes = await stockAndTargetAlertService.dispatchDailyReport(companyId, {
        dryRun,
        force: true,
      });
      const dueChecksSummary = await stockAndTargetAlertService.runDueChecks({
        companyId,
        dryRun,
        force: true,
      });
      return res.json({
        success: true,
        summary: {
          ...dueChecksSummary,
          dailyReportSent: dailyReportRes.success,
          dailyReport: dailyReportRes,
        },
      });
    }
  } catch (err) {
    console.error('❌ [agentAutomationRoutes] POST /:slug/run error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4) GET /:slug — retrieve automation settings
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!SLUGS[slug]) {
      return res.status(400).json({ success: false, error: 'Invalid agent slug' });
    }

    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'No company context' });
    }

    if (slug === 'shipping-agent') {
      const settings = await shippingFollowUpService.getSettings(companyId);
      return res.json({ success: true, slug, settings });
    }

    if (slug === 'stock-target-monitor-agent') {
      const settings = await stockAndTargetAlertService.getSettings(companyId);
      return res.json({ success: true, slug, settings });
    }
  } catch (err) {
    console.error('❌ [agentAutomationRoutes] GET /:slug error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5) PUT /:slug — atomic update of automation settings
router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!SLUGS[slug]) {
      return res.status(400).json({ success: false, error: 'Invalid agent slug' });
    }

    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'No company context' });
    }

    // Ignore req.body.companyId to enforce tenant isolation
    const payload = { ...req.body };
    delete payload.companyId;

    if (slug === 'shipping-agent') {
      if (payload.minDays !== undefined) {
        const minDays = Number(payload.minDays);
        if (!Number.isInteger(minDays) || minDays < 0) {
          return res.status(400).json({ success: false, error: 'عدد الأيام غير صالح' });
        }
      }

      if (payload.statuses !== undefined) {
        if (!Array.isArray(payload.statuses) || payload.statuses.length === 0) {
          return res.status(400).json({ success: false, error: 'قائمة الحالات لا يمكن أن تكون فارغة' });
        }
      }

      if (payload.maxPerRun !== undefined) {
        const maxPerRun = Number(payload.maxPerRun);
        if (!Number.isInteger(maxPerRun) || maxPerRun <= 0 || maxPerRun > 100) {
          return res.status(400).json({ success: false, error: 'الحد الأقصى لكل تشغيل يجب أن يكون بين 1 و 100' });
        }
      }

      const settings = await shippingFollowUpService.updateSettings(companyId, payload);
      return res.json({ success: true, settings });
    }

    if (slug === 'stock-target-monitor-agent') {
      if (payload.min_stock_threshold !== undefined) {
        const threshold = Number(payload.min_stock_threshold);
        if (isNaN(threshold) || threshold <= 0) {
          return res.status(400).json({ success: false, error: 'الحد الأدنى للمخزون يجب أن يكون أكبر من صفر' });
        }
      }

      if (payload.milestones !== undefined) {
        if (!Array.isArray(payload.milestones) || payload.milestones.length === 0) {
          return res.status(400).json({ success: false, error: 'مراحل التنبيه لا يمكن أن تكون فارغة' });
        }
      }

      if (payload.monthly_orders !== undefined) {
        const monthlyOrders = Number(payload.monthly_orders);
        if (isNaN(monthlyOrders) || monthlyOrders < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الأوردرات الشهري غير صالح' });
        }
      }

      if (payload.monthly_revenue !== undefined) {
        const monthlyRev = Number(payload.monthly_revenue);
        if (isNaN(monthlyRev) || monthlyRev < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الإيراد الشهري غير صالح' });
        }
      }

      if (payload.report_time !== undefined) {
        const reportTime = String(payload.report_time).trim();
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(reportTime)) {
          return res.status(400).json({ success: false, error: 'وقت التقرير غير صالح (الصيغة المطلوبة HH:mm)' });
        }
      }

      if (payload.daily_orders !== undefined) {
        const dailyOrders = Number(payload.daily_orders);
        if (isNaN(dailyOrders) || dailyOrders < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الأوردرات اليومي غير صالح' });
        }
      }

      if (payload.weekly_orders !== undefined) {
        const weeklyOrders = Number(payload.weekly_orders);
        if (isNaN(weeklyOrders) || weeklyOrders < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الأوردرات الأسبوعي غير صالح' });
        }
      }

      if (payload.daily_revenue !== undefined) {
        const dailyRev = Number(payload.daily_revenue);
        if (isNaN(dailyRev) || dailyRev < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الإيراد اليومي غير صالح' });
        }
      }

      if (payload.weekly_revenue !== undefined) {
        const weeklyRev = Number(payload.weekly_revenue);
        if (isNaN(weeklyRev) || weeklyRev < 0) {
          return res.status(400).json({ success: false, error: 'تارجت الإيراد الأسبوعي غير صالح' });
        }
      }

      const settings = await stockAndTargetAlertService.updateSettings(companyId, payload);
      return res.json({ success: true, settings });
    }

    return res.status(400).json({ success: false, error: 'Unsupported slug for direct update' });
  } catch (err) {
    console.error('❌ [agentAutomationRoutes] PUT /:slug error:', err);
    return res.status(err.message.includes('غير صالح') || err.message.includes('فارغة') ? 400 : 500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
