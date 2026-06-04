/**
 * @module criticalFixes.test
 * @description Tests for the critical security, memory, and scoping fixes
 * applied to the agent architecture (2026-06-02).
 */

const agentProvisioningService = require('../../../services/aiAgent/agentProvisioningService');
const BaseAgent = require('../../../services/aiAgent/BaseAgent');

describe('CRITICAL FIX: _enforceRoleToolScope respects UI tool config', () => {
  const companyId = 'test_tool_scope';

  afterEach(() => {
    const agents = agentProvisioningService.listAgents(companyId);
    for (const agent of agents) {
      agentProvisioningService.removeRuntimeAgent(companyId, agent.id);
    }
  });

  test('spawn with custom tools preserves them for SAS_SALES', async () => {
    const customTools = ['product.search', 'facebook.reply'];
    const agent = await agentProvisioningService.spawn(companyId, {
      role: 'SAS_SALES',
      allowedTools: customTools,
    });
    expect(agent.getTools()).toEqual(expect.arrayContaining(customTools));
    expect(agent.getTools()).toHaveLength(2);
    expect(agent.canUseTool('inventory.check')).toBe(false);
  });

  test('spawn without tools falls back to canonical template tools', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'SAS_SALES' });
    expect(agent.getTools()).toHaveLength(7);
    expect(agent.canUseTool('product.search')).toBe(true);
    expect(agent.canUseTool('facebook.reply')).toBe(true);
  });

  test('spawn with no allowedTools field falls back to canonical', async () => {
    const agent = await agentProvisioningService.spawn(companyId, {
      role: 'SALES',
    });
    expect(agent.getTools()).toHaveLength(9);
    expect(agent.canUseTool('discount.create_draft')).toBe(true);
  });

  test('spawn CEO without tools gets canonical 33 tools', async () => {
    const agent = await agentProvisioningService.spawn(companyId, { role: 'CEO' });
    expect(agent.getTools().length).toBeGreaterThanOrEqual(30);
  });
});

describe('CRITICAL FIX: _taskLog capped at MAX_TASK_LOG_ENTRIES (500)', () => {
  test('BaseAgent _taskLog never exceeds 500 entries', () => {
    const agent = new BaseAgent({
      id: 't',
      name: 't',
      role: 'T',
      companyId: 'c',
      allowedTools: [],
    });

    for (let i = 0; i < 550; i++) {
      agent._appendToTaskLog({ n: i });
    }
    expect(agent._taskLog).toHaveLength(500);
    expect(agent._taskLog[0].n).toBe(50);
    expect(agent._taskLog[499].n).toBe(549);
  });

  test('_appendToTaskLog handles single entry', () => {
    const agent = new BaseAgent({
      id: 't',
      name: 't',
      role: 'T',
      companyId: 'c',
      allowedTools: [],
    });
    agent._appendToTaskLog({ task: 'hello' });
    expect(agent._taskLog).toHaveLength(1);
    expect(agent._taskLog[0].task).toBe('hello');
  });

  test('getTaskLog returns copy, not reference', () => {
    const agent = new BaseAgent({
      id: 't',
      name: 't',
      role: 'T',
      companyId: 'c',
      allowedTools: [],
    });
    agent._appendToTaskLog({ a: 1 });
    const log1 = agent.getTaskLog();
    log1.push({ b: 2 });
    expect(agent.getTaskLog()).toHaveLength(1);
  });
});

describe('MEDIUM FIX: clearPromptCache invalidates system prompt cache', () => {
  test('clearPromptCache resets _systemPromptCache and _systemPromptCacheAt', () => {
    const agent = new BaseAgent({
      id: 't',
      name: 't',
      role: 'T',
      companyId: 'c',
      allowedTools: [],
    });
    agent._systemPromptCache = 'cached-prompt';
    agent._systemPromptCacheAt = Date.now();

    agent.clearPromptCache();

    expect(agent._systemPromptCache).toBeNull();
    expect(agent._systemPromptCacheAt).toBe(0);
  });
});

describe('CRITICAL FIX: crypto.randomUUID() replaces _idCounter', () => {
  test('spawned agent IDs are UUID-based, not sequential', async () => {
    const companyId = 'test_uuid';
    const agent1 = await agentProvisioningService.spawn(companyId, { role: 'SALES' });
    const agent2 = await agentProvisioningService.spawn(companyId, { role: 'SALES' });

    // UUIDs should be different
    expect(agent1.id).not.toBe(agent2.id);

    // Should contain UUID segments (8-4-4-4-12 pattern)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    expect(agent1.id).toMatch(uuidPattern);
    expect(agent2.id).toMatch(uuidPattern);

    agentProvisioningService.removeRuntimeAgent(companyId, agent1.id);
    agentProvisioningService.removeRuntimeAgent(companyId, agent2.id);
  });
});

describe('HIGH FIX: template-driven system prompt includes persona', () => {
  test('BaseAgent default prompt has empty persona when no instructions', () => {
    const agent = new BaseAgent({
      id: 't',
      name: 't',
      role: 'T',
      companyId: 'c',
      allowedTools: [],
    });
    const prompt = agent._getSystemPrompt();
    expect(prompt).not.toContain('[الشخصية]');
    expect(prompt).toContain('[الأدوات المتاحة]');
  });

  test('SAS_SALES template prompt includes persona and rules', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'test_company');
    const prompt = agent._getSystemPrompt();
    expect(prompt).toContain('[الشخصية]');
    expect(prompt).toContain('[القواعد التشغيلية]');
    expect(prompt).toContain('SAS_SALES');
  });
});
