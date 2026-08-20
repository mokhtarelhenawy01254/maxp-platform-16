/**
 * Regression test: independent loyalty-system toggles
 * Verifies that tiers and auto-discount are no longer mutually exclusive ΓÇö
 * each has its own flag (tiersEnabled / autoDiscountEnabled) and they can be
 * enabled together. Also verifies fresh companies default to all-off.
 */

const store = {};

const mockPrisma = {
  company: {
    findUnique: jest.fn(async ({ where }) => store[where.id] || null),
    update: jest.fn(async ({ where, data }) => {
      const rec = store[where.id] || (store[where.id] = { id: where.id });
      Object.assign(rec, data);
      return rec;
    }),
  },
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const svc = require('../services/autoDiscountService');

beforeEach(() => {
  jest.clearAllMocks();
  store.c1 = {
    id: 'c1',
    loyaltySystem: 'TIERS',
    loyaltySettings: JSON.stringify({ discountPercent: 10, validityDays: 3 }),
  };
  delete store.c2;
});

describe('independent loyalty toggles', () => {
  it('enables tiers and auto-discount together (no mutual exclusion)', async () => {
    await svc.updateLoyaltyConfig('c1', {
      tiersEnabled: true,
      autoDiscountEnabled: true,
      discountCombination: 'ADDITIVE',
    });

    expect(await svc.isTiersActive('c1')).toBe(true);
    expect(await svc.isAutoDiscountActive('c1')).toBe(true);

    const settings = await svc.getSettings('c1');
    expect(settings.tiersEnabled).toBe(true);
    expect(settings.autoDiscountEnabled).toBe(true);
    expect(settings.discountCombination).toBe('ADDITIVE');
  });

  it('updating one flag does not clear the other (independent)', async () => {
    await svc.updateLoyaltyConfig('c1', { tiersEnabled: true, autoDiscountEnabled: true });
    await svc.updateLoyaltyConfig('c1', { autoDiscountEnabled: false });

    expect(await svc.isTiersActive('c1')).toBe(true); // unchanged
    expect(await svc.isAutoDiscountActive('c1')).toBe(false);
  });

  it('fresh companies default to all systems off', async () => {
    expect(await svc.isTiersActive('c2')).toBe(false);
    expect(await svc.isAutoDiscountActive('c2')).toBe(false);
    const settings = await svc.getSettings('c2');
    expect(settings.tiersEnabled).toBe(false);
    expect(settings.autoDiscountEnabled).toBe(false);
    expect(settings.discountCombination).toBe('ADDITIVE');
  });

  it('keeps legacy loyaltySystem in sync when only one system is on', async () => {
    await svc.updateLoyaltyConfig('c1', { autoDiscountEnabled: true });
    const settings = await svc.getSettings('c1');
    expect(settings.loyaltySystem).toBe('AUTO_DISCOUNT');
    expect(settings.activated).toBe(true);

    await svc.updateLoyaltyConfig('c1', { autoDiscountEnabled: false, tiersEnabled: true });
    const settings2 = await svc.getSettings('c1');
    expect(settings2.loyaltySystem).toBe('TIERS');
  });

  it('stores discount combination mode and clamps the total discount cap', async () => {
    await svc.updateLoyaltyConfig('c1', {
      tiersEnabled: true,
      autoDiscountEnabled: true,
      discountCombination: 'COMPOUND',
      maxTotalDiscountPercent: 15,
    });
    const settings = await svc.getSettings('c1');
    expect(settings.discountCombination).toBe('COMPOUND');
    expect(settings.maxTotalDiscountPercent).toBe(15);
  });

  it('rejects an invalid combination mode and falls back to ADDITIVE', async () => {
    await svc.updateLoyaltyConfig('c1', { discountCombination: 'INVALID' });
    const settings = await svc.getSettings('c1');
    expect(settings.discountCombination).toBe('ADDITIVE');
  });

  it('treats a non-positive cap as no cap (0)', async () => {
    await svc.updateLoyaltyConfig('c1', { maxTotalDiscountPercent: -5 });
    const settings = await svc.getSettings('c1');
    expect(settings.maxTotalDiscountPercent).toBe(0);
  });
});
