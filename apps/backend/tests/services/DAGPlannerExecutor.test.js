/**
 * @module DAGPlannerExecutor.test
 * @description Integration tests for DAG plan creation, execution, checkpointing,
 *   replanning, and multi-tenant safety.
 */

const DAGPlannerExecutor = require('../../services/aiAgent/DAGPlannerExecutor');

jest.mock('../../services/sharedDatabase', () => {
  const aiAgentTasks = [];
  const aiAgentTask = {
    create: jest.fn(({ data }) => {
      const row = { id: data.id || `task_${aiAgentTasks.length}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      aiAgentTasks.push(row);
      return Promise.resolve(row);
    }),
    findFirst: jest.fn(({ where }) => Promise.resolve(aiAgentTasks.find(t => t.id === where?.id && t.companyId === where?.companyId) || null)),
    findMany: jest.fn(() => Promise.resolve(aiAgentTasks)),
    update: jest.fn(({ where, data }) => {
      const row = aiAgentTasks.find(t => t.id === where?.id && t.companyId === where?.companyId);
      if (!row) return Promise.reject(new Error('task not found'));
      Object.assign(row, data);
      return Promise.resolve(row);
    }),
    updateMany: jest.fn(),
    delete: jest.fn(),
  };

  return {
    getSharedPrismaClient: jest.fn(() => ({
      aiAgentTask,
      aiAgentRun: { create: jest.fn(), findMany: jest.fn() },
    })),
    __aiAgentTasks: aiAgentTasks,
    __aiAgentTaskMock: aiAgentTask,
  };
});

const { getSharedPrismaClient, __aiAgentTasks, __aiAgentTaskMock } = require('../../services/sharedDatabase');

describe('DAGPlannerExecutor', () => {
  beforeEach(() => {
    DAGPlannerExecutor._reset();
    __aiAgentTasks.splice(0, __aiAgentTasks.length);
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('creates a valid DAG plan from independent tasks', () => {
      const tasks = [
        { id: 'a', name: 'Task A', dependencies: [], handler: jest.fn() },
        { id: 'b', name: 'Task B', dependencies: [], handler: jest.fn() },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      expect(plan.planId).toMatch(/^plan_/);
      expect(plan.status).toBe('READY');
      expect(plan.tasks).toHaveLength(2);
      expect(plan.executionOrder).toHaveLength(1);
      expect(plan.executionOrder[0]).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('topologically sorts tasks with dependencies', () => {
      const tasks = [
        { id: 'c', name: 'Task C', dependencies: ['a', 'b'], handler: jest.fn() },
        { id: 'a', name: 'Task A', dependencies: [], handler: jest.fn() },
        { id: 'b', name: 'Task B', dependencies: ['a'], handler: jest.fn() },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      expect(plan.executionOrder).toHaveLength(3);
      expect(plan.executionOrder[0]).toEqual(['a']);
      expect(plan.executionOrder[1]).toEqual(['b']);
      expect(plan.executionOrder[2]).toEqual(['c']);
    });

    it('rejects cyclic dependencies', () => {
      const tasks = [
        { id: 'x', name: 'X', dependencies: ['y'], handler: jest.fn() },
        { id: 'y', name: 'Y', dependencies: ['x'], handler: jest.fn() },
      ];
      expect(() => DAGPlannerExecutor.createPlan(tasks)).toThrow('cycle detected');
    });
  });

  describe('executePlan', () => {
    it('executes independent tasks concurrently and collects results', async () => {
      const handlerA = jest.fn().mockResolvedValue({ count: 10 });
      const handlerB = jest.fn().mockResolvedValue({ count: 20 });
      const tasks = [
        { id: 'a', name: 'Task A', dependencies: [], handler: handlerA },
        { id: 'b', name: 'Task B', dependencies: [], handler: handlerB },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);

      expect(result.status).toBe('SUCCESS');
      expect(result.results.a).toEqual({ count: 10 });
      expect(result.results.b).toEqual({ count: 20 });
      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(result.errors).toHaveLength(0);
    });

    it('executes layers sequentially respecting dependencies', async () => {
      const callOrder = [];
      const tasks = [
        { id: 'fetch', name: 'Fetch', dependencies: [], handler: jest.fn().mockImplementation(async () => { callOrder.push('fetch'); return { data: [1, 2] }; }) },
        { id: 'transform', name: 'Transform', dependencies: ['fetch'], handler: jest.fn().mockImplementation(async () => { callOrder.push('transform'); return { transformed: true }; }) },
        { id: 'save', name: 'Save', dependencies: ['transform'], handler: jest.fn().mockImplementation(async () => { callOrder.push('save'); return { saved: true }; }) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);

      expect(result.status).toBe('SUCCESS');
      expect(callOrder).toEqual(['fetch', 'transform', 'save']);
    });

    it('resolves template parameters from previous results', async () => {
      const tasks = [
        { id: 'search', name: 'Search', dependencies: [], handler: jest.fn().mockResolvedValue({ productId: 'p1' }) },
        { id: 'detail', name: 'Detail', dependencies: ['search'], params: { id: '{{search.productId}}' }, handler: jest.fn().mockImplementation(async (p) => ({ fetched: p.id })) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);

      expect(result.results.detail).toEqual({ fetched: 'p1' });
    });

    it('skips tasks whose dependencies failed', async () => {
      const tasks = [
        { id: 'failing', name: 'Failing', dependencies: [], handler: jest.fn().mockRejectedValue(new Error('boom')) },
        { id: 'dependent', name: 'Dependent', dependencies: ['failing'], handler: jest.fn().mockResolvedValue({ ok: true }) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);

      expect(result.status).toBe('PARTIAL_FAILURE');
      expect(result.errors).toHaveLength(2);
      expect(plan.tasks.find(t => t.id === 'dependent').status).toBe('SKIPPED');
    });

    it('returns PARTIAL_FAILURE when some tasks fail but others succeed', async () => {
      const tasks = [
        { id: 'ok', name: 'OK', dependencies: [], handler: jest.fn().mockResolvedValue({ success: true }) },
        { id: 'fail', name: 'Fail', dependencies: [], handler: jest.fn().mockRejectedValue(new Error('nope')) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);

      expect(result.status).toBe('PARTIAL_FAILURE');
      expect(result.results.ok).toEqual({ success: true });
      expect(result.errors).toHaveLength(1);
    });

    it('uses a no-op handler when none is provided', async () => {
      const tasks = [
        { id: 'a', name: 'No Handler', dependencies: [] },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan);
      expect(result.status).toBe('SUCCESS');
      expect(result.results.a).toEqual({ success: true });
    });
  });

  describe('_saveCheckpoint', () => {
    it('persists checkpoint to AiAgentTask after each layer', async () => {
      const taskRow = { id: 'task_1', companyId: 'co_1', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);

      const tasks = [
        { id: 'step1', name: 'Step 1', dependencies: [], handler: jest.fn().mockResolvedValue({ x: 1 }) },
        { id: 'step2', name: 'Step 2', dependencies: ['step1'], handler: jest.fn().mockResolvedValue({ y: 2 }) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      const result = await DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_1', companyId: 'co_1' });

      expect(result.status).toBe('SUCCESS');
      expect(__aiAgentTaskMock.update).toHaveBeenCalled();

      const lastCall = __aiAgentTaskMock.update.mock.calls[__aiAgentTaskMock.update.mock.calls.length - 1];
      const [whereClause, dataClause] = [lastCall[0].where, lastCall[0].data];
      expect(whereClause.id).toBe('task_1');
      expect(whereClause.companyId).toBe('co_1');
      expect(dataClause.status).toBe('COMPLETED');
      expect(dataClause.checkpoint).toBeDefined();
      expect(dataClause.checkpoint.planId).toBe(plan.planId);
      expect(dataClause.checkpoint.tasks).toBeDefined();
      expect(dataClause.checkpoint.layerIndex).toBeDefined();
    });

    it('derives FAILED status when any task has failed', async () => {
      const taskRow = { id: 'task_fail', companyId: 'co_fail', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);

      const tasks = [
        { id: 'good', name: 'Good', dependencies: [], handler: jest.fn().mockResolvedValue({ ok: 1 }) },
        { id: 'bad', name: 'Bad', dependencies: [], handler: jest.fn().mockRejectedValue(new Error('fail')) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_fail', companyId: 'co_fail' });

      const lastCall = __aiAgentTaskMock.update.mock.calls[__aiAgentTaskMock.update.mock.calls.length - 1];
      expect(lastCall[0].data.status).toBe('FAILED');
    });

    it('derives IN_PROGRESS status when tasks are still running', async () => {
      const taskRow = { id: 'task_prog', companyId: 'co_prog', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);

      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({}) },
        { id: 'b', name: 'B', dependencies: ['a'], handler: jest.fn().mockResolvedValue({}) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_prog', companyId: 'co_prog' });

      const firstCall = __aiAgentTaskMock.update.mock.calls[0];
      expect(firstCall[0].data.status).toBe('IN_PROGRESS');
    });

    it('scopes update by companyId for multi-tenant safety', async () => {
      const taskRow = { id: 'task_mt', companyId: 'co_mt', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);

      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({}) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_mt', companyId: 'co_mt' });

      const call = __aiAgentTaskMock.update.mock.calls[0];
      expect(call[0].where.companyId).toBe('co_mt');
    });

    it('does not call update when DB update fails (swallows error)', async () => {
      const taskRow = { id: 'task_err', companyId: 'co_err', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);
      __aiAgentTaskMock.update.mockImplementationOnce(() => Promise.reject(new Error('DB down')));

      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({}) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);

      await expect(DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_err', companyId: 'co_err' })).resolves.toBeDefined();
      expect(plan.tasks[0].status).toBe('COMPLETED');
    });

    it('stores checkpoint as native JSON object (not double-serialized string)', async () => {
      const taskRow = { id: 'task_js', companyId: 'co_js', status: 'PENDING', checkpoint: null };
      __aiAgentTasks.push(taskRow);

      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({ val: 42 }) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan, {}, { aiAgentTaskId: 'task_js', companyId: 'co_js' });

      const call = __aiAgentTaskMock.update.mock.calls[0];
      const checkpoint = call[0].data.checkpoint;
      expect(typeof checkpoint).toBe('object');
      expect(typeof checkpoint).not.toBe('string');
      expect(checkpoint.planId).toBe(plan.planId);
      expect(checkpoint.tasks).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'a', status: 'COMPLETED' }),
      ]));
    });
  });

  describe('replan', () => {
    it('removes failed tasks and recalculates execution order', () => {
      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn() },
        { id: 'b', name: 'B', dependencies: ['a'], handler: jest.fn() },
        { id: 'c', name: 'C', dependencies: [], handler: jest.fn() },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      plan.tasks[0].status = 'FAILED';

      const replanned = DAGPlannerExecutor.replan(plan, ['a']);
      expect(replanned.tasks).toHaveLength(2);
      expect(replanned.tasks.every(t => t.id !== 'a')).toBe(true);
      expect(replanned.status).toBe('REPLANNED');
    });

    it('removes dependency references to failed tasks', () => {
      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn() },
        { id: 'b', name: 'B', dependencies: ['a'], handler: jest.fn() },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);

      const replanned = DAGPlannerExecutor.replan(plan, ['a']);
      expect(replanned.tasks[0].dependencies).toHaveLength(0);
    });
  });

  describe('execution log', () => {
    it('records each execution in the log', async () => {
      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({}) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan);

      const log = DAGPlannerExecutor.getExecutionLog();
      expect(log).toHaveLength(1);
      expect(log[0].planId).toBe(plan.planId);
      expect(log[0].status).toBe('SUCCESS');
      expect(log[0].completedTasks).toBe(1);
      expect(log[0].failedTasks).toBe(0);
    });

    it('resets execution log', async () => {
      const tasks = [
        { id: 'a', name: 'A', dependencies: [], handler: jest.fn().mockResolvedValue({}) },
      ];
      const plan = DAGPlannerExecutor.createPlan(tasks);
      await DAGPlannerExecutor.executePlan(plan);
      DAGPlannerExecutor._reset();
      expect(DAGPlannerExecutor.getExecutionLog()).toHaveLength(0);
    });
  });
});