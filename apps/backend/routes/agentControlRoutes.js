/**
 * @module agentControlRoutes
 * @description Merchant-facing control-plane routes for AI agents, schedules,
 * audit logs, and guardrail settings.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const agentProvisioningService = require('../legacy-ai-agent/aiAgent/agentProvisioningService');
const agentManagerService = require('../legacy-ai-agent/aiAgent/agentManagerService');
const agentProfileLoaderService = require('../legacy-ai-agent/aiAgent/agentProfileLoaderService');
const toolRegistryService = require('../legacy-ai-agent/aiAgent/toolRegistryService');
const skillRegistryService = require('../legacy-ai-agent/aiAgent/skillRegistryService');
const { getModelCapabilities } = require('../legacy-ai-agent/aiAgent/agentModelCapabilityService');
const naturalLanguageCronService = require('../legacy-ai-agent/aiAgent/naturalLanguageCronService');
const routineExecutorService = require('../legacy-ai-agent/aiAgent/routineExecutorService');
const agentAuditTrailService = require('../legacy-ai-agent/aiAgent/agentAuditTrailService');
const aiRuntimeService = require('../legacy-ai-agent/aiAgent/aiRuntimeService');
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
  allowedTools: agent.getTools(),
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
  if (agent.templateSlug) {
    try {
      profile = agentProfileLoaderService.loadProfile(agent.templateSlug);
    } catch (_) {
      profile = null;
    }
  }
  const persona = agent.persona || {};
  const skillDetails = skillRegistryService.getSkillsForIds(agent.getSkills ? agent.getSkills() : []);
  const toolDetails = agent.getTools().map(name => toolRegistryService.getTool(name)).filter(Boolean);

  return {
    profile: profile
      ? {
        slug: profile.slug,
        name: profile.name,
        role: profile.role,
        version: profile.version,
        modelPolicy: profile.modelPolicy,
      }
      : null,
    files: {
      'SOUL.md': persona.soulInstructions || profile?.instructions?.soul || '',
      'AGENTS.md': persona.agentInstructions || profile?.instructions?.agents || '',
      'TOOLS.md': persona.toolsInstructions || profile?.instructions?.tools || '',
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

router.get('/profiles', (req, res) => {
  try {
    const profiles = agentProfileLoaderService.listProfiles().map(profile => ({
      slug: profile.slug,
      name: profile.name,
      role: profile.role,
      version: profile.version,
      modelPolicy: profile.modelPolicy,
      allowedTools: profile.allowedTools,
      allowedSkills: profile.allowedSkills,
      instructions: profile.instructions,
    }));
    return res.json({ success: true, profiles, count: profiles.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tools', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.listTools();
    if (!result.ok) {
      return res.status(result.status || 502).json({
        success: false,
        error: result.data?.error || result.error || result.reason || 'ai-service tools catalog unavailable',
        catalogSource: 'python_ai_service',
      });
    }
    return res.json(result.data);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/skills', (req, res) => {
  try {
    const skills = skillRegistryService.listSkills();
    return res.json({ success: true, skills, count: skills.length });
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

    const agent = agentProvisioningService.getAgent(companyId, req.params.id);
    if (!agent) return res.status(404).json({ error: 'AGENT_NOT_FOUND' });

    const nextStatus = req.body?.status === 'PAUSED' || req.body?.status === 'INACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE';
    if (nextStatus === 'INACTIVE') agent.deactivate();
    else agent.activate();

    await getSharedPrismaClient().companyAgent.updateMany({
      where: { id: req.params.id, companyId },
      data: { status: nextStatus },
    });

    return res.json({ success: true, agent: serializeAgent(agent) });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
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
