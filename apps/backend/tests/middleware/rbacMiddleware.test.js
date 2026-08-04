const mockPermissionService = {
  getUserPermissions: jest.fn(),
};

jest.mock('../../services/permissionService', () => mockPermissionService);

const { requirePermission, requireDbPermission, hasPermission, normalizeRole } = require('../../middleware/rbacMiddleware');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('rbacMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeRole', () => {
    it('maps AGENT to MODERATOR', () => {
      expect(normalizeRole('AGENT')).toBe('MODERATOR');
    });

    it('maps MANAGER to TEAM_LEADER', () => {
      expect(normalizeRole('MANAGER')).toBe('TEAM_LEADER');
    });

    it('maps OWNER to COMPANY_ADMIN', () => {
      expect(normalizeRole('OWNER')).toBe('COMPANY_ADMIN');
    });

    it('passes SUPER_ADMIN through', () => {
      expect(normalizeRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
    });
  });

  describe('hasPermission', () => {
    it('returns true for SUPER_ADMIN on any permission', () => {
      expect(hasPermission('SUPER_ADMIN', 'dashboard.view')).toBe(true);
    });

    it('returns true for COMPANY_ADMIN on dashboard.view', () => {
      expect(hasPermission('COMPANY_ADMIN', 'dashboard.view')).toBe(true);
    });

    it('returns false for AGENT on settings.manage', () => {
      expect(hasPermission('AGENT', 'settings.manage')).toBe(false);
    });

    it('returns false for unknown permission', () => {
      expect(hasPermission('COMPANY_ADMIN', 'nonexistent.perm')).toBe(false);
    });
  });

  describe('requirePermission (old middleware + new DB permissions)', () => {
    it('returns 401 when no user', () => {
      const req = {};
      const res = createResponse();
      const next = jest.fn();

      requirePermission('orders.view')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows SUPER_ADMIN without checking permissions', () => {
      const req = { user: { role: 'SUPER_ADMIN' } };
      const res = createResponse();
      const next = jest.fn();

      requirePermission('orders.view')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('checks DB-based permissions first (req.user.userPermissions) — allows', () => {
      const req = {
        user: {
          role: 'AGENT',
          userPermissions: ['orders.view', 'products.view', 'inbox.send'],
        },
      };
      const res = createResponse();
      const next = jest.fn();

      requirePermission('orders.view')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('checks DB-based permissions first (req.user.userPermissions) — denies', () => {
      const req = {
        user: {
          role: 'AGENT',
          userPermissions: ['products.view'],
        },
      };
      const res = createResponse();
      const next = jest.fn();

      requirePermission('orders.create')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when no DB permissions attached (no hardcoded fallback)', () => {
      const req = {
        user: { role: 'AGENT' },  // no userPermissions
      };
      const res = createResponse();
      const next = jest.fn();

      requirePermission('inbox.send')(req, res, next);

      // DB permissions are the source of truth — empty userPermissions = deny
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('denies when role lacks the permission even if hardcoded map allows it', () => {
      const req = {
        user: { role: 'AGENT' },  // AGENT → MODERATOR, but no DB permissions
      };
      const res = createResponse();
      const next = jest.fn();

      // MODERATOR is NOT allowed 'users.manage' in hardcoded map; DB perms empty → deny
      requirePermission('users.manage')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows when DB permissions include the required permission regardless of role', () => {
      const req = {
        user: { role: 'MANAGER', userPermissions: ['teams.view'] },
      };
      const res = createResponse();
      const next = jest.fn();

      requirePermission('teams.view')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireDbPermission (new middleware)', () => {
    it('returns 401 when no user', async () => {
      const req = {};
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('orders.view')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows SUPER_ADMIN without checking permissions', async () => {
      const req = { user: { id: 'admin-1', role: 'SUPER_ADMIN' } };
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('orders.view')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockPermissionService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('returns 403 when no company context', async () => {
      const req = { user: { id: 'user-1', role: 'AGENT', companyId: null } };
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('orders.view')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when DB lacks the specific permission (no hardcoded fallback)', async () => {
      mockPermissionService.getUserPermissions.mockResolvedValue(['products.view', 'inbox.send']);

      const req = { user: { id: 'user-1', role: 'AGENT', companyId: 'company-1', effectiveCompanyId: 'company-1' } };
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('orders.create')(req, res, next);

      // DB permissions are the source of truth — no hardcoded role fallback
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when DB + hardcoded both lack the permission', async () => {
      mockPermissionService.getUserPermissions.mockResolvedValue(['products.view', 'inbox.send']);

      const req = { user: { id: 'user-1', role: 'AGENT', companyId: 'company-1', effectiveCompanyId: 'company-1' } };
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('settings.manage')(req, res, next);

      // AGENT→MODERATOR, MODERATOR does NOT have settings.manage
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows when user has the required permission', async () => {
      mockPermissionService.getUserPermissions.mockResolvedValue(['orders.view', 'orders.create', 'products.view']);

      const req = { user: { id: 'user-1', role: 'AGENT', companyId: 'company-1', effectiveCompanyId: 'company-1' } };
      const res = createResponse();
      const next = jest.fn();

      await requireDbPermission('orders.create')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
