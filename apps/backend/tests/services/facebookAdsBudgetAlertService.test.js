jest.mock('../../services/facebookAdsService', () => jest.fn());
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: jest.fn((operation) => operation()),
}));
jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: jest.fn(),
}));

const facebookAdsBudgetAlertService = require('../../services/facebookAdsBudgetAlertService');

function normalizeDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
}

describe('facebookAdsBudgetAlertService', () => {
  it('deduplicates comma and newline separated WhatsApp recipients', () => {
    expect(
      facebookAdsBudgetAlertService.parseRecipientPhones(
        '01000000000, 01111111111\n01000000000؛01222222222'
      )
    ).toEqual(['01000000000', '01111111111', '01222222222']);
  });

  it('triggers numeric alerts when observed value reaches threshold', () => {
    const rule = {
      metric: facebookAdsBudgetAlertService.ALERT_METRICS.CAMPAIGN_BUDGET_REMAINING,
      thresholdAmount: 100,
    };

    expect(
      facebookAdsBudgetAlertService.isObservationTriggered(rule, {
        available: true,
        observedValue: 100,
      })
    ).toBe(true);
    expect(
      facebookAdsBudgetAlertService.isObservationTriggered(rule, {
        available: true,
        observedValue: 101,
      })
    ).toBe(false);
  });

  it('builds an Arabic WhatsApp alert message with target and threshold', () => {
    const message = facebookAdsBudgetAlertService.buildAlertMessage(
      {
        metric: facebookAdsBudgetAlertService.ALERT_METRICS.ACCOUNT_BALANCE,
        thresholdAmount: 100,
      },
      {
        targetKind: 'الحساب الإعلاني',
        targetName: 'Swan Ads',
        metricLabel: 'رصيد الحساب الإعلاني',
        observedValue: 75,
        currency: 'EGP',
      },
      new Date('2026-05-07T12:00:00.000Z')
    );

    expect(message).toContain('تنبيه رصيد الإعلانات');
    expect(message).toContain('Swan Ads');
    const normalizedMessage = normalizeDigits(message);
    expect(normalizedMessage).toContain('100');
    expect(normalizedMessage).toContain('75');
  });

  it('does not expose sensitive ad account fields when serializing rules', () => {
    const serialized = facebookAdsBudgetAlertService.serializeRule({
      id: 'rule-1',
      recipientPhones: '["01000000000"]',
      settings: '{"safe":true}',
      adAccount: {
        id: 'account-1',
        accountId: '123',
        name: 'Swan',
        currency: 'EGP',
        accessToken: 'secret-token',
        settings: '{"secret":true}',
      },
      campaign: {
        id: 'campaign-1',
        facebookCampaignId: '456',
        name: 'Campaign',
        accessToken: 'campaign-secret',
        settings: '{"secret":true}',
      },
    });

    expect(serialized.adAccount).toEqual({
      id: 'account-1',
      accountId: '123',
      name: 'Swan',
      currency: 'EGP',
      timezone: undefined,
      isActive: undefined,
    });
    expect(serialized.adAccount.accessToken).toBeUndefined();
    expect(serialized.adAccount.settings).toBeUndefined();
    expect(serialized.campaign.accessToken).toBeUndefined();
    expect(serialized.campaign.settings).toBeUndefined();
  });
});
