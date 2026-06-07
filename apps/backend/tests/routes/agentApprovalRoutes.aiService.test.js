const express = require('express');
const request = require('supertest');

let mockCurrentUser;
const mockGetDraft = jest.fn();
const mockListDrafts = jest.fn();
const mockProcessApprovalResponse = jest.fn();
const mockProcessRejectionResponse = jest.fn();
const mockResumeWorkflow = jest.fn();
const mockIsAiServiceEnabled = jest.fn();

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ error: 'Authentication required' });
    req.user = mockCurrentUser;
    return next();
  },
}));

jest.mock('../../legacy-ai-agent/aiAgent/draftProposalService', () => ({
  getDraft: (...args) => mockGetDraft(...args),
  listDrafts: (...args) => mockListDrafts(...args),
}));

jest.mock('../../legacy-ai-agent/aiAgent/humanApprovalService', () => ({
  processApprovalResponse: (...args) => mockProcessApprovalResponse(...args),
  processRejectionResponse: (...args) => mockProcessRejectionResponse(...args),
}));

jest.mock('../../services/aiSdkClient', () => ({
  resumeWorkflow: (...args) => mockResumeWorkflow(...args),
}));

jest.mock('../../legacy-ai-agent/aiAgent/aiServiceRouter', () => ({
  isAiServiceEnabled: (...args) => mockIsAiServiceEnabled(...args),
}));

const agentApprovalRoutes = require('../../routes/agentApprovalRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/agent/approvals', agentApprovalRoutes);
  return app;
}

describe('agentApprovalRoutes AI service resume integration', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: 'user-1',
      username: 'merchant-user',
      companyId: 'company-1',
    };
    mockGetDraft.mockResolvedValue({
      id: 'draft-1',
      conversationId: 'thread-1',
    });
    mockProcessApprovalResponse.mockResolvedValue({ approved: true });
    mockProcessRejectionResponse.mockResolvedValue({ rejected: true });
    mockResumeWorkflow.mockResolvedValue({ status: 'ok' });
    mockIsAiServiceEnabled.mockReturnValue(true);
    app = createApp();
  });

  test('notifies maxp-ai-service resume after approval', async () => {
    const response = await request(app)
      .post('/api/v1/agent/approvals/draft-1/approve')
      .send({ approvalCode: '1234', reason: 'approved by merchant' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockResumeWorkflow).toHaveBeenCalledWith({
      companyId: 'company-1',
      threadId: 'thread-1',
      draftId: 'draft-1',
      approved: true,
      reason: 'approved by merchant',
      decidedBy: 'merchant-user',
    });
  });

  test('notifies maxp-ai-service resume after rejection', async () => {
    const response = await request(app)
      .post('/api/v1/agent/approvals/draft-1/reject')
      .send({ reason: 'too risky' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockResumeWorkflow).toHaveBeenCalledWith({
      companyId: 'company-1',
      threadId: 'thread-1',
      draftId: 'draft-1',
      approved: false,
      reason: 'too risky',
      decidedBy: 'merchant-user',
    });
  });

  test('does not notify maxp-ai-service when rollout is disabled for the company', async () => {
    mockIsAiServiceEnabled.mockReturnValue(false);

    const response = await request(app)
      .post('/api/v1/agent/approvals/draft-1/approve')
      .send({ approvalCode: '1234' });

    expect(response.status).toBe(200);
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
  });
});
