const express = require('express');
const request = require('supertest');

let mockCurrentUser;

const mockProviderClient = {
  generateContent: jest.fn(),
  generateResponse: jest.fn(),
};
let mockCeoAgentInstance;
let mockCeoAgentNextResult;
let mockAiServiceChatResult;
let mockSandboxAgentConfig;
let mockSandboxAgentsList;
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
    findMany: jest.fn(),
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

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
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
  requireSuperAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  },
  requireCompanyAccess: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/aiServiceAdminClient', () => ({
  chatWithAgent: jest.fn(async () => mockAiServiceChatResult || {
    status: 'ok',
    reply: 'LLM reply',
    tool_calls: [],
    runtime: 'python-agent',
  }),
  evaluateSandboxResponse: jest.fn(async () => ({
    success: true,
    scores: { accuracy: 91, helpfulness: 90, relevance: 89, completeness: 88, safety: 100, overall: 91 },
    overall: 91,
    comment: 'python evaluation',
  })),
  getAgent: jest.fn(async () => mockSandboxAgentConfig || null),
  listAgents: jest.fn(async () => [mockSandboxAgentConfig].filter(Boolean)),
}));

const AIProviderFactory = { getProvider: jest.fn(() => mockProviderClient), getActiveProvider: jest.fn(() => mockProviderClient) };
const aiServiceAdminClient = require('../../services/aiServiceAdminClient');

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
    mockAiServiceChatResult = null;
    mockSandboxAgentConfig = {
      id: 'agent_sales',
      name: 'Sales Agent',
      role: 'SALES',
      model: 'gemini-2.5-flash',
      templateSlug: 'sales-agent',
      parentId: null,
      allowedTools: ['product.search', 'order.create_draft'],
      allowedSkills: ['sales-conversion'],
      persona: { soulInstructions: 'Test soul instructions' },
      policies: {},
      status: 'ACTIVE',
    };
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
    mockPrisma.globalAiConfig.findMany.mockResolvedValue(undefined);
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
        allowedTools: JSON.stringify(['product.search', 'order.create_draft']),
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

  test('marks the preferred central model even when an earlier global config row has empty settings', async () => {
    mockPrisma.globalAiConfig.findMany.mockResolvedValue([
      { settings: JSON.stringify({ preferredAiKeyIds: {} }), updatedAt: new Date('2026-01-02T00:00:00.000Z') },
      { settings: JSON.stringify({ preferredAiKeyIds: { GOOGLE: 'preferred_key' } }), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    mockPrisma.aiKey.findMany.mockResolvedValue([
      {
        id: 'default_key',
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
        id: 'preferred_key',
        name: 'Preferred Gemini',
        provider: 'GOOGLE',
        keyType: 'CENTRAL',
        companyId: null,
        isActive: true,
        apiKey: 'preferred-secret',
        baseUrl: null,
        priority: 2,
      },
    ]);
    mockPrisma.aiModelConfig.findMany.mockResolvedValue([
      { keyId: 'default_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
      { keyId: 'preferred_key', modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 },
    ]);

    const response = await request(app).get('/ai-sandbox/models');

    expect(response.status).toBe(200);
    const models = response.body.providers[0].models;
    expect(models.find((m) => m.keyId === 'default_key')).toEqual(expect.objectContaining({
      isPreferred: false,
    }));
    expect(models.find((m) => m.keyId === 'preferred_key')).toEqual(expect.objectContaining({
      isPreferred: true,
    }));
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
    mockAiServiceChatResult = {
      status: 'error',
      reply: '',
      error_code: 'AI_AGENT_LLM_UNAVAILABLE',
      error: 'No model response was available for this task',
      tool_calls: [],
      runtime: 'python-agent',
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
    mockSandboxAgentConfig = {
      id: 'agent_sales',
      name: 'Sales Agent',
      role: 'SALES',
      persona: {
        agentInstructions: 'Ask for required customer details before order actions.',
        soulInstructions: 'Use dynamic customer-facing phrasing for every reply.',
        toolsInstructions: 'Use order.create_confirmed only after explicit confirmation and complete order details.',
      },
      allowedTools: ['product.search', 'order.create_confirmed'],
    };
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
    expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledTimes(1);
    const task = aiServiceAdminClient.chatWithAgent.mock.calls[0][0];
    expect(task).toEqual(expect.objectContaining({
      channel: 'FACEBOOK',
      message: 'Create an order',
      threadId: expect.stringContaining('session_1'),
    }));
    expect(task.agentConfig).toEqual(expect.objectContaining({
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
    }));
  });

  test('routes sandbox chat through the configured preferred central provider key', async () => {
    mockPrisma.globalAiConfig.findMany.mockResolvedValue([
      { settings: JSON.stringify({ preferredAiKeyIds: {} }), updatedAt: new Date('2026-01-02T00:00:00.000Z') },
      { settings: JSON.stringify({ preferredAiKeyIds: { GOOGLE: 'key_preferred' } }), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
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
    expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledWith(expect.objectContaining({
      agentConfig: expect.objectContaining({
        provider: 'GOOGLE',
        keyId: 'central_key',
      }),
    }));
  });

  test('returns and persists token usage and cost from sandbox runtime metadata', async () => {
    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Measured reply',
      tool_calls: [],
      runtime: 'python-agent',
      usage_metadata: {
        promptTokenCount: 1000,
        candidatesTokenCount: 2000,
        totalTokenCount: 3000,
      },
      model_selection: {
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

    if (response.status !== 200) {
      throw new Error('Unexpected status ' + response.status + ' body=' + JSON.stringify(response.body));
    }
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

  test('returns and persists Python pipeline trace for sandbox tool diagnostics', async () => {
    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Tool-backed reply',
      runtime: 'python-agent',
      tool_calls: [{
        tool: 'inventory_check',
        params: { product_name_or_sku: 'black shoes' },
        result: { status: 'NOT_FOUND' },
        success: true,
      }],
      pipeline_trace: {
        intentClassification: {
          intent: 'inventory.check',
          confidence: 0.91,
          confidenceLevel: 'high',
          ambiguous: false,
          slots: { productName: 'black shoes' },
          missingSlots: [],
        },
        toolPlan: {
          intent: 'inventory.check',
          primaryTool: 'inventory_check',
          allowedTools: ['inventory.check'],
          reason: 'classified by model',
        },
        toolExecutions: [{
          name: 'inventory_check',
          params: { product_name_or_sku: 'black shoes' },
          output: { status: 'NOT_FOUND' },
          success: true,
        }],
        activeSkill: {
          skillId: 'catalog-search',
          requiresHumanApproval: false,
          maxToolCount: 2,
        },
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
        message: 'Check inventory',
      });

    expect(response.status).toBe(200);
    expect(response.body.pipelineTrace.toolExecutions[0]).toEqual(expect.objectContaining({
      name: 'inventory_check',
      params: { product_name_or_sku: 'black shoes' },
      output: { status: 'NOT_FOUND' },
    }));
    expect(response.body.pipelineTrace.activeSkill).toEqual({
      skillId: 'catalog-search',
      requiresHumanApproval: false,
      maxToolCount: 2,
    });

    const assistantCreate = mockPrisma.aiSandboxMessage.create.mock.calls
      .map(([arg]) => arg)
      .find(arg => arg.data.role === 'assistant');
    expect(assistantCreate.data.metadata.pipelineTrace.toolPlan.primaryTool).toBe('inventory_check');
    expect(assistantCreate.data.metadata.pipelineTrace.activeSkill.skillId).toBe('catalog-search');
  });

  test('preserves awaiting approval status from Python tool results in sandbox tool calls', async () => {
    mockAiServiceChatResult = {
      status: 'awaiting_approval',
      reply: 'Pending approval',
      runtime: 'python-agent',
      tool_calls: [{
        tool: 'order.create_confirmed',
        success: false,
        result: {
          status: 'awaiting_approval',
          action_type: 'order_create_confirmed',
          action_args: {
            product_name: 'Sprint X',
            product_price: 1499,
          },
          company_id: 'company_1',
        },
      }],
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Confirm order',
      });

    expect(response.status).toBe(200);
    expect(response.body.toolCalls[0]).toEqual(expect.objectContaining({
      name: 'order.create_confirmed',
      status: 'awaiting_approval',
    }));
    const assistantCreate = mockPrisma.aiSandboxMessage.create.mock.calls
      .map(([arg]) => arg)
      .find(arg => arg.data.role === 'assistant');
    const storedToolCalls = JSON.parse(assistantCreate.data.toolCalls);
    expect(storedToolCalls[0].status).toBe('awaiting_approval');
  });

  test('hydrates sandbox product memory from previous tool calls before Python chat', async () => {
    const previousToolCalls = [{
      name: 'inventory.check',
      status: 'success',
      input: { productNameOrSku: 'black shoes' },
      output: {
        found: true,
        productId: 'prod_123',
        productName: 'Black Shoes',
        sku: 'SKU-BLK',
        requestedColor: 'black',
        price: { amount: 2199, currency: 'EGP' },
      },
    }];
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValueOnce({
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
      messages: [
        { role: 'user', content: 'Do you have black shoes?', toolCalls: null },
        { role: 'assistant', content: 'Available.', toolCalls: JSON.stringify(previousToolCalls) },
      ],
    });

    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Python reply',
      tool_calls: [],
      runtime: 'python-agent',
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Is size 42 available?',
      });

    expect(response.status).toBe(200);
    expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledWith(expect.objectContaining({
      memoryContext: expect.objectContaining({
        lastInventoryParams: expect.objectContaining({ productNameOrSku: 'black shoes' }),
        lastInventoryResult: expect.objectContaining({
          productId: 'prod_123',
          productName: 'Black Shoes',
          sku: 'SKU-BLK',
        }),
        selectedProduct: expect.objectContaining({ productId: 'prod_123', productName: 'Black Shoes' }),
      }),
    }));
  });

  test('hydrates structured sandbox tool memory from persisted Python pipeline traces', async () => {
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValueOnce({
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
      messages: [{
        role: 'assistant',
        content: 'Tool-backed reply.',
        toolCalls: null,
        metadata: {
          pipelineTrace: {
            toolExecutions: [
              {
                name: 'shipping_rates',
                params: { governorate: 'Cairo' },
                output: { shippingFee: 50, currency: 'EGP' },
                success: true,
              },
              {
                name: 'order_create_confirmed',
                params: {
                  customer_name: 'Ahmed',
                  customer_phone: '01000000000',
                  product_name: 'Sprint X',
                  product_price: 1499,
                  city: 'Cairo',
                },
                output: { draft_id: 'draft_1', status: 'awaiting_approval' },
                status: 'awaiting_approval',
              },
            ],
          },
        },
      }],
    });

    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Python reply',
      tool_calls: [],
      runtime: 'python-agent',
    };

    const response = await request(app)
      .post('/ai-sandbox/chat')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Complete the order',
      });

    expect(response.status).toBe(200);
    expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledWith(expect.objectContaining({
      memoryContext: expect.objectContaining({
        lastShippingResult: expect.objectContaining({
          governorate: 'Cairo',
          shippingFee: 50,
          currency: 'EGP',
        }),
        lastOrderCandidate: expect.objectContaining({
          customer_name: 'Ahmed',
          customer_phone: '01000000000',
          product_name: 'Sprint X',
          product_price: 1499,
          city: 'Cairo',
          draft_id: 'draft_1',
          status: 'awaiting_approval',
        }),
      }),
    }));
  });

  test('returns persisted Python trace metadata when loading a sandbox session', async () => {
    mockPrisma.aiSandboxSession.findFirst.mockResolvedValueOnce({
      id: 'session_1',
      companyId: 'company_1',
      userId: 'user_1',
      title: 'Trace Session',
      agentId: 'agent_sales',
      agentName: 'Sales Agent',
      agentRole: 'SALES',
      model: 'gemini-2.5-flash',
      provider: 'GOOGLE',
      keyId: 'key_google',
      messageCount: 2,
      toolCallCount: 1,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 42,
      score: null,
      createdAt: new Date('2026-06-09T09:00:00.000Z'),
      updatedAt: new Date('2026-06-09T09:00:10.000Z'),
      messages: [{
        id: 'msg_assistant',
        role: 'assistant',
        content: 'Tool-backed reply',
        model: 'gemini-2.5-flash',
        provider: 'GOOGLE',
        keyId: 'key_google',
        keyName: 'Production Gemini',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        latencyMs: 42,
        cost: 0,
        toolCalls: JSON.stringify([{ name: 'inventory_check', status: 'success', input: {}, output: {} }]),
        metadata: {
          runtime: 'python-agent',
          pipelineTrace: {
            toolPlan: {
              intent: 'inventory.check',
              primaryTool: 'inventory_check',
              reason: 'classified by model',
            },
          },
        },
        createdAt: new Date('2026-06-09T09:00:10.000Z'),
      }],
    });

    const response = await request(app).get('/ai-sandbox/sessions/session_1');

    expect(response.status).toBe(200);
    expect(response.body.session.messages[0].runtime).toBe('python-agent');
    expect(response.body.session.messages[0].metadata.pipelineTrace.toolPlan.primaryTool).toBe('inventory_check');
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

  test('streams Python pipeline trace in the final sandbox event', async () => {
    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Streamed tool reply',
      runtime: 'python-agent',
      tool_calls: [],
      pipeline_trace: {
        toolPlan: {
          intent: 'inventory.check',
          primaryTool: 'inventory_check',
          allowedTools: ['inventory.check'],
          reason: 'classified by model',
        },
        toolExecutions: [{
          name: 'inventory_check',
          params: { product_name_or_sku: 'black shoes' },
          output: { status: 'NOT_FOUND' },
          success: true,
        }],
      },
    };

    const response = await request(app)
      .post('/ai-sandbox/chat/stream')
      .send({
        sessionId: 'session_1',
        agentId: 'agent_sales',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
        message: 'Check inventory',
      });

    expect(response.status).toBe(200);
    const events = response.text
      .split('\n\n')
      .filter(Boolean)
      .map(block => JSON.parse(block.replace(/^data: /, '')));
    const doneEvent = events.find(event => event.done === true);
    expect(doneEvent.pipelineTrace.toolPlan.primaryTool).toBe('inventory_check');
    expect(doneEvent.pipelineTrace.toolExecutions[0].output).toEqual({ status: 'NOT_FOUND' });
  });

  test('routes sandbox response evaluation through Python ai-service instead of Node providers', async () => {
    const response = await request(app)
      .post('/ai-sandbox/evaluate')
      .send({
        message: 'Check inventory',
        response: 'Need exact product model',
        toolCalls: [{ name: 'inventory.check', input: { product: 'black shoes' }, status: 'success' }],
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        keyId: 'key_google',
      });

    expect(response.status).toBe(200);
    expect(response.body.comment).toBe('python evaluation');
    expect(aiServiceAdminClient.evaluateSandboxResponse).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company_1',
      message: 'Check inventory',
      response: 'Need exact product model',
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
      keyId: 'key_google',
    }));
    expect(AIProviderFactory.getProvider).not.toHaveBeenCalled();
    expect(mockProviderClient.generateContent).not.toHaveBeenCalled();
  });

  test('strips internal reasoning and draft markers from the sandbox reply', async () => {
    mockAiServiceChatResult = {
      status: 'ok',
      reply: [
        '*   *Draft 1 (Formal - Incorrect):* Salutations. (Too formal).',
        '    *   *Draft 2 (Colloquial):* Hey! (Better).',
        '    *   Egyptian dialect? Yes.',
        '    *   Cheerful? Yes.',
        '',
        'Hello, how can I help you?',
      ].join('\n'),
      tool_calls: [],
      runtime: 'python-agent',
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

    if (response.status !== 200) {
      throw new Error('Unexpected status ' + response.status + ' body=' + JSON.stringify(response.body));
    }
    expect(response.status).toBe(200);
    expect(response.body.reply).toBe('Hello, how can I help you?');
    expect(response.body.reply).not.toContain('Draft 1');
    expect(response.body.reply).not.toContain('Egyptian dialect');
  });

  test('normalizes set-like agent tools before sending the selected agent config to Python', async () => {

    aiServiceAdminClient.getAgent.mockResolvedValueOnce({
      id: 'agent_sales',
      name: 'Sales Agent',
      role: 'SALES',
      templateSlug: 'sales-agent',
      persona: { soulInstructions: 'Private operating instructions' },
      allowedTools: new Set(['product.search', 'order.create_draft']),
      policies: {},
    });
    mockAiServiceChatResult = {
      status: 'ok',
      reply: 'Python reply',
      tool_calls: [],
      runtime: 'python-agent',
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

    expect(response.body).toEqual(expect.objectContaining({ reply: 'Python reply', success: true }));
    expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Hello',
      agentConfig: expect.objectContaining({
        allowedTools: ['product.search', 'order.create_draft'],
      }),
    }));
  });
});
