/**
 * @module aiChatServiceOrchestration.test
 * @description Tests multi-agent orchestration triggered from merchant chat (aiChatService).
 */

const aiChatService = require('../../legacy-ai-agent/aiAgent/aiChatService');
const agentProvisioningService = require('../../legacy-ai-agent/aiAgent/agentProvisioningService');
const aiRuntimeService = require('../../legacy-ai-agent/aiAgent/aiRuntimeService');
const CEOAgent = require('../../legacy-ai-agent/aiAgent/CEOAgent');

// In-memory Redis mock
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

// Mock model manager
jest.mock('../../legacy-ai-agent/aiAgent/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({
    getNextKeySimple: jest.fn(() => Promise.resolve({
      provider: 'google',
      model: 'gemini-2.5-pro',
      apiKey: 'test-key',
      keyId: 'key_1',
    })),
    recordRoutingSuccess: jest.fn(),
  })),
}));

// Mock AI provider
jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(() => ({
    generateResponse: jest.fn(() => Promise.resolve({
      text: `{"plan": "Launch Facebook ads for products A and B with a 15% discount.", "summary": "Focus on high-stock, high-selling items via Facebook.", "actionItems": [{"owner": "MARKETING", "task": "Create Facebook ad campaign", "priority": "high"}, {"owner": "SALES", "task": "Prepare discount codes", "priority": "high"}] }`,
    })),
  })),
}));

// Mock agentChatTranscriptService
jest.mock('../../legacy-ai-agent/aiAgent/agentChatTranscriptService', () => ({
  appendMessage: jest.fn(() => Promise.resolve()),
  loadMessages: jest.fn(() => Promise.resolve([])),
  listSessions: jest.fn(() => Promise.resolve([])),
  saveSession: jest.fn(() => Promise.resolve()),
  saveSessions: jest.fn(() => Promise.resolve()),
  deleteSession: jest.fn(() => Promise.resolve()),
}));

// Mock telemetry
jest.mock('../../legacy-ai-agent/aiAgent/telemetryTracerService', () => ({
  startTrace: jest.fn(() => Promise.resolve({ id: 'trace_1' })),
  endTrace: jest.fn(() => Promise.resolve()),
  startSpan: jest.fn(() => Promise.resolve({ id: 'span_1' })),
  endSpan: jest.fn(() => Promise.resolve()),
}));

// Mock RAG
jest.mock('../../services/rag/CorrectiveRAGEngine', () => ({
  query: jest.fn(() => Promise.resolve({ answer: null })),
}));

// Mock intent classifier
jest.mock('../../legacy-ai-agent/aiAgent/agentIntentClassifierService', () => ({
  classifyIntentFromLLM: jest.fn(() => Promise.resolve({})),
}));

// Mock goal run service
jest.mock('../../legacy-ai-agent/aiAgent/agentGoalRunService', () => ({
  loadActiveRun: jest.fn(() => Promise.resolve(null)),
  processTurn: jest.fn(() => Promise.resolve({ activeGoal: null, promptBlock: '' })),
  applyTaskResult: jest.fn(() => Promise.resolve()),
  clearConversation: jest.fn(() => Promise.resolve()),
}));

// Override BaseAgent.processTask for specialist agents
const originalProcessTask = require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask;

beforeEach(async () => {
  agentProvisioningService._reset();
  aiChatService._agents.clear();
  aiChatService._sessionIndexes.clear();

  // Seed specialist agents
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

  require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask = jest.fn(async function (task) {
    const role = this.role || 'UNKNOWN';
    if (role === 'SALES') {
      return { agentId: this.id, role: 'SALES', status: 'SUCCESS', result: { summary: 'Top products: A and B' } };
    }
    if (role === 'MARKETING') {
      return { agentId: this.id, role: 'MARKETING', status: 'SUCCESS', result: { summary: 'Best channel: Facebook' } };
    }
    if (role === 'INVENTORY') {
      return { agentId: this.id, role: 'INVENTORY', status: 'SUCCESS', result: { summary: 'Stock: 500 units each' } };
    }
    return { agentId: this.id, role, status: 'SUCCESS', result: { summary: `Reply from ${role}` } };
  });
});

afterEach(() => {
  require('../../legacy-ai-agent/aiAgent/BaseAgent').prototype.processTask = originalProcessTask;
});

describe('aiChatService orchestration integration', () => {
  test('triggers multi-agent orchestration for marketing plan requests', async () => {
    const result = await aiChatService.sendMessage('comp1', 'user1', 'عايز خطة تسويقية لسبتمبر', {
      user: { firstName: 'أحمد' },
    });

    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    // The synthesized plan should mention action items
    expect(result.reply).toContain('MARKETING');
    expect(result.reply).toContain('SALES');
    expect(result.taskDetails).toBeDefined();
    expect(result.taskDetails.status).toBe('SUCCESS');
  });

  test('triggers orchestration for sales plan in English', async () => {
    const result = await aiChatService.sendMessage('comp1', 'user1', 'I need a sales plan for Q4', {
      user: { firstName: 'Test' },
    });

    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
  });

  test('_isOrchestrationRequest detects only orchestration patterns', () => {
    // Access private helper through the service instance
    const service = require('../../legacy-ai-agent/aiAgent/aiChatService');

    expect(service._isOrchestrationRequest('عايز خطة تسويقية')).toBeTruthy();
    expect(service._isOrchestrationRequest('I need a sales plan')).toBeTruthy();
    expect(service._isOrchestrationRequest('حملة ترويجية للمنتجات')).toBeTruthy();

    expect(service._isOrchestrationRequest('How many orders today?')).toBeNull();
    expect(service._isOrchestrationRequest('What is the price of X?')).toBeNull();
    expect(service._isOrchestrationRequest('Hello')).toBeNull();
  });

  test('triggers orchestration for promotion campaign requests', async () => {
    const result = await aiChatService.sendMessage('comp1', 'user1', 'حملة ترويجية للمنتجات الجديدة', {
      user: { firstName: 'Test' },
    });

    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.reply).toContain('MARKETING');
  });

  test('returns session and conversation metadata', async () => {
    const result = await aiChatService.sendMessage('comp1', 'user1', 'خطة تسويقية', {
      user: { firstName: 'Test' },
    });

    expect(result.conversationId).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.session.id).toBeDefined();
  });
});
