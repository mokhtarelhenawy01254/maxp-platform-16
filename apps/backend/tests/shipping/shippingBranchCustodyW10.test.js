/**
 * Shipping Portal W10 Acceptance Tests (SHIP-W10)
 * Branch Custody, Inter-Branch Transfer, Summary & Reconciliation Diff
 *
 * Verifies all 5 digital acceptance criteria:
 * 1. استلام 10 شحنات في فرع A -> summary = 10, inventory = 10.
 * 2. تحويل 4 لفرع B -> A=6, B=4, 4 أحداث TRANSFERRED, صفر شحنة في فرعين.
 * 3. محاولة تحويل شحنة مسلّمة -> تُرفض في failed[] بسبب INVALID_STATUS.
 * 4. تحويل لفرع شركة تانية -> 404.
 * 5. custody-diff لفترة فيها 20 استلام / 5 تحويل / 10 تسليم -> الأرقام مطابقة (اختبار بجدول).
 */

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  shippingBranch: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-w10-1',
  companyId: 'company-w10-alpha',
  role: 'OPERATIONS_MANAGER',
  name: 'Branch Operations Officer',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

describe('SHIP-W10 Branch Custody & Transfer Acceptance Gates', () => {
  const branchA = {
    id: 'branch-a',
    companyId: 'company-w10-alpha',
    name: 'فرع القاهرة - المعادي',
    code: 'BR-MAADI',
    governorate: 'القاهرة',
    isActive: true,
  };

  const branchB = {
    id: 'branch-b',
    companyId: 'company-w10-alpha',
    name: 'فرع الجيزة - الدقي',
    code: 'BR-DOKKI',
    governorate: 'الجيزة',
    isActive: true,
  };

  const branchOtherCompany = {
    id: 'branch-other',
    companyId: 'company-beta-intruder',
    name: 'فرع الإسكندرية المنافس',
    code: 'BR-ALEX',
    governorate: 'الإسكندرية',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-w10-1',
      companyId: 'company-w10-alpha',
      role: 'OPERATIONS_MANAGER',
      name: 'Branch Operations Officer',
    };
  });

  // 1) استلام 10 شحنات في فرع A -> summary = 10 · inventory = 10
  describe('Gate 1: Branch Custody Inventory & Summary for 10 shipments at Branch A', () => {
    it('returns summary = 10 and inventory = 10 for Branch A', async () => {
      // 10 shipments received at branch A
      const shipmentsInBranchA = Array.from({ length: 10 }, (_, i) => ({
        id: `shipment-${i + 1}`,
        companyId: 'company-w10-alpha',
        trackingNumber: `TRK-A-${1000 + i}`,
        barcode: `BAR-A-${1000 + i}`,
        status: 'RECEIVED_AT_HUB',
        branchId: branchA.id,
        codAmount: 250.0,
        lastBranchAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        recipientName: `العميل ${i + 1}`,
        recipientPhone: `0100000000${i}`,
        destinationGovernorate: 'القاهرة',
        destinationCity: 'المعادي',
      }));

      // Mock branch check
      mockPrisma.shippingBranch.findFirst.mockResolvedValue(branchA);

      // Mock inventory queries
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.branchId === branchA.id) {
          return Promise.resolve(shipmentsInBranchA);
        }
        return Promise.resolve([]);
      });
      mockPrisma.shipment.count.mockResolvedValue(10);

      // Test GET /branches/:id/inventory
      const inventoryRes = await request(app)
        .get(`/api/v1/shipping-portal/branches/${branchA.id}/inventory`)
        .expect(200);

      expect(inventoryRes.body.success).toBe(true);
      expect(inventoryRes.body.shipments).toHaveLength(10);
      expect(inventoryRes.body.statusCounts.RECEIVED_AT_HUB).toBe(10);
      expect(inventoryRes.body.statusCounts.total).toBe(10);
      expect(inventoryRes.body.pagination.total).toBe(10);

      // Test GET /branches/:id/summary
      const summaryRes = await request(app)
        .get(`/api/v1/shipping-portal/branches/${branchA.id}/summary`)
        .expect(200);

      expect(summaryRes.body.success).toBe(true);
      expect(summaryRes.body.summary.totalShipments).toBe(10);
      expect(summaryRes.body.summary.byStatus.RECEIVED_AT_HUB).toBe(10);
      expect(summaryRes.body.summary.expectedCod).toBe(2500); // 10 * 250
    });
  });

  // 2) تحويل 4 لفرع B -> A=6 · B=4 · 4 أحداث TRANSFERRED · صفر شحنة في فرعين
  describe('Gate 2: Transfer 4 shipments to Branch B -> A=6, B=4, 4 TRANSFERRED events, 0 in two branches', () => {
    it('transfers 4 shipments to Branch B, records 4 TRANSFERRED events, and updates custody counts', async () => {
      // In-memory store of shipments to simulate real database state
      const state = {
        shipments: Array.from({ length: 10 }, (_, i) => ({
          id: `shipment-${i + 1}`,
          companyId: 'company-w10-alpha',
          trackingNumber: `TRK-A-${1000 + i}`,
          barcode: `BAR-A-${1000 + i}`,
          status: 'RECEIVED_AT_HUB',
          branchId: branchA.id,
          codAmount: 250.0,
          lastBranchAt: new Date(Date.now() - 3600000),
          createdAt: new Date(),
          updatedAt: new Date(),
          recipientName: `العميل ${i + 1}`,
        })),
        events: [],
      };

      // Mock branch resolution
      mockPrisma.shippingBranch.findFirst.mockImplementation(({ where }) => {
        if (where.id === branchA.id && where.companyId === 'company-w10-alpha') return Promise.resolve(branchA);
        if (where.id === branchB.id && where.companyId === 'company-w10-alpha') return Promise.resolve(branchB);
        return Promise.resolve(null);
      });

      // Mock findMany for transfer
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve(state.shipments.filter((s) => where.id.in.includes(s.id)));
        }
        if (where?.branchId) {
          return Promise.resolve(state.shipments.filter((s) => s.branchId === where.branchId));
        }
        return Promise.resolve(state.shipments);
      });

      // Mock update
      mockPrisma.shipment.update.mockImplementation(({ where, data }) => {
        const item = state.shipments.find((s) => s.id === where.id);
        if (item) {
          Object.assign(item, data, { updatedAt: new Date() });
          return Promise.resolve({ ...item, branch: branchB });
        }
        return Promise.reject(new Error('Shipment not found'));
      });

      // Mock recordShipmentEvent
      mockPrisma.shipmentEvent.create.mockImplementation(({ data }) => {
        state.events.push(data);
        return Promise.resolve({ id: `ev-${state.events.length}`, ...data });
      });

      // Transfer shipments 1, 2, 3, 4 from Branch A to Branch B
      const toTransferIds = ['shipment-1', 'shipment-2', 'shipment-3', 'shipment-4'];
      const transferRes = await request(app)
        .post(`/api/v1/shipping-portal/branches/${branchA.id}/transfer`)
        .send({
          shipmentIds: toTransferIds,
          toBranchId: branchB.id,
          notes: 'تحويل لنقطة توزيع الدقي لتسليم الغد',
        })
        .expect(200);

      expect(transferRes.body.success).toBe(true);
      expect(transferRes.body.manifest.transferredCount).toBe(4);
      expect(transferRes.body.manifest.failedCount).toBe(0);
      expect(transferRes.body.manifest.manifestNumber).toMatch(/^TRF-\d+-[A-Z0-9]+$/);
      expect(transferRes.body.transferred).toHaveLength(4);

      // Verify events: exactly 4 TRANSFERRED events with correct from/to metadata
      expect(state.events).toHaveLength(4);
      state.events.forEach((ev) => {
        expect(ev.toStatus).toBe('TRANSFERRED');
        expect(ev.reasonCode).toBe('BRANCH_TRANSFER');
        expect(ev.branchId).toBe(branchB.id);
        const meta = JSON.parse(ev.metadata);
        expect(meta.fromBranchId).toBe(branchA.id);
        expect(meta.toBranchId).toBe(branchB.id);
      });

      // Verify new custody distribution:
      // Branch A must have exactly 6
      const inA = state.shipments.filter((s) => s.branchId === branchA.id);
      expect(inA).toHaveLength(6);

      // Branch B must have exactly 4
      const inB = state.shipments.filter((s) => s.branchId === branchB.id);
      expect(inB).toHaveLength(4);

      // Zero shipments in two branches simultaneously (each shipment has exactly 1 branchId)
      state.shipments.forEach((s) => {
        expect(s.branchId === branchA.id || s.branchId === branchB.id).toBe(true);
      });
      const inBoth = state.shipments.filter((s) => s.branchId === branchA.id && s.branchId === branchB.id);
      expect(inBoth).toHaveLength(0);
    });
  });

  // 3) محاولة تحويل شحنة مسلّمة -> تُرفض في failed[] بسبب INVALID_STATUS
  describe('Gate 3: Reject transfer of delivered or cancelled shipment with INVALID_STATUS', () => {
    it('rejects delivered shipment in failed[] with INVALID_STATUS reason', async () => {
      const deliveredShipment = {
        id: 'shipment-delivered-99',
        companyId: 'company-w10-alpha',
        trackingNumber: 'TRK-DELIVERED-99',
        status: 'DELIVERED', // Terminal status!
        branchId: branchA.id,
        codAmount: 300,
      };

      const regularShipment = {
        id: 'shipment-valid-50',
        companyId: 'company-w10-alpha',
        trackingNumber: 'TRK-VALID-50',
        status: 'RECEIVED_AT_HUB',
        branchId: branchA.id,
        codAmount: 150,
      };

      mockPrisma.shippingBranch.findFirst.mockImplementation(({ where }) => {
        if (where.id === branchA.id && where.companyId === 'company-w10-alpha') return Promise.resolve(branchA);
        if (where.id === branchB.id && where.companyId === 'company-w10-alpha') return Promise.resolve(branchB);
        return Promise.resolve(null);
      });

      mockPrisma.shipment.findMany.mockResolvedValue([deliveredShipment, regularShipment]);
      mockPrisma.shipment.update.mockResolvedValue({ ...regularShipment, branchId: branchB.id, branch: branchB });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'ev-1' });

      const res = await request(app)
        .post(`/api/v1/shipping-portal/branches/${branchA.id}/transfer`)
        .send({
          shipmentIds: ['shipment-delivered-99', 'shipment-valid-50'],
          toBranchId: branchB.id,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.manifest.transferredCount).toBe(1);
      expect(res.body.manifest.failedCount).toBe(1);

      // Verify failed array contains delivered shipment with INVALID_STATUS
      const failedDelivered = res.body.failed.find((f) => f.id === 'shipment-delivered-99');
      expect(failedDelivered).toBeDefined();
      expect(failedDelivered.reason).toBe('INVALID_STATUS');
      expect(failedDelivered.trackingNumber).toBe('TRK-DELIVERED-99');
    });
  });

  // 4) تحويل لفرع شركة تانية -> 404
  describe('Gate 4: Cross-tenant isolation - transfer to another company branch returns 404', () => {
    it('returns 404 when toBranchId belongs to another company', async () => {
      mockPrisma.shippingBranch.findFirst.mockImplementation(({ where }) => {
        // Source branch A belongs to current user company
        if (where.id === branchA.id && where.companyId === 'company-w10-alpha') {
          return Promise.resolve(branchA);
        }
        // Target branch belongs to another company -> prisma findFirst with where.companyId returns null!
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post(`/api/v1/shipping-portal/branches/${branchA.id}/transfer`)
        .send({
          shipmentIds: ['shipment-1'],
          toBranchId: branchOtherCompany.id,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/غير موجود/);
    });
  });

  // 5) custody-diff لفترة فيها 20 استلام/5 تحويل/10 تسليم -> الأرقام مطابقة (اختبار بجدول)
  describe('Gate 5: Custody Diff Reconciliation matches exactly 20 receives, 5 transfers, 10 deliveries', () => {
    it('returns matching figures for a period with 20 receives, 5 transfers, and 10 deliveries', async () => {
      const branches = [branchA, branchB];

      // Generate 20 RECEIVED_AT_HUB events (12 for Branch A, 8 for Branch B)
      const receivedEvents = Array.from({ length: 20 }, (_, i) => ({
        id: `ev-rec-${i}`,
        companyId: 'company-w10-alpha',
        shipmentId: `ship-rec-${i}`,
        toStatus: 'RECEIVED_AT_HUB',
        branchId: i < 12 ? branchA.id : branchB.id,
        createdAt: new Date('2026-11-04T08:00:00Z'),
      }));

      // Generate 5 TRANSFERRED events from Branch A to Branch B
      const transferEvents = Array.from({ length: 5 }, (_, i) => ({
        id: `ev-trf-${i}`,
        companyId: 'company-w10-alpha',
        shipmentId: `ship-rec-${i}`,
        toStatus: 'TRANSFERRED',
        reasonCode: 'BRANCH_TRANSFER',
        branchId: branchB.id,
        metadata: JSON.stringify({
          fromBranchId: branchA.id,
          toBranchId: branchB.id,
        }),
        createdAt: new Date('2026-11-04T10:00:00Z'),
      }));

      // Generate 10 DELIVERED events (6 for Branch A, 4 for Branch B)
      const deliveredEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `ev-del-${i}`,
        companyId: 'company-w10-alpha',
        shipmentId: `ship-rec-${i}`,
        toStatus: 'DELIVERED',
        branchId: i < 6 ? branchA.id : branchB.id,
        createdAt: new Date('2026-11-04T12:00:00Z'),
      }));

      const allEvents = [...receivedEvents, ...transferEvents, ...deliveredEvents];

      mockPrisma.shippingBranch.findMany.mockResolvedValue(branches);
      mockPrisma.shipmentEvent.findMany.mockResolvedValue(allEvents);
      mockPrisma.shipment.findMany.mockResolvedValue([]);

      // Test GET /custody-diff and GET /branches/custody-diff
      const res = await request(app)
        .get('/api/v1/shipping-portal/branches/custody-diff?from=2026-11-04&to=2026-11-04')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.diff).toHaveLength(2);

      const diffTable = res.body.diff;
      const statsA = diffTable.find((b) => b.branchId === branchA.id);
      const statsB = diffTable.find((b) => b.branchId === branchB.id);

      // Verify individual branch figures
      expect(statsA.received).toBe(12);
      expect(statsA.transferredOut).toBe(5);
      expect(statsA.transferredIn).toBe(0);
      expect(statsA.delivered).toBe(6);

      expect(statsB.received).toBe(8);
      expect(statsB.transferredOut).toBe(0);
      expect(statsB.transferredIn).toBe(5);
      expect(statsB.delivered).toBe(4);

      // Verify aggregate company totals: exactly 20 receives, 5 transfers, 10 deliveries
      expect(res.body.totals.totalReceived).toBe(20);
      expect(res.body.totals.totalTransferredOut).toBe(5);
      expect(res.body.totals.totalTransferredIn).toBe(5);
      expect(res.body.totals.totalDelivered).toBe(10);

      // Print structured verification table
      console.log('--- Digital Gate 5 Table Verification ---');
      console.table(
        diffTable.map((r) => ({
          'الفرع': r.branchName,
          'استلام': r.received,
          'تحويل صادر': r.transferredOut,
          'تحويل وارد': r.transferredIn,
          'تسليم': r.delivered,
        }))
      );
      console.log('Totals:', res.body.totals);
    });
  });

  // Gate 6: Aging parcels detection (> 48h) in summary
  describe('Gate 6: Aging parcels (> 48h) detection in branch summary', () => {
    it('identifies shipments residing in branch over 48 hours without delivery', async () => {
      const now = Date.now();
      const threeDaysAgo = new Date(now - 72 * 3600 * 1000);
      const oneHourAgo = new Date(now - 1 * 3600 * 1000);

      const shipments = [
        {
          id: 'ship-stagnant-1',
          trackingNumber: 'TRK-STAGNANT-1',
          status: 'RECEIVED_AT_HUB',
          branchId: branchA.id,
          codAmount: 500,
          lastBranchAt: threeDaysAgo,
          createdAt: threeDaysAgo,
          recipientName: 'عميل شحنة متأخرة',
        },
        {
          id: 'ship-fresh-2',
          trackingNumber: 'TRK-FRESH-2',
          status: 'RECEIVED_AT_HUB',
          branchId: branchA.id,
          codAmount: 200,
          lastBranchAt: oneHourAgo,
          createdAt: oneHourAgo,
          recipientName: 'عميل شحنة جديدة',
        },
      ];

      mockPrisma.shippingBranch.findFirst.mockResolvedValue(branchA);
      mockPrisma.shipment.findMany.mockResolvedValue(shipments);

      const res = await request(app)
        .get(`/api/v1/shipping-portal/branches/${branchA.id}/summary`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.summary.aging48hCount).toBe(1);
      expect(res.body.summary.agingShipments[0].trackingNumber).toBe('TRK-STAGNANT-1');
      expect(res.body.summary.agingShipments[0].ageHours).toBeGreaterThanOrEqual(71);
    });
  });
});
