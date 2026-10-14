jest.mock('@prisma/client', () => ({
  Prisma: {},
}), { virtual: true });

jest.mock('../../services/orderWorkflowService', () => ({}), { virtual: true });

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}), { virtual: true });

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
}, { virtual: true });

jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    order: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    customerBlock: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  return {
    getSharedPrismaClient: jest.fn(() => mockPrisma),
    mockPrisma,
  };
});

const { scoreOrderDraft } = require('../../services/orderRiskScoringService');
const orderConfirmationService = require('../../services/orderConfirmationService');
const { mockPrisma } = require('../../services/sharedDatabase');

describe('Operational Effective Status Integration (Wave 2 Item 4 Batch 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('orderRiskScoringService.scoreOrderDraft - collectHistorySignals', () => {
    test('uses effectiveOrderStatusSql and identifies cancelled/returned orders', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { status: 'CANCELLED', cnt: 2 },
        { status: 'RETURNED', cnt: 1 },
        { status: 'DELIVERED', cnt: 3 },
      ]);

      const result = await scoreOrderDraft(
        mockPrisma,
        {
          companyId: 'comp-1',
          phone: '01012345678',
          address: '123 Test Street Downtown',
          city: 'Cairo',
          total: 500,
        },
        {
          enabled: true,
          highThreshold: 70,
          mediumThreshold: 40,
          highValueThreshold: 5000,
          historyWindowDays: 90,
        }
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('customStatusCode');
      expect(sqlCall).toContain('GROUP BY');

      expect(result.signals.cancelledCount).toBe(2);
      expect(result.signals.returnedCount).toBe(1);
    });
  });

  describe('orderConfirmationService.pickByWorkload', () => {
    test('queries workload using effectiveOrderStatusSql', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { assignedTo: 'user-1', count: 5 },
        { assignedTo: 'user-2', count: 2 },
      ]);

      const eligibleUsers = [
        { id: 'user-1', name: 'Agent 1' },
        { id: 'user-2', name: 'Agent 2' },
      ];

      const settings = {
        workloadStatuses: ['PENDING', 'PROCESSING', 'CUSTOM_STAGE'],
      };

      const picked = await orderConfirmationService.pickByWorkload('comp-1', eligibleUsers, settings);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('customStatusCode');
      expect(picked.id).toBe('user-2'); // lowest workload
    });
  });
});
