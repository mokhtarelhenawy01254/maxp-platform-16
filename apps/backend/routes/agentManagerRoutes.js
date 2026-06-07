/**
 * @module agentManagerRoutes
 * @description Paperclip-style manager agent control plane.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const agentManagerService = require('../legacy-ai-agent/aiAgent/agentManagerService');
const agentInboxService = require('../legacy-ai-agent/aiAgent/agentInboxService');
const toolOrchestratorService = require('../legacy-ai-agent/aiAgent/toolOrchestratorService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const router = express.Router();

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;
const sqlQuote = (value = '') => String(value).replace(/'/g, "''");

async function loadAgentOrgMetadata(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        ca."id",
        ca."departmentId",
        ca."managerType",
        ad."key" AS "departmentKey",
        ad."name" AS "departmentName",
        ad."icon" AS "departmentIcon"
      FROM "company_agents" ca
      LEFT JOIN "agent_departments" ad ON ad."id" = ca."departmentId"
      WHERE ca."companyId" = '${sqlQuote(companyId)}'
    `);
    return new Map(rows.map(row => [row.id, row]));
  } catch (_) {
    return new Map();
  }
}

router.get('/me', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    return res.json({ success: true, context });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentManagerService.chat(companyId, {
      message: req.body?.message || '',
      userId: req.user?.id || null,
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/inbox', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const tasks = await agentInboxService.listTasks(companyId, {
      status: req.query.status || undefined,
      agentId: req.query.agentId || undefined,
      assignTo: req.query.assignTo || undefined,
      activeOnly: req.query.activeOnly === 'true',
    });
    return res.json({ success: true, tasks, count: tasks.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:id/checkout', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentInboxService.checkoutTask(companyId, req.params.id, req.body?.agentId);
    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentInboxService.completeTask(companyId, req.params.id, req.body?.agentId, req.body?.result || {});
    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:id/fail', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentInboxService.failTask(companyId, req.params.id, req.body?.agentId, req.body?.error || '');
    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/hire', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentManagerService.hireAgent(companyId, {
      ...req.body,
      requestedBy: req.user?.id || null,
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/delegate', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentManagerService.delegateGoal(companyId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/profiles', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    return res.json({ success: true, profiles: context.profiles, count: context.profiles.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tools', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    return res.json({ success: true, tools: context.tools, count: context.tools.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tools/execute', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await toolOrchestratorService.execute(companyId, req.body || {});
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/skills', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    return res.json({ success: true, skills: context.skills, count: context.skills.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /agents — all company agents from DB (DB-backed, persistent)
router.get('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    const byId = new Map((context.agents || []).map(agent => [agent.id, agent]));
    const orgMetaById = await loadAgentOrgMetadata(companyId);

    try {
      const prisma = getSharedPrismaClient();
      const rows = await prisma.companyAgent.findMany({
        where: { companyId, status: { not: 'ARCHIVED' } },
        orderBy: { createdAt: 'asc' },
      });
      for (const a of rows) {
        byId.set(a.id, {
          ...(byId.get(a.id) || {}),
          id: a.id,
          name: a.name,
          role: a.role,
          icon: a.icon || '🤖',
          description: a.description || '',
          soul: a.soul || '',
          rules: (() => { try { return JSON.parse(a.rules || '[]'); } catch { return []; } })(),
          skills: (() => { try { return JSON.parse(a.skills || '[]'); } catch { return []; } })(),
          model: a.model || null,
          status: a.status,
          parentId: a.parentId || null,
          templateSlug: a.templateSlug || null,
          createdBy: a.createdBy || null,
          createdAt: a.createdAt,
          departmentId: orgMetaById.get(a.id)?.departmentId || null,
          departmentKey: orgMetaById.get(a.id)?.departmentKey || null,
          departmentName: orgMetaById.get(a.id)?.departmentName || null,
          departmentIcon: orgMetaById.get(a.id)?.departmentIcon || null,
          managerType: orgMetaById.get(a.id)?.managerType || null,
        });
      }
    } catch (_) {}

    const agents = [...byId.values()].map(agent => ({
      ...agent,
      rules: agent.rules || [],
      skills: agent.skills || agent.allowedSkills || [],
      departmentId: agent.departmentId || orgMetaById.get(agent.id)?.departmentId || null,
      departmentKey: agent.departmentKey || orgMetaById.get(agent.id)?.departmentKey || null,
      departmentName: agent.departmentName || orgMetaById.get(agent.id)?.departmentName || null,
      departmentIcon: agent.departmentIcon || orgMetaById.get(agent.id)?.departmentIcon || null,
      managerType: agent.managerType || orgMetaById.get(agent.id)?.managerType || (agent.role === 'CEO' ? 'CEO' : 'AGENT'),
    }));
    return res.json({ success: true, agents, count: agents.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /agents/:id — archive a sub-agent (not CEO)
router.delete('/agents/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const result = await agentManagerService.archiveAgent(companyId, req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const departments = await agentManagerService.listAgentDepartments(companyId);
    return res.json({ success: true, departments, count: departments.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
