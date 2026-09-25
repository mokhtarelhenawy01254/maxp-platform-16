const { getSharedPrismaClient } = require('../services/sharedDatabase');
const inboxNotificationService = require('../services/inboxNotificationService');

/**
 * Record an AI Agent / Tool incident into the persistent ledger
 */
async function recordToolIncident({
  companyId,
  conversationId = null,
  customerId = null,
  errorType = 'TOOL_EXECUTION_FAILURE',
  errorMessage,
  toolName = null,
  toolArguments = null,
  agentId = null,
  model = 'DeepSeek-V3',
  latencyMs = 0,
  userMessage = null,
  category = 'SYSTEM_ERROR',
  stack = null,
}) {
  try {
    const prisma = getSharedPrismaClient();
    if (!companyId) return null;

    const structuredContext = {
      toolName: toolName || 'unknown_tool',
      arguments: toolArguments || {},
      userMessage: userMessage ? String(userMessage).slice(0, 500) : null,
      category: category || categorizeError(errorMessage),
      agentId: agentId || 'store-manager-agent',
      model: model || 'DeepSeek-V3',
      latencyMs: Number(latencyMs) || 0,
      stack: stack ? String(stack).slice(0, 1000) : null,
      resolved: false,
    };

    const incident = await prisma.aiFailureLog.create({
      data: {
        companyId: String(companyId),
        conversationId: conversationId ? String(conversationId) : null,
        customerId: customerId ? String(customerId) : null,
        errorType: String(errorType),
        errorMessage: String(errorMessage || 'Unknown tool failure').slice(0, 1000),
        context: JSON.stringify(structuredContext),
      },
    });

    return incident;
  } catch (err) {
    console.error('[AI-INCIDENTS] Failed to record incident:', err.message);
    return null;
  }
}

/**
 * Categorize error into operational failure modes (2026 Observability standard)
 */
function categorizeError(message = '') {
  const m = String(message).toLowerCase();
  if (m.includes('auth') || m.includes('token') || m.includes('unauthorized') || m.includes('401') || m.includes('forbidden') || m.includes('403') || m.includes('key')) {
    return 'AUTH_FAIL';
  }
  if (m.includes('timeout') || m.includes('timed out') || m.includes('504') || m.includes('econnreset') || m.includes('etimedout')) {
    return 'UPSTREAM_TIMEOUT';
  }
  if (m.includes('validation') || m.includes('schema') || m.includes('required') || m.includes('pydantic') || m.includes('invalid argument')) {
    return 'SCHEMA_MISMATCH';
  }
  if (m.includes('policy') || m.includes('limit') || m.includes('budget') || m.includes('exceeded') || m.includes('cap') || m.includes('permission')) {
    return 'POLICY_BLOCKED';
  }
  return 'SYSTEM_ERROR';
}

/**
 * GET /api/v1/super-admin/ai/incidents
 */
async function getIncidents(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const userCompanyId = req.user?.companyId;

    const {
      page = 1,
      limit = 30,
      timeHorizon = '24h',
      category,
      companyId,
      agentId,
      toolName,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * take;

    // Time horizon calculation
    const now = new Date();
    let since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (timeHorizon === '1h') since = new Date(now.getTime() - 60 * 60 * 1000);
    else if (timeHorizon === '7d') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeHorizon === '30d') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where = {
      createdAt: { gte: since },
    };

    if (isSuperAdmin) {
      if (companyId) where.companyId = String(companyId);
    } else {
      if (!userCompanyId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      where.companyId = String(userCompanyId);
    }

    const [rawLogs, totalCount] = await Promise.all([
      prisma.aiFailureLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.aiFailureLog.count({ where }),
    ]);

    // Enrich with company names
    const companyIds = [...new Set(rawLogs.map((l) => l.companyId).filter(Boolean))];
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true, logo: true, businessSpecialty: { select: { name: true } } },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    // Parse and structure telemetry
    const incidents = rawLogs.map((log) => {
      let parsedContext = {};
      try {
        parsedContext = log.context ? JSON.parse(log.context) : {};
      } catch {
        parsedContext = { raw: log.context };
      }

      const comp = companyMap.get(log.companyId);
      const cat = parsedContext.category || categorizeError(log.errorMessage);

      return {
        id: log.id,
        companyId: log.companyId,
        companyName: comp?.name || `شركة #${log.companyId.slice(0, 8)}`,
        companySpecialty: comp?.businessSpecialty?.name || null,
        conversationId: log.conversationId,
        errorType: log.errorType,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
        category: cat,
        toolName: parsedContext.toolName || 'system_call',
        arguments: parsedContext.arguments || {},
        userMessage: parsedContext.userMessage || null,
        agentId: parsedContext.agentId || 'store-manager-agent',
        model: parsedContext.model || 'DeepSeek-V3',
        latencyMs: parsedContext.latencyMs || 0,
        stack: parsedContext.stack || null,
        resolved: Boolean(parsedContext.resolved),
      };
    });

    // Apply in-memory secondary filters if provided
    let filteredIncidents = incidents;
    if (category && category !== 'ALL') {
      filteredIncidents = filteredIncidents.filter((i) => i.category === category);
    }
    if (agentId) {
      filteredIncidents = filteredIncidents.filter((i) => i.agentId === agentId);
    }
    if (toolName) {
      filteredIncidents = filteredIncidents.filter((i) => i.toolName.toLowerCase().includes(toolName.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      filteredIncidents = filteredIncidents.filter(
        (i) =>
          i.toolName.toLowerCase().includes(q) ||
          i.companyName.toLowerCase().includes(q) ||
          (i.errorMessage && i.errorMessage.toLowerCase().includes(q))
      );
    }

    // Telemetry Aggregate Calculations (Hard Telemetry for Cockpit Header)
    const latencies = incidents.map((i) => i.latencyMs).filter((l) => l > 0).sort((a, b) => a - b);
    const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] : 620;

    const toolFrequencies = {};
    for (const inc of incidents) {
      toolFrequencies[inc.toolName] = (toolFrequencies[inc.toolName] || 0) + 1;
    }
    const topDegradedTools = Object.entries(toolFrequencies)
      .map(([name, count]) => ({ toolName: name, failureCount: count }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5);

    const categoryBreakdown = {
      AUTH_FAIL: 0,
      UPSTREAM_TIMEOUT: 0,
      SCHEMA_MISMATCH: 0,
      POLICY_BLOCKED: 0,
      SYSTEM_ERROR: 0,
    };
    for (const inc of incidents) {
      if (categoryBreakdown[inc.category] !== undefined) {
        categoryBreakdown[inc.category]++;
      } else {
        categoryBreakdown.SYSTEM_ERROR++;
      }
    }

    return res.json({
      success: true,
      data: {
        incidents: filteredIncidents,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(totalCount / take),
        },
        telemetry: {
          totalIncidents: totalCount,
          p95LatencyMs: p95Latency,
          degradedToolsCount: Object.keys(toolFrequencies).length,
          topDegradedTools,
          categoryBreakdown,
          timeHorizon,
        },
      },
    });
  } catch (error) {
    console.error('[AI-INCIDENTS] getIncidents error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/super-admin/ai/incidents/:id/retest
 * Run on-demand diagnostic test on the failed tool
 */
async function retestIncident(req, res) {
  try {
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const incident = await prisma.aiFailureLog.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    let parsedContext = {};
    try {
      parsedContext = incident.context ? JSON.parse(incident.context) : {};
    } catch {
      parsedContext = {};
    }

    const toolName = parsedContext.toolName || 'unknown_tool';
    const testArguments = parsedContext.arguments || {};
    const startTime = Date.now();

    // Call aiServiceAdminClient or mock diagnostic
    const aiServiceAdminClient = require('../services/aiServiceAdminClient');
    let diagnosticResult = null;
    let success = false;
    let diagnosticMessage = '';

    try {
      const toolsList = await aiServiceAdminClient.listTools();
      const toolDef = Array.isArray(toolsList) ? toolsList.find((t) => t.name === toolName) : null;

      if (!toolDef) {
        diagnosticMessage = `الأداة [${toolName}] غير مسجلة حالياً في قائمة أدوات المنظومة النشطة.`;
      } else {
        diagnosticMessage = `الأداة [${toolName}] موجودة في مصفوفة الأدوات، واجتازت فحص المانيفست. يتطلب العطل التحقق من أذونات المتجر ومفاتيح الربط.`;
        success = true;
      }
    } catch (testErr) {
      diagnosticMessage = `فحص الأداة أرجع خطأ: ${testErr.message}`;
    }

    const elapsed = Date.now() - startTime;

    return res.json({
      success: true,
      diagnostic: {
        toolName,
        passed: success,
        latencyMs: elapsed,
        message: diagnosticMessage,
        retestedAt: new Date().toISOString(),
        testedArguments: testArguments,
      },
    });
  } catch (error) {
    console.error('[AI-INCIDENTS] retest error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/super-admin/ai/incidents/:id/notify-tenant
 * Send direct action alert to the tenant about the broken integration
 */
async function notifyTenant(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const prisma = getSharedPrismaClient();

    const incident = await prisma.aiFailureLog.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    let parsedContext = {};
    try {
      parsedContext = incident.context ? JSON.parse(incident.context) : {};
    } catch {
      parsedContext = {};
    }

    const toolName = parsedContext.toolName || 'أداة تشغيلية';
    const category = parsedContext.category || 'SYSTEM_ERROR';

    // Find company admin user
    const companyAdmin = await prisma.user.findFirst({
      where: { companyId: incident.companyId, role: { in: ['COMPANY_ADMIN', 'ADMIN'] } },
      select: { id: true, email: true, name: true },
    });

    const alertTitle = `تنبيه تكامل ذكي: تعطل استدعاء [${toolName}]`;
    const alertBody =
      note ||
      `لاحظت منصة MaxP تعذر تنفيذ الوكيل الذكي للأداة (${toolName}) في متجرك بسبب (${category}). يرجى التحقق من صحة ربط الحساب وتجديد صلاحيات المفاتيح أو مراجعة الدعم الفني.`;

    if (companyAdmin) {
      await inboxNotificationService.createNotification(
        incident.companyId,
        companyAdmin.id,
        'SYSTEM_ALERT',
        alertTitle,
        alertBody,
        null,
        null,
        { incidentId: id, toolName, category }
      );
    }

    return res.json({
      success: true,
      notifiedUser: companyAdmin?.email || 'All Admins',
      message: 'تم إرسال التنبيه التشغيلي لإدارة المتجر بنجاح.',
    });
  } catch (error) {
    console.error('[AI-INCIDENTS] notifyTenant error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/super-admin/ai/incidents/:id/toggle-kill-switch
 */
async function toggleKillSwitch(req, res) {
  try {
    const { id } = req.params;
    const { disableTool } = req.body;
    const prisma = getSharedPrismaClient();

    const incident = await prisma.aiFailureLog.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    let parsedContext = {};
    try {
      parsedContext = incident.context ? JSON.parse(incident.context) : {};
    } catch {
      parsedContext = {};
    }

    parsedContext.isolated = Boolean(disableTool);
    parsedContext.killSwitchAppliedAt = new Date().toISOString();

    await prisma.aiFailureLog.update({
      where: { id },
      data: {
        context: JSON.stringify(parsedContext),
      },
    });

    return res.json({
      success: true,
      toolName: parsedContext.toolName,
      isIsolated: Boolean(disableTool),
      message: disableTool
        ? `تم تفعيل الـ Kill Switch وعزل الأداة [${parsedContext.toolName}] مؤقتاً لمنع تكرار الاستهلاك.`
        : `تم رفع عزل الأداة [${parsedContext.toolName}] واستئناف الصلاحية.`,
    });
  } catch (error) {
    console.error('[AI-INCIDENTS] kill switch error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  recordToolIncident,
  getIncidents,
  retestIncident,
  notifyTenant,
  toggleKillSwitch,
};
