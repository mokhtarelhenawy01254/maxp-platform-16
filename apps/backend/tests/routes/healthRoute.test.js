const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

jest.mock('../../services/sharedDatabase', () => ({
  healthCheck: jest.fn().mockResolvedValue({
    status: 'ok',
    queries: 42,
    latency: 5,
    queue: 0,
    active: 1,
  }),
  checkModelIntegrity: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  getSharedPrismaClient: jest.fn(),
}));

const sharedDatabase = require('../../services/sharedDatabase');
const healthRoute = require('../../routes/healthRoute');

describe('Health Route Tests (OBS-1: gitSha + buildTime)', () => {
  let app;
  const originalEnv = { ...process.env };
  const buildInfoPath = path.resolve(__dirname, '../../build-info.json');

  beforeEach(() => {
    delete process.env.GIT_SHA;
    delete process.env.BUILD_TIME;
    if (fs.existsSync(buildInfoPath)) {
      try { fs.unlinkSync(buildInfoPath); } catch (_) {}
    }
    sharedDatabase.healthCheck.mockResolvedValue({
      status: 'ok',
      queries: 42,
      latency: 5,
      queue: 0,
      active: 1,
    });
    sharedDatabase.checkModelIntegrity.mockResolvedValue({
      status: 'ok',
    });

    app = express();
    app.use(express.json());
    app.use('/health', healthRoute);
    app.use('/api/v1/health', healthRoute);
    app.use('/api/health', healthRoute);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (fs.existsSync(buildInfoPath)) {
      try { fs.unlinkSync(buildInfoPath); } catch (_) {}
    }
  });

  test('fallback: returns null for gitSha and buildTime when env/file missing without crashing', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.build).toBeDefined();
    expect(res.body.build.gitSha).toBeNull();
    expect(res.body.build.buildTime).toBeNull();
    expect(res.body.database).toBe('Connected');
    expect(res.body.integrity).toBe('OK');
  });

  test('returns injected GIT_SHA and BUILD_TIME from environment variables', async () => {
    process.env.GIT_SHA = 'd952a42da';
    process.env.BUILD_TIME = '2026-11-11T14:30:00Z';

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.build).toEqual({
      gitSha: 'd952a42da',
      buildTime: '2026-11-11T14:30:00Z',
    });
  });

  test('reads gitSha and buildTime from build-info.json when env variables not present', async () => {
    fs.writeFileSync(buildInfoPath, JSON.stringify({
      gitSha: 'f87a19c',
      buildTime: '2026-11-11T13:00:00Z',
    }));

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.build).toEqual({
      gitSha: 'f87a19c',
      buildTime: '2026-11-11T13:00:00Z',
    });
  });

  test('environment variables take precedence over build-info.json', async () => {
    fs.writeFileSync(buildInfoPath, JSON.stringify({
      gitSha: 'old-sha',
      buildTime: '2026-11-11T10:00:00Z',
    }));
    process.env.GIT_SHA = 'env-sha';
    process.env.BUILD_TIME = '2026-11-11T15:00:00Z';

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.build).toEqual({
      gitSha: 'env-sha',
      buildTime: '2026-11-11T15:00:00Z',
    });
  });

  test('returns build metadata even when database is degraded', async () => {
    process.env.GIT_SHA = 'deg-sha';
    process.env.BUILD_TIME = '2026-11-11T14:00:00Z';

    sharedDatabase.healthCheck.mockResolvedValue({
      status: 'connection_limit',
      connectionLimitStatus: 'throttled',
      cooldownEndsAt: '2026-11-11T14:05:00Z',
    });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DEGRADED');
    expect(res.body.build).toEqual({
      gitSha: 'deg-sha',
      buildTime: '2026-11-11T14:00:00Z',
    });
  });

  test('returns build metadata when server is shutting down', async () => {
    process.env.GIT_SHA = 'shut-sha';
    process.env.BUILD_TIME = '2026-11-11T14:00:00Z';

    app.set('isShuttingDown', true);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('SHUTTING_DOWN');
    expect(res.body.build).toEqual({
      gitSha: 'shut-sha',
      buildTime: '2026-11-11T14:00:00Z',
    });
  });
});
