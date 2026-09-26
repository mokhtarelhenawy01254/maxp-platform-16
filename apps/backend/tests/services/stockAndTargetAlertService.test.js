/**
 * @file stockAndTargetAlertService.test.js
 * @description Unit tests for automated stock monitoring and daily/weekly order target alerts.
 */

const stockAndTargetAlertService = require('../../services/stockAndTargetAlertService');
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
const sharedDb = require('../../services/sharedDatabase');

describe('StockAndTargetAlertService - Unit Test Suite', () => {
  let mockSendNotification;
  let mockSafeQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendNotification = jest.spyOn(WhatsAppNotificationService, 'sendNotification').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    mockSendNotification.mockRestore();
    if (mockSafeQuery) {
      mockSafeQuery.mockRestore();
    }
  });

  describe('1. Calendar & Date Calculations', () => {
    test('getWeekStartDate returns Saturday 00:00:00', () => {
      // Wednesday, Sept 23, 2026
      const midWeek = new Date(2026, 8, 23, 14, 30, 0);
      const weekStart = stockAndTargetAlertService.getWeekStartDate(midWeek);

      // Day 6 is Saturday
      expect(weekStart.getDay()).toBe(6);
      expect(weekStart.getHours()).toBe(0);
      expect(weekStart.getMinutes()).toBe(0);
      expect(weekStart.getSeconds()).toBe(0);
      expect(weekStart.getDate()).toBe(19); // Saturday Sept 19
    });

    test('getWeekStartDate on Saturday itself returns the same day 00:00:00', () => {
      const sat = new Date(2026, 8, 26, 16, 0, 0);
      const weekStart = stockAndTargetAlertService.getWeekStartDate(sat);
      expect(weekStart.getDay()).toBe(6);
      expect(weekStart.getDate()).toBe(26);
      expect(weekStart.getHours()).toBe(0);
    });
  });

  describe('2. Message Formatting (Anti-Slop & Precision)', () => {
    test('formats daily 100% target achievement message properly', () => {
      const msg = stockAndTargetAlertService._formatTargetAlertMessage({
        storeName: 'متجر الأناقة',
        milestone: '100%',
        actualOrders: 50,
        targetOrders: 50,
        percentage: 100,
      });

      expect(msg).toContain('متجر الأناقة');
      expect(msg).toContain('100%');
      expect(msg).toContain('50');
      expect(msg).not.toMatch(/[🤖🚀⚡✨🔥💡🎯🛒🧠]/); // Anti-slop: zero emoji littering
    });

    test('formats weekly target achievement message properly', () => {
      const msg = stockAndTargetAlertService._formatWeeklyTargetAlertMessage({
        storeName: 'متجر الأناقة',
        milestone: '80%',
        actualOrders: 240,
        targetOrders: 300,
        percentage: 80,
        remainingOrders: 60,
      });

      expect(msg).toContain('تحديث أداء المبيعات الأسبوعي');
      expect(msg).toContain('240');
      expect(msg).toContain('300');
      expect(msg).toContain('60');
      expect(msg).not.toMatch(/[🤖🚀⚡✨🔥💡🎯🛒🧠]/);
    });
  });

  describe('3. Daily Target Evaluation', () => {
    test('returns false if daily_orders is not set or 0', async () => {
      const company = { id: 'c1', name: 'Store 1' };
      const config = { daily_orders: 0 };
      const res = await stockAndTargetAlertService._evaluateDailyOrderTargets(company, config, '01012345678');
      expect(res).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('triggers 50% milestone alert when orders reach 50% of target', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          order: { count: jest.fn().mockResolvedValue(25) },
          company: { findUnique: jest.fn().mockResolvedValue({ settings: '{}' }), update: jest.fn() },
        };
        return cb(dummyPrisma);
      });

      const company = { id: 'c1', name: 'Store 1' };
      const config = { daily_orders: 50, notified_milestones: [] };

      const res = await stockAndTargetAlertService._evaluateDailyOrderTargets(company, config, '01012345678');
      expect(res).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification.mock.calls[0][0].contentOverride).toContain('50%');
    });

    test('does not re-trigger milestone if already in notified_milestones for today', async () => {
      const todayDateKey = new Date().toISOString().slice(0, 10);
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          order: { count: jest.fn().mockResolvedValue(25) },
        };
        return cb(dummyPrisma);
      });

      const company = { id: 'c1', name: 'Store 1' };
      const config = {
        daily_orders: 50,
        last_notified_target_date: todayDateKey,
        notified_milestones: ['50%'],
      };

      const res = await stockAndTargetAlertService._evaluateDailyOrderTargets(company, config, '01012345678');
      expect(res).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('4. Weekly Target Evaluation', () => {
    test('returns false if weekly_orders is not set or 0', async () => {
      const company = { id: 'c1', name: 'Store 1' };
      const config = { weekly_orders: 0 };
      const res = await stockAndTargetAlertService._evaluateWeeklyOrderTargets(company, config, '01012345678');
      expect(res).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    test('triggers 100% milestone alert when weekly orders reach target', async () => {
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          order: { count: jest.fn().mockResolvedValue(305) },
          company: { findUnique: jest.fn().mockResolvedValue({ settings: '{}' }), update: jest.fn() },
        };
        return cb(dummyPrisma);
      });

      const company = { id: 'c1', name: 'Store 1' };
      const config = { weekly_orders: 300, notified_weekly_milestones: ['50%', '80%'] };

      const res = await stockAndTargetAlertService._evaluateWeeklyOrderTargets(company, config, '01012345678');
      expect(res).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification.mock.calls[0][0].contentOverride).toContain('100%');
      expect(mockSendNotification.mock.calls[0][0].contentOverride).toContain('تارجت الأسبوع');
    });

    test('suppresses duplicate weekly alerts in the same week', async () => {
      const weekStartKey = stockAndTargetAlertService.getWeekStartDate().toISOString().slice(0, 10);
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          order: { count: jest.fn().mockResolvedValue(305) },
        };
        return cb(dummyPrisma);
      });

      const company = { id: 'c1', name: 'Store 1' };
      const config = {
        weekly_orders: 300,
        last_notified_weekly_target_date: weekStartKey,
        notified_weekly_milestones: ['50%', '80%', '100%'],
      };

      const res = await stockAndTargetAlertService._evaluateWeeklyOrderTargets(company, config, '01012345678');
      expect(res).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('5. Low Stock Evaluation & Variant Safety', () => {
    test('queries variants with trackInventory = true', async () => {
      let variantQueryArgs = null;
      mockSafeQuery = jest.spyOn(sharedDb, 'safeQuery').mockImplementation(async (cb) => {
        const dummyPrisma = {
          product: { findMany: jest.fn().mockResolvedValue([]) },
          productVariant: {
            findMany: jest.fn().mockImplementation((args) => {
              variantQueryArgs = args;
              return [{ name: 'L / Red', sku: 'SKU-RED-L', stock: 2, product: { name: 'قميص كاجوال' } }];
            }),
          },
          company: { findUnique: jest.fn().mockResolvedValue({ settings: '{}' }), update: jest.fn() },
        };
        return cb(dummyPrisma);
      });

      const company = { id: 'c1', name: 'Store 1' };
      const config = { min_stock_threshold: 5 };

      const res = await stockAndTargetAlertService._evaluateStockLevels(company, config, '01012345678');
      expect(res).toBe(true);
      expect(variantQueryArgs.where.trackInventory).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification.mock.calls[0][0].contentOverride).toContain('قميص كاجوال (L / Red)');
    });
  });
});
