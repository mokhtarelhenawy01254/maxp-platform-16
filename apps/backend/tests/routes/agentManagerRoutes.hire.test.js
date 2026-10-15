const request = require('supertest');
const express = require('express');

const mockAiServiceAdminClient = {
  spawnAgent: jest.fn(),
  listAgents: jest.fn().mockResolvedValue([]),
  listTools: jest.fn().mockResolvedValue([]),
  listAgentTemplates: jest.fn().mockResolvedValue([]),
};

jest.mock('../../services/aiServiceAdminClient', () => mockAiServiceAdminClient);

const mockPrisma = {
  aiAgentTask: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: 'task-1' }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'user-1', companyId: 'cmopgxu3a07i4jujj6f1oh32h' };
    next();
  },
}));

const agentManagerRoutes = require('../../routes/agentManagerRoutes');

describe('Agent Manager Hire Route (/hire)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(agentManagerRoutes);
  });

  it('successfully hires agent with full marketplace payload, converting descriptive Arabic role to description and preserving template role', async () => {
    mockAiServiceAdminClient.spawnAgent.mockResolvedValue({
      id: 'agent_123',
      name: 'زياد رادار',
      role: 'COMPETITOR',
      status: 'ACTIVE',
      template_slug: 'competitor-analysis',
    });

    const payload = {
      templateSlug: 'competitor-analysis',
      name: 'زياد رادار',
      role: 'محلل استخبارات السوق والحملات التنافسية (Market Intelligence Specialist)',
      department: 'executive',
      safetyMode: 'draft',
    };

    const res = await request(app).post('/hire').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('agent_123');

    // Verify spawnAgent call
    expect(mockAiServiceAdminClient.spawnAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'cmopgxu3a07i4jujj6f1oh32h',
        templateSlug: 'competitor-analysis',
        name: 'زياد رادار',
        description: 'محلل استخبارات السوق والحملات التنافسية (Market Intelligence Specialist)',
        department: 'executive',
        safetyMode: 'draft',
      })
    );
    // Verify descriptive role was NOT passed as system role
    const calledPayload = mockAiServiceAdminClient.spawnAgent.mock.calls[0][0];
    expect(calledPayload.role).toBeUndefined();
  });

  it('successfully hires agent with minimal payload { templateSlug }', async () => {
    mockAiServiceAdminClient.spawnAgent.mockResolvedValue({
      id: 'agent_456',
      name: 'محلل المنافسين',
      role: 'COMPETITOR',
      status: 'ACTIVE',
      template_slug: 'competitor-analysis',
    });

    const res = await request(app).post('/hire').send({
      templateSlug: 'competitor-analysis',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('agent_456');
    expect(mockAiServiceAdminClient.spawnAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'cmopgxu3a07i4jujj6f1oh32h',
        templateSlug: 'competitor-analysis',
      })
    );
  });

  it('returns clean error message if spawnAgent fails', async () => {
    mockAiServiceAdminClient.spawnAgent.mockRejectedValue(new Error('Agent with name already exists'));

    const res = await request(app).post('/hire').send({
      templateSlug: 'competitor-analysis',
      name: 'زياد رادار',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Agent with name already exists');
  });
});
