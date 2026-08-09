const request = require('supertest');
const express = require('express');

const mockAiServiceAdminClient = {
  getAgentPause: jest.fn(),
  updateAgentPause: jest.fn(),
  getAutoReply: jest.fn(),
  updateAutoReply: jest.fn(),
  getChannelReply: jest.fn(),
  updateChannelReply: jest.fn(),
  listAgents: jest.fn().mockResolvedValue([]),
  listTools: jest.fn().mockResolvedValue([]),
  listAgentTemplates: jest.fn().mockResolvedValue([]),
};

jest.mock('../../services/aiServiceAdminClient', () => mockAiServiceAdminClient);

const mockPrisma = {
  aiSetting: {
    upsert: jest.fn().mockResolvedValue({}),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { companyId: 'company-123' };
    next();
  },
}));

const agentManagerRoutes = require('../../routes/agentManagerRoutes');

function authed(req, _res, next) {
  req.user = { companyId: 'company-123' };
  next();
}

describe('Agent Manager Pause Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(agentManagerRoutes);
  });

  it('GET /pause returns the pause state', async () => {
    mockAiServiceAdminClient.getAgentPause.mockResolvedValue({ paused: true, pauseReason: 'holiday' });
    const res = await request(app).get('/pause');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paused).toBe(true);
    expect(res.body.pauseReason).toBe('holiday');
  });

  it('PUT /pause saves the pause state + reason and mirrors it to Prisma', async () => {
    mockAiServiceAdminClient.updateAgentPause.mockResolvedValue({ paused: true, pauseReason: 'maintenance' });
    const res = await request(app).put('/pause').send({ paused: true, reason: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paused).toBe(true);
    expect(mockAiServiceAdminClient.updateAgentPause).toHaveBeenCalledWith('company-123', true, 'maintenance');
    expect(mockPrisma.aiSetting.upsert).toHaveBeenCalled();
  });

  it('PUT /pause clears the reason when resuming', async () => {
    mockAiServiceAdminClient.updateAgentPause.mockResolvedValue({ paused: false, pauseReason: null });
    const res = await request(app).put('/pause').send({ paused: false, reason: null });
    expect(res.status).toBe(200);
    expect(res.body.paused).toBe(false);
    expect(mockAiServiceAdminClient.updateAgentPause).toHaveBeenCalledWith('company-123', false, null);
  });
});
