/**
 * @module agentManagerRoutes
 * @description Paperclip-style manager agent control plane.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const EMPTY_CONTEXT = () => ({ manager: null, agents: [], profiles: [], tools: [], skills: [], inbox: { active: 0, pending: 0 } });

const prisma = () => getSharedPrismaClient();

const agentManagerService = {
  getManagerContext: async (companyId) => {
    try {
      const [agentsRes, toolsRes] = await Promise.allSettled([
        aiServiceAdminClient.listAgents(companyId),
        aiServiceAdminClient.listTools(),
      ]);
      const agents = agentsRes.status === 'fulfilled' && Array.isArray(agentsRes.value) ? agentsRes.value : [];
      const tools = toolsRes.status === 'fulfilled' && Array.isArray(toolsRes.value) ? toolsRes.value : [];

      let profiles = [];
      let skills = [];
      let manager = null;
      try {
        const db = prisma();
        const dbProfiles = await db.agentDefinition.findMany({ where: { isBuiltIn: true } });
        profiles = dbProfiles.map(p => {
          const settings = (() => { try { return JSON.parse(p.settings || '{}'); } catch { return {}; } })();
          return {
            slug: p.type,
            name: p.name,
            role: settings.role || '',
            allowedTools: settings.allowedTools || [],
            allowedSkills: settings.allowedSkills || [],
          };
        });
        const ceo = agents.find(a => a.role === 'CEO' || a.managerType === 'CEO');
        if (ceo) manager = { id: ceo.id, name: ceo.name, status: ceo.status || 'ACTIVE', templateSlug: ceo.templateSlug || null };
        if (!manager) {
          try {
            const dbCeo = await db.companyAgent.findFirst({ where: { companyId, role: 'CEO', status: { not: 'ARCHIVED' } } });
            if (dbCeo) manager = { id: dbCeo.id, name: dbCeo.name, status: dbCeo.status, templateSlug: dbCeo.templateSlug || null };
          } catch (_) {}
        }
        skills = profiles.length > 0 ? profiles.flatMap(p => p.allowedSkills).filter(Boolean) : [];
        const uniqueSkills = [...new Set(skills)];
        skills = uniqueSkills.map(s => ({ id: s, displayName: s }));
      } catch (_) {}

      const taskCounts = await countAgentTasks(companyId);
      return { manager, agents, profiles, tools, skills, inbox: taskCounts };
    } catch (_) {
      return EMPTY_CONTEXT();
    }
  },
  chat: async (companyId, { message, userId }) => {
    try {
      const result = await aiServiceAdminClient.chatWithAgent({
        companyId, agentId: '', message, threadId: `manager_${companyId}`,
      });
      return result || { success: false, reply: '', context: null };
    } catch (_) {
      return { success: false, reply: '', error: 'فشل الاتصال بخدمة الذكاء الاصطناعي' };
    }
  },
  hireAgent: async (companyId, body) => {
    const result = await aiServiceAdminClient.spawnAgent({ companyId, ...body });
    if (result && result.id) {
      try {
        const db = prisma();
        await db.companyAgent.upsert({
          where: { id: result.id },
          update: { name: result.name, role: result.role, model: result.model || null, templateSlug: result.template_slug || result.templateSlug || null, status: result.status || 'ACTIVE' },
          create: { id: result.id, companyId, name: result.name, role: result.role, model: result.model || null, templateSlug: result.template_slug || result.templateSlug || null, status: result.status || 'ACTIVE', icon: body.icon || '🤖', description: body.description || '' },
        });
      } catch (dbErr) {
        console.error('[MANAGER] Failed to sync hired agent to company_agents:', dbErr.message);
      }
    }
    return result || { success: false, error: 'فشل تعيين الوكيل' };
  },
  delegateGoal: async (companyId, body) => {
    try {
      const db = prisma();
      const task = await db.aiAgentTask.create({
        data: {
          companyId,
          agentId: body.agentId || (await resolveCeoAgentId(companyId)),
          title: body.title || body.goal || 'مهمة جديدة',
          description: body.description || body.goal || '',
          status: 'PENDING',
          priority: body.priority || 'medium',
          createdBy: body.requestedBy || null,
          metadata: body.metadata || {},
        },
      });
      return { success: true, task: { id: task.id, title: task.title, status: task.status, createdAt: task.createdAt } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  archiveAgent: async (companyId, agentId) => {
    try {
      const db = prisma();
      await db.companyAgent.updateMany({
        where: { id: agentId, companyId, status: { not: 'ARCHIVED' } },
        data: { status: 'ARCHIVED' },
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  listAgentDepartments: async (companyId) => {
    try {
      const db = prisma();
      return await db.agentDepartment.findMany({ where: { companyId }, orderBy: { sortOrder: 'asc' } });
    } catch (_) {
      return [];
    }
  },
};

async function countAgentTasks(companyId) {
  try {
    const db = prisma();
    const [active, pending] = await Promise.all([
      db.aiAgentTask.count({ where: { companyId, status: { in: ['PENDING', 'CHECKED_OUT', 'IN_PROGRESS'] } } }),
      db.aiAgentTask.count({ where: { companyId, status: 'PENDING' } }),
    ]);
    return { active, pending };
  } catch (_) {
    return { active: 0, pending: 0 };
  }
}

async function resolveCeoAgentId(companyId) {
  try {
    const db = prisma();
    const ceo = await db.companyAgent.findFirst({ where: { companyId, role: 'CEO', status: { not: 'ARCHIVED' } } });
    return ceo?.id || '';
  } catch (_) {
    return '';
  }
}

const agentInboxService = {
  listTasks: async (companyId, filters = {}) => {
    try {
      const db = prisma();
      const where = { companyId };
      if (filters.status) where.status = filters.status;
      if (filters.agentId) where.agentId = filters.agentId;
      if (filters.assignTo) where.checkedOutBy = filters.assignTo;
      if (filters.activeOnly) where.status = { in: ['PENDING', 'CHECKED_OUT', 'IN_PROGRESS'] };
      return await db.aiAgentTask.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    } catch (_) {
      return [];
    }
  },
  checkoutTask: async (companyId, taskId, agentId) => {
    try {
      const db = prisma();
      const task = await db.aiAgentTask.findFirst({ where: { id: taskId, companyId } });
      if (!task) return { success: false, error: 'المهمة غير موجودة' };
      if (task.status !== 'PENDING') return { success: false, error: 'المهمة ليست في حالة انتظار' };
      await db.aiAgentTask.update({
        where: { id: taskId },
        data: { status: 'CHECKED_OUT', checkedOutBy: agentId || null, checkedOutAt: new Date() },
      });
      return { success: true, task: { ...task, status: 'CHECKED_OUT' } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  completeTask: async (companyId, taskId, agentId, result) => {
    try {
      const db = prisma();
      const task = await db.aiAgentTask.findFirst({ where: { id: taskId, companyId } });
      if (!task) return { success: false, error: 'المهمة غير موجودة' };
      await db.aiAgentTask.update({
        where: { id: taskId },
        data: { status: 'COMPLETED', completedAt: new Date(), metadata: result || {} },
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  failTask: async (companyId, taskId, agentId, error) => {
    try {
      const db = prisma();
      const task = await db.aiAgentTask.findFirst({ where: { id: taskId, companyId } });
      if (!task) return { success: false, error: 'المهمة غير موجودة' };
      await db.aiAgentTask.update({
        where: { id: taskId },
        data: { status: 'FAILED', metadata: { error: error || 'فشل غير معروف' } },
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

const toolOrchestratorService = {
  execute: async (companyId, body) => {
    try {
      const result = await aiServiceAdminClient.chatWithAgent({
        companyId, agentId: body.agentId || '', message: body.input || '',
        threadId: `tool_${companyId}_${Date.now()}`,
      });
      return result || { success: false, error: 'فشل تنفيذ الأداة' };
    } catch (_) {
      return { success: false, error: 'فشل الاتصال بخدمة الذكاء الاصطناعي' };
    }
  },
};

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
          channels: (() => { try { return JSON.parse(a.channels || '[]'); } catch { return []; } })(),
          allowed_channels: (() => { try { return JSON.parse(a.channels || '[]'); } catch { return []; } })(),
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

// PUT /agents/:id — update agent channels via Prisma (direct, no Python dependency)
router.put('/agents/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const prisma = getSharedPrismaClient();
    const allowedChannels = req.body?.allowedChannels;
    if (allowedChannels !== undefined) {
      await prisma.companyAgent.updateMany({
        where: { id: req.params.id, companyId },
        data: { channels: JSON.stringify(allowedChannels) },
      });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /auto-reply — enable/disable AI auto-reply globally
router.put('/auto-reply', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const enabled = req.body?.enabled === true;
    const prisma = getSharedPrismaClient();
    await prisma.aiSetting.upsert({
      where: { companyId },
      update: { autoReplyEnabled: enabled, updatedAt: new Date() },
      create: { companyId, autoReplyEnabled: enabled },
    });
    return res.json({ success: true, autoReplyEnabled: enabled });
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
