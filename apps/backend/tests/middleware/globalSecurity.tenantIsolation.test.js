/**
 * Tests for P0.3 — globalSecurity.js tenant isolation fix
 * (PRODUCTION-FIX tenant-isolation-2026-08-23).
 *
 * The vulnerability: line 882 used to set `req.user.companyId` from
 * `X-Company-Id` header for EVERY user, allowing any authenticated
 * user to perform operations on any other tenant.
 *
 * The fix: companyId comes from the JWT (decoded.companyId) for
 * non-SUPER_ADMIN. SUPER_ADMIN may override via header, but each
 * override is logged for audit.
 *
 * Strategy: we exercise the globalAuthentication middleware function
 * directly with a hand-built req/res, mocking the external dependencies
 * (jwt, sharedDatabase, tenantContext).
 */

// ── Mocks — string literals required because jest.mock is hoisted ────
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token) => {
    // Token format: "<companyId>|<userId>|<role>" for test simplicity
    const [companyId, userId, role] = String(token).split('|');
    return { companyId, userId, role };
  }),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => ({
    user: { findUnique: jest.fn(() => Promise.resolve({ companyId: 'cached_company' })) },
  }),
}));

jest.mock('../../services/tenantContext', () => ({
  run: jest.fn((companyId, fn) => fn()),
}));

jest.mock('../../utils/jwtSecret', () => ({
  getJwtSecret: () => 'test-secret',
  isMissingAuthSecretError: () => false,
}));

// ── Now load the middleware ────────────────────────────────────────
const { globalAuthentication } = require('../../middleware/globalSecurity');

// ── Helpers ────────────────────────────────────────────────────────
const buildReq = (token, headers = {}) => ({
  method: 'POST',
  path: '/api/v1/order-status-rules',
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  socket: { remoteAddress: '127.0.0.1' },
  headers: {
    authorization: token ? `Bearer ${token}` : undefined,
    ...headers,
  },
});

const buildRes = () => {
  const res = {
    statusCode: 200,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.payload = payload; return res; },
  };
  return res;
};

// ── Tests ──────────────────────────────────────────────────────────
describe('globalSecurity.globalAuthentication — tenant isolation via X-Company-Id header (P0.3)', () => {
  let consoleLogSpy;
  beforeEach(() => { consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { consoleLogSpy.mockRestore(); });

  test('REGRESSION: non-SUPER_ADMIN cannot override companyId via X-Company-Id header', async () => {
    // JWT: user belongs to "comp_A"
    // Header: claims to be from "comp_B" (cross-tenant attack)
    const req = buildReq('comp_A|user_1|MANAGER', { 'x-company-id': 'comp_B' });
    const res = buildRes();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    // 🚨 Critical assertion: the cross-tenant header was IGNORED.
    // req.user.companyId must equal the JWT's companyId, NOT the header.
    expect(req.user).toBeTruthy();
    expect(req.user.companyId).toBe('comp_A');
    expect(next).toHaveBeenCalled();
  });

  test('non-SUPER_ADMIN with same-company header is a no-op (no audit log)', async () => {
    const req = buildReq('comp_A|user_1|MANAGER', { 'x-company-id': 'comp_A' });
    const res = buildRes();
    const next = jest.fn();
    await globalAuthentication(req, res, next);

    expect(req.user.companyId).toBe('comp_A');
    // No impersonation log should fire when company matches
    const impersonationLogs = consoleLogSpy.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('[ADMIN-IMPERSONATION]')
    );
    expect(impersonationLogs).toHaveLength(0);
  });

  test('SUPER_ADMIN can override via header (legitimate impersonation)', async () => {
    const req = buildReq('comp_A|admin_1|SUPER_ADMIN', { 'x-company-id': 'comp_B' });
    const res = buildRes();
    const next = jest.fn();
    await globalAuthentication(req, res, next);

    // For SUPER_ADMIN, header override is allowed
    expect(req.user.companyId).toBe('comp_B');
    // MUST be logged for audit
    const impersonationLogs = consoleLogSpy.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('[ADMIN-IMPERSONATION]')
    );
    expect(impersonationLogs).toHaveLength(1);
    expect(impersonationLogs[0][0]).toContain('admin_1');
    expect(impersonationLogs[0][0]).toContain('comp_B');
    expect(impersonationLogs[0][0]).toContain('POST /api/v1/order-status-rules');
  });

  test('SUPER_ADMIN without header still works (uses JWT companyId)', async () => {
    const req = buildReq('comp_A|admin_1|SUPER_ADMIN', {});
    const res = buildRes();
    const next = jest.fn();
    await globalAuthentication(req, res, next);

    expect(req.user.companyId).toBe('comp_A');
    const impersonationLogs = consoleLogSpy.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('[ADMIN-IMPERSONATION]')
    );
    expect(impersonationLogs).toHaveLength(0);
  });

  test('AFFILIATE role is treated as non-SUPER_ADMIN (no header override)', async () => {
    const req = buildReq('comp_A|aff_1|AFFILIATE', { 'x-company-id': 'comp_B' });
    const res = buildRes();
    const next = jest.fn();
    await globalAuthentication(req, res, next);

    expect(req.user.companyId).toBe('comp_A');
  });

  test('handles uppercase X-Company-Id header variant', async () => {
    const req = buildReq('comp_A|user_1|MANAGER', { 'X-Company-Id': 'comp_B' });
    const res = buildRes();
    const next = jest.fn();
    await globalAuthentication(req, res, next);

    expect(req.user.companyId).toBe('comp_A');
  });
});

/**
 * The original 1-Click Wipe attack vector was:
 *
 *   POST /api/v1/order-status-rules
 *   Authorization: Bearer <jwt_from_company_A>
 *   X-Company-Id: <company_B_id>
 *   { "fromStatus": "DELIVERED", "toStatus": "PENDING", "waitTime": 0, "timeUnit": "Minutes" }
 *
 * Pre-fix: companyId came from header → rule created in company_B
 * Post-fix: companyId comes from JWT → rule created in company_A (or 401/403)
 *
 * This test reproduces that flow at the middleware level.
 */
describe('globalSecurity — full attack chain reproduction (P0.3)', () => {
  let consoleLogSpy;
  beforeEach(() => { consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { consoleLogSpy.mockRestore(); });

  test('the original "1-Click Wipe" cross-tenant attack is now blocked', async () => {
    // Attacker scenario:
    // - Has a JWT from comp_A (legitimate user there)
    // - Tries to create a destructive rule in comp_B by spoofing the header
    const req = buildReq('comp_A|attacker_1|MANAGER', { 'x-company-id': 'comp_B' });
    const res = buildRes();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    // After fix: req.user.companyId must be comp_A (the JWT), not comp_B (the header)
    expect(req.user.companyId).toBe('comp_A');

    // This is the contract downstream code now relies on:
    // orderStatusRuleController.createRule will use req.user.companyId = 'comp_A'
    // and the rule will be created in comp_A (attacker's actual company), not
    // comp_B (the target).
    //
    // Combined with P0.1 (createRule validation) the waitTime=0 case is also
    // rejected at the controller layer.
  });
});
