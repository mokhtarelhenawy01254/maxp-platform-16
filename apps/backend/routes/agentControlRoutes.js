/**
 * @module agentControlRoutes
 * @description Merchant-facing control-plane routes.
 * 9 routes proxy to Python, 12 routes Node-only.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();
router.use(verifyToken.authenticateToken);
const getCompanyId = (req) => req.user?.companyId || req.companyId;
const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (_) { return fallback; }
};

// ── 9 Proxy routes (Python is source of truth) ──────────────────────────

router.get('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const { status } = req.query;
    if (status === 'ARCHIVED') {
      const archivedAgents = await aiServiceAdminClient.listAgents(companyId, 'ARCHIVED');
      return res.json({ success: true, agents: archivedAgents || [], count: archivedAgents?.length || 0 });
    }
    const context = await aiServiceAdminClient.getManagerContext(companyId);
    return res.json({ success: true, agents: context?.agents || [], count: context?.agents?.length || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const isArchive = req.query.archive === 'true';
    let result;
    if (!isArchive) {
      result = await aiServiceAdminClient.deleteAgentPermanently(req.params.id, companyId);
      console.log('[AGENT] Agent permanently deleted via ai-service:', req.params.id);
    } else {
      result = await aiServiceAdminClient.archiveAgent(req.params.id, companyId);
      if (result && result.id) {
        console.log('[AGENT] Agent archived via ai-service:', result.id);
      }
    }
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get('/team-map', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.getTeamMap(companyId);
    return res.json(result || { success: true, tree: [], agents: [], count: 0 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profiles', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const context = await aiServiceAdminClient.getManagerContext(companyId);
    return res.json({ success: true, profiles: context?.profiles || [], count: context?.profiles?.length || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tools', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.listTools();
    if (Array.isArray(result)) {
      return res.json({ success: true, tools: result, count: result.length, catalogSource: 'python_tool_registry' });
    }
    return res.json({ success: true, tools: [], count: 0, catalogSource: 'python_tool_registry' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/tools/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.status(422).json({ success: false, error: 'description is required' });
    }
    const result = await aiServiceAdminClient.updateToolMeta(name, { description: description.trim() });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/skills', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    let skills = [];
    if (companyId) {
      const context = await aiServiceAdminClient.getManagerContext(companyId);
      skills = (context && context.skills) || [];
    } else {
      skills = await aiServiceAdminClient.listSkills();
    }
    return res.json({ success: true, skills, count: skills.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/skills/company', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    const rows = await prisma.companySkill.findMany({
      where: { companyId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    let aiSkills = [];
    try {
      aiSkills = await prisma.$queryRaw`
        SELECT id, name, description, instructions, 
               "allowed_tools"::text AS tools, 
               channels::text AS channels, 
               priority, enabled, "created_at" AS "createdAt"
        FROM ai.skills 
        WHERE company_id = ${companyId}
        ORDER BY priority DESC, created_at ASC
      `;
    } catch (e) {
      console.warn('[agentControl] Could not query ai.skills:', e.message);
    }

    const existingIds = new Set(rows.map((r) => r.id));
    const combined = rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      instructions: s.instructions,
      tools: parseJson(s.tools, []),
      channels: parseJson(s.channels, []),
      priority: s.priority,
      enabled: s.enabled,
      createdAt: s.createdAt,
    }));

    for (const s of aiSkills) {
      if (!existingIds.has(s.id)) {
        combined.push({
          id: s.id,
          name: s.name,
          description: s.description || '',
          instructions: s.instructions,
          tools: parseJson(s.tools, []),
          channels: parseJson(s.channels, []),
          priority: s.priority,
          enabled: s.enabled,
          createdAt: s.createdAt,
        });
      }
    }

    return res.json({
      success: true,
      skills: combined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/skills', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const { name, description, instructions, tools, channels, priority, enabled } = req.body;
    if (!name || !instructions) {
      return res.status(400).json({ success: false, error: 'name and instructions are required' });
    }
    const prisma = getSharedPrismaClient();
    const skill = await prisma.companySkill.create({
      data: {
        companyId,
        name: name.trim(),
        description: description || '',
        instructions: instructions.trim(),
        tools: JSON.stringify(Array.isArray(tools) ? tools : []),
        channels: JSON.stringify(Array.isArray(channels) ? channels : []),
        priority: Number(priority) || 0,
        enabled: enabled !== false,
      },
    });
    return res.status(201).json({
      success: true,
      skill: {
        ...skill,
        tools: parseJson(skill.tools, []),
        channels: parseJson(skill.channels, []),
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'اسم المهارة مستخدم بالفعل' });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    let deletedCount = 0;
    try {
      const deleted = await prisma.companySkill.deleteMany({
        where: { id: req.params.id, companyId },
      });
      deletedCount += deleted.count;
    } catch (_) {}

    try {
      const deletedAi = await prisma.$executeRaw`
        DELETE FROM ai.skills 
        WHERE id = ${req.params.id} AND company_id = ${companyId}
      `;
      deletedCount += Number(deletedAi || 0);
    } catch (_) {}

    if (deletedCount === 0) return res.status(404).json({ success: false, error: 'Skill not found' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.spawnAgent({
      companyId, name: req.body?.name, role: req.body?.role,
      description: req.body?.description, icon: req.body?.icon,
      templateSlug: req.body?.templateSlug, model: req.body?.model,
      parentId: req.body?.parentId, allowedTools: req.body?.allowedTools,
      allowedSkills: req.body?.allowedSkills, allowedChannels: req.body?.allowedChannels,
      persona: req.body?.persona, guardrails: req.body?.guardrails,
      budget: req.body?.budget, config: req.body?.config,
    });
    // 2026: ai-service manages agents; no dual-write to public.company_agents
    if (result && result.id) {
      console.log('[AGENT] Agent spawned via ai-service:', result.id);
    }
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/agents/:id/status', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const nextStatus = req.body?.status === 'PAUSED' || req.body?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const pyResult = await aiServiceAdminClient.updateAgentStatus(req.params.id, nextStatus);
    if (!pyResult) return res.status(502).json({ success: false, error: 'AI service unreachable' });
    return res.json({
      success: true,
      agent: {
        id: pyResult.id, name: pyResult.name, role: pyResult.role,
        status: pyResult.status === 'INACTIVE' ? 'PAUSED' : pyResult.status,
        model: pyResult.model, templateSlug: pyResult.template_slug,
        persona: pyResult.persona || {},
      },
    });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

router.put('/agents/:id/persona', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.updateAgent(req.params.id, companyId, {
      persona: { soulInstructions: req.body?.soulInstructions || '' },
    });
    return res.json(result || { success: true });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

// ── 12 Node-only routes (no Python equivalent yet) ─────────────────────

router.get('/available-models', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    const models = await prisma.aiModelConfig.findMany({
      where: { isEnabled: true, aiKey: { isActive: true, OR: [{ companyId }, { keyType: 'CENTRAL' }] } },
      include: { aiKey: { select: { id: true, name: true, provider: true, keyType: true, companyId: true, priority: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json({
      success: true,
      models: models.map(m => ({
        id: m.id, modelName: m.modelName, provider: m.aiKey.provider,
        keyId: m.aiKey.id, keyName: m.aiKey.name, keyType: m.aiKey.keyType,
        priority: m.priority, scope: m.aiKey.companyId === companyId ? 'company' : 'central',
      })),
      count: models.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/agents/:id/files', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.getAgentFiles(req.params.id, companyId);
    return res.json(result || { success: true, agent: {}, files: {}, tools: [], skills: [] });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

router.put('/agents/:id/files', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const files = req.body?.files || {};
    const payload = {
      name: req.body?.name, role: req.body?.role, model: req.body?.model,
      description: req.body?.description, icon: req.body?.icon, config: req.body?.config,
      allowedTools: req.body?.allowedTools, allowedSkills: req.body?.allowedSkills,
      allowedChannels: req.body?.allowedChannels,
      soulInstructions: files['SOUL.md'] ?? req.body?.soulInstructions,
      agentInstructions: files['AGENTS.md'] ?? req.body?.agentInstructions,
      toolsInstructions: files['TOOLS.md'] ?? req.body?.toolsInstructions,
      personaInstructions: files['PERSONA.md'] ?? req.body?.personaInstructions,
      persona: req.body?.persona,
      style: req.body?.style, policies: req.body?.policies,
      guardrails: req.body?.guardrails, budget: req.body?.budget,
      custom_instructions: req.body?.customInstructions,
    };
    const result = await aiServiceAdminClient.updateAgent(req.params.id, companyId, payload);
    // 2026: ai-service manages agents; no dual-write to public.company_agents
    if (result && result.id) {
      console.log('[AGENT] Agent updated via ai-service:', result.id);
    }
    return res.json(result || { success: true, agent: {}, files: {}, tools: [], skills: [] });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

router.post('/agents/:id/run-task', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.chatWithAgent({
      companyId, agentId: req.params.id,
      message: req.body?.task || req.body?.title || '',
      threadId: req.body?.traceId || `run-task-${Date.now()}`,
    });
    return res.json(result || { success: true });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

router.post('/agents/orchestrate', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiServiceAdminClient.chatWithAgent({
      companyId, agentId: '',
      message: req.body?.goal || 'أنجز المهمة الموكلة',
      threadId: `orchestrate-${Date.now()}`,
    });
    return res.json(result || { success: true, result: {} });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

// ── Scheduler (in-memory) ──────────────────────────────────────────────

const aiCronSchedulerService = require('../services/aiCronSchedulerService');

router.get('/scheduler/jobs', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const jobs = await aiCronSchedulerService.listJobs(companyId);
    return res.json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/scheduler/jobs', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const job = await aiCronSchedulerService.createJob(companyId, {
      description: req.body?.description,
      naturalInput: req.body?.naturalInput,
      taskType: req.body?.taskType,
      payload: req.body?.payload || {},
    });
    return res.status(201).json({ success: true, job });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/scheduler/jobs/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiCronSchedulerService.deleteJob(companyId, req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(404).json({ success: false, error: error.message });
  }
});

router.post('/scheduler/jobs/:id/run', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiCronSchedulerService.executeJob(companyId, req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── Settings & Audit ────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const data = await aiServiceAdminClient.getGuardrails(companyId);
    const ms = data?.modelSettings || {};
    const ws = data?.writeToolScopes || {};
    const p = ms.agenticPolicies || {};
    return res.json({ success: true, settings: {
      maxDiscountPercent: ws.maxDiscountPercent ?? p.maxDiscountPercent ?? 20,
      maxPriceIncreasePercent: p.maxPriceIncreasePercent ?? ws.maxPriceChangePercent ?? 15,
      maxPriceDecreasePercent: p.maxPriceDecreasePercent ?? ws.maxPriceChangePercent ?? 25,
      dailyBudgetUSD: ms.dailyCostLimit ?? p.dailyBudgetUSD ?? 5,
      requireApprovalForWrite: data?.humanApprovalRequiredForWrite ?? true,
      emergencyStopActive: Boolean(p.emergencyStopActive),
      blockedProducts: Array.isArray(ws.blockedProducts) ? ws.blockedProducts : [],
      blockedActions: Array.isArray(ws.blockedActions) ? ws.blockedActions : [],
      maxRepliesPerCustomer: data?.maxRepliesPerCustomer ?? 5,
    } });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const inc = req.body || {};
    const result = await aiServiceAdminClient.updateGuardrails(companyId, {
      modelSettings: {
        dailyCostLimit: Number(inc.dailyBudgetUSD) || 5,
        agenticPolicies: {
          maxPriceIncreasePercent: Number(inc.maxPriceIncreasePercent) || 15,
          maxPriceDecreasePercent: Number(inc.maxPriceDecreasePercent) || 25,
          dailyBudgetUSD: Number(inc.dailyBudgetUSD) || 5,
          emergencyStopActive: Boolean(inc.emergencyStopActive),
        },
      },
      writeToolScopes: {
        maxDiscountPercent: Number(inc.maxDiscountPercent) || 20,
        maxPriceChangePercent: Math.max(Number(inc.maxPriceIncreasePercent) || 0, Number(inc.maxPriceDecreasePercent) || 0) || 30,
        blockedProducts: Array.isArray(inc.blockedProducts) ? inc.blockedProducts : [],
        blockedActions: Array.isArray(inc.blockedActions) ? inc.blockedActions : [],
      },
      humanApprovalRequiredForWrite: inc.requireApprovalForWrite !== false,
      maxRepliesPerCustomer: Number(inc.maxRepliesPerCustomer) || 5,
    });
    return res.json({ success: true, settings: req.body });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/audit-trail', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    let logs = [];
    try {
      logs = await prisma.activityLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (_) {
      try {
        logs = await prisma.$queryRaw`
          SELECT id, "companyId", action, category, description, severity, "isSuccess", "createdAt", metadata
          FROM activity_logs
          WHERE "companyId" = ${companyId}
          ORDER BY "createdAt" DESC
          LIMIT ${limit}
        `;
      } catch (err) {
        console.warn('[agentControl] Could not query activity_logs:', err.message);
      }
    }

    const formatted = (logs || []).map((l) => ({
      id: l.id,
      action: l.action,
      category: l.category || 'AI_AGENT',
      description: l.description,
      severity: l.severity || 'INFO',
      isSuccess: l.isSuccess !== false,
      createdAt: l.createdAt,
      metadata: typeof l.metadata === 'string' ? parseJson(l.metadata, {}) : (l.metadata || {}),
    }));

    return res.json({
      success: true,
      logs: formatted,
      count: formatted.length,
      summary: {
        total: formatted.length,
        aiAgentEvents: formatted.filter((l) => l.category === 'AI_AGENT').length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
