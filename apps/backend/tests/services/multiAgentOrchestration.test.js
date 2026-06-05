/**
 * @module multiAgentOrchestration.test
 * @description Integration tests for multi-agent orchestration layer:
 * agentConversationBroker, planSynthesisEngine, and CEOAgent multi-agent workflows.
 */

const CEOAgent = require('../../legacy-ai-agent/aiAgent/CEOAgent');
const agentConversationBroker = require('../../legacy-ai-agent/aiAgent/agentConversationBroker');
const planSynthesisEngine = require('../../legacy-ai-agent/aiAgent/planSynthesisEngine');
const agentProvisioningService = require('../../legacy-ai-agent/aiAgent/agentProvisioningService');
const aiRuntimeService = require('../../legacy-ai-agent/aiAgent/aiRuntimeService');
jest.mock('../../services/redisCacheService', () => {
  const store = new Map();
  return {
    set: jest.fn((key, value, ttl) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
      return Promise.resolve('OK');
    }),
    get: jest.fn((key) => {
      const val = store.get(key);
      return Promise.resolve(val ? JSON.parse(JSON.stringify(val)) : null);
    }),
    del: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
  };
});

// Mock AI provider for synthesis engine
const mockGenerateResponse = jest.fn();
jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(() => ({
    generateResponse: mockGenerateResponse,
  })),
}));

// Mock model manager
const mockGetNextKeySimple = jest.fn();
jest.mock('../../legacy-ai-agent/aiAgent/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({
    getNextKeySimple: mockGetNextKeySimple,
    recordRoutingSuccess: jest.fn(),
  })),
}));

// Mock BaseAgent.prototype.processTask so specialist agents return predictable replies
const originalProcessTask = require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask;

beforeEach(async () => {
  agentProvisioningService._reset();
  agentConversationBroker._reset();
  mockGenerateResponse.mockReset();
  mockGetNextKeySimple.mockReset();

  // Seed specialist agents for company 'comp1'
  await agentProvisioningService.spawn('comp1', {
    role: 'SALES',
    name: 'Sales Agent',
    templateSlug: 'sales-agent',
  });
  await agentProvisioningService.spawn('comp1', {
    role: 'MARKETING',
    name: 'Marketing Agent',
    templateSlug: 'marketing-agent',
  });
  await agentProvisioningService.spawn('comp1', {
    role: 'INVENTORY',
    name: 'Inventory Agent',
    templateSlug: 'inventory-pricing-agent',
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Tests: agentConversationBroker ──

describe('agentConversationBroker', () => {
  test('opens a conversation session', async () => {
    const session = await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'sales_1',
      topic: 'Q4 sales plan',
      context: { budget: 5000 },
    });

    expect(session.id).toBeDefined();
    expect(session.companyId).toBe('comp1');
    expect(session.parentAgentId).toBe('ceo_1');
    expect(session.specialistAgentId).toBe('sales_1');
    expect(session.topic).toBe('Q4 sales plan');
    expect(session.status).toBe('OPEN');
    expect(session.turns).toEqual([]);
  });

  test('sends and stores messages', async () => {
    const session = await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'sales_1',
      topic: 'test',
    });

    await agentConversationBroker.sendMessage(session.id, {
      fromAgentId: 'ceo_1',
      content: 'What are our top selling products?',
      role: 'user',
    });

    const history = await agentConversationBroker.getHistory(session.id);
    expect(history.turns).toHaveLength(1);
    expect(history.turns[0].from).toBe('ceo_1');
    expect(history.turns[0].content).toBe('What are our top selling products?');
  });

  test('enforces max turns limit', async () => {
    const session = await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'sales_1',
      topic: 'test',
      maxTurns: 2,
    });

    await agentConversationBroker.sendMessage(session.id, { fromAgentId: 'ceo_1', content: 'msg1' });
    await agentConversationBroker.sendMessage(session.id, { fromAgentId: 'sales_1', content: 'msg2' });

    await expect(
      agentConversationBroker.sendMessage(session.id, { fromAgentId: 'ceo_1', content: 'msg3' }),
    ).rejects.toThrow('MAX_TURNS_REACHED');
  });

  test('closes a session with summary', async () => {
    const session = await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'sales_1',
      topic: 'test',
    });

    const closed = await agentConversationBroker.closeSession(session.id, {
      finalSummary: 'Focus on product X and Y.',
    });
    expect(closed).toBe(true);

    const history = await agentConversationBroker.getHistory(session.id);
    expect(history.status).toBe('CLOSED');
    expect(history.finalSummary).toBe('Focus on product X and Y.');
  });

  test('lists open sessions for a company', async () => {
    await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'sales_1',
      topic: 'plan A',
    });
    const s2 = await agentConversationBroker.openSession({
      companyId: 'comp1',
      parentAgentId: 'ceo_1',
      specialistAgentId: 'marketing_1',
      topic: 'plan B',
    });
    await agentConversationBroker.closeSession(s2.id);

    const open = await agentConversationBroker.listOpenSessions('comp1');
    expect(open).toHaveLength(1);
    expect(open[0].topic).toBe('plan A');
  });
});

// ── Tests: planSynthesisEngine ──

describe('planSynthesisEngine', () => {
  beforeEach(() => {
    planSynthesisEngine.setModelManager(aiRuntimeService.getModelManager());
  });

  test('synthesizes a unified plan from multiple agent inputs', async () => {
    mockGetNextKeySimple.mockResolvedValue({
      provider: 'google',
      model: 'gemini-2.5-pro',
      apiKey: 'test-key',
      keyId: 'key_1',
    });

    mockGenerateResponse.mockResolvedValue({
      text: `{"plan": "Launch Facebook ads for products A and B with a 15% discount.", "summary": "Focus on high-stock, high-selling items via Facebook.", "actionItems": [{"owner": "MARKETING", "task": "Create Facebook ad campaign", "priority": "high"}, {"owner": "SALES", "task": "Prepare discount codes", "priority": "high"}] }`,
    });

    const result = await planSynthesisEngine.synthesizePlan({
      goal: 'Q4 marketing plan',
      companyId: 'comp1',
      inputs: [
        { agentRole: 'SALES', agentName: 'Sales Agent', output: 'Products A and B are top sellers.' },
        { agentRole: 'INVENTORY', agentName: 'Inventory Agent', output: 'Products A and B have 500+ units in stock.' },
        { agentRole: 'MARKETING', agentName: 'Marketing Agent', output: 'Facebook ads have the best ROAS.' },
      ],
      constraints: { budget: 5000 },
    });

    expect(result.plan).toContain('Facebook ads');
    expect(result.summary).toContain('Facebook');
    expect(result.actionItems).toHaveLength(2);
    expect(result.completeness).toBeGreaterThanOrEqual(0);
    expect(result.agentInputs).toHaveLength(3);
  });

  test('validates plan completeness and detects gaps', async () => {
    mockGetNextKeySimple.mockResolvedValue({
      provider: 'google',
      model: 'gemini-2.5-pro',
      apiKey: 'test-key',
      keyId: 'key_1',
    });

    // Synthesis response that only mentions SALES, omitting INVENTORY and MARKETING
    mockGenerateResponse.mockResolvedValue({
      text: `{"plan": "Ask the sales team to push more units.", "summary": "Sales push.", "actionItems": [] }`,
    });

    const result = await planSynthesisEngine.synthesizePlan({
      goal: 'Q4 plan',
      companyId: 'comp1',
      inputs: [
        { agentRole: 'SALES', agentName: 'Sales Agent', output: 'Push more units.' },
        { agentRole: 'INVENTORY', agentName: 'Inventory Agent', output: 'Stock is fine.' },
        { agentRole: 'MARKETING', agentName: 'Marketing Agent', output: 'Run ads.' },
      ],
    });

    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps.some(g => g.includes('INVENTORY') || g.includes('MARKETING'))).toBe(true);
    expect(result.completeness).toBeLessThan(100);
  });

  test('throws when model key is unavailable', async () => {
    mockGetNextKeySimple.mockResolvedValue({ error: 'NO_MODEL_KEY_AVAILABLE' });

    await expect(
      planSynthesisEngine.synthesizePlan({
        goal: 'test',
        inputs: [{ agentRole: 'SALES', agentName: 'Sales', output: 'test' }],
      }),
    ).rejects.toThrow('NO_MODEL_KEY_AVAILABLE');
  });

  test('throws when inputs array is empty', async () => {
    await expect(
      planSynthesisEngine.synthesizePlan({ goal: 'test', inputs: [] }),
    ).rejects.toThrow('INPUTS_REQUIRED');
  });
});

// ── Tests: CEOAgent multi-agent orchestration ──

describe('CEOAgent Multi-Agent Orchestration', () => {
  beforeEach(() => {
    // Override BaseAgent.processTask to return deterministic specialist replies
    require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask = jest.fn(async function (task) {
      const role = this.role || 'UNKNOWN';
      const desc = task.description || task.title || '';

      if (role === 'SALES') {
        return {
          agentId: this.id,
          role: 'SALES',
          status: 'SUCCESS',
          result: { summary: 'SALES: Top products are A and B. Recommend bundle discount.' },
        };
      }
      if (role === 'MARKETING') {
        return {
          agentId: this.id,
          role: 'MARKETING',
          status: 'SUCCESS',
          result: { summary: 'MARKETING: Facebook ads + Instagram stories yield best ROI.' },
        };
      }
      if (role === 'INVENTORY') {
        return {
          agentId: this.id,
          role: 'INVENTORY',
          status: 'SUCCESS',
          result: { summary: 'INVENTORY: 500 units of A, 300 units of B. No restock needed.' },
        };
      }

      return {
        agentId: this.id,
        role,
        status: 'SUCCESS',
        result: { summary: `Reply from ${role}` },
      };
    });
  });

  afterEach(() => {
    require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask = originalProcessTask;
  });

  test('CEOAgent can discuss with a single specialist agent', async () => {
    const ceo = new CEOAgent('comp1', { role: 'CEO' });
    ceo.setModelManager(aiRuntimeService.getModelManager());

    const agents = agentProvisioningService.listAgents('comp1');
    const salesAgent = agents.find(a => a.role === 'SALES');

    const result = await ceo.discussWithAgent({
      specialistAgentId: salesAgent.id,
      topic: 'Top products inquiry',
      initialTask: 'What are our best selling products this month?',
      maxRounds: 2,
    });

    expect(result.sessionId).toBeDefined();
    expect(result.specialistAgentId).toBe(salesAgent.id);
    expect(result.reply).toBeDefined();
    expect(result.history.turns.length).toBeGreaterThanOrEqual(2);
  });

  test('CEOAgent can request revision from specialist', async () => {
    const ceo = new CEOAgent('comp1', { role: 'CEO' });
    ceo.setModelManager(aiRuntimeService.getModelManager());

    const agents = agentProvisioningService.listAgents('comp1');
    const salesAgent = agents.find(a => a.role === 'SALES');

    // First discussion
    const first = await ceo.discussWithAgent({
      specialistAgentId: salesAgent.id,
      topic: 'Draft plan',
      initialTask: 'Draft a sales plan',
      maxRounds: 1,
    });

    // Request revision
    const refined = await ceo.reviewAndRefine({
      sessionId: first.sessionId,
      feedback: 'Add pricing details and timeline.',
      specialistAgentId: salesAgent.id,
    });

    expect(refined.reply).toBeDefined();
    expect(refined.history.turns.length).toBeGreaterThanOrEqual(3);
    expect(refined.history.turns.some(t => t.content.includes('Revision Request'))).toBe(true);
  });

  test('orchestrateMultiAgentWorkflow consults multiple agents and returns unified plan', async () => {
    const ceo = new CEOAgent('comp1', { role: 'CEO' });
    ceo.setModelManager(aiRuntimeService.getModelManager());

    mockGetNextKeySimple.mockResolvedValue({
      provider: 'google',
      model: 'gemini-2.5-pro',
      apiKey: 'test-key',
      keyId: 'key_1',
    });

    mockGenerateResponse.mockResolvedValue({
      text: `{"plan": "Unified Q4 Plan: Bundle A+B with 15% discount via Facebook ads.", "summary": "Bundle strategy on Facebook.", "actionItems": [{"owner": "MARKETING", "task": "Launch Facebook campaign", "priority": "high"}, {"owner": "SALES", "task": "Activate bundle discount", "priority": "high"}, {"owner": "INVENTORY", "task": "Reserve stock", "priority": "medium"}] }`,
    });

    const agents = agentProvisioningService.listAgents('comp1');
    const salesAgent = agents.find(a => a.role === 'SALES');
    const marketingAgent = agents.find(a => a.role === 'MARKETING');
    const inventoryAgent = agents.find(a => a.role === 'INVENTORY');

    const result = await ceo.orchestrateMultiAgentWorkflow({
      goal: 'Q4 marketing and sales plan',
      agents: [
        { agentId: salesAgent.id, role: 'SALES', task: 'What should we focus on selling?' },
        { agentId: marketingAgent.id, role: 'MARKETING', task: 'Which channels should we use?' },
        { agentId: inventoryAgent.id, role: 'INVENTORY', task: 'Do we have enough stock?' },
      ],
      constraints: { budget: 10000, timeline: 'September' },
    });

    expect(result.goal).toBe('Q4 marketing and sales plan');
    expect(result.plan).toContain('Unified Q4 Plan');
    expect(result.summary).toBeDefined();
    expect(result.actionItems).toHaveLength(3);
    expect(result.sessions).toHaveLength(3);
    expect(result.inputs).toHaveLength(3);
    expect(result.completeness).toBeGreaterThanOrEqual(0);
    expect(result.modelUsed).toBe('gemini-2.5-pro');
  });

  test('orchestrateMultiAgentWorkflow closes all sessions after completion', async () => {
    const ceo = new CEOAgent('comp1', { role: 'CEO' });
    ceo.setModelManager(aiRuntimeService.getModelManager());

    mockGetNextKeySimple.mockResolvedValue({
      provider: 'google',
      model: 'gemini-2.5-pro',
      apiKey: 'test-key',
      keyId: 'key_1',
    });

    mockGenerateResponse.mockResolvedValue({
      text: `{"plan": "Plan text", "summary": "Summary text", "actionItems": [] }`,
    });

    const agents = agentProvisioningService.listAgents('comp1');
    const salesAgent = agents.find(a => a.role === 'SALES');

    await ceo.orchestrateMultiAgentWorkflow({
      goal: 'Test',
      agents: [{ agentId: salesAgent.id, role: 'SALES', task: 'Test task' }],
    });

    const openSessions = await agentConversationBroker.listOpenSessions('comp1');
    expect(openSessions).toHaveLength(0);
  });

  test('handles missing agent gracefully', async () => {
    const ceo = new CEOAgent('comp1', { role: 'CEO' });
    ceo.setModelManager(aiRuntimeService.getModelManager());

    await expect(
      ceo.discussWithAgent({
        specialistAgentId: 'nonexistent_agent',
        topic: 'Test',
        initialTask: 'Test',
      }),
    ).rejects.toThrow('AGENT_NOT_FOUND');
  });
});

// ── End-to-End: Tool-level orchestration ──

describe('agent.orchestrate tool end-to-end', () => {
  test('CEOAgent tool registry includes agent.orchestrate', () => {
    const TOOLS = require('../../legacy-ai-agent/aiAgent/tools/managerTools');
    expect(TOOLS['agent.orchestrate']).toBeDefined();
    expect(TOOLS['agent.orchestrate'].description).toContain('Coordinate multiple specialist agents');
    expect(TOOLS['agent.orchestrate'].requiresApproval).toBe(true);
  });
});
