const mockPrisma = {
  wholesaleCustomer: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  wholesalePriceListItem: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  wholesaleChangeRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  wholesaleAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  customer: {
    update: jest.fn(),
  },
  wholesaleCustomerPriceList: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

const { wholesaleService, WHOLESALE_PERMISSIONS } = require('../services/wholesaleService');
const wholesaleController = require('../controller/wholesaleController');

describe('Wholesale Change Requests, Approvals & Audit Log Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Permissions Definition', () => {
    test('exports WHOLESALE_PERMISSIONS with APPROVE permission', () => {
      expect(WHOLESALE_PERMISSIONS.APPROVE).toBe('wholesale.approve');
      expect(WHOLESALE_PERMISSIONS.VIEW).toBe('wholesale.view');
      expect(WHOLESALE_PERMISSIONS.CREATE).toBe('wholesale.create');
      expect(WHOLESALE_PERMISSIONS.EDIT).toBe('wholesale.edit');
      expect(WHOLESALE_PERMISSIONS.DELETE).toBe('wholesale.delete');
    });
  });

  describe('2. Change Request Creation (Sensitive Fields)', () => {
    test('creates pending change request for customer credit limit', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-100',
        companyId: 'comp-1',
        creditLimit: 50000,
        currentBalance: 12000,
        isActive: true,
      });

      mockPrisma.wholesaleChangeRequest.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'cr-1', ...data, status: 'PENDING', createdAt: new Date() })
      );

      mockPrisma.wholesaleAuditLog.create.mockResolvedValue({ id: 'log-1' });

      const cr = await wholesaleService.createChangeRequest(
        {
          companyId: 'comp-1',
          entityType: 'CUSTOMER',
          entityId: 'wc-100',
          field: 'creditLimit',
          newValue: '75000',
          reason: 'زيادة حجم المبيعات الشهرية وسجل سداد ممتاز',
        },
        'user-admin-1'
      );

      expect(cr.id).toBe('cr-1');
      expect(cr.status).toBe('PENDING');
      expect(cr.field).toBe('creditLimit');
      expect(cr.oldValue).toBe('50000');
      expect(cr.newValue).toBe('75000');
      expect(cr.reason).toBe('زيادة حجم المبيعات الشهرية وسجل سداد ممتاز');
      expect(cr.requestedBy).toBe('user-admin-1');

      // Verify audit log was created
      expect(mockPrisma.wholesaleAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REQUEST_CHANGE',
            entityType: 'CUSTOMER',
            entityId: 'wc-100',
            field: 'creditLimit',
            newValue: '75000',
          }),
        })
      );

      // Verify target customer was NOT modified
      expect(mockPrisma.wholesaleCustomer.update).not.toHaveBeenCalled();
    });

    test('creates pending change request for price list item', async () => {
      mockPrisma.wholesalePriceListItem.findFirst.mockResolvedValue({
        id: 'item-55',
        price: 200,
        priceList: { companyId: 'comp-1' },
      });

      mockPrisma.wholesaleChangeRequest.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'cr-2', ...data, status: 'PENDING', createdAt: new Date() })
      );

      const cr = await wholesaleService.createChangeRequest(
        {
          companyId: 'comp-1',
          entityType: 'PRICE_LIST_ITEM',
          entityId: 'item-55',
          field: 'price',
          newValue: '240',
          reason: 'تحديث الأسعار مع زيادة تكلفة المورد',
        },
        'user-agent-1'
      );

      expect(cr.id).toBe('cr-2');
      expect(cr.status).toBe('PENDING');
      expect(cr.oldValue).toBe('200');
      expect(cr.newValue).toBe('240');
      expect(mockPrisma.wholesalePriceListItem.update).not.toHaveBeenCalled();
    });

    test('rejects change request creation if reason is missing or empty', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-100',
        companyId: 'comp-1',
      });

      await expect(
        wholesaleService.createChangeRequest({
          companyId: 'comp-1',
          entityType: 'CUSTOMER',
          entityId: 'wc-100',
          field: 'creditLimit',
          newValue: '60000',
          reason: '   ',
        })
      ).rejects.toThrow('سبب طلب التعديل إلزامي');
    });
  });

  describe('3. Change Request Approval & Rejection Flow', () => {
    test('approval updates target entity inside transaction and records audit log', async () => {
      mockPrisma.wholesaleChangeRequest.findFirst.mockResolvedValue({
        id: 'cr-1',
        companyId: 'comp-1',
        entityType: 'CUSTOMER',
        entityId: 'wc-100',
        field: 'creditLimit',
        oldValue: '50000',
        newValue: '80000',
        reason: 'طلب زيادة الائتمان',
        status: 'PENDING',
      });

      mockPrisma.wholesaleCustomer.update.mockResolvedValue({
        id: 'wc-100',
        creditLimit: 80000,
      });

      mockPrisma.wholesaleChangeRequest.update.mockResolvedValue({
        id: 'cr-1',
        status: 'APPROVED',
        approvedBy: 'user-manager-1',
      });

      mockPrisma.wholesaleAuditLog.create.mockResolvedValue({ id: 'log-approve' });

      const approved = await wholesaleService.approveChangeRequest('cr-1', 'comp-1', 'user-manager-1');

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('user-manager-1');

      // Verify transaction executed entity update
      expect(mockPrisma.wholesaleCustomer.update).toHaveBeenCalledWith({
        where: { id: 'wc-100' },
        data: { creditLimit: 80000 },
      });

      // Verify audit log record
      expect(mockPrisma.wholesaleAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVE',
          entityType: 'CUSTOMER',
          entityId: 'wc-100',
          field: 'creditLimit',
          newValue: '80000',
          performedBy: 'user-manager-1',
        }),
      });
    });

    test('rejection updates status to REJECTED without modifying target entity', async () => {
      mockPrisma.wholesaleChangeRequest.findFirst.mockResolvedValue({
        id: 'cr-2',
        companyId: 'comp-1',
        entityType: 'CUSTOMER',
        entityId: 'wc-100',
        field: 'creditLimit',
        oldValue: '50000',
        newValue: '100000',
        reason: 'طلب زيادة كبيرة',
        status: 'PENDING',
      });

      mockPrisma.wholesaleChangeRequest.update.mockResolvedValue({
        id: 'cr-2',
        status: 'REJECTED',
        approvedBy: 'user-manager-1',
      });

      const rejected = await wholesaleService.rejectChangeRequest(
        'cr-2',
        'comp-1',
        'user-manager-1',
        'تاريخ السداد غير كافي لمنح هذا الحد'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(mockPrisma.wholesaleCustomer.update).not.toHaveBeenCalled();
      expect(mockPrisma.wholesalePriceListItem.update).not.toHaveBeenCalled();

      // Verify audit log recorded rejection
      expect(mockPrisma.wholesaleAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'REJECT',
          entityType: 'CUSTOMER',
          entityId: 'wc-100',
          performedBy: 'user-manager-1',
          reason: 'تاريخ السداد غير كافي لمنح هذا الحد',
        }),
      });
    });

    test('throws error when trying to approve an already decided request', async () => {
      mockPrisma.wholesaleChangeRequest.findFirst.mockResolvedValue({
        id: 'cr-done',
        companyId: 'comp-1',
        status: 'APPROVED',
      });

      await expect(
        wholesaleService.approveChangeRequest('cr-done', 'comp-1', 'user-1')
      ).rejects.toThrow('طلب التغيير تم البت فيه مسبقاً (APPROVED)');
    });
  });

  describe('4. Suspension with Mandatory Reason & Effect on Orders', () => {
    test('suspends customer with mandatory reason and writes audit log', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-suspend',
        companyId: 'comp-1',
        isActive: true,
        notes: null,
      });

      mockPrisma.wholesaleCustomer.update.mockResolvedValue({
        id: 'wc-suspend',
        isActive: false,
        notes: '[إيقاف حساب]: شيك مرتد',
      });

      const res = await wholesaleService.suspendDistributor(
        'wc-suspend',
        'comp-1',
        'شيك مرتد وعدم الرد',
        'user-admin'
      );

      expect(res.isActive).toBe(false);
      expect(mockPrisma.wholesaleAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SUSPEND',
            entityType: 'CUSTOMER',
            entityId: 'wc-suspend',
            field: 'isActive',
            newValue: 'false',
            reason: 'شيك مرتد وعدم الرد',
            performedBy: 'user-admin',
          }),
        })
      );
    });

    test('rejects suspension if reason is missing or whitespace', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-suspend',
        companyId: 'comp-1',
        isActive: true,
      });

      await expect(
        wholesaleService.suspendDistributor('wc-suspend', 'comp-1', '    ')
      ).rejects.toThrow('سبب إيقاف الموزع مطلوب');
    });

    test('updateWholesaleCustomer requires reason when toggling isActive from true to false', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-update-suspend',
        companyId: 'comp-1',
        isActive: true,
      });

      await expect(
        wholesaleService.updateWholesaleCustomer('wc-update-suspend', 'comp-1', {
          isActive: false,
        })
      ).rejects.toThrow('سبب إيقاف التاجر إلزامي');
    });

    test('validateCreditLimit blocks order placement when customer is suspended', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-blocked',
        companyId: 'comp-1',
        creditLimit: 50000,
        currentBalance: 10000,
        isActive: false, // SUSPENDED!
      });

      const check = await wholesaleService.validateCreditLimit('wc-blocked', 'comp-1', 500);

      expect(check.isWholesale).toBe(true);
      expect(check.allowed).toBe(false);
      expect(check.isSuspended).toBe(true);
      expect(check.available).toBe(0);
      expect(check.error).toContain('موقوف مؤقتاً');
    });
  });

  describe('5. Audit Log Filtering & Listing', () => {
    test('listAuditLogs filters by entityType, entityId and action', async () => {
      mockPrisma.wholesaleAuditLog.findMany.mockResolvedValue([
        { id: 'l1', action: 'APPROVE', entityType: 'CUSTOMER', entityId: 'wc-1' },
      ]);
      mockPrisma.wholesaleAuditLog.count.mockResolvedValue(1);

      const result = await wholesaleService.listAuditLogs({
        companyId: 'comp-1',
        entityType: 'CUSTOMER',
        entityId: 'wc-1',
        action: 'APPROVE',
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrisma.wholesaleAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'comp-1',
            entityType: 'CUSTOMER',
            entityId: 'wc-1',
            action: 'APPROVE',
          },
        })
      );
    });
  });

  describe('6. Controller wholesale.approve Permission Guard', () => {
    test('allows SUPER_ADMIN, OWNER and COMPANY_ADMIN', () => {
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      wholesaleController.requireApprovePermission({ user: { role: 'COMPANY_ADMIN' } }, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      wholesaleController.requireApprovePermission({ user: { role: 'SUPER_ADMIN' } }, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      wholesaleController.requireApprovePermission({ user: { role: 'OWNER' } }, res, next);
      expect(next).toHaveBeenCalledTimes(3);
    });

    test('allows user with wholesale.approve in userPermissions', () => {
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      wholesaleController.requireApprovePermission(
        { user: { role: 'MODERATOR', userPermissions: ['wholesale.approve'] } },
        res,
        next
      );
      expect(next).toHaveBeenCalled();
    });

    test('returns 403 Forbidden when user lacks wholesale.approve permission', () => {
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      wholesaleController.requireApprovePermission(
        { user: { role: 'MODERATOR', userPermissions: ['wholesale.view', 'wholesale.edit'] } },
        res,
        next
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: 'wholesale.approve',
        })
      );
    });
  });
});
