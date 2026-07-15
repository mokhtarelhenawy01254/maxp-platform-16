const mockPrisma = {
  permission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  role: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  rolePermission: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const permissionService = require('../../services/permissionService');

const createResponse = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

describe('permissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('returns all active permissions when no domain filter', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', key: 'orders.view', name: 'View orders', domain: 'ORDERS', isActive: true },
        { id: 'p2', key: 'products.create', name: 'Create products', domain: 'PRODUCTS', isActive: true },
      ]);

      const result = await permissionService.getPermissions();

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ domain: 'asc' }, { key: 'asc' }],
      });
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('orders.view');
    });

    it('filters by domain when provided', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p3', key: 'orders.create', name: 'Create order', domain: 'ORDERS', isActive: true },
      ]);

      const result = await permissionService.getPermissions('ORDERS');

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { isActive: true, domain: 'ORDERS' },
        orderBy: [{ domain: 'asc' }, { key: 'asc' }],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getCompanyRoles', () => {
    it('returns built-in + company roles, ordered by priority desc', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', key: 'OWNER', name: 'Owner', priority: 1000, isBuiltIn: true, permissions: [] },
        { id: 'r2', key: 'AGENT', name: 'Agent', priority: 200, isBuiltIn: true, permissions: [] },
      ]);

      const result = await permissionService.getCompanyRoles('company-1');

      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { companyId: '__system__', isBuiltIn: true },
            { companyId: null, isBuiltIn: true },
            { companyId: 'company-1' },
          ],
          isActive: true,
        },
        include: { permissions: { include: { permission: true } } },
        orderBy: { priority: 'desc' },
      });
      expect(result[0].key).toBe('OWNER');
      expect(result[1].key).toBe('AGENT');
    });
  });

  describe('createCustomRole', () => {
    it('creates a new custom role with permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', key: 'orders.view' },
        { id: 'p2', key: 'products.view' },
      ]);
      mockPrisma.role.create.mockResolvedValue({
        id: 'new-role',
        key: 'CUSTOM_VIEWER',
        name: 'مشاهد',
        companyId: 'company-1',
        isBuiltIn: false,
        permissions: [
          { permission: { key: 'orders.view', name: 'View orders', domain: 'ORDERS' } },
          { permission: { key: 'products.view', name: 'View products', domain: 'PRODUCTS' } },
        ],
      });

      const result = await permissionService.createCustomRole('company-1', {
        key: 'CUSTOM_VIEWER',
        name: 'مشاهد',
        description: 'مشاهد فقط',
        permissionKeys: ['orders.view', 'products.view'],
      }, 'actor-1');

      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: {
          key: 'CUSTOM_VIEWER',
          name: 'مشاهد',
          description: 'مشاهد فقط',
          companyId: 'company-1',
          isBuiltIn: false,
          isSystem: false,
          isActive: true,
          permissions: {
            create: [{ permissionId: 'p1' }, { permissionId: 'p2' }],
          },
        },
        include: { permissions: { include: { permission: true } } },
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalled();
      expect(result.key).toBe('CUSTOM_VIEWER');
    });

    it('throws when role key already exists in company', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'existing', key: 'CUSTOM_VIEWER' });

      await expect(
        permissionService.createCustomRole('company-1', {
          key: 'CUSTOM_VIEWER',
          name: 'مشاهد',
          permissionKeys: [],
        }, 'actor-1')
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateCustomRole', () => {
    it('updates role name and permissions', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'Old Name', companyId: 'company-1', isBuiltIn: false });
      mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p1', key: 'orders.view' }]);
      mockPrisma.role.update.mockResolvedValue({
        id: 'role-1',
        name: 'New Name',
        permissions: [{ permission: { key: 'orders.view' } }],
      });

      const result = await permissionService.updateCustomRole('company-1', 'role-1', {
        name: 'New Name',
        permissionKeys: ['orders.view'],
      }, 'actor-1');

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
      expect(mockPrisma.role.update).toHaveBeenCalled();
      expect(mockPrisma.activityLog.create).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('throws when role not found or is built-in', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(
        permissionService.updateCustomRole('company-1', 'fake-id', { name: 'X', permissionKeys: [] }, 'actor-1')
      ).rejects.toThrow('Role not found');
    });
  });

  describe('deleteCustomRole', () => {
    it('deletes a custom role and logs audit', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'Custom Role', companyId: 'company-1', isBuiltIn: false });
      mockPrisma.role.delete.mockResolvedValue({});

      await permissionService.deleteCustomRole('company-1', 'role-1', 'actor-1');

      expect(mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'actor-1',
          companyId: 'company-1',
          action: 'role.delete',
          severity: 'WARNING',
        }),
      });
    });

    it('throws when role is built-in', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(
        permissionService.deleteCustomRole('company-1', 'built-in-id', 'actor-1')
      ).rejects.toThrow('Custom role not found');
    });
  });

  describe('getUserPermissions', () => {
    it('returns permission keys when user has roleRef', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({
        roleRef: {
          permissions: [
            { permission: { key: 'orders.view' } },
            { permission: { key: 'products.create' } },
          ],
        },
      });

      const result = await permissionService.getUserPermissions('user-1', 'company-1');

      expect(result).toEqual(['orders.view', 'products.create']);
    });

    it('returns empty array when no userCompany', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(null);

      const result = await permissionService.getUserPermissions('user-1', 'company-1');

      expect(result).toEqual([]);
    });

    it('returns empty array when no roleRef', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({ roleRef: null });

      const result = await permissionService.getUserPermissions('user-1', 'company-1');

      expect(result).toEqual([]);
    });
  });

  describe('setUserRole', () => {
    it('assigns role to user and logs audit', async () => {
      mockPrisma.role.findUnique
        .mockResolvedValueOnce({ id: 'role-1', name: 'Manager', companyId: null })  // for setUserRole role lookup
        .mockResolvedValueOnce({ id: 'old-role', name: 'Old Role' });  // for old role lookup
      mockPrisma.userCompany.findUnique.mockResolvedValue({ id: 'uc-1', userId: 'user-1', companyId: 'company-1', roleId: 'old-role' });

      await permissionService.setUserRole('user-1', 'company-1', 'role-1', 'actor-1');

      expect(mockPrisma.userCompany.update).toHaveBeenCalledWith({
        where: { userId_companyId: { userId: 'user-1', companyId: 'company-1' } },
        data: { roleId: 'role-1' },
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'role.assign',
          userId: 'actor-1',
        }),
      });
    });
  });

  describe('hasPermission', () => {
    it('returns true when permission is in the list', () => {
      expect(permissionService.hasPermission(['orders.view', 'products.create'], 'orders.view')).toBe(true);
    });

    it('returns false when permission is not in the list', () => {
      expect(permissionService.hasPermission(['orders.view'], 'products.delete')).toBe(false);
    });
  });
});
