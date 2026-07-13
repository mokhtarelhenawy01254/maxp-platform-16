const express = require('express');
const request = require('supertest');

let mockCurrentUser;
const mockResumeWorkflow = jest.fn();

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ error: 'Authentication required' });
    req.user = mockCurrentUser;
    return next();
  },
}));

jest.mock('../../services/aiSdkClient', () => ({
  resumeWorkflow: (...args) => mockResumeWorkflow(...args),
  listApprovals: jest.fn(async () => ({ approvals: [], count: 0 })),
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
    mockResumeWorkflow.mockResolvedValue({ status: 'ok' });
    app = createApp();
  });

  test('notifies maxp-ai-service resume after approval', async () => {
    const response = await request(app)
      .post('/api/v1/agent/approvals/draft-1/approve')
      .send({ threadId: 'thread-1', approvalCode: '1234', reason: 'approved by merchant' });

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
      .send({ threadId: 'thread-1', reason: 'too risky' });

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
});
