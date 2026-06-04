const express = require('express');
const request = require('supertest');

process.env.AI_SERVICE_TOKEN = 'bridge-test-token';

const mockExecute = jest.fn();
const mockCreateDraft = jest.fn();

jest.mock('../../services/aiAgent/toolOrchestratorService', () => ({
  execute: (...args) => mockExecute(...args),
}));

jest.mock('../../services/aiAgent/draftProposalService', () => ({
  createDraft: (...args) => mockCreateDraft(...args),
}));

const agentServiceBridgeRoutes = require('../../routes/agentServiceBridgeRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/ai-bridge', agentServiceBridgeRoutes);
  return app;
}

describe('agentServiceBridgeRoutes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test('rejects requests without the AI service token', async () => {
    const response = await request(app)
      .post('/api/v1/ai-bridge/tools/execute')
      .send({ companyId: 'company-1', toolName: 'product.search', input: {} });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('forwards tool execution through the orchestrator as the AI service agent', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      status: 'EXECUTED',
      toolName: 'product.search',
      output: { products: [{ id: 'product-1' }] },
    });

    const response = await request(app)
      .post('/api/v1/ai-bridge/tools/execute')
      .set('Authorization', 'Bearer bridge-test-token')
      .send({
        companyId: 'company-1',
        toolName: 'product.search',
        input: { query: 'shoes' },
        threadId: 'thread-1',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result.status).toBe('EXECUTED');
    expect(mockExecute).toHaveBeenCalledWith('company-1', {
      agentId: 'ai-service',
      toolName: 'product.search',
      input: { query: 'shoes' },
      traceId: 'thread-1',
    });
  });

  test('validates required tool execution fields before calling the orchestrator', async () => {
    const response = await request(app)
      .post('/api/v1/ai-bridge/tools/execute')
      .set('Authorization', 'Bearer bridge-test-token')
      .send({ toolName: 'product.search', input: {} });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('companyId is required');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('creates approval drafts through the draft proposal service', async () => {
    mockCreateDraft.mockResolvedValue({
      success: true,
      draftId: 'draft-1',
      status: 'PENDING',
      toolName: 'discount.apply',
    });

    const response = await request(app)
      .post('/api/v1/ai-bridge/approvals/draft')
      .set('Authorization', 'Bearer bridge-test-token')
      .send({
        companyId: 'company-1',
        actionType: 'discount.create',
        actionArgs: { productId: 'product-1', discountPercent: 15 },
        threadId: 'thread-1',
        customerId: 'customer-1',
        reasoning: 'loyalty save',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.draftId).toBe('draft-1');
    expect(mockCreateDraft).toHaveBeenCalledWith('company-1', {
      agentId: 'ai-service',
      toolName: 'discount.apply',
      params: { productId: 'product-1', discountPercent: 15 },
      reasoning: 'loyalty save',
      conversationId: 'thread-1',
      customerId: 'customer-1',
    });
  });
});
