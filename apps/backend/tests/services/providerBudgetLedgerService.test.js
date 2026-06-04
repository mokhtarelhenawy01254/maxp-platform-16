const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const providerBudgetLedgerService = require('../../services/aiAgent/providerBudgetLedgerService');

describe('ProviderBudgetLedgerService - Tenant Token Budgeting Tests', () => {
  let prisma;
  const createdCompanies = [];

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
  });

  afterEach(async () => {
    // Clean up created records for this test run
    for (const companyId of createdCompanies) {
      await prisma.aiNotification.deleteMany({ where: { companyId } }).catch(() => {});
      await prisma.aiSetting.deleteMany({ where: { companyId } }).catch(() => {});
      await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
    }
    createdCompanies.length = 0;
  });

  async function setupTestCompany(suffix) {
    const email = `test-budget-${suffix}@company.com`;
    let company = await prisma.company.findFirst({
      where: { email }
    });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: `Test Budget Company ${suffix}`,
          email,
          isActive: true
        }
      });
    }
    createdCompanies.push(company.id);
    return company.id;
  }

  test('should load default daily limits when no custom limits are configured', async () => {
    const companyId = await setupTestCompany('default-limits');

    // Make sure no custom setting exists
    await prisma.aiSetting.deleteMany({ where: { companyId } }).catch(() => {});

    const limits = await providerBudgetLedgerService.getCompanyLimits(companyId);
    expect(limits.dailyTokenLimit).toBe(500000);
    expect(limits.dailyCostLimit).toBe(50.0);
  });

  test('should load custom daily limits from AiSetting modelSettings JSON', async () => {
    const companyId = await setupTestCompany('custom-limits');

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: {
        modelSettings: JSON.stringify({
          dailyTokenLimit: 25000,
          dailyCostLimit: 2.5
        })
      },
      create: {
        companyId,
        modelSettings: JSON.stringify({
          dailyTokenLimit: 25000,
          dailyCostLimit: 2.5
        })
      }
    });

    const limits = await providerBudgetLedgerService.getCompanyLimits(companyId);
    expect(limits.dailyTokenLimit).toBe(25000);
    expect(limits.dailyCostLimit).toBe(2.5);
  });

  test('should track, increment company daily usage and block if tokens exceed limit', async () => {
    const companyId = await setupTestCompany('tokens-limit');

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: {
        modelSettings: JSON.stringify({
          dailyTokenLimit: 1000,
          dailyCostLimit: 10.0
        })
      },
      create: {
        companyId,
        modelSettings: JSON.stringify({
          dailyTokenLimit: 1000,
          dailyCostLimit: 10.0
        })
      }
    });

    // 1. Initial status check
    const status1 = await providerBudgetLedgerService.isWithinDailyBudget(companyId, 100);
    expect(status1.allowed).toBe(true);

    // 2. Increment usage (e.g. 600 tokens)
    await providerBudgetLedgerService.incrementCompanyUsage(companyId, { tokens: 600 }, {
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash'
    });

    // 3. Status check under limit
    const status2 = await providerBudgetLedgerService.isWithinDailyBudget(companyId, 100);
    expect(status2.allowed).toBe(true);

    // 4. Checking status with tokens that would exceed limit
    const status3 = await providerBudgetLedgerService.isWithinDailyBudget(companyId, 500); // 600 + 500 = 1100 > 1000
    expect(status3.allowed).toBe(false);
    expect(status3.reason).toBe('DAILY_TOKEN_LIMIT_EXCEEDED');
    expect(status3.limit).toBe(1000);
    expect(status3.current).toBe(600);
  });

  test('should track, increment company daily usage and block if cost exceeds limit', async () => {
    const companyId = await setupTestCompany('cost-limit');

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: {
        modelSettings: JSON.stringify({
          dailyTokenLimit: 100000,
          dailyCostLimit: 0.00001
        })
      },
      create: {
        companyId,
        modelSettings: JSON.stringify({
          dailyTokenLimit: 100000,
          dailyCostLimit: 0.00001
        })
      }
    });

    // 1. Initial status check
    const status1 = await providerBudgetLedgerService.isWithinDailyBudget(companyId, 10);
    expect(status1.allowed).toBe(true);

    // 2. Increment usage with expensive model tokens (e.g. 500 tokens Claude-3-5-sonnet)
    await providerBudgetLedgerService.incrementCompanyUsage(companyId, { tokens: 500 }, {
      provider: 'ANTHROPIC',
      model: 'claude-3-5-sonnet'
    });

    // 3. Status check should be exceeded due to cost
    const status2 = await providerBudgetLedgerService.isWithinDailyBudget(companyId, 10);
    expect(status2.allowed).toBe(false);
    expect(status2.reason).toBe('DAILY_COST_LIMIT_EXCEEDED');
    expect(status2.limit).toBe(0.00001);
    expect(status2.current).toBeGreaterThan(0.00001);
  });

  test('should return BUDGET_EXCEEDED and trigger only one notification per day', async () => {
    const companyId = await setupTestCompany('notification-spam');

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: {
        modelSettings: JSON.stringify({
          dailyTokenLimit: 500,
          dailyCostLimit: 10.0
        })
      },
      create: {
        companyId,
        modelSettings: JSON.stringify({
          dailyTokenLimit: 500,
          dailyCostLimit: 10.0
        })
      }
    });

    // 1. Increment usage to exceed limit
    await providerBudgetLedgerService.incrementCompanyUsage(companyId, { tokens: 600 }, {
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash'
    });

    // Mock rotator selection object
    const selection = {
      companyId,
      name: 'Test key',
      provider: 'GOOGLE',
      modelName: 'gemini-2.5-flash',
      apiKey: 'test-key-abc',
      usage: '{}'
    };

    // 2. Trigger routing check twice
    const routeStatus1 = await providerBudgetLedgerService.canRoute(selection, { estimatedTokens: 100 });
    expect(routeStatus1.allowed).toBe(false);
    expect(routeStatus1.reason).toBe('BUDGET_EXCEEDED');

    const routeStatus2 = await providerBudgetLedgerService.canRoute(selection, { estimatedTokens: 100 });
    expect(routeStatus2.allowed).toBe(false);
    expect(routeStatus2.reason).toBe('BUDGET_EXCEEDED');

    // 3. Verify exactly 1 notification is stored in DB (anti-spam block check)
    const notifications = await prisma.aiNotification.findMany({
      where: { companyId, type: 'BUDGET_EXCEEDED' }
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].severity).toBe('high');
    expect(notifications[0].title).toBe('تجميد باقة الذكاء الاصطناعي - تجاوز الميزانية اليومية');
    expect(notifications[0].message).toContain('تم تجميد استهلاك باقة الذكاء الاصطناعي للشركة');
    expect(JSON.parse(notifications[0].metadata).reason).toBe('DAILY_TOKEN_LIMIT_EXCEEDED');
  });
});
