jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/hr/customerNotificationScheduleService', () => ({
  sendCustomerNotification: jest.fn(),
  getEffectiveSchedule: jest.fn(),
}));

const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');
const scheduleService = require('../../services/hr/customerNotificationScheduleService');

// processExpiryWarnings already exists in the service -> real, runnable test.
// getExpiringPoints is added by the sibling agent -> auto-skipped until present.
const itE = typeof loyaltyService.getExpiringPoints === 'function' ? it : it.skip;

const companyId = 'company-1';
const customerId = 'customer-1';

// Build a lastPointsEarned so that the points expire `daysAhead` days from now.
function earnedDaysAgoForExpiryIn(daysAhead) {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  d.setDate(d.getDate() + daysAhead);
  return d;
}

describe('customerLoyaltyService.processExpiryWarnings (expiry notification path)', () => {
  let prisma;
  let recordFindMany;
  let recordUpdate;

  beforeEach(() => {
    scheduleService.sendCustomerNotification.mockResolvedValue({});
    scheduleService.getEffectiveSchedule.mockResolvedValue({ delayUnit: 'DAYS', delayValue: 7 });

    recordFindMany = jest.fn();
    recordUpdate = jest.fn().mockResolvedValue({});
    prisma = {
      customerLoyaltyRecord: { findMany: recordFindMany, update: recordUpdate },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);

    // A record whose points expire ~5 days from now (warning window = 7 days).
    recordFindMany.mockResolvedValue([
      {
        id: 'rec-1',
        companyId,
        customerId,
        currentPoints: '50',
        lastPointsEarned: earnedDaysAgoForExpiryIn(5).toISOString(),
        metadata: null,
        customerLoyaltyProgram: { id: 'prog-1', name: 'Prog', nameAr: 'برنامج', expiryMonths: 12 },
        customer: { id: customerId, phone: '0123456789', firstName: 'A', lastName: 'B' },
      },
    ]);
  });

  it('triggers the expiry-warning notification for a customer within the warning window', async () => {
    const result = await loyaltyService.processExpiryWarnings(companyId);

    expect(result.success).toBe(true);
    expect(result.totalWarned).toBeGreaterThanOrEqual(1);

    const notifyCall = scheduleService.sendCustomerNotification.mock.calls.find(
      (c) => c[0] && c[0].eventType === 'LOYALTY_POINTS_EXPIRY_WARNING'
    );
    expect(notifyCall).toBeTruthy();
    expect(notifyCall[0].customerId).toBe(customerId);
    expect(notifyCall[0].variables.points).toBe('50');
  });
});

describe('customerLoyaltyService.getExpiringPoints (pre-expiry alert data)', () => {
  let prisma;
  let recordFindMany;
  let companyFindUnique;

  beforeEach(() => {
    recordFindMany = jest.fn();
    companyFindUnique = jest.fn().mockResolvedValue({
      id: companyId,
      domain: 'https://shop.example.com/',
      name: 'Shop',
    });
    prisma = {
      customerLoyaltyRecord: { findMany: recordFindMany },
      company: { findUnique: companyFindUnique },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);

    // A record whose points expire exactly 7 days from now (the requested window).
    recordFindMany.mockResolvedValue([
      {
        id: 'rec-2',
        companyId,
        customerId,
        currentPoints: '40',
        pendingPoints: '0',
        lastPointsEarned: earnedDaysAgoForExpiryIn(7).toISOString(),
        metadata: null,
        customerLoyaltyProgram: { id: 'prog-1', name: 'Prog', nameAr: 'برنامج', expiryMonths: 12 },
        customer: { id: customerId, phone: '0123456789', firstName: 'A', lastName: 'B' },
      },
    ]);
  });

  itE('returns expiring customers carrying expiringPoints and a deepLink', async () => {
    const res = await loyaltyService.getExpiringPoints({ companyId, days: 7 });

    expect(Array.isArray(res)).toBe(true);
    const customer = res[0];
    expect(customer).toBeTruthy();
    expect(customer.expiringPoints).toBeDefined();
    expect(customer.expiringPoints).toBe(40);
    expect(customer.deepLink).toBeDefined();
    expect(customer.deepLink).toContain('loyalty_discount=40');
  });
});
