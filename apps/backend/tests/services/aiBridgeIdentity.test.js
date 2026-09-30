/**
 * AI Bridge identity tests — deterministic per-company user, role-permission
 * sync, and JWT minting shape. Mocks prisma (no DB dependency).
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

jest.mock('../../utils/jwtSecret', () => ({
  getJwtSecret: () => 'test-jwt-secret',
}));

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn() },
  userCompany: { upsert: jest.fn(), updateMany: jest.fn() },
  role: { findFirst: jest.fn(), create: jest.fn() },
  permission: { findUnique: jest.fn() },
  rolePermission: { create: jest.fn() },
};

const {
  getBridgeSession,
  ensureBridgeRole,
  bridgeEmailFor,
  BRIDGE_PERMISSION_KEYS,
  clearSessionCache,
} = require('../../services/aiBridgeIdentity');

describe('ai bridge identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSessionCache();
    // happy path: user exists, role exists with all permissions attached
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: bridgeEmailFor('c1'), role: 'AGENT' });
    mockPrisma.role.findFirst.mockResolvedValue({
      id: 'r1',
      permissions: BRIDGE_PERMISSION_KEYS.map((key) => ({ permission: { key } })),
    });
  });

  test('bridge email is deterministic per company', () => {
    expect(bridgeEmailFor('abc')).toBe('ai-bridge.abc@ai-bridge.internal.maxp');
    expect(bridgeEmailFor('abc')).toBe(bridgeEmailFor('abc'));
  });

  test('mints a 15-min AGENT token with companyId + bridge scope', async () => {
    const token = await getBridgeSession('c1');
    expect(token).toBeTruthy();

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'test-jwt-secret');
    expect(decoded.role).toBe('AGENT'); // NOT AI_SERVICE — no permission bypass
    expect(decoded.companyId).toBe('c1');
    expect(decoded.scope).toBe('ai-bridge');
    expect(decoded.userId).toBe('u1');
  });

  test('caches session per company (no re-mint within TTL)', async () => {
    const first = await getBridgeSession('c1');
    const second = await getBridgeSession('c1');
    expect(second).toBe(first);
    expect(mockPrisma.role.findFirst).toHaveBeenCalledTimes(1);
  });

  test('creates role with only the whitelisted permission keys', async () => {
    mockPrisma.role.findFirst.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({ id: 'r2', permissions: [] });
    mockPrisma.permission.findUnique.mockImplementation(({ where: { key } }) =>
      Promise.resolve({ id: `perm-${key}`, key }));
    mockPrisma.rolePermission.create.mockResolvedValue({});

    await getBridgeSession('c2');

    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: 'AI_BRIDGE', companyId: 'c2' }),
      }),
    );
    // every whitelisted key attached, nothing else
    const attachedKeys = mockPrisma.rolePermission.create.mock.calls.map(
      (c) => c[0].data.permissionId.replace('perm-', ''),
    );
    expect(attachedKeys.sort()).toEqual([...BRIDGE_PERMISSION_KEYS].sort());
  });

  test('skips unknown permission keys instead of crashing', async () => {
    mockPrisma.role.findFirst.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({ id: 'r3', permissions: [] });
    mockPrisma.permission.findUnique.mockResolvedValue(null); // none exist

    await expect(getBridgeSession('c3')).resolves.toBeTruthy();
    expect(mockPrisma.rolePermission.create).not.toHaveBeenCalled();
  });

  test('ties the role to the userCompany row so permissionService resolves it', async () => {
    await getBridgeSession('c1');
    expect(mockPrisma.userCompany.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', companyId: 'c1' },
      data: { roleId: 'r1' },
    });
  });
});
