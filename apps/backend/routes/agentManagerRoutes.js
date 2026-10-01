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
        const templates = await aiServiceAdminClient.listAgentTemplates();
        if (Array.isArray(templates)) {
          profiles = templates.map(t => ({ slug: t.slug, name: t.name, role: t.role, allowedSkills: t.allowed_skills || t.allowedSkills || [] }));
          const allSkills = profiles.flatMap(p => p.allowedSkills);
          const uniqueSkills = [...new Set(allSkills.filter(Boolean))];
          skills = uniqueSkills.map(s => ({ id: s, displayName: s }));
        }
      } catch (_) {}
      const ceo = agents.find(a => a.role === 'CEO' || a.managerType === 'CEO');
      if (ceo) manager = { id: ceo.id, name: ceo.name, status: ceo.status || 'ACTIVE', templateSlug: ceo.templateSlug || null };

      const taskCounts = await countAgentTasks(companyId);
      return { manager, agents, profiles, tools, skills, inbox: taskCounts };
    } catch (_) {
      return EMPTY_CONTEXT();
    }
  },
  chat: async (companyId, { message, userId }) => {
    try {
      const result = await aiServiceAdminClient.chatWithAgent({
        companyId, agentId: '', customerId: userId || undefined, message, threadId: `manager_${companyId}`,
      });
      return result || { success: false, reply: '', context: null };
    } catch (_) {
      return { success: false, reply: '', error: 'فشل الاتصال بخدمة الذكاء الاصطناعي' };
    }
  },
  hireAgent: async (companyId, body) => {
    const result = await aiServiceAdminClient.spawnAgent({ companyId, ...body });
    // 2026: ai-service manages ai.agents table; no dual-write to public.company_agents
    if (result && result.id) {
      console.log('[MANAGER] Agent spawned via ai-service:', result.id, result.name);
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
    // 2026: delegate to ai-service API (single source of truth)
    try {
      const result = await aiServiceAdminClient.archiveAgent(agentId, companyId);
      return result || { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  listAgentDepartments: async (companyId) => {
    try {
      const departments = await aiServiceAdminClient.listDepartments(companyId);
      return (departments || []).map(d => ({
        id: d.id,
        companyId: d.company_id,
        key: d.key,
        name: d.name,
        description: d.description || null,
        icon: d.icon || '🤖',
        sortOrder: d.sort_order || 100,
      }));
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
  // 2026: use ai-service API instead of direct Prisma read
  try {
    const agents = await aiServiceAdminClient.listAgents(companyId);
    if (Array.isArray(agents)) {
      const ceo = agents.find(a => a.role === 'CEO' && a.status !== 'ARCHIVED');
      return ceo?.id || '';
    }
    return '';
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

// 2026: Department/org metadata now comes from ai-service AgentRead (departmentId, departmentKey, etc.)
// This function is kept as a thin wrapper for backward compatibility.
async function loadAgentOrgMetadata(companyId) {
  try {
    const agents = await aiServiceAdminClient.listAgents(companyId);
    return new Map((agents || []).map(a => [a.id, {
      id: a.id,
      departmentId: a.departmentId || a.department_id || null,
      departmentKey: a.departmentKey || a.department_key || null,
      departmentName: a.departmentName || a.department_name || null,
      departmentIcon: a.departmentIcon || a.department_icon || null,
      managerType: a.managerType || a.manager_type || null,
    }]));
  } catch (_) {
    return new Map();
  }
}

const handleManagerContext = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const context = await agentManagerService.getManagerContext(companyId);
    return res.json({ success: true, context });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/me', handleManagerContext);
router.get('/context', handleManagerContext);

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
    // 2026: agent data (including department info) comes from ai-service API
    const agents = [...byId.values()].map(agent => ({
      ...agent,
      rules: agent.rules || [],
      skills: agent.allowed_skills || agent.skills || agent.allowedSkills || [],
      allowedChannels: agent.allowed_channels || agent.allowedChannels || [],
      allowedSkills: agent.allowed_skills || agent.skills || agent.allowedSkills || [],
      allowedTools: agent.allowed_tools || agent.allowedTools || [],
      departmentId: agent.departmentId || agent.department_id || null,
      departmentKey: agent.departmentKey || agent.department_key || null,
      departmentName: agent.departmentName || agent.department_name || null,
      departmentIcon: agent.departmentIcon || agent.department_icon || null,
      managerType: agent.managerType || agent.manager_type || (agent.role === 'CEO' ? 'CEO' : 'AGENT'),
    }));
    return res.json({ success: true, agents, count: agents.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /agents/:id — update agent fields via ai-service
router.put('/agents/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const agentUpdateData = {};
    if (req.body?.allowedChannels !== undefined) agentUpdateData.allowedChannels = req.body.allowedChannels;
    if (req.body?.model !== undefined) agentUpdateData.model = req.body.model;
    if (req.body?.name !== undefined) agentUpdateData.name = req.body.name;
    if (req.body?.icon !== undefined) agentUpdateData.icon = req.body.icon;
    if (req.body?.description !== undefined) agentUpdateData.description = req.body.description;
    if (Object.keys(agentUpdateData).length > 0) {
      await aiServiceAdminClient.updateAgent(req.params.id, companyId, agentUpdateData);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /auto-reply — read AI auto-reply state
router.get('/auto-reply', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const data = await aiServiceAdminClient.getAutoReply(companyId);
    return res.json({ success: true, autoReplyEnabled: data?.autoReplyEnabled === true });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

// PUT /auto-reply — enable/disable AI auto-reply globally
router.put('/auto-reply', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const enabled = req.body?.enabled === true;
    await Promise.all([
      aiServiceAdminClient.updateAutoReply(companyId, enabled),
      prisma().aiSetting.upsert({
        where: { companyId },
        update: { autoReplyEnabled: enabled },
        create: { companyId, autoReplyEnabled: enabled },
      }),
    ]);
    return res.json({ success: true, autoReplyEnabled: enabled });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

// GET /channel-reply — per-channel auto-reply toggles
router.get('/channel-reply', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const data = await aiServiceAdminClient.getChannelReply(companyId);
    return res.json({ success: true, channels: data?.channels || {} });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

// PUT /channel-reply — save per-channel auto-reply toggles
router.put('/channel-reply', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const channels = req.body?.channels || {};
    const data = await aiServiceAdminClient.updateChannelReply(companyId, channels);
    return res.json({ success: true, channels: data?.channels || channels });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

// GET /pause — read agent pause state
router.get('/pause', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const data = await aiServiceAdminClient.getAgentPause(companyId);
    return res.json({ success: true, paused: data?.paused === true, pauseReason: data?.pauseReason || null });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

// PUT /pause — pause/resume the agent with an optional reason
router.put('/pause', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const paused = req.body?.paused === true;
    const reason = req.body?.reason || null;
    const data = await aiServiceAdminClient.updateAgentPause(companyId, paused, reason);
    await prisma().aiSetting.upsert({
      where: { companyId },
      update: { agentPaused: paused, pauseReason: paused ? reason : null },
      create: { companyId, agentPaused: paused, pauseReason: paused ? reason : null },
    });
    return res.json({ success: true, paused: data?.paused === true, pauseReason: data?.pauseReason || null });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
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

// GET /whatsapp-sessions — list WhatsApp sessions with dedicated agent routing
router.get('/whatsapp-sessions', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const db = prisma();
    const sessions = await db.whatsAppSession.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        status: true,
        autoReply: true,
        aiEnabled: true,
        isDefault: true,
        metadata: true,
        provider: true,
        createdAt: true,
      },
    });

    const mapped = sessions.map((s) => {
      let meta = {};
      try {
        meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : (s.metadata || {});
      } catch (_) {}
      return {
        id: s.id,
        name: s.name,
        phoneNumber: s.phoneNumber,
        status: s.status,
        autoReply: s.autoReply !== false,
        aiEnabled: s.aiEnabled !== false,
        isDefault: s.isDefault === true,
        agentId: meta?.agentId || null,
        provider: s.provider,
      };
    });

    return res.json({ success: true, sessions: mapped, count: mapped.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /whatsapp-sessions/:id — update a WhatsApp session's assigned agent and autoReply toggle
router.put('/whatsapp-sessions/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    const { id } = req.params;
    const { agentId, autoReply, aiEnabled } = req.body || {};
    const db = prisma();

    const existingSession = await db.whatsAppSession.findFirst({
      where: { id, companyId },
    });
    if (!existingSession) {
      return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    }

    let meta = {};
    try {
      meta = typeof existingSession.metadata === 'string' ? JSON.parse(existingSession.metadata) : (existingSession.metadata || {});
    } catch (_) {}

    if (agentId !== undefined) {
      meta.agentId = agentId || null;
    }

    const updateData = {
      metadata: JSON.stringify(meta),
      updatedAt: new Date(),
    };
    if (autoReply !== undefined) updateData.autoReply = Boolean(autoReply);
    if (aiEnabled !== undefined) updateData.aiEnabled = Boolean(aiEnabled);

    const updated = await db.whatsAppSession.update({
      where: { id },
      data: updateData,
    });

    try {
      const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
      const active = WhatsAppManager.getSession(id);
      if (active) active.metadata = meta;
    } catch (_) {}

    return res.json({
      success: true,
      session: {
        id: updated.id,
        name: updated.name,
        phoneNumber: updated.phoneNumber,
        agentId: meta.agentId || null,
        autoReply: updated.autoReply,
        aiEnabled: updated.aiEnabled,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
