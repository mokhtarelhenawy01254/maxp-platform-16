/**
 * GET /api/v1/public/ext/mcp/status — honest MCP availability probe.
 *
 * Contract (ticket 2026-10-20): the Developer Hub must never advertise a
 * copy-ready MCP config while the servers are not deployed. The probe is
 * public (no API key) and its answer comes from deployment configuration, so
 * enabling the servers flips the UI back without a code change.
 */
const express = require('express');
const request = require('supertest');

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClientAsync: jest.fn().mockResolvedValue({}),
}));

// NOTE: merchantApiAuth is intentionally NOT mocked — the probe must work with
// no credential at all, which only holds if it is registered before the gate.
const router = require('../routes/externalApiV1Routes');
const { getMcpDeploymentStatus } = require('../config/mcpDeployment');

const app = express();
app.use(express.json());
app.use('/api/v1/public/ext', router);

const ORIGINAL_FLAG = process.env.MCP_SERVERS_DEPLOYED;
const ORIGINAL_GATEWAY = process.env.MCP_GATEWAY_PUBLIC_URL;

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) delete process.env.MCP_SERVERS_DEPLOYED;
  else process.env.MCP_SERVERS_DEPLOYED = ORIGINAL_FLAG;

  if (ORIGINAL_GATEWAY === undefined) delete process.env.MCP_GATEWAY_PUBLIC_URL;
  else process.env.MCP_GATEWAY_PUBLIC_URL = ORIGINAL_GATEWAY;
});

describe('MCP status probe — not deployed (default)', () => {
  it('returns 200 with available:false and reason:not_deployed without any credential', async () => {
    delete process.env.MCP_SERVERS_DEPLOYED;
    const res = await request(app).get('/api/v1/public/ext/mcp/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('not_deployed');
    expect(res.body.servers).toEqual([]);
  });

  it('treats explicit false / empty / garbage flags as not deployed', async () => {
    for (const value of ['false', '', '0', 'no', 'deployed?']) {
      process.env.MCP_SERVERS_DEPLOYED = value;
      const res = await request(app).get('/api/v1/public/ext/mcp/status');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(false);
      expect(res.body.reason).toBe('not_deployed');
    }
  });

  it('never leaks a copyable MCP endpoint while not deployed', async () => {
    delete process.env.MCP_SERVERS_DEPLOYED;
    const res = await request(app).get('/api/v1/public/ext/mcp/status');
    expect(JSON.stringify(res.body)).not.toContain('/mcp/catalog');
    expect(JSON.stringify(res.body)).not.toContain('/mcp/video');
  });

  it('sends no-store caching so the hub always reads the current state', async () => {
    delete process.env.MCP_SERVERS_DEPLOYED;
    const res = await request(app).get('/api/v1/public/ext/mcp/status');
    expect(res.headers['cache-control']).toContain('no-store');
  });
});

describe('MCP status probe — servers deployed', () => {
  it('returns available:true with server paths once the deployment flag is set', async () => {
    process.env.MCP_SERVERS_DEPLOYED = 'true';
    const res = await request(app).get('/api/v1/public/ext/mcp/status');

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.reason).toBeNull();
    expect(res.body.servers.map((server) => server.path)).toEqual(['/mcp/catalog', '/mcp/video']);
  });

  it('builds absolute URLs from MCP_GATEWAY_PUBLIC_URL when configured', async () => {
    process.env.MCP_SERVERS_DEPLOYED = '1';
    process.env.MCP_GATEWAY_PUBLIC_URL = 'https://mcp.example.com/';
    const res = await request(app).get('/api/v1/public/ext/mcp/status');

    expect(res.body.available).toBe(true);
    expect(res.body.gatewayBaseUrl).toBe('https://mcp.example.com');
    expect(res.body.servers[0].url).toBe('https://mcp.example.com/mcp/catalog');
  });
});

describe('mcpDeployment config — read per call, not cached', () => {
  it('reflects an environment flip immediately without re-requiring the module', () => {
    delete process.env.MCP_SERVERS_DEPLOYED;
    expect(getMcpDeploymentStatus()).toMatchObject({ available: false, reason: 'not_deployed' });

    process.env.MCP_SERVERS_DEPLOYED = 'true';
    expect(getMcpDeploymentStatus()).toMatchObject({ available: true, reason: null });

    process.env.MCP_SERVERS_DEPLOYED = 'false';
    expect(getMcpDeploymentStatus()).toMatchObject({ available: false, reason: 'not_deployed' });
  });

  it('does not allow MCP URLs to bypass the REST key gate on other routes', async () => {
    // Sanity check that the public probe did not open the rest of the surface.
    const res = await request(app).get('/api/v1/public/ext/products');
    expect(res.status).toBe(401);
  });
});
