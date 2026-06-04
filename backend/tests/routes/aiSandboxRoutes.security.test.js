const express = require('express');
const request = require('supertest');

let mockCurrentUser;

const mockProviderClient = {
  generateContent: jest.fn(),
  generateResponse: jest.fn(),
};
let mockCeoAgentInstance;
let mockCeoAgentNextResult;
const mockWorkingMemoryStore = new Map();

const mockPrisma = {
  aiKey: {
    findMany: jest.fn(),
  },
  aiModelConfig: {
    findMany: jest.fn(),
  },
  globalAiConfig: {
    findFirst: jest.fn(),
  },
  companyAgent: {
    findMany: jest.fn(),
  },
  aiSandboxSession: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  aiSandboxMessage: {
    create: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    return next();
  },
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(() => mockProviderClient),
  getActiveProvider: jest.fn(() => mockProviderClient),
}));

jest.mock('../../services/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({
    getNextKeySimple: jest.fn(),
  })),
}));

jest.mock('../../services/aiAgent/workingMemoryService', () => ({
  clearSession: jest.fn(async (companyId, conversationId) => {
    mockWorkingMemoryStore.delete(`${companyId}:${conversationId}`);
    return true;
  }),
  initSession: jest.fn(async (companyId, conversationId) => {
    mockWorkingMemoryStore.set(`${companyId}:${conversationId}`, { messages: [] });
    return mockWorkingMemoryStore.get(`${companyId}:${conversationId}`);
  }),
  addMessage: jest.fn(async (companyId, conversationId, message) => {
    const key = `${companyId}:${conversationId}`;
    const session = mockWorkingMemoryStore.get(key) || { messages: [] };
    session.messages = session.messages || [];
    session.messages.push({
      role: message.role || 'user',
      content: message.content || '',
    });
    mockWorkingMemoryStore.set(key, session);
    return session;
  }),
  getContext: jest.fn(async (companyId, conversationId) => {
    const session = mockWorkingMemoryStore.get(`${companyId}:${conversationId}`);
    if (!session) return null;
    return {
      summary: null,
      recentMessages: session.messages || [],
      cart: {},
      queriedProducts: [],
    };
  }),
}));

jest.mock('../../services/aiAgent/CEOAgent', () => jest.fn().mockImplementation(() => {
  const defaultResult = {
    status: 'SUCCESS',
    result: {
      reply: 'LLM reply',
      summary: 'LLM reply',
      tools: [],
    },
    modelSelection: {
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
      keyId: 'key_google',
      keyName: 'Production Gemini',
    },
  };
  mockCeoAgentInstance = {
    setModelManager: jest.fn(),
    processTask: jest.fn(async () => mockCeoAgentNextResult || defaultResult),
    getInfo: jest.fn(() => ({
      selectedModel: 'gemini-2.5-flash',
      selectedProvider: 'GOOGLE',
      lastModelSelection: {
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        keyName: 'Production Gemini',
      },
    })),
  };
  return mockCeoAgentInstance;
}));

jest.mock('../../services/aiAgent/agentProvisioningService', () => ({
  getAgent: jest.fn(() => ({
    id: 'agent_sales',
    name: 'Sales Agent',
    role: 'SALES',
    persona: {
      soulInstructions: 'Sensitive private operating instructions',
    },
    allowedTools: ['product.search', 'order.create_draft'],
  })),
}));

jest.mock('../../services/aiAgent/agentProfileLoaderService', () => ({
  loadProfile: jest.fn(() => null),
}));

jest.mock('../../services/aiAgent/agentManagerService', () => ({
  getManagerAgent: jest.fn().mockResolvedValue({ id: 'agent_ceo' }),
  ensureFacebookMessengerAgent: jest.fn().mockResolvedValue(null),
  getManagerContext: jest.fn().mockResolvedValue({
    agents: [
      {
        id: 'agent_sales',
        name: 'Sales Agent',
        role: 'SALES',
        icon: 'S',
        description: 'Sales support',
        soul: 'Runtime private soul',
        rules: ['Private runtime rule'],
        allowedTools: ['product.search', 'order.create_draft'],
        skills: ['sales-conversion'],
        model: 'gemini-2.5-flash',
        status: 'ACTIVE',
        createdBy: 'seed',
      },
    ],
  }),
}));

const AIProviderFactory = require('../../services/aiAgent/providers/AIProviderFactory');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/ai-sandbox', require('../../routes/aiSandboxRoutes'));
  return app;
};

describe('AI sandbox route security', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkingMemoryStore.clear();
    mockCeoAgentInstance = null;
    mockCeoAgentNextResult = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCurrentUser = { id: 'user_1', companyId: 'company_1', role: 'OWNER' };
    mockProviderClient.generateContent = jest.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'LLM reply' }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
    });
    mockProviderClient.generateResponse = jest.fn();
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'key_google',
        name: 'Production Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'secret-key',
        baseUrl: null,
        priority: 1,
      },
    ]);
    mockPrisma.globalAiConfig.findFirst.mockResolvedValue(null);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      {
        keyId: 'key_google',
        modelName: 'gemini-2.5-flash',
        isEnabled: true,
        priority: 1,
      },
    ]);
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValue({
      id: 'session_1',
      companyId: 'company_1',
      userId: 'user_1',
      title: 'Test 1',
      agentId: 'agent_sales',
      agentName: 'Sales Agent',
      agentRole: 'SALES',
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
      isDeleted: false,
      messages: [],
    });
    mockPrisma.companyAgent.findMany.mockResolvedValue([
      {
        id: 'agent_sales',
        name: 'Sales Agent',
        role: 'SALES',
        icon: 'S',
        description: 'Persisted sales agent',
        soul: 'Persisted private soul',
        rules: JSON.stringify(['Persisted private rule']),
        skills: JSON.stringify(['sales-conversion']),
        model: 'gemini-2.5-flash',
        status: 'ACTIVE',
        parentId: null,
        templateSlug: 'sales-agent',
        createdBy: 'seed',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'agent_sales',
        departmentId: 'dept_sales',
        managerType: 'AGENT',
        departmentKey: 'sales',
        departmentName: 'Sales',
        departmentIcon: 'S',
      },
    ]);
    const mockSession = { id: 'test_session_1', title: 'Test 1', createdAt: new Date().toISOString() };
    mockPrisma.aiSandboxSession.create.mockImplementation(({ data }) => Promise.resolve({
      id: data?.id || mockSession.id,
      title: data?.title || mockSession.title,
      createdAt: mockSession.createdAt,
    }));
    mockPrisma.aiSandboxSession.update.mockResolvedValue(mockSession);
    mockPrisma.aiSandboxMessage.create.mockResolvedValue({ id: 'msg_1' });
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('blocks non-admin roles from every sandbox route', async () => {
    mockCurrentUser = { id: 'user_2', companyId: 'company_1', role: 'EMPLOYEE' };

    const response = await request(app).get('/ai-sandbox/agents');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  test('redacts private agent prompts and rules from the agent list', async () => {
    const response = await request(app).get('/ai-sandbox/agents');

    expect(response.status).toBe(200);
    expect(response.body.agents).toHaveLength(1);
    expect(response.body.agents[0]).toEqual(expect.objectContaining({
      id: 'agent_sales',
      name: 'Sales Agent',
      allowedTools: ['product.search', 'order.create_draft'],
    }));
    expect(response.body.agents[0]).not.toHaveProperty('soul');
    expect(response.body.agents[0]).not.toHaveProperty('rules');
    expect(response.body.agents[0]).not.toHaveProperty('createdBy');
  });

  test('lists only central key model options and exposes non-secret key metadata for testing', async () => {
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'company_key',
        name: 'Company Gemini',
        provider: 'GOOGLE',
        keyType: 'COMPANY',
        companyId: 'company_1',
        isActive: true,
        apiKey: 'company-secret',
        baseUrl: null,
        priority: 1,
      },
      {
        id: 'central_key',
        name: 'Central Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'central-secret',
        baseUrl: null,
        priority: 2,
      },
    ]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      { keyId: 'company_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
      { keyId: 'central_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
    ]);

    const response = await request(app).get('/ai-sandbox/models');

    expect(response.status).toBe(200);
    expect(response.body.providers[0]).toEqual(expect.objectContaining({
      name: 'GOOGLE',
      label: 'Google Gemini',
    }));
    expect(response.body.providers[0].models).toEqual([
      expect.objectContaining({
        id: 'gemini-2.5-flash',
        keyId: 'central_key',
        keyName: 'Central Gemini',
        keyType: 'CENTRAL',
        scope: 'central',
        keyIsActive: true,
        isSelectable: true,
      }),
    ]);
    expect(response.body.centralKeys).toEqual([
      expect.objectContaining({
        id: 'central_key',
        name: 'Central Gemini',
        keyType: 'CENTRAL',
        scope: 'central',
        isActive: true,
      }),
    ]);
    expect(JSON.stringify(response.body)).not.toContain('company_key');
    expect(JSON.stringify(response.body)).not.toContain('company-secret');
    expect(JSON.stringify(response.body)).not.toContain('central-secret');
  });

  test('shows inactive central keys for diagnostics but refuses to execute them', async () => {
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'inactive_central_key',
        name: 'Inactive Central Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: false,
        apiKey: 'inactive-secret',
        baseUrl: null,
        priority: 1,
      },
    ]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      { keyId: 'inactive_central_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
    ]);

    const modelsResponse = await request(app).get('/ai-sandbox/models');

    expect(modelsResponse.status).toBe(200);
    expect(modelsResponse.body.centralKeys).toEqual([
      expect.objectContaining({
        id: 'inactive_central_key',
        name: 'Inactive Central Gemini',
        isActive: false,
        scope: 'central',
      }),
    ]);
    expect(modelsResponse.body.providers[0].models[0]).toEqual(expect.objectContaining({
      keyId: 'inactive_central_key',
      keyIsActive: false,
      isSelectable: false,
    }));
    expect(JSON.stringify(modelsResponse.body)).not.toContain('inactive-secret');

    const chatResponse = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'inactive_central_key',
        message: 'Hello',
      });

    expect(chatResponse.status).toBe(400);
    expect(chatResponse.body.code).toBe('MODEL_NOT_ALLOWED');
    expect(mockProviderClient.generateContent).not.toHaveBeenCalled();
  });

  test('rejects a chat request when the requested provider/model is not enabled for the tenant', async () => {
    mockPrisma.aiKey.findMany.mockResolvedValue([]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([]);

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'OPENAI',
        model: 'gpt-4o',
        message: 'Hello',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MODEL_NOT_ALLOWED');
    expect(mockProviderClient.generateContent).not.toHaveBeenCalled();
  });

  test('returns a structured error when the sandbox agent cannot produce a reply', async () => {
    mockCeoAgentNextResult = {
      status: 'FAILED',
      errorCode: 'AI_AGENT_LLM_UNAVAILABLE',
      error: 'No model response was available for this task',
      result: {
        reply: '',
        summary: '',
        tools: [],
      },
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        message: 'Hello',
      });

    expect(response.status).toBe(502);
    expect(response.body.code).toBe('AI_AGENT_LLM_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toMatch(/[\u0600-\u06FF]/);
  });

  test('passes full agent operating context and selected central key into the sandbox agent runtime', async () => {
    const agentProvisioningService = require('../../services/aiAgent/agentProvisioningService');
    agentProvisioningService.getAgent.mockReturnValueOnce({
      id: 'agent_sales',
      name: 'Sales Agent',
      role: 'SALES',
      persona: {
        agentInstructions: 'Ask for required customer details before order actions.',
        soulInstructions: 'Use dynamic customer-facing phrasing for every reply.',
        toolsInstructions: 'Use order.create_confirmed only after explicit confirmation and complete order details.',
      },
      allowedTools: ['product.search', 'order.create_confirmed'],
    });
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValueOnce({
      id: 'session_1',
      companyId: 'company_1',
      userId: 'user_1',
      title: 'Existing Session',
      agentId: 'agent_sales',
      agentName: 'Sales Agent',
      agentRole: 'SALES',
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
      isDeleted: false,
      messages: [
        {
          id: 'msg_prev_1',
          role: 'user',
          content: 'I need help with an order.',
          model: 'gemini-2.5-flash',
          provider: 'GOOGLE',
          keyId: 'key_google',
          keyName: 'Production Gemini',
          tokensInput: 0,
          tokensOutput: 0,
          tokensTotal: 0,
          latencyMs: 0,
          cost: 0,
          toolCalls: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'msg_prev_2',
          role: 'assistant',
          content: 'What would you like to know about the order?',
          model: 'gemini-2.5-flash',
          provider: 'GOOGLE',
          keyId: 'key_google',
          keyName: 'Production Gemini',
          tokensInput: 0,
          tokensOutput: 0,
          tokensTotal: 0,
          latencyMs: 0,
          cost: 0,
          toolCalls: null,
          createdAt: new Date('2026-01-01T00:00:01.000Z'),
        },
      ],
    });

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        message: 'Create an order',
      });

    expect(response.status).toBe(200);
    expect(mockCeoAgentInstance.setModelManager).toHaveBeenCalled();
    expect(mockCeoAgentInstance.processTask).toHaveBeenCalledTimes(1);
    const task = mockCeoAgentInstance.processTask.mock.calls[0][0];
    expect(task.conversationHistory).toEqual([
      { role: 'user', content: 'I need help with an order.' },
      { role: 'assistant', content: 'What would you like to know about the order?' },
      { role: 'user', content: 'Create an order' },
    ]);
    expect(task.intentContext).toEqual(expect.objectContaining({
      channel: 'FACEBOOK',
      sandbox: true,
    }));
    const ctorArgs = require('../../services/aiAgent/CEOAgent').mock.calls[0][1];
    expect(ctorArgs.persona.agentInstructions).toContain('Ask for required customer details before order actions.');
    expect(ctorArgs.persona.soulInstructions).toContain('Use dynamic customer-facing phrasing for every reply.');
    expect(ctorArgs.persona.modelPolicy).toEqual(expect.objectContaining({
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
    }));
    expect(ctorArgs.policies.modelPolicy).toEqual(expect.objectContaining({
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
    }));
  });

  test('routes sandbox chat through the configured preferred central provider key', async () => {
    mockPrisma.globalAiConfig.findFirst.mockResolvedValue({
      settings: JSON.stringify({
        preferredAiKeyIds: {
          GOOGLE: 'key_preferred',
        },
      }),
    });
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'key_default',
        name: 'Default Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'default-secret',
        baseUrl: null,
        priority: 1,
      },
      {
        id: 'key_preferred',
        name: 'Preferred Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'preferred-secret',
        baseUrl: null,
        priority: 99,
      },
    ]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      { keyId: 'key_default', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
      { keyId: 'key_preferred', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
    ]);

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        message: 'Hello',
      });

    expect(response.status).toBe(200);
    const ctorArgs = require('../../services/aiAgent/CEOAgent').mock.calls[0][1];
    expect(ctorArgs.persona.modelPolicy).toEqual(expect.objectContaining({
      provider: 'GOOGLE',
      keyId: 'key_preferred',
    }));
    expect(ctorArgs.policies.modelPolicy).toEqual(expect.objectContaining({
      provider: 'GOOGLE',
      keyId: 'key_preferred',
    }));
  });

  test('routes sandbox chat only through an explicitly selected central key', async () => {
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'company_key',
        name: 'Company Gemini',
        provider: 'GOOGLE',
        keyType: 'COMPANY',
        companyId: 'company_1',
        isActive: true,
        apiKey: 'company-secret',
        baseUrl: null,
        priority: 1,
      },
      {
        id: 'central_key',
        name: 'Central Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'central-secret',
        baseUrl: null,
        priority: 2,
      },
    ]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      { keyId: 'company_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
      { keyId: 'central_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
    ]);

    const companyKeyResponse = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'company_key',
        message: 'Hello',
      });

    expect(companyKeyResponse.status).toBe(400);
    expect(companyKeyResponse.body.code).toBe('MODEL_NOT_ALLOWED');

    const centralKeyResponse = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'central_key',
        message: 'Hello',
      });

    expect(centralKeyResponse.status).toBe(200);
    const ctorArgs = require('../../services/aiAgent/CEOAgent').mock.calls[0][1];
    expect(ctorArgs.persona.modelPolicy).toEqual(expect.objectContaining({
      provider: 'GOOGLE',
      keyId: 'central_key',
    }));
  });

  test('returns and persists token usage and cost from sandbox runtime metadata', async () => {
    mockCeoAgentNextResult = {
      status: 'SUCCESS',
      result: {
        reply: 'Measured reply',
        summary: 'Measured reply',
        tools: [],
      },
      usageMetadata: {
        promptTokenCount: 1000,
        candidatesTokenCount: 2000,
        totalTokenCount: 3000,
      },
      modelSelection: {
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        keyName: 'Production Gemini',
      },
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Hello',
      });

    expect(response.status).toBe(200);
    expect(response.body.tokens).toEqual({ input: 1000, output: 2000, total: 3000 });
    expect(response.body.cost).toBeCloseTo(0.000675, 10);

    const assistantCreate = mockPrisma.aiSandboxMessage.create.mock.calls
      .map(([arg]) => arg)
      .find(arg => arg.data.role === 'assistant');
    expect(assistantCreate.data.tokensInput).toBe(1000);
    expect(assistantCreate.data.tokensOutput).toBe(2000);
    expect(assistantCreate.data.tokensTotal).toBe(3000);
    expect(assistantCreate.data.cost).toBeCloseTo(0.000675, 10);
  });

  test('rejects streaming chat for a missing or cross-tenant session before writing messages', async () => {
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/ai-sandbox/chat/stream')
      .send({
        sessionId: 'foreign_session',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Hello',
      });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('SESSION_NOT_FOUND');
    expect(mockPrisma.aiSandboxMessage.create).not.toHaveBeenCalled();
    expect(mockProviderClient.generateContent).not.toHaveBeenCalled();
  });

  test('normalizes set-like agent tools and supports OpenAI-compatible provider clients', async () => {
    const agentProvisioningService = require('../../services/aiAgent/agentProvisioningService');
    agentProvisioningService.getAgent.mockReturnValueOnce({
      id: 'agent_sales',
      name: 'Sales Agent',
      role: 'SALES',
      persona: { soulInstructions: 'Private operating instructions' },
      allowedTools: new Set(['product.search', 'order.create_draft']),
    });
    mockProviderClient.generateContent = undefined;
    mockProviderClient.generateResponse = jest.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'OpenAI compatible reply' }] } }],
      usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 13 },
    });
    mockCeoAgentNextResult = {
      status: 'SUCCESS',
      result: {
        reply: 'OpenAI compatible reply',
        summary: 'OpenAI compatible reply',
        tools: [],
      },
      modelSelection: {
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        keyName: 'Production Gemini',
      },
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Hello',
      });

    expect(response.status).toBe(200);
    expect(response.body.reply).toBe('OpenAI compatible reply');
    expect(mockCeoAgentInstance.processTask).toHaveBeenCalledWith(expect.objectContaining({
      currentMessage: 'Hello',
      intentMessage: 'Hello',
      conversationHistory: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Hello' }),
      ]),
    }));
  });
});
