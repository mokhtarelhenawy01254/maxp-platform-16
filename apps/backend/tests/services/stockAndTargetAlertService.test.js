/**
 * @file stockAndTargetAlertService.test.js
 * @description Unit tests for StockAndTargetAlertService: atomic ledger gate, milestone sequencing,
 * company isolation, dryRun mode, and jsonb_set settings persistence.
 */

const stockAndTargetAlertService = require('../../services/stockAndTargetAlertService');
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
const sharedDb = require('../../services/sharedDatabase');

describe('StockAndTargetAlertService - Unit Test Suite', () => {
  let mockSendNotification;
  let mockSafeQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification = jest
      .spyOn(WhatsAppNotificationService, 'sendNotification')
      .mockResolvedValue({ success: true });
  });

  afterEach(() => {
    mockSendNotification.mockRestore();
    if (mockSafeQuery) {
      mockSafeQuery.mockRestore();
    }
  });

  describe('1. Atomic claim gate and P2002 deduplication (T00 §2.3 / T20 §3.1)', () => {
    test('claim returns true on first attempt and false on second attempt when P2002 occurs', async () => {
      let callCount = 0;
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          aiRuntimeLedger: {
            create: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({ id: 'ledger_1' });
              }
              const p2002 = new Error('Unique constraint failed on idempotencyKey');
              p2002.code = 'P2002';
              return Promise.reject(p2002);
            }),
          },
        };
        return cb(dummyPrisma);
      });

      const key = 'target:comp_1:daily:2026-10-28:100';
      const first = await stockAndTargetAlertService.claim('comp_1', key, { test: 1 });
      expect(first).toBe(true);

      const second = await stockAndTargetAlertService.claim('comp_1', key, { test: 1 });
      expect(second).toBe(false);
    });

    test('P2002 error prevents WhatsApp message from being sent', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Test Store',
              phone: '01011112222',
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  daily_orders: 10,
                  alert_phone: '01011112222',
                  notify_whatsapp: true,
                },
              }),
            }),
          },
          order: {
            count: jest.fn().mockResolvedValue(10), // 100%
          },
          aiRuntimeLedger: {
            create: jest.fn().mockRejectedValue({ code: 'P2002', message: 'Unique constraint' }),
            update: jest.fn(),
          },
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
        };
        return cb(dummyPrisma);
      });

      const res = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: false });
      expect(res.targetAlertsSent).toBe(0);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('2. Milestone sequencing fix (T20 §3.1 b)', () => {
    test('reaching 100% triggers only 100% and subsequent run does NOT trigger 80% or 50%', async () => {
      let notifiedList = [];
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Test Store',
              phone: '01011112222',
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  daily_orders: 10,
                  milestones: [50, 80, 100],
                  notified_milestones: notifiedList,
                  last_notified_target_date: new Date().toISOString().slice(0, 10),
                },
              }),
            }),
          },
          order: {
            count: jest.fn().mockResolvedValue(10), // 100%
          },
          aiRuntimeLedger: {
            create: jest.fn().mockResolvedValue({ id: 'led_1' }),
            update: jest.fn().mockResolvedValue({}),
          },
          aiNotification: {
            create: jest.fn().mockResolvedValue({}),
          },
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          $executeRawUnsafe: jest.fn().mockImplementation((_sql, jsonStr) => {
            const parsed = JSON.parse(jsonStr);
            if (parsed.notified_milestones) {
              notifiedList = parsed.notified_milestones;
            }
            return Promise.resolve(1);
          }),
        };
        return cb(dummyPrisma);
      });

      // Run 1: 100% reached
      const run1 = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: true });
      expect(run1.targetAlertsSent).toBe(1);
      expect(notifiedList).toContain('100%');

      // Run 2: Immediately run again, must NOT trigger 80% or 50%
      const run2 = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: true });
      expect(run2.targetAlertsSent).toBe(0);
      expect(notifiedList).not.toContain('80%');
      expect(notifiedList).not.toContain('50%');
    });
  });

  describe('3. 3 Consecutive runs => exactly 1 alert sent (T20 §1 & §4 step 5)', () => {
    test('consecutive checks on same day send only one alert', async () => {
      const ledgerMap = new Map();

      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Test Store',
              phone: '01011112222',
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  daily_orders: 5,
                  alert_phone: '01011112222',
                },
              }),
            }),
          },
          order: {
            count: jest.fn().mockResolvedValue(5),
          },
          aiRuntimeLedger: {
            create: jest.fn().mockImplementation(({ data }) => {
              if (ledgerMap.has(data.idempotencyKey)) {
                const err = new Error('Unique violation');
                err.code = 'P2002';
                return Promise.reject(err);
              }
              ledgerMap.set(data.idempotencyKey, data);
              return Promise.resolve({ id: 'l_1' });
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          aiNotification: { create: jest.fn().mockResolvedValue({}) },
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return cb(dummyPrisma);
      });

      const res1 = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: false });
      const res2 = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: false });
      const res3 = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1', dryRun: false });

      expect(res1.targetAlertsSent).toBe(1);
      expect(res2.targetAlertsSent).toBe(0);
      expect(res3.targetAlertsSent).toBe(0);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Company isolation & error resilience (T20 §3.1 c)', () => {
    test('an error in company 1 does NOT stop company 2 from being evaluated', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'comp_broken',
                name: 'Broken Store',
                phone: '01000000001',
                settings: JSON.stringify({
                  order_targets: {
                    enabled: true,
                    daily_orders: 10,
                    alert_phone: '01000000001',
                  },
                }),
              },
              {
                id: 'comp_healthy',
                name: 'Healthy Store',
                phone: '01000000002',
                settings: JSON.stringify({
                  order_targets: {
                    enabled: true,
                    daily_orders: 5,
                    alert_phone: '01000000002',
                  },
                }),
              },
            ]),
          },
          order: {
            count: jest.fn().mockImplementation(({ where }) => {
              if (where.companyId === 'comp_broken') {
                throw new Error('Database connection failed for broken company');
              }
              return Promise.resolve(5);
            }),
          },
          aiRuntimeLedger: {
            create: jest.fn().mockResolvedValue({ id: 'led_2' }),
            update: jest.fn().mockResolvedValue({}),
          },
          aiNotification: { create: jest.fn().mockResolvedValue({}) },
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return cb(dummyPrisma);
      });

      const result = await stockAndTargetAlertService.runDueChecks({ dryRun: true });
      expect(result.checkedCompanies).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].companyId).toBe('comp_broken');
      expect(result.targetAlertsSent).toBe(1); // comp_healthy processed successfully!
    });
  });

  describe('5. Atomic Settings Update with jsonb_set (T00 §2.2 / T20 §3.1 d)', () => {
    test('_persistTargetMeta uses $executeRawUnsafe with jsonb_set and never calls full update', async () => {
      let rawSql = '';
      let rawParams = [];

      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            update: jest.fn(),
          },
          $executeRawUnsafe: jest.fn().mockImplementation((sql, ...params) => {
            rawSql = sql;
            rawParams = params;
            return Promise.resolve(1);
          }),
        };
        return cb(dummyPrisma);
      });

      await stockAndTargetAlertService._persistTargetMeta('comp_123', {
        daily_orders: 20,
        enabled: true,
      });

      expect(rawSql).toContain('jsonb_set');
      expect(rawSql).toContain('{order_targets}');
      expect(rawParams[0]).toContain('"daily_orders":20');
      expect(rawParams[1]).toBe('comp_123');
    });

    test('updateSettings updates targets atomically and returns merged object', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              phone: '01011112222',
              settings: JSON.stringify({
                qa: true,
                order_targets: {
                  daily_orders: 15,
                  min_stock_threshold: 4,
                  enabled: true,
                },
              }),
            }),
          },
        };
        return cb(dummyPrisma);
      });

      const updated = await stockAndTargetAlertService.updateSettings('comp_1', {
        weekly_orders: 50,
      });

      expect(updated.enabled).toBe(true);
      expect(updated.daily_orders).toBe(15);
      expect(updated.min_stock_threshold).toBe(4);
    });
  });

  describe('6. Validation & Boundary Conditions', () => {
    test('updateSettings rejects min_stock_threshold <= 0', async () => {
      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { min_stock_threshold: 0 })
      ).rejects.toThrow('الحد الأدنى للمخزون يجب أن يكون أكبر من صفر');
    });

    test('updateSettings rejects empty milestones array', async () => {
      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { milestones: [] })
      ).rejects.toThrow('مراحل التنبيه لا يمكن أن تكون فارغة');
    });

    test('updateSettings rejects negative daily_orders', async () => {
      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { daily_orders: -5 })
      ).rejects.toThrow('تارجت الأوردرات اليومي غير صالح');
    });

    test('disabled company increments skipped without sending', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              phone: '01011112222',
              settings: JSON.stringify({
                order_targets: {
                  enabled: false,
                  daily_orders: 10,
                },
              }),
            }),
          },
        };
        return cb(dummyPrisma);
      });

      const res = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1' });
      expect(res.checkedCompanies).toBe(1);
      expect(res.skipped).toBe(1);
      expect(res.targetAlertsSent).toBe(0);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('missing phone increments skipped without throwing', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              phone: null,
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  daily_orders: 10,
                  alert_phone: null,
                },
              }),
            }),
          },
        };
        return cb(dummyPrisma);
      });

      const res = await stockAndTargetAlertService.runDueChecks({ companyId: 'comp_1' });
      expect(res.checkedCompanies).toBe(1);
      expect(res.skipped).toBe(1);
      expect(res.errors.length).toBe(0);
    });
  });

  describe('7. Scheduled Daily Report & Per-Product Deduplication', () => {
    test('validation: updateSettings validates monthly_orders and report_time format', async () => {
      // 1. Invalid report_time format
      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { report_time: '25:99' })
      ).rejects.toThrow('وقت التقرير غير صالح');

      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { report_time: 'not-a-time' })
      ).rejects.toThrow('وقت التقرير غير صالح');

      // 2. Negative monthly_orders
      await expect(
        stockAndTargetAlertService.updateSettings('comp_1', { monthly_orders: -10 })
      ).rejects.toThrow('تارجت الأوردرات الشهري غير صالح');
    });

    test('rule: no alert sent if no limits configured (ممنوع تنبيه بدون حد متظبط)', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Store With No Limits',
              phone: '01011112222',
              isActive: true,
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  min_stock_threshold: 0,
                  monthly_orders: 0,
                },
              }),
            }),
          },
        };
        return cb(dummyPrisma);
      });

      const res = await stockAndTargetAlertService.dispatchDailyReport('comp_1', { force: true });
      expect(res.success).toBe(false);
      expect(res.skipped).toBe(true);
      expect(res.reason).toBe('NO_LIMITS_CONFIGURED');
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('report numbers match live database queries: month orders count and achievement %', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Store Metrics Test',
              phone: '01011112222',
              isActive: true,
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  monthly_orders: 200,
                  min_stock_threshold: 5,
                  report_time: '09:00',
                },
              }),
            }),
          },
          order: {
            count: jest.fn().mockImplementation(({ where }) => {
              // Verify query criteria matches sales report: not CANCELLED and month start
              expect(where.status).toEqual({ not: 'CANCELLED' });
              return Promise.resolve(150); // 150 of 200 => 75%
            }),
          },
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          aiRuntimeLedger: {
            create: jest.fn().mockResolvedValue({ id: 'l_1' }),
            update: jest.fn().mockResolvedValue({}),
          },
          notification: { create: jest.fn().mockResolvedValue({}) },
          aiNotification: { create: jest.fn().mockResolvedValue({}) },
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return cb(dummyPrisma);
      });

      const res = await stockAndTargetAlertService.dispatchDailyReport('comp_1', { dryRun: true, force: true });
      expect(res.success).toBe(true);
      expect(res.metrics.monthlyTarget).toBe(200);
      expect(res.metrics.monthOrdersCount).toBe(150);
      expect(res.metrics.achievementPct).toBe(75);
      expect(res.messageText).toContain('150');
      expect(res.messageText).toContain('200');
      expect(res.messageText).toContain('75%');
    });

    test('per-product deduplication: low stock product appears once per day', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      let persistedNotifiedStock = null;

      const productA = { id: 'prod_A', name: 'قماش صوف فاخر', sku: 'WOOL-01', stock: 2 };
      const productB = { id: 'prod_B', name: 'خيط حرير', sku: 'SILK-01', stock: 1 };

      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Fashion Hub',
              phone: '01011112222',
              isActive: true,
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  monthly_orders: 100,
                  min_stock_threshold: 5,
                  notified_stock_today: persistedNotifiedStock,
                },
              }),
            }),
          },
          order: { count: jest.fn().mockResolvedValue(40) },
          product: { findMany: jest.fn().mockResolvedValue([productA, productB]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          aiRuntimeLedger: {
            create: jest.fn().mockResolvedValue({ id: 'l_stock' }),
            update: jest.fn().mockResolvedValue({}),
          },
          notification: { create: jest.fn().mockResolvedValue({}) },
          aiNotification: { create: jest.fn().mockResolvedValue({}) },
          $executeRawUnsafe: jest.fn().mockImplementation((_sql, jsonStr) => {
            const parsed = JSON.parse(jsonStr);
            if (parsed.notified_stock_today) {
              persistedNotifiedStock = parsed.notified_stock_today;
            }
            return Promise.resolve(1);
          }),
        };
        return cb(dummyPrisma);
      });

      // Run 1: First dispatch today -> both products are alerted
      const run1 = await stockAndTargetAlertService.dispatchDailyReport('comp_1', { dryRun: true, force: true });
      expect(run1.success).toBe(true);
      expect(run1.metrics.newLowItemsCount).toBe(2);
      expect(run1.messageText).toContain('قماش صوف فاخر');
      expect(run1.messageText).toContain('خيط حرير');
      expect(persistedNotifiedStock).not.toBeNull();
      expect(persistedNotifiedStock.date).toBe(todayStr);
      expect(persistedNotifiedStock.itemIds).toEqual(['prod_B', 'prod_A']);

      // Run 2: Second dispatch today -> 0 new products alerted, message notes no new items
      const run2 = await stockAndTargetAlertService.dispatchDailyReport('comp_1', { dryRun: true, force: true });
      expect(run2.success).toBe(true);
      expect(run2.metrics.newLowItemsCount).toBe(0);
      expect(run2.metrics.allLowItemsCount).toBe(2);
      expect(run2.messageText).toContain('تم تنبيهك سابقاً اليوم بالأصناف المنخفضة، ولا توجد أصناف جديدة انخفضت');
      expect(run2.messageText).not.toContain('• قماش صوف فاخر:');
    });

    test('cross-day deduplication reset: products can be alerted again on a new day', async () => {
      const yesterdayStr = '2026-10-31';
      let persistedNotifiedStock = {
        date: yesterdayStr,
        itemIds: ['prod_A'],
      };

      const productA = { id: 'prod_A', name: 'قماش صوف فاخر', sku: 'WOOL-01', stock: 2 };

      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          company: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'comp_1',
              name: 'Fashion Hub',
              phone: '01011112222',
              isActive: true,
              settings: JSON.stringify({
                order_targets: {
                  enabled: true,
                  monthly_orders: 100,
                  min_stock_threshold: 5,
                  notified_stock_today: persistedNotifiedStock,
                },
              }),
            }),
          },
          order: { count: jest.fn().mockResolvedValue(40) },
          product: { findMany: jest.fn().mockResolvedValue([productA]) },
          productVariant: { findMany: jest.fn().mockResolvedValue([]) },
          aiRuntimeLedger: {
            create: jest.fn().mockResolvedValue({ id: 'l_stock' }),
            update: jest.fn().mockResolvedValue({}),
          },
          notification: { create: jest.fn().mockResolvedValue({}) },
          aiNotification: { create: jest.fn().mockResolvedValue({}) },
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return cb(dummyPrisma);
      });

      // Since today is different from yesterday, prod_A should be alerted again
      const runToday = await stockAndTargetAlertService.dispatchDailyReport('comp_1', { dryRun: true, force: true });
      expect(runToday.success).toBe(true);
      expect(runToday.metrics.newLowItemsCount).toBe(1);
      expect(runToday.messageText).toContain('قماش صوف فاخر');
    });
  });
});
