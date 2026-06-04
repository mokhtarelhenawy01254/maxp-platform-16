const mockRedisCache = new Map();

jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(async key => mockRedisCache.get(key) || null),
  set: jest.fn(async (key, value) => {
    mockRedisCache.set(key, value);
    return true;
  }),
  del: jest.fn(async key => {
    mockRedisCache.delete(key);
    return true;
  }),
}));

const {
  AgentRunRuntimeService,
} = require('../../services/aiAgent/agentRunRuntimeService');

describe('agentRunRuntimeService', () => {
  beforeEach(() => {
    mockRedisCache.clear();
  });

  test('creates and checkpoints a generic durable run', async () => {
    const runtime = new AgentRunRuntimeService({ namespace: 'test:agent-run', runPrefix: 'test_goal' });
    const run = runtime.createRun({
      type: 'create_skill',
      title: 'Create Skill',
      companyId: 'company_1',
      userId: 'user_1',
      sessionId: 'session_1',
      conversationId: 'conversation_1',
      message: 'اعمل مهارة جديدة',
    });

    expect(run.id).toMatch(/^test_goal_/);
    expect(run.checkpoint).toEqual(expect.objectContaining({
      sequence: 1,
      eventType: 'created',
      status: 'collecting',
      nextStep: 'collect_missing_fields',
    }));

    const updated = runtime.transitionRun(run, {
      status: 'waiting_for_confirmation',
      nextStep: 'confirm_skill',
      collected: { skillName: 'متابعة العملاء' },
      executionParams: { displayName: 'متابعة العملاء' },
      plan: ['skill.create'],
    }, {
      type: 'updated',
      message: 'اسمها متابعة العملاء',
    });

    expect(updated.checkpoint.sequence).toBe(2);
    expect(updated.executionFingerprint).toEqual(expect.any(String));
    expect(updated.events).toHaveLength(2);

    await runtime.saveRun('company_1', 'conversation_1', updated);
    const loaded = await runtime.loadActiveRun('company_1', 'conversation_1');
    expect(loaded).toEqual(updated);
    expect(runtime.publicSnapshot(loaded)).toEqual(expect.objectContaining({
      id: updated.id,
      type: 'create_skill',
      checkpoint: expect.objectContaining({ sequence: 2 }),
      executionFingerprint: updated.executionFingerprint,
    }));
  });

  test('adds deterministic step idempotency keys to planned tool steps', () => {
    const runtime = new AgentRunRuntimeService({ namespace: 'test:agent-run' });
    const run = runtime.transitionRun(runtime.createRun({
      type: 'create_agent_with_skill',
      title: 'Create Agent',
      companyId: 'company_1',
      userId: 'user_1',
      sessionId: 'session_1',
      conversationId: 'conversation_1',
      message: 'اعمل وكيل',
    }), {
      status: 'ready_to_execute',
      nextStep: 'execute_tool',
      executionParams: { agent: { name: 'شرين' }, skill: { id: 'facebook-sales-conversion' } },
      plan: ['agent.spawn', 'skill.create'],
    }, { type: 'confirmed' });

    const steps = runtime.prepareExecutionSteps(run, [
      { tool: 'agent.spawn', params: run.executionParams.agent },
      { tool: 'skill.create', params: run.executionParams.skill },
    ]);

    expect(steps).toEqual([
      expect.objectContaining({
        goalRunId: run.id,
        stepIndex: 0,
        idempotencyKey: `${run.id}:0:agent.spawn:${run.executionFingerprint}`,
      }),
      expect.objectContaining({
        goalRunId: run.id,
        stepIndex: 1,
        idempotencyKey: `${run.id}:1:skill.create:${run.executionFingerprint}`,
      }),
    ]);
  });
});
