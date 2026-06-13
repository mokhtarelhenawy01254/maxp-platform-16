/**
 * @module agentControlRoutes
 * @description Merchant-facing control-plane routes for AI agents, schedules,
 * audit logs, and guardrail settings.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const agentProvisioningService = { listAgents: () => [], spawn: async () => ({}), getAgent: () => ({}), updateAgent: async () => {} };
const agentManagerService = { getManagerAgent: async () => ({}), ensureFacebookMessengerAgent: async () => {}, archiveAgent: async () => ({}), updateAgentProfile: async () => ({}), runAgentTask: async () => ({}) };
const agentProfileLoaderService = {
  loadProfile: (slug) => {
    if (!slug) return null;
    try {
      const db = getSharedPrismaClient();
      return db.agentDefinition.findUnique({ where: { type: slug } });
    } catch (_) { return null; }
  },
  listProfiles: () => {
    try {
      const db = getSharedPrismaClient();
      return db.agentDefinition.findMany({ where: { isBuiltIn: true } });
    } catch (_) { return []; }
  },
};
const toolRegistryService = { getTool: () => null, listTools: () => [] };
const skillRegistryService = {
  listSkills: (companyId) => {
    try {
      const db = getSharedPrismaClient();
      return db.companySkill.findMany({ where: { companyId, enabled: true }, orderBy: { priority: 'asc' } });
    } catch (_) { return []; }
  },
  getSkillsForIds: (companyId, ids = []) => {
    if (!ids.length) return [];
    try {
      const db = getSharedPrismaClient();
      return db.companySkill.findMany({ where: { companyId, name: { in: ids }, enabled: true } });
    } catch (_) { return []; }
  },
};
const { getModelCapabilities } = { getModelCapabilities: () => ({}) };
const cronParser = require('node-cron');
const jobStore = new Map(); // companyId -> job[]

const naturalLanguageCronService = {
  getJobs: (companyId) => jobStore.get(companyId) || [],
  scheduleJob: (companyId, body) => {
    const jobs = jobStore.get(companyId) || [];
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const description = body.description || body.naturalInput || '';
    const cronExpression = guessCronFromText(description);
    const job = {
      id, description, cronExpression, taskType: body.taskType || 'GENERAL',
      status: 'ACTIVE', lastRun: null, lastStatus: null, nextRun: '—', runCount: 0,
      payload: body.payload || {}, createdAt: new Date().toISOString(),
    };
    jobs.unshift(job);
    jobStore.set(companyId, jobs);
    return { success: true, job };
  },
  cancelJob: (companyId, jobId) => {
    const jobs = jobStore.get(companyId);
    if (!jobs) return false;
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx === -1) return false;
    jobs.splice(idx, 1);
    if (jobs.length === 0) jobStore.delete(companyId);
    else jobStore.set(companyId, jobs);
    return true;
  },
};

const routineExecutorService = {
  executeRoutine: async (companyId, job, payload) => {
    try {
      const result = await aiServiceAdminClient.chatWithAgent({
        companyId, agentId: '', message: job.description || 'نفذ المهمة المجدولة',
        threadId: `scheduler_${companyId}_${job.id}`,
      });
      const status = result && result.success !== false ? 'SUCCESS' : 'FAILED';
      // Update job in store
      const jobs = jobStore.get(companyId);
      if (jobs) {
        const j = jobs.find(j => j.id === job.id);
        if (j) { j.lastRun = new Date().toISOString(); j.lastStatus = status; j.runCount = (j.runCount || 0) + 1; }
      }
      return { status, reply: result?.reply || '' };
    } catch (_) {
      return { status: 'FAILED', reply: '' };
    }
  },
};

function guessCronFromText(text) {
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
  return '0 8 * * *'; // default: daily 8am
}
const agentAuditTrailService = { getDecisionLog: async () => [], getCostSummary: async () => ({}) };
const aiRuntimeService = { getModelManager: () => ({}) };
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;
const sqlQuote = (value = '') => String(value).replace(/'/g, "''");

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const serializeAgent = (agent) => ({
  id: agent.id,
  name: agent.name,
  role: agent.role,
  status: agent.status === 'INACTIVE' ? 'PAUSED' : agent.status,
  avatar: agent.persona?.avatar || 'AI',
  soulInstructions: agent.persona?.soulInstructions || agent.persona?.instructions || '',
  allowedTools: typeof agent.getTools === 'function' ? agent.getTools() : [],
  allowedSkills: agent.getSkills ? agent.getSkills() : [],
  templateSlug: agent.templateSlug || agent.persona?.templateSlug || null,
  version: agent.version || agent.persona?.version || null,
  parentId: agent.parentId || null,
  lastActive: agent.createdAt,
  memorySize: agent.persona?.memorySize || 0,
  model: agent.model,
  persona: agent.persona || {},
  policies: agent.policies || {},
});

const buildAgentFiles = (agent) => {
  let profile = null;
  let profileSettings = {};
  if (agent.templateSlug) {
    try {
      const p = agentProfileLoaderService.loadProfile(agent.templateSlug);
      if (p) {
        profile = p;
        profileSettings = (() => { try { return JSON.parse(p.settings || '{}'); } catch { return {}; } })();
      }
    } catch (_) {
      profile = null;
    }
  }
  const persona = agent.persona || {};
  const skillDetails = skillRegistryService.getSkillsForIds(agent.getSkills ? agent.getSkills() : []);
  const toolDetails = (typeof agent.getTools === 'function' ? agent.getTools() : []).map(name => toolRegistryService.getTool(name)).filter(Boolean);

  return {
    profile: profile
      ? {
        slug: profile.type,
        name: profile.name,
        role: profileSettings.role || '',
        version: profileSettings.version || '1.0.0',
        modelPolicy: profileSettings.modelPolicy || null,
      }
      : null,
    files: {
      'SOUL.md': persona.soulInstructions || profileSettings?.instructions?.soul || '',
      'AGENTS.md': persona.agentInstructions || profileSettings?.instructions?.agents || '',
      'TOOLS.md': persona.toolsInstructions || profileSettings?.instructions?.tools || '',
      'SKILLS.json': JSON.stringify({
        allowedSkills: agent.getSkills ? agent.getSkills() : [],
        skills: skillDetails.map(skill => ({
          id: skill.id,
          displayName: skill.displayName,
          version: skill.version,
          description: skill.description,
          allowedTools: skill.allowedTools,
          requiresHumanApproval: skill.requiresHumanApproval,
        })),
      }, null, 2),
    },
    tools: toolDetails,
    skills: skillDetails,
  };
};

const loadAgentOrgMetadata = async (companyId, agentId) => {
  try {
    const prisma = getSharedPrismaClient();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        ca."departmentId",
        ca."managerType",
        ca."createdBy",
        ca."createdAt",
        ad."key" AS "departmentKey",
        ad."name" AS "departmentName",
        ad."icon" AS "departmentIcon"
      FROM "company_agents" ca
      LEFT JOIN "agent_departments" ad ON ad."id" = ca."departmentId"
      WHERE ca."companyId" = '${sqlQuote(companyId)}'
        AND ca."id" = '${sqlQuote(agentId)}'
      LIMIT 1
    `);
    return rows[0] || {};
  } catch (_) {
    return {};
  }
};

const applyAgentOrgMetadata = async (companyId, agents = []) => {
  try {
    const prisma = getSharedPrismaClient();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        ca."id",
        ca."departmentId",
        ca."managerType",
        ca."createdBy",
        ca."createdAt",
        ad."key" AS "departmentKey",
        ad."name" AS "departmentName",
        ad."icon" AS "departmentIcon"
      FROM "company_agents" ca
      LEFT JOIN "agent_departments" ad ON ad."id" = ca."departmentId"
      WHERE ca."companyId" = '${sqlQuote(companyId)}'
    `);
    const byId = new Map(rows.map(row => [row.id, row]));
    return agents.map(agent => ({ ...agent, ...(byId.get(agent.id) || {}) }));
  } catch (_) {
    return agents;
  }
};

const buildTeamTree = (agents) => {
  const nodeById = new Map(agents.map(agent => [
    agent.id,
    {
      ...(typeof agent.getTools === 'function' ? serializeAgent(agent) : agent),
      children: [],
    }
  ]));
  const roots = [];

  for (const agent of agents) {
    const node = nodeById.get(agent.id);
    const parent = agent.parentId ? nodeById.get(agent.parentId) : null;
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.sort((a, b) => (a.role === 'CEO' ? -1 : b.role === 'CEO' ? 1 : a.name.localeCompare(b.name)));
  return roots;
};

const buildSettings = (aiSetting) => {
  const modelSettings = parseJson(aiSetting?.modelSettings);
  const writeToolScopes = parseJson(aiSetting?.writeToolScopes);
  const policy = modelSettings.agenticPolicies || {};

  return {
    maxDiscountPercent: writeToolScopes.maxDiscountPercent ?? policy.maxDiscountPercent ?? 20,
    maxPriceIncreasePercent: policy.maxPriceIncreasePercent ?? writeToolScopes.maxPriceChangePercent ?? 15,
    maxPriceDecreasePercent: policy.maxPriceDecreasePercent ?? writeToolScopes.maxPriceChangePercent ?? 25,
    dailyBudgetUSD: modelSettings.dailyCostLimit ?? policy.dailyBudgetUSD ?? 5,
    requireApprovalForWrite: aiSetting?.humanApprovalRequiredForWrite ?? true,
    emergencyStopActive: Boolean(policy.emergencyStopActive),
    blockedProducts: Array.isArray(writeToolScopes.blockedProducts) ? writeToolScopes.blockedProducts : [],
    blockedActions: Array.isArray(writeToolScopes.blockedActions) ? writeToolScopes.blockedActions : [],
    maxRepliesPerCustomer: aiSetting?.maxRepliesPerCustomer ?? 5,
  };
};

router.get('/agents', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  await agentManagerService.getManagerAgent(companyId).catch(() => {});
  await agentManagerService.ensureFacebookMessengerAgent(companyId).catch(() => {});
  const agents = await applyAgentOrgMetadata(companyId, agentProvisioningService.listAgents(companyId).map(serializeAgent));
  return res.json({ success: true, agents, count: agents.length });
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await agentManagerService.archiveAgent(companyId, req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get('/team-map', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  await agentManagerService.ensureFacebookMessengerAgent(companyId).catch(() => {});
  const agents = await applyAgentOrgMetadata(companyId, agentProvisioningService.listAgents(companyId).map(serializeAgent));
  return res.json({
    success: true,
    tree: buildTeamTree(agents),
    agents,
    count: agents.length,
  });
});

router.get('/profiles', async (req, res) => {
  try {
    const dbProfiles = await agentProfileLoaderService.listProfiles();
    const profiles = dbProfiles.map(profile => {
      const s = (() => { try { return JSON.parse(profile.settings || '{}'); } catch { return {}; } })();
      return {
        slug: profile.type,
        name: profile.name,
        role: s.role || '',
        version: s.version || '1.0.0',
        modelPolicy: s.modelPolicy || null,
        allowedTools: s.allowedTools || [],
        allowedSkills: s.allowedSkills || [],
        instructions: s.instructions || null,
      };
    });
    return res.json({ success: true, profiles, count: profiles.length });
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
  } catch (_) {}
  // Fallback: return tools from the local Node registry
  const tools = toolRegistryService.listTools();
  return res.json({ success: true, tools, count: tools.length, catalogSource: 'node_tool_registry' });
});

router.get('/skills', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const skills = await skillRegistryService.listSkills(companyId);
    return res.json({ success: true, skills: skills || [], count: (skills || []).length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/available-models', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    const models = await prisma.aiModelConfig.findMany({
      where: {
        isEnabled: true,
        aiKey: {
          isActive: true,
          OR: [
            { companyId },
            { keyType: 'CENTRAL' },
          ],
        },
      },
      include: {
        aiKey: {
          select: {
            id: true,
            name: true,
            provider: true,
            keyType: true,
            companyId: true,
            priority: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    const data = models.map(model => ({
      id: model.id,
      modelName: model.modelName,
      provider: model.aiKey.provider,
      keyId: model.aiKey.id,
      keyName: model.aiKey.name,
      keyType: model.aiKey.keyType,
      priority: model.priority,
      scope: model.aiKey.companyId === companyId ? 'company' : 'central',
      agentSuitability: getModelCapabilities(model.aiKey.provider, model.modelName),
    }));
    return res.json({ success: true, models: data, count: data.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const { name, role, soulInstructions, allowedTools, allowedSkills, model, templateSlug, parentId } = req.body || {};
    const agent = await agentProvisioningService.spawn(companyId, {
      name,
      role,
      parentId,
      model,
      allowedTools,
      allowedSkills,
      templateSlug,
      persona: { soulInstructions },
    });
    return res.status(201).json({ success: true, agent: serializeAgent(agent) });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/agents/:id/files', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });
  const agent = agentProvisioningService.getAgent(companyId, req.params.id);
  if (!agent) return res.status(404).json({ error: 'AGENT_NOT_FOUND' });
  const org = await loadAgentOrgMetadata(companyId, req.params.id);
  return res.json({
    success: true,
    agent: { ...serializeAgent(agent), ...org },
    ...buildAgentFiles(agent),
  });
});

router.put('/agents/:id/files', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const files = req.body?.files || {};
    const payload = {
      agentId: req.params.id,
      name: req.body?.name,
      role: req.body?.role,
      model: req.body?.model,
      allowedTools: req.body?.allowedTools,
      allowedSkills: req.body?.allowedSkills,
      soulInstructions: files['SOUL.md'] ?? req.body?.soulInstructions,
      agentInstructions: files['AGENTS.md'] ?? req.body?.agentInstructions,
      toolsInstructions: files['TOOLS.md'] ?? req.body?.toolsInstructions,
      style: req.body?.style,
      policies: req.body?.policies,
      requestedBy: req.user?.id || null,
      source: 'merchant-agent-files',
      traceId: req.body?.traceId,
    };
    const result = await agentManagerService.updateAgentProfile(companyId, payload);
    const agent = agentProvisioningService.getAgent(companyId, req.params.id);
    return res.json({
      ...result,
      agent: agent ? { ...serializeAgent(agent), ...(await loadAgentOrgMetadata(companyId, req.params.id)) } : result.agent,
      ...(agent ? buildAgentFiles(agent) : {}),
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/agents/:id/run-task', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await agentManagerService.runAgentTask(companyId, {
      agentId: req.params.id,
      task: req.body?.task,
      title: req.body?.title,
      metadata: req.body?.metadata,
      requestedBy: req.user?.id || null,
      traceId: req.body?.traceId,
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/agents/orchestrate', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const manager = await agentManagerService.getManagerAgent(companyId);
    manager.setModelManager(aiRuntimeService.getModelManager());
    const result = await manager.orchestrateMultiAgentWorkflow({
      goal: req.body?.goal,
      agents: req.body?.agents || [],
      constraints: req.body?.constraints || {},
    });
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/agents/:id/status', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const nextStatus = req.body?.status === 'PAUSED' || req.body?.status === 'INACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE';

    // Delegate to Python ai-service (single source of truth)
    const pyResult = await aiServiceAdminClient.updateAgentStatus(req.params.id, nextStatus);
    if (!pyResult) {
      return res.status(502).json({ success: false, error: 'AI service unreachable' });
    }

    return res.json({
      success: true,
      agent: {
        id: pyResult.id,
        name: pyResult.name,
        role: pyResult.role,
        status: pyResult.status === 'INACTIVE' ? 'PAUSED' : pyResult.status,
        model: pyResult.model,
        templateSlug: pyResult.template_slug,
        persona: pyResult.persona || {},
      },
    });
  } catch (error) {
    return res.status(502).json({ success: false, error: 'AI service unreachable: ' + (error.message || 'connection failed') });
  }
});

router.put('/agents/:id/persona', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const agent = agentProvisioningService.getAgent(companyId, req.params.id);
  if (!agent) return res.status(404).json({ error: 'AGENT_NOT_FOUND' });

  agentProvisioningService.updateAgent(companyId, req.params.id, {
    persona: { soulInstructions: req.body?.soulInstructions || '' },
    audit: { requestedBy: req.user?.id || null, source: 'legacy-persona-route' },
  }).then(updated => {
    res.json({ success: true, agent: serializeAgent(updated) });
  }).catch(error => {
    res.status(400).json({ success: false, error: error.message });
  });
});

router.get('/scheduler/jobs', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  return res.json({ success: true, jobs: naturalLanguageCronService.getJobs(companyId) });
});

router.post('/scheduler/jobs', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const result = naturalLanguageCronService.scheduleJob(companyId, req.body || {});
  if (!result.success) return res.status(400).json(result);
  return res.status(201).json(result);
});

router.delete('/scheduler/jobs/:id', (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const cancelled = naturalLanguageCronService.cancelJob(companyId, req.params.id);
  if (!cancelled) return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
  return res.json({ success: true });
});

router.post('/scheduler/jobs/:id/run', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const job = naturalLanguageCronService.getJobs(companyId).find((item) => item.id === req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });

  const execution = await routineExecutorService.executeRoutine(companyId, job, job.payload || {});
  return res.json({ success: true, execution });
});

router.get('/audit-trail', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const logs = await agentAuditTrailService.getDecisionLog(companyId, {
    limit: Number(req.query.limit) || 100,
    action: req.query.action || undefined,
    agentId: req.query.agentId || undefined,
    traceId: req.query.traceId || undefined,
  });
  const summary = await agentAuditTrailService.getCostSummary(companyId);
  return res.json({ success: true, logs, summary });
});

router.get('/settings', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const prisma = getSharedPrismaClient();
  const aiSetting = await prisma.aiSetting.findUnique({ where: { companyId } });
  return res.json({ success: true, settings: buildSettings(aiSetting) });
});

router.put('/settings', async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'companyId is required' });

  const prisma = getSharedPrismaClient();
  const existing = await prisma.aiSetting.findUnique({ where: { companyId } });
  const currentModelSettings = parseJson(existing?.modelSettings);
  const currentWriteScopes = parseJson(existing?.writeToolScopes);
  const incoming = req.body || {};
  const maxPriceChangePercent = Math.max(
    Number(incoming.maxPriceIncreasePercent) || 0,
    Number(incoming.maxPriceDecreasePercent) || 0,
  );

  const modelSettings = {
    ...currentModelSettings,
    dailyCostLimit: Number(incoming.dailyBudgetUSD) || 5,
    agenticPolicies: {
      ...(currentModelSettings.agenticPolicies || {}),
      maxPriceIncreasePercent: Number(incoming.maxPriceIncreasePercent) || 15,
      maxPriceDecreasePercent: Number(incoming.maxPriceDecreasePercent) || 25,
      dailyBudgetUSD: Number(incoming.dailyBudgetUSD) || 5,
      emergencyStopActive: Boolean(incoming.emergencyStopActive),
    },
  };

  const writeToolScopes = {
    ...currentWriteScopes,
    maxDiscountPercent: Number(incoming.maxDiscountPercent) || 20,
    maxPriceChangePercent: maxPriceChangePercent || 30,
    blockedProducts: Array.isArray(incoming.blockedProducts) ? incoming.blockedProducts : [],
    blockedActions: Array.isArray(incoming.blockedActions) ? incoming.blockedActions : [],
  };

  const saved = await prisma.aiSetting.upsert({
    where: { companyId },
    update: {
      modelSettings: JSON.stringify(modelSettings),
      writeToolScopes: JSON.stringify(writeToolScopes),
      humanApprovalRequiredForWrite: incoming.requireApprovalForWrite !== false,
      maxRepliesPerCustomer: Number(incoming.maxRepliesPerCustomer) || 5,
    },
    create: {
      companyId,
      modelSettings: JSON.stringify(modelSettings),
      writeToolScopes: JSON.stringify(writeToolScopes),
      humanApprovalRequiredForWrite: incoming.requireApprovalForWrite !== false,
      maxRepliesPerCustomer: Number(incoming.maxRepliesPerCustomer) || 5,
    },
  });

  return res.json({ success: true, settings: buildSettings(saved) });
});

module.exports = router;
