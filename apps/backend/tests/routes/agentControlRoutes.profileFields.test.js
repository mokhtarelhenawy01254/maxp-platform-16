const express = require('express');
const request = require('supertest');

const mockAiServiceAdminClient = {
  spawnAgent: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgentPermanently: jest.fn(),
  archiveAgent: jest.fn(),
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'user_1', companyId: 'company_1', role: 'OWNER' };
    next();
  },
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({})),
}));

jest.mock('../../services/aiServiceAdminClient', () => mockAiServiceAdminClient);

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/agent', require('../../routes/agentControlRoutes'));
  return app;
};

describe('agentControlRoutes profile fields', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
    mockAiServiceAdminClient.spawnAgent.mockResolvedValue({
      id: 'agent_1',
      name: 'Mobile Accessories Sales',
    });
    mockAiServiceAdminClient.updateAgent.mockResolvedValue({
      success: true,
      id: 'agent_1',
    });
    mockAiServiceAdminClient.deleteAgentPermanently.mockResolvedValue({
      success: true,
      id: 'agent_1',
    });
    mockAiServiceAdminClient.archiveAgent.mockResolvedValue({
      success: true,
      id: 'agent_1',
    });
  });

  test('forwards profile metadata and config when creating an agent', async () => {
    const response = await request(app)
      .post('/agent/agents')
      .send({
        name: 'Mobile Accessories Sales',
        role: 'SALES_REP',
        templateSlug: 'sales-rep-agent',
        model: 'deepseek-v4-flash',
        description: 'Specialized in mobile accessories',
        icon: 'phone-accessory',
        persona: { soulInstructions: 'Sell phone cases and chargers' },
        guardrails: { maxDiscountPercent: 10 },
        budget: { dailyUsd: 2 },
        config: { provider: 'DEEPSEEK', keyId: 'key_deepseek' },
        allowedTools: ['product.search'],
        allowedSkills: ['sales-conversion'],
        allowedChannels: ['dashboard'],
      });

    expect(response.status).toBe(201);
    expect(mockAiServiceAdminClient.spawnAgent).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company_1',
      name: 'Mobile Accessories Sales',
      role: 'SALES_REP',
      templateSlug: 'sales-rep-agent',
      model: 'deepseek-v4-flash',
      description: 'Specialized in mobile accessories',
      icon: 'phone-accessory',
      persona: { soulInstructions: 'Sell phone cases and chargers' },
      guardrails: { maxDiscountPercent: 10 },
      budget: { dailyUsd: 2 },
      config: { provider: 'DEEPSEEK', keyId: 'key_deepseek' },
      allowedTools: ['product.search'],
      allowedSkills: ['sales-conversion'],
      allowedChannels: ['dashboard'],
    }));
  });

  test('forwards saved file content plus metadata and config when updating an agent profile', async () => {
    const response = await request(app)
      .put('/agent/agents/agent_1/files')
      .send({
        name: 'Mobile Accessories Sales',
        role: 'SALES_REP',
        model: 'deepseek-v4-flash',
        description: 'Updated phone accessories specialist',
        icon: 'updated-phone-icon',
        config: { provider: 'DEEPSEEK', keyId: 'key_deepseek' },
        allowedTools: ['product.search'],
        allowedSkills: ['sales-conversion'],
        allowedChannels: ['dashboard'],
        files: {
          'SOUL.md': 'Recommend cases, screen protectors, chargers, and cables.',
          'AGENTS.md': 'Ask clarifying questions before recommending.',
          'TOOLS.md': 'Use product.search for availability.',
          'PERSONA.md': 'Egyptian Arabic, helpful and concise.',
        },
        policies: { guardrails: { maxDiscountPercent: 10 } },
      });

    expect(response.status).toBe(200);
    expect(mockAiServiceAdminClient.updateAgent).toHaveBeenCalledWith(
      'agent_1',
      'company_1',
      expect.objectContaining({
        name: 'Mobile Accessories Sales',
        role: 'SALES_REP',
        model: 'deepseek-v4-flash',
        description: 'Updated phone accessories specialist',
        icon: 'updated-phone-icon',
        config: { provider: 'DEEPSEEK', keyId: 'key_deepseek' },
        allowedTools: ['product.search'],
        allowedSkills: ['sales-conversion'],
        allowedChannels: ['dashboard'],
        soulInstructions: 'Recommend cases, screen protectors, chargers, and cables.',
        agentInstructions: 'Ask clarifying questions before recommending.',
        toolsInstructions: 'Use product.search for availability.',
        personaInstructions: 'Egyptian Arabic, helpful and concise.',
        policies: { guardrails: { maxDiscountPercent: 10 } },
      })
    );
  });

  test('permanently deletes an agent by default when calling DELETE /agent/agents/:id', async () => {
    const response = await request(app)
      .delete('/agent/agents/agent_1');

    expect(response.status).toBe(200);
    expect(mockAiServiceAdminClient.deleteAgentPermanently).toHaveBeenCalledWith('agent_1', 'company_1');
    expect(mockAiServiceAdminClient.archiveAgent).not.toHaveBeenCalled();
  });

  test('archives an agent when calling DELETE /agent/agents/:id?archive=true', async () => {
    const response = await request(app)
      .delete('/agent/agents/agent_1?archive=true');

    expect(response.status).toBe(200);
    expect(mockAiServiceAdminClient.archiveAgent).toHaveBeenCalledWith('agent_1', 'company_1');
    expect(mockAiServiceAdminClient.deleteAgentPermanently).not.toHaveBeenCalled();
  });
});
