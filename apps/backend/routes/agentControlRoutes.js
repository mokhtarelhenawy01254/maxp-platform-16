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
    const result = await aiServiceAdminClient.archiveAgent(req.params.id, companyId);
    // 2026: ai-service manages agents; no dual-write to public.company_agents
    if (result && result.id) {
      console.log('[AGENT] Agent archived via ai-service:', result.id);
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
    return res.json({
      success: true,
      skills: rows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        instructions: s.instructions,
        tools: parseJson(s.tools, []),
        channels: parseJson(s.channels, []),
        priority: s.priority,
        enabled: s.enabled,
        createdAt: s.createdAt,
      })),
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
    const deleted = await prisma.companySkill.deleteMany({
      where: { id: req.params.id, companyId },
    });
    if (deleted.count === 0) return res.status(404).json({ success: false, error: 'Skill not found' });
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
      templateSlug: req.body?.templateSlug, model: req.body?.model,
      parentId: req.body?.parentId, allowedTools: req.body?.allowedTools,
      allowedSkills: req.body?.allowedSkills, allowedChannels: req.body?.allowedChannels,
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
      allowedTools: req.body?.allowedTools, allowedSkills: req.body?.allowedSkills,
      soulInstructions: files['SOUL.md'] ?? req.body?.soulInstructions,
      agentInstructions: files['AGENTS.md'] ?? req.body?.agentInstructions,
      toolsInstructions: files['TOOLS.md'] ?? req.body?.toolsInstructions,
      personaInstructions: files['PERSONA.md'] ?? req.body?.personaInstructions,
      style: req.body?.style, policies: req.body?.policies,
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

const cronParser = require('node-cron');
const jobStore = new Map();

const guessCron = (text) => {
  const lower = (text || '').toLowerCase();
  if (lower.includes('كل') && (lower.includes('ساعة') || lower.includes('ساعه'))) return '0 * * * *';
  if (lower.includes('كل') && (lower.includes('يوم') || lower.includes('يوماً'))) return '0 0 * * *';
  if (lower.includes('صباح') || lower.includes('كل يوم')) return '0 8 * * *';
  if (lower.includes('مساء')) return '0 20 * * *';
  if (lower.includes('اثنين') || lower.includes('الاثنين')) return '0 9 * * 1';
  if (lower.includes('ثلاثاء') || lower.includes('الثلاثاء')) return '0 9 * * 2';
  if (lower.includes('اربعاء') || lower.includes('الأربعاء')) return '0 9 * * 3';
  if (lower.includes('خميس') || lower.includes('الخميس')) return '0 9 * * 4';
  if (lower.includes('جمعة') || lower.includes('الجمعة')) return '0 9 * * 5';
  if (lower.includes('سبت') || lower.includes('السبت')) return '0 9 * * 6';
  if (lower.includes('شهر') || lower.includes('شهرياً') || lower.includes('شهري')) return '0 0 1 * *';
  if (cronParser.validate(text.trim())) return text.trim();
  return '0 8 * * *';
};

router.get('/scheduler/jobs', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  return res.json({ success: true, jobs: jobStore.get(companyId) || [] });
});

router.post('/scheduler/jobs', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  const jobs = jobStore.get(companyId) || [];
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const desc = req.body?.description || req.body?.naturalInput || '';
  const job = { id, description: desc, cronExpression: guessCron(desc),
    taskType: req.body?.taskType || 'GENERAL', status: 'ACTIVE',
    lastRun: null, lastStatus: null, nextRun: '—', runCount: 0,
    payload: req.body?.payload || {}, createdAt: new Date().toISOString() };
  jobs.unshift(job);
  jobStore.set(companyId, jobs);
  return res.status(201).json({ success: true, job });
});

router.delete('/scheduler/jobs/:id', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  const jobs = jobStore.get(companyId);
  if (!jobs) return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
  const idx = jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
  jobs.splice(idx, 1);
  if (jobs.length === 0) jobStore.delete(companyId);
  return res.json({ success: true });
});

router.post('/scheduler/jobs/:id/run', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  const jobs = jobStore.get(companyId);
  const job = jobs?.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
  try {
    const result = await aiServiceAdminClient.chatWithAgent({
      companyId, agentId: '',
      message: job.description || 'نفذ المهمة المجدولة',
      threadId: `scheduler_${companyId}_${job.id}`,
    });
    const status = result && result.success !== false ? 'SUCCESS' : 'FAILED';
    const j = jobs.find(j => j.id === job.id);
    if (j) { j.lastRun = new Date().toISOString(); j.lastStatus = status; j.runCount = (j.runCount || 0) + 1; }
    return res.json({ success: true, execution: { status, reply: result?.reply || '' } });
  } catch (_) {
    return res.json({ success: true, execution: { status: 'FAILED', reply: '' } });
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
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  return res.json({ success: true, logs: [], summary: {} });
});

module.exports = router;
