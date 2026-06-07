/**
 * Tests for routeToTools stage.
 */

jest.mock('../../legacy-ai-agent/aiAgent/agentToolRegistry', () => ({
  TOOLS: {
    'inventory.check': { readOnly: true },
    'product.search': { readOnly: true },
    'order.create_draft': { readOnly: false },
    'agent.handoff': { readOnly: false },
  },
  getToolDescriptions: jest.fn(() => 'tool descriptions'),
  getNativeToolDefinitions: jest.fn(() => []),
  fromNativeToolName: jest.fn(name => name),
}));

jest.mock('../../legacy-ai-agent/aiAgent/CEOAgent', () => ({
  _formatRelevancePrompt: jest.fn((plan) => `[Intent: ${plan?.intent || 'none'}]`),
}));

const routeToTools = require('../../legacy-ai-agent/aiAgent/pipeline/stages/routeToTools');
const { buildSystemPromptForTurn, buildMessages } = routeToTools;

describe('buildSystemPromptForTurn', () => {
  test('appends relevance plan to system prompt', () => {
    const result = buildSystemPromptForTurn('System prompt', { intent: 'inventory' });
    expect(result).toContain('System prompt');
    expect(result).toContain('[Intent: inventory]');
  });
});

describe('buildMessages', () => {
  const baseAgent = { name: 'TestBot', role: 'SALES' };

  test('returns standard messages for non-customer channel', () => {
    const result = buildMessages({
      isCustomerReplyChannel: false,
      userMessage: 'hello',
      systemPromptForTurn: 'system',
      relevancePlan: {},
      agent: baseAgent,
    });
    expect(result).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'hello' },
    ]);
  });

  test('returns customer messages for customer channel', () => {
    const result = buildMessages({
      isCustomerReplyChannel: true,
      customerReplySourceMessage: 'عايز فستان',
      userMessage: 'hello',
      systemPromptForTurn: 'system',
      relevancePlan: {},
      formattedHistory: '',
      customerVoiceProfile: '',
      agent: baseAgent,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('routeToTools', () => {
  const baseContext = {
    agent: { name: 'TestBot', role: 'CEO', canUseTool: jest.fn(() => false) },
    relevancePlan: { intent: 'general.chat', requiresTool: false },
    isCustomerReplyChannel: false,
    intentMessage: 'test',
    executionMessage: 'test',
    nativeTools: [],
    intentContext: {},
    task: {},
    isStructuredTask: false,
    systemPrompt: 'System',
    customerReplySourceMessage: 'test',
    formattedHistory: '',
    customerVoiceProfile: '',
    userMessage: 'test',
  };

  test('returns execution plan with defaults', async () => {
    const result = await routeToTools(baseContext);
    expect(result.executionPlan).toBeDefined();
    expect(result.executionPlan.plannedExecutions).toEqual([]);
    expect(result.executionPlan.deterministicReadExecution).toBeNull();
    expect(result.executionPlan.deterministicActionExecution).toBeNull();
    expect(result.executionPlan.contextOrderDraftParams).toBeNull();
  });

  test('initializes empty arrays for tool tracking', async () => {
    const result = await routeToTools(baseContext);
    expect(result.executedTools).toEqual([]);
    expect(result.toolEvidence).toEqual([]);
    expect(result.toolContext).toBe('');
  });

  test('skips deterministic execution for customer channels', async () => {
    const context = {
      ...baseContext,
      isCustomerReplyChannel: true,
      relevancePlan: {
        intent: 'inventory',
        requiresTool: true,
        primaryTool: 'inventory.check',
        allowedTools: ['inventory.check'],
      },
    };
    const result = await routeToTools(context);
    expect(result.executionPlan.deterministicReadExecution).toBeNull();
    expect(result.executionPlan.deterministicActionExecution).toBeNull();
  });

  test('sets llmResult and llmResponse to null', async () => {
    const result = await routeToTools(baseContext);
    expect(result.llmResult).toBeNull();
    expect(result.llmResponse).toBe('');
  });
});
