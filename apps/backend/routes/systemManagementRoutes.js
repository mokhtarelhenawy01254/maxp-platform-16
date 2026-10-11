/**
 * System Management Routes
 * مسارات إدارة أنظمة النظام
 */

const express = require('express');
const router = express.Router();
const systemManager = require('../services/systemManager');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const { cacheMiddleware } = require('../middleware/performanceOptimization');
const { t } = require('../services/i18n');

/**
 * GET /api/v1/admin/systems
 * الحصول على جميع الأنظمة
 */
router.get('/systems', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const systems = await systemManager.getAllSystems();
    const stats = await systemManager.getSystemStats();

    // Translate system descriptions for frontend
    const translatedSystems = systems.map(system => ({
      ...system,
      description: t(system.description)
    }));

    res.json({
      success: true,
      data: {
        systems: translatedSystems,
        stats
      },
      message: t('system.systems_fetched')
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting systems:', error);
    res.status(500).json({
      success: false,
      message: t('system.fetch_error'),
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/statistics
 * الحصول على إحصائيات النظام العامة (للداشبورد)
 */
router.get('/statistics', authenticateToken, requireSuperAdmin, cacheMiddleware(60000), async (req, res) => {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalCustomers,
      totalConversations,
      recentCompanies,
      recentUsers,
      recentCustomers
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.customer.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalCustomers,
          totalConversations
        },
        recentActivity: {
          newCompaniesLast30Days: recentCompanies,
          newUsersLast30Days: recentUsers,
          newCustomersLast30Days: recentCustomers
        }
      },
      message: 'تم جلب الإحصائيات بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/dashboard/aggregated
 * داشبورد مدير النظام - بيانات مجمعة (إحصائيات، مقارنات، اتجاهات، صحة النظام، الخدمات)
 */
router.get('/dashboard/aggregated', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { getSharedPrismaClient, healthCheck: dbHealthCheck } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies, activeCompanies, totalUsers, totalCustomers, totalConversations,
      recentCompanies, recentUsers, recentCustomers,
      prevCompanies, prevUsers, prevCustomers,
      dailyCompanies, dailyUsers, dailyCustomers,
      systems, recentAlerts
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.customer.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.company.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.customer.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      (async () => {
        try {
          return await prisma.$queryRaw`SELECT CAST("createdAt" AS DATE) as date, CAST(COUNT(*) AS INTEGER) as count FROM "companies" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY CAST("createdAt" AS DATE) ORDER BY date ASC`;
        } catch (err) {
          console.warn('⚠️ [Dashboard] Trend companies query warning:', err.message);
          return [];
        }
      })(),
      (async () => {
        try {
          return await prisma.$queryRaw`SELECT CAST("createdAt" AS DATE) as date, CAST(COUNT(*) AS INTEGER) as count FROM "users" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY CAST("createdAt" AS DATE) ORDER BY date ASC`;
        } catch (err) {
          console.warn('⚠️ [Dashboard] Trend users query warning:', err.message);
          return [];
        }
      })(),
      (async () => {
        try {
          return await prisma.$queryRaw`SELECT CAST("createdAt" AS DATE) as date, CAST(COUNT(*) AS INTEGER) as count FROM "customers" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY CAST("createdAt" AS DATE) ORDER BY date ASC`;
        } catch (err) {
          console.warn('⚠️ [Dashboard] Trend customers query warning:', err.message);
          return [];
        }
      })(),
      prisma.systemSettings.findMany({ orderBy: [{ category: 'asc' }, { displayName: 'asc' }] }).catch(() => []),
      prisma.activityLog.findMany({ where: { severity: { in: ['HIGH', 'CRITICAL'] } }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => [])
    ]);

    const calcGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const toDateStr = (d) => {
      if (!d) return '';
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
    };

    const trendsMap = {};
    const addTrend = (rows, key) => {
      for (const row of rows) {
        const d = toDateStr(row.date);
        if (!d) continue;
        if (!trendsMap[d]) trendsMap[d] = { date: d, companies: 0, users: 0, customers: 0 };
        trendsMap[d][key] = typeof row.count === 'bigint' ? Number(row.count) : (row.count || 0);
      }
    };
    addTrend(dailyCompanies, 'companies');
    addTrend(dailyUsers, 'users');
    addTrend(dailyCustomers, 'customers');

    const trends = [];
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const ds = toDateStr(d);
      trends.push(trendsMap[ds] || { date: ds, companies: 0, users: 0, customers: 0 });
    }

    let health = { status: 'UNKNOWN', database: 'N/A' };
    try {
      const dbHealth = await dbHealthCheck();
      health = {
        status: dbHealth.status === 'ok' ? 'healthy' : dbHealth.status === 'connection_limit' ? 'degraded' : 'error',
        uptime: process.uptime(),
        database: dbHealth.status === 'ok' ? 'connected' : 'limited',
        dbStats: { queryCount: dbHealth.queryCount || 0, latency: dbHealth.latency || 0, queue: dbHealth.queue || 0, active: dbHealth.active || 0 },
        environment: process.env.NODE_ENV || 'development',
        timestamp: now.toISOString(),
      };
    } catch (e) {
      health = { status: 'error', database: 'disconnected', error: e.message, timestamp: now.toISOString() };
    }

    const sysConfig = (s) => {
      try { return JSON.parse(s.config || '{}'); } catch { return {}; }
    };

    res.json({
      success: true,
      data: {
        overview: { totalCompanies, activeCompanies, totalUsers, totalCustomers, totalConversations },
        comparison: {
          companiesGrowth: calcGrowth(recentCompanies, prevCompanies),
          usersGrowth: calcGrowth(recentUsers, prevUsers),
          customersGrowth: calcGrowth(recentCustomers, prevCustomers),
        },
        recentActivity: { newCompaniesLast30Days: recentCompanies, newUsersLast30Days: recentUsers, newCustomersLast30Days: recentCustomers },
        trends,
        health,
        systems: systems.map(s => ({ systemName: s.systemName, displayName: s.displayName, category: s.category, isEnabled: s.isEnabled, resourceUsage: s.resourceUsage || sysConfig(s).resourceUsage || 'unknown' })),
        alerts: recentAlerts.map(a => ({ id: a.id, type: a.severity === 'CRITICAL' ? 'error' : 'warning', message: a.description, category: a.category, action: a.action, timestamp: a.createdAt }))
      },
      message: 'تم جلب بيانات الداشبورد بنجاح'
    });
  } catch (error) {
    console.error('❌ [Dashboard] Error fetching aggregated data:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الداشبورد', error: error.message });
  }
});

/**
 * GET /api/v1/admin/active-users
 * الحصول على المستخدمين النشطين على التاسكات (التيمر شغال)
 */
router.get('/active-users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const activeTimers = await prisma.devTimeLog.findMany({
      where: { isRunning: true },
      include: {
        dev_team_member: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        dev_task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            type: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    const formattedData = activeTimers.map(entry => {
      const now = new Date();
      const duration = Math.floor((now - new Date(entry.startTime)) / 1000);
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;

      return {
        id: entry.id,
        user: {
          id: entry.dev_team_member.user.id,
          name: `${entry.dev_team_member.user.firstName} ${entry.dev_team_member.user.lastName}`,
          email: entry.dev_team_member.user.email,
          avatar: entry.dev_team_member.user.avatar,
          role: entry.dev_team_member.role
        },
        task: {
          id: entry.dev_task.id,
          title: entry.dev_task.title,
          status: entry.dev_task.status,
          priority: entry.dev_task.priority,
          type: entry.dev_task.type
        },
        startTime: entry.startTime,
        duration: {
          total: duration,
          hours,
          minutes,
          seconds,
          formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        },
        description: entry.description
      };
    });

    res.json({
      success: true,
      data: {
        activeUsers: formattedData,
        count: formattedData.length
      },
      message: 'تم جلب المستخدمين النشطين بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting active users:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين النشطين',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/:systemName/toggle
 * تفعيل/تعطيل نظام
 */
router.post('/systems/:systemName/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled يجب أن يكون true أو false'
      });
    }

    // ✅ FIX: التحقق من وجود النظام قبل التبديل
    if (!systemManager.systems.has(systemName)) {
      return res.status(404).json({
        success: false,
        message: `النظام غير موجود: ${systemName}`
      });
    }

    const systemAuditService = require('../services/systemAuditService');

    // ... (existing imports)

    // ... inside toggle route after success
    const success = await systemManager.toggleSystem(systemName, isEnabled);

    if (success) {
      // ✅ AUDIT LOG
      await systemAuditService.logAction(
        req.user.id,
        'TOGGLE_SYSTEM',
        systemName,
        `System ${isEnabled ? 'Enabled' : 'Disabled'}`,
        { isEnabled, systemName }
      );

      res.json({
        success: true,
        data: {
          systemName,
          isEnabled
        },
        message: `تم ${isEnabled ? 'تفعيل' : 'تعطيل'} النظام بنجاح`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في تغيير حالة النظام'
      });
    }
  } catch (error) {
    console.error('❌ [SystemManagement] Error toggling system:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/:systemName/status
 * فحص حالة نظام معين
 */
router.get('/systems/:systemName/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const isEnabled = await systemManager.isSystemEnabled(systemName);

    res.json({
      success: true,
      data: {
        systemName,
        isEnabled
      },
      message: 'تم جلب حالة النظام بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/stats
 * الحصول على إحصائيات الأنظمة
 */
router.get('/systems/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await systemManager.getSystemStats();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب إحصائيات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/bulk-toggle
 * تفعيل/تعطيل عدة أنظمة مرة واحدة
 */
router.post('/systems/bulk-toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systems } = req.body; // [{ systemName, isEnabled }, ...]

    if (!Array.isArray(systems)) {
      return res.status(400).json({
        success: false,
        message: 'systems يجب أن يكون مصفوفة'
      });
    }

    const results = [];
    for (const system of systems) {
      const { systemName, isEnabled } = system;
      const success = await systemManager.toggleSystem(systemName, isEnabled);
      results.push({
        systemName,
        isEnabled,
        success
      });
    }

    res.json({
      success: true,
      data: results,
      message: 'تم تحديث الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error bulk toggling systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/initialize
 * تهيئة إعدادات الأنظمة
 */
router.post('/systems/initialize', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await systemManager.initializeSystemSettings();

    res.json({
      success: true,
      message: 'تم تهيئة إعدادات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error initializing systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تهيئة إعدادات الأنظمة',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/keys-status
 * الحصول على حالة أنظمة المفاتيح
 */
router.get('/systems/keys-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const status = await systemManager.getKeysSystemStatus();

    res.json({
      success: true,
      data: status,
      message: 'تم جلب حالة أنظمة المفاتيح بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting keys status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة أنظمة المفاتيح',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/key-rotation-strategy
 * ❌ DEPRECATED: Key rotation removed. Returns a fixed response.
 */
router.get('/systems/key-rotation-strategy', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const strategy = await systemManager.getKeyRotationStrategy();

    res.json({
      success: true,
      data: {
        strategy,
        message: t('system.key_rotation_removed')
      }
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting key rotation strategy:', error);
    res.status(500).json({
      success: false,
      message: t('system.key_rotation_error'),
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/key-rotation-strategy
 * ❌ DEPRECATED: Key rotation removed. This endpoint is a no-op.
 */
router.post('/systems/key-rotation-strategy', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await systemManager.setKeyRotationStrategy(req.body.strategy);

    res.json({
      success: true,
      message: t('system.key_rotation_removed')
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error setting key rotation strategy:', error);
    res.status(500).json({
      success: false,
      message: t('system.key_rotation_error'),
      error: error.message
    });
  }
});

module.exports = router;
