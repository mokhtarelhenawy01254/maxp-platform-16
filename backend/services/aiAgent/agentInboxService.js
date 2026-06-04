/**
 * @module agentInboxService
 * @description Lightweight task inbox and checkout protocol for agents.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const agentConflictGuardService = require('./agentConflictGuardService');

const SCOPE = 'agent_task';
const ACTIVE_STATUSES = new Set(['PENDING', 'CHECKED_OUT', 'IN_PROGRESS']);

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function buildTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class AgentInboxService {
  constructor() {
    // In-memory cache for fast reads; DB is source of truth
    this._tasks = new Map();
    this._heartbeats = new Map();
    this._loadedCompanies = new Set();
  }

  async createTask(companyId, task = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!task.title && !task.description) throw new Error('task title or description is required');

    const prisma = getSharedPrismaClient();
    const taskId = task.id || buildTaskId();

    const conflictKey = task.metadata?.conflictKey;
    if (conflictKey) {
      const activeStatuses = ['PENDING', 'IN_PROGRESS'];
      const existing = await prisma.aiAgentTask.findMany({
        where: { companyId, status: { in: activeStatuses } },
      });
      const conflict = existing.find(t => {
        const meta = parseJson(t.metadata, {});
        return meta.conflictKey === conflictKey;
      });
      if (conflict) {
        const error = new Error(`ACTIVE_TASK_CONFLICT: An active task already exists for conflict key ${conflictKey}`);
        error.code = 'ACTIVE_TASK_CONFLICT';
        throw error;
      }
    }

    const dbTask = await prisma.aiAgentTask.create({
      data: {
        id: taskId,
        companyId,
        agentId: task.agentId || null,
        title: task.title || task.description,
        description: task.description || task.title || '',
        priority: task.priority || 'medium',
        status: 'PENDING',
        parentTaskId: task.parentTaskId || null,
        traceId: task.traceId || null,
        metadata: task.metadata || {},
        createdBy: task.createdBy || null,
      },
    });

    const nextTask = { ...dbTask, metadata: parseJson(dbTask.metadata, {}) };
    this._companyMap(companyId).set(nextTask.id, nextTask);
    await this._recordEvent(companyId, 'TASK_CREATED', nextTask);
    return { ...nextTask };
  }

  async listTasks(companyId, filters = {}) {
    if (!companyId) throw new Error('companyId is required');

    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (filters.status) where.status = filters.status;
    if (filters.agentId) where.OR = [{ agentId: filters.agentId }, { checkedOutBy: filters.agentId }];

    const dbTasks = await prisma.aiAgentTask.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const tasks = dbTasks.map(t => ({ ...t, metadata: parseJson(t.metadata, {}) }));
    for (const t of tasks) this._companyMap(companyId).set(t.id, t);
    this._loadedCompanies.add(companyId);

    return tasks;
  }

  async getTask(companyId, taskId) {
    if (!companyId) throw new Error('companyId is required');

    const cached = this._companyMap(companyId).get(taskId);
    if (cached) return { ...cached };

    const prisma = getSharedPrismaClient();
    const dbTask = await prisma.aiAgentTask.findFirst({
      where: { id: taskId, companyId },
    });
    if (!dbTask) return null;

    const task = { ...dbTask, metadata: parseJson(dbTask.metadata, {}) };
    this._companyMap(companyId).set(task.id, task);
    return task;
  }

  async checkoutTask(companyId, taskId, agentId) {
    if (!agentId) throw new Error('agentId is required');
    const task = await this.getTask(companyId, taskId);
    if (!task) return { success: false, error: 'TASK_NOT_FOUND' };
    if (task.status === 'COMPLETED') return { success: false, error: 'TASK_ALREADY_COMPLETED' };
    if (task.status === 'FAILED') return { success: false, error: 'TASK_ALREADY_FAILED' };
    if (task.checkedOutBy && task.checkedOutBy !== agentId) {
      return { success: false, error: 'TASK_ALREADY_CHECKED_OUT', checkedOutBy: task.checkedOutBy };
    }
    if (task.agentId && task.agentId !== agentId) {
      return { success: false, error: 'TASK_ASSIGNED_TO_DIFFERENT_AGENT', agentId: task.agentId };
    }

    const prisma = getSharedPrismaClient();
    const updated = await prisma.aiAgentTask.update({
      where: { id: taskId },
      data: {
        agentId: task.agentId || agentId,
        checkedOutBy: agentId,
        checkedOutAt: task.checkedOutAt || new Date(),
        status: 'CHECKED_OUT',
        updatedAt: new Date(),
      },
    });

    const result = { ...updated, metadata: parseJson(updated.metadata, {}) };
    this._companyMap(companyId).set(taskId, result);
    await this._recordEvent(companyId, 'TASK_CHECKED_OUT', result);
    return { success: true, task: result };
  }

  async completeTask(companyId, taskId, agentId, result = {}) {
    const task = await this.getTask(companyId, taskId);
    if (!task) return { success: false, error: 'TASK_NOT_FOUND' };
    if (task.checkedOutBy && task.checkedOutBy !== agentId) {
      return { success: false, error: 'TASK_CHECKED_OUT_BY_DIFFERENT_AGENT', checkedOutBy: task.checkedOutBy };
    }

    const prisma = getSharedPrismaClient();
    const updated = await prisma.aiAgentTask.update({
      where: { id: taskId },
      data: {
        agentId: task.agentId || agentId,
        checkedOutBy: task.checkedOutBy || agentId,
        status: 'COMPLETED',
        metadata: { ...task.metadata, result },
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const resultTask = { ...updated, metadata: parseJson(updated.metadata, {}) };
    this._companyMap(companyId).set(taskId, resultTask);
    await this._recordEvent(companyId, 'TASK_COMPLETED', resultTask);
    return { success: true, task: resultTask };
  }

  async failTask(companyId, taskId, agentId, error = '') {
    const task = await this.getTask(companyId, taskId);
    if (!task) return { success: false, error: 'TASK_NOT_FOUND' };
    if (task.checkedOutBy && task.checkedOutBy !== agentId) {
      return { success: false, error: 'TASK_CHECKED_OUT_BY_DIFFERENT_AGENT', checkedOutBy: task.checkedOutBy };
    }

    const prisma = getSharedPrismaClient();
    const updated = await prisma.aiAgentTask.update({
      where: { id: taskId },
      data: {
        agentId: task.agentId || agentId,
        checkedOutBy: task.checkedOutBy || agentId,
        status: 'FAILED',
        metadata: { ...task.metadata, error },
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const resultTask = { ...updated, metadata: parseJson(updated.metadata, {}) };
    this._companyMap(companyId).set(taskId, resultTask);
    await this._recordEvent(companyId, 'TASK_FAILED', resultTask);
    return { success: true, task: resultTask };
  }

  async heartbeat(companyId, agentId, state = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!agentId) throw new Error('agentId is required');

    const heartbeat = {
      companyId,
      agentId,
      state,
      status: state.status || 'ACTIVE',
      timestamp: nowIso(),
    };
    this._heartbeatMap(companyId).set(agentId, heartbeat);
    await this._recordHeartbeat(companyId, heartbeat);
    return { ...heartbeat };
  }

  getHeartbeat(companyId, agentId) {
    const heartbeat = this._heartbeatMap(companyId).get(agentId);
    return heartbeat ? { ...heartbeat } : null;
  }

  _companyMap(companyId) {
    if (!this._tasks.has(companyId)) this._tasks.set(companyId, new Map());
    return this._tasks.get(companyId);
  }

  _heartbeatMap(companyId) {
    if (!this._heartbeats.has(companyId)) this._heartbeats.set(companyId, new Map());
    return this._heartbeats.get(companyId);
  }

  async _ensureCompanyLoaded(companyId) {
    if (this._loadedCompanies.has(companyId)) return;
    this._loadedCompanies.add(companyId);

    try {
      const prisma = getSharedPrismaClient();
      const dbTasks = await prisma.aiAgentTask.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
      });
      for (const t of dbTasks) {
        const task = { ...t, metadata: parseJson(t.metadata, {}) };
        this._companyMap(companyId).set(task.id, task);
      }
    } catch (e) {
      console.warn('[AGENT-INBOX] Failed to load tasks from DB:', e.message);
    }
  }

  async _recordEvent(companyId, action, task) {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.aiProviderLog.create({
        data: {
          provider: 'AGENT_INBOX',
          companyId,
          scope: SCOPE,
          action,
          status: task.status,
          model: task.agentId || task.checkedOutBy || null,
          message: task.title || task.description || task.id,
          metadata: JSON.stringify({ task }),
        },
      });
    } catch (_) {}
  }

  async _recordHeartbeat(companyId, heartbeat) {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.aiProviderLog.create({
        data: {
          provider: 'AGENT_INBOX',
          companyId,
          scope: SCOPE,
          action: 'AGENT_HEARTBEAT',
          status: heartbeat.status,
          model: heartbeat.agentId,
          message: `Heartbeat from ${heartbeat.agentId}`,
          metadata: JSON.stringify({ heartbeat }),
        },
      });
    } catch (_) {}
  }

  async _reset() {
    this._tasks.clear();
    this._heartbeats.clear();
    this._loadedCompanies.clear();
    // NOTE: We no longer delete ai_provider_logs (historical diagnostics).
    // For test cleanup, delete from ai_agent_tasks directly if needed.
  }
}

module.exports = new AgentInboxService();
