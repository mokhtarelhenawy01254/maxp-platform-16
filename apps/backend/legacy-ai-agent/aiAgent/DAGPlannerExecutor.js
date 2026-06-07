/**
 * @module DAGPlannerExecutor
 * @description Phase 20: DAG Planner & Executor - directed acyclic graph task
 * planning with topological sort, concurrent execution, and dynamic replanning.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

class DAGPlannerExecutor {
  constructor() {
    this._executionLog = [];
  }

  /**
   * Creates a DAG plan from task definitions.
   * @param {Array<{ id: string, name: string, dependencies: string[], handler: Function }>} tasks
   * @returns {{ planId: string, tasks: Array, executionOrder: string[][], status: string }}
   */
  createPlan(tasks) {
    const planId = `plan_${Date.now()}`;
    const taskMap = new Map(tasks.map(t => [t.id, { ...t, status: 'PENDING', result: null, error: null }]));

    // Validate no cycles
    if (this._hasCycle(tasks)) {
      throw new Error('DAG validation failed: cycle detected in task dependencies');
    }

    const executionOrder = this._topologicalSort(tasks);

    return {
      planId,
      tasks: [...taskMap.values()],
      executionOrder,
      status: 'READY',
      createdAt: new Date(),
    };
  }

  /**
   * Topological sort: groups tasks into execution layers.
   * Tasks in the same layer can run concurrently.
   * @returns {string[][]} Array of layers, each containing task IDs
   */
  _topologicalSort(tasks) {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const inDegree = new Map(tasks.map(t => [t.id, 0]));
    const adjacency = new Map(tasks.map(t => [t.id, []]));

    for (const task of tasks) {
      for (const dep of (task.dependencies || [])) {
        if (adjacency.has(dep)) {
          adjacency.get(dep).push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }

    const layers = [];
    const remaining = new Set(tasks.map(t => t.id));

    while (remaining.size > 0) {
      const layer = [];
      for (const id of remaining) {
        if ((inDegree.get(id) || 0) === 0) layer.push(id);
      }

      if (layer.length === 0) break; // No progress = cycle

      layers.push(layer);
      for (const id of layer) {
        remaining.delete(id);
        for (const child of (adjacency.get(id) || [])) {
          inDegree.set(child, (inDegree.get(child) || 0) - 1);
        }
      }
    }

    return layers;
  }

  /**
   * Detects cycles in the task graph.
   */
  _hasCycle(tasks) {
    const visited = new Set();
    const recStack = new Set();
    const adj = new Map(tasks.map(t => [t.id, t.dependencies || []]));

    const dfs = (id) => {
      visited.add(id);
      recStack.add(id);
      for (const dep of (adj.get(id) || [])) {
        if (!visited.has(dep)) { if (dfs(dep)) return true; }
        else if (recStack.has(dep)) return true;
      }
      recStack.delete(id);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id) && dfs(task.id)) return true;
    }
    return false;
  }

  /**
   * Executes a plan layer by layer with concurrent execution within each layer.
   * @param {Object} plan - Plan created by createPlan
   * @param {Object} [initialContext] - Initial template variables
   * @param {Object} [options] - Execution options
   * @param {string} [options.aiAgentTaskId] - Optional AiAgentTask ID to persist checkpoint
   * @param {string} [options.companyId] - Required if aiAgentTaskId is provided
   * @returns {{ planId: string, status: string, results: Object, errors: Array }}
   */
  async executePlan(plan, initialContext = {}, options = {}) {
    const results = { ...initialContext };
    const errors = [];
    const taskMap = new Map(plan.tasks.map(t => [t.id, t]));
    const { aiAgentTaskId, companyId } = options;

    for (let layerIndex = 0; layerIndex < plan.executionOrder.length; layerIndex++) {
      const layer = plan.executionOrder[layerIndex];
      const layerPromises = layer.map(async (taskId) => {
        const task = taskMap.get(taskId);
        if (!task) return;

        // Check if any dependencies have failed or been skipped
        const hasFailedDependency = (task.dependencies || []).some(depId => {
          const depTask = taskMap.get(depId);
          return depTask && (depTask.status === 'FAILED' || depTask.status === 'SKIPPED');
        });

        if (hasFailedDependency) {
          task.status = 'SKIPPED';
          task.error = 'Dependency failed or skipped';
          errors.push({ taskId, error: 'Dependency failed or skipped' });
          return;
        }

        try {
          // Resolve template parameters from previous results
          const resolvedParams = this._resolveTemplates(task.params || {}, results);
          task.status = 'RUNNING';

          const handler = task.handler || (async () => ({ success: true }));
          const result = await handler(resolvedParams, results);

          task.status = 'COMPLETED';
          task.result = result;
          results[taskId] = result;
        } catch (error) {
          task.status = 'FAILED';
          task.error = error.message;
          errors.push({ taskId, error: error.message });
        }
      });

      await Promise.all(layerPromises);

      // Persist checkpoint after each layer
      if (aiAgentTaskId && companyId) {
        await this._saveCheckpoint(companyId, aiAgentTaskId, {
          planId: plan.planId,
          layerIndex,
          tasks: [...taskMap.values()].map(t => ({ id: t.id, status: t.status, result: t.result, error: t.error })),
          results: { ...results },
          errors: [...errors],
        });
      }
    }

    const allCompleted = plan.tasks.every(t => t.status === 'COMPLETED');
    plan.status = errors.length === 0 && allCompleted ? 'SUCCESS' : 'PARTIAL_FAILURE';

    this._executionLog.push({
      planId: plan.planId, status: plan.status,
      completedTasks: plan.tasks.filter(t => t.status === 'COMPLETED').length,
      failedTasks: errors.length,
      timestamp: new Date(),
    });

    return { planId: plan.planId, status: plan.status, results, errors };
  }

  /**
   * Resolves template variables like {{taskId.field}} from previous results.
   */
  _resolveTemplates(params, results) {
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = value.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, taskId, field) => {
          const taskResult = results[taskId];
          if (taskResult && taskResult[field] !== undefined) return taskResult[field];
          return match;
        });
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * Attempts replanning when tasks fail by removing failed tasks and re-sorting.
   */
  replan(plan, failedTaskIds) {
    const remaining = plan.tasks.filter(t => !failedTaskIds.includes(t.id));
    // Remove dependencies on failed tasks
    for (const task of remaining) {
      task.dependencies = (task.dependencies || []).filter(d => !failedTaskIds.includes(d));
      task.status = 'PENDING';
    }
    const executionOrder = this._topologicalSort(remaining);
    return { ...plan, tasks: remaining, executionOrder, status: 'REPLANNED' };
  }

  async _saveCheckpoint(companyId, taskId, checkpointData) {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.aiAgentTask.update({
        where: { id: taskId, companyId },
        data: {
          checkpoint: checkpointData,
          status: checkpointData.tasks.some(t => t.status === 'FAILED') ? 'FAILED'
            : checkpointData.tasks.every(t => t.status === 'COMPLETED') ? 'COMPLETED'
            : 'IN_PROGRESS',
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn('[DAG-PLANNER] Failed to save checkpoint:', e.message);
    }
  }

  getExecutionLog() { return [...this._executionLog]; }
  _reset() { this._executionLog = []; }
}

module.exports = new DAGPlannerExecutor();
