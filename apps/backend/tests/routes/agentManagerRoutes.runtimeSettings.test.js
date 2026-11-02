const request = require('supertest');
const express = require('express');

let companySettingsStore = {};

const mockPrisma = {
  company: {
    findUnique: jest.fn(async ({ where }) => {
      const settings = companySettingsStore[where.id] || null;
      return { id: where.id, settings };
    }),
    update: jest.fn(async ({ where, data }) => {
      companySettingsStore[where.id] = data.settings;
      return { id: where.id, settings: data.settings };
    }),
  },
  aiRuntimeQueueJob: {
    groupBy: jest.fn(async ({ by }) => {
      if (by.includes('agentId')) {
        return [
          {
            agentId: 'agent-shipping-1',
            status: 'RUNNING',
            _count: { id: 1 },
            _max: { startedAt: new Date('2026-11-02T10:00:00.000Z') },
          },
          {
            agentId: 'agent-stock-2',
            status: 'PENDING',
            _count: { id: 3 },
            _max: { startedAt: null },
          },
        ];
      }
      return [
        { status: 'PENDING', _count: { id: 3 } },
        { status: 'RUNNING', _count: { id: 1 } },
      ];
    }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  aiAgentTask: {
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../services/aiServiceAdminClient', () => ({
  listAgents: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'user-1', companyId: 'test-company-t32' };
    next();
  },
}));

const agentManagerRoutes = require('../../routes/agentManagerRoutes');

describe('Agent Manager Runtime Settings & Per-Agent Status (T32)', () => {
  let app;

  beforeEach(() => {
    companySettingsStore = {
      'test-company-t32': {
        agentRuntime: { maxParallel: 3, poolSize: 4 },
      },
    };
    app = express();
    app.use(express.json());
    app.use('/', agentManagerRoutes);
  });

  it('GET /runtime-settings returns default maxParallel and poolSize', async () => {
    const res = await request(app).get('/runtime-settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.maxParallel).toBe(3);
    expect(res.body.poolSize).toBe(4);
  });

  it('PUT /runtime-settings updates maxParallel (whitelist 1..10) and persists', async () => {
    const putRes = await request(app)
      .put('/runtime-settings')
      .send({ maxParallel: 2 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.maxParallel).toBe(2);

    // Verify GET returns 2 after update
    const getRes = await request(app).get('/runtime-settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.maxParallel).toBe(2);
  });

  it('PUT /runtime-settings rejects values outside 1..10 with 400', async () => {
    const resLow = await request(app)
      .put('/runtime-settings')
      .send({ maxParallel: 0 });
    expect(resLow.status).toBe(400);

    const resHigh = await request(app)
      .put('/runtime-settings')
      .send({ maxParallel: 15 });
    expect(resHigh.status).toBe(400);

    const resInvalid = await request(app)
      .put('/runtime-settings')
      .send({ maxParallel: 'not-a-number' });
    expect(resInvalid.status).toBe(400);
  });

  it('GET /runtime returns agents[] array with per-agent running, queued and lastRunAt', async () => {
    const res = await request(app).get('/runtime');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.agents)).toBe(true);
    expect(res.body.agents.length).toBe(2);

    const runningAgent = res.body.agents.find((a) => a.agentId === 'agent-shipping-1');
    expect(runningAgent).toBeDefined();
    expect(runningAgent.running).toBe(1);
    expect(runningAgent.queued).toBe(0);
    expect(runningAgent.lastRunAt).toBeDefined();

    const queuedAgent = res.body.agents.find((a) => a.agentId === 'agent-stock-2');
    expect(queuedAgent).toBeDefined();
    expect(queuedAgent.running).toBe(0);
    expect(queuedAgent.queued).toBe(3);
  });
});
