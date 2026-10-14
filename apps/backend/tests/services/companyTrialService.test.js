const { expireCompanyTrial } = require('../../services/companyTrialService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn((cb) => cb()),
}));

jest.mock('../../services/pendingBillingService', () => ({
  processPendingUsageCharges: jest.fn(),
}));

describe('companyTrialService.expireCompanyTrial', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      company: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      companyApp: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      appUsageLog: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalCost: 0 } }),
      },
      billingHistory: {
        create: jest.fn(),
      },
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps apps with valid future subscription and PAY_PER_USE apps active, while expiring unpurchased trial apps', async () => {
    const companyId = 'test-company-1';
    mockPrisma.company.findUnique.mockResolvedValue({
      id: companyId,
      trialModeEnabled: true,
      trialStartedAt: new Date(Date.now() - 14 * 86400000),
      trialEndsAt: new Date(Date.now() - 86400000),
    });

    const future = new Date(Date.now() + 20 * 86400000);
    const past = new Date(Date.now() - 5 * 86400000);

    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-sub-valid',
        appId: 'app-wa',
        activePricingModel: 'SUBSCRIPTION',
        validUntil: future,
        app: { name: 'WhatsApp Business', pricingModel: 'SUBSCRIPTION' },
      },
      {
        id: 'ca-ppu-store',
        appId: 'app-store',
        activePricingModel: 'PAY_PER_USE',
        validUntil: null,
        app: { name: 'المتجر', pricingModel: 'PAY_PER_USE' },
      },
      {
        id: 'ca-trial-unpurchased',
        appId: 'app-analytics',
        activePricingModel: 'SUBSCRIPTION',
        validUntil: past,
        app: { name: 'Analytics Pro', pricingModel: 'SUBSCRIPTION' },
      },
    ]);

    const result = await expireCompanyTrial(companyId);

    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: companyId },
      data: { trialModeEnabled: false },
    });

    // Expect toExpire (ca-trial-unpurchased) to become EXPIRED
    expect(mockPrisma.companyApp.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ca-trial-unpurchased'] } },
      data: { status: 'EXPIRED', installedInTrial: false },
    });

    // Expect toKeepActive (ca-sub-valid, ca-ppu-store) to remain ACTIVE with trial cleared
    expect(mockPrisma.companyApp.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ca-sub-valid', 'ca-ppu-store'] } },
      data: { status: 'ACTIVE', installedInTrial: false, trialEndsAt: null },
    });

    expect(result.frozen).toBe(1);
  });
});
