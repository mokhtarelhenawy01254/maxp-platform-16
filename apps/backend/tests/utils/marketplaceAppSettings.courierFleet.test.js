const {
  SUPPORTED_MARKETPLACE_APP_SETTING_SLUGS,
  getDefaultMarketplaceAppSettings,
  sanitizeMarketplaceAppSettings,
  buildInstalledMarketplaceAppSettings,
} = require('../../utils/marketplaceAppSettings');

describe('Marketplace App Settings - internal-courier-fleet Integration Test', () => {
  test('1. internal-courier-fleet slug is registered in SUPPORTED_MARKETPLACE_APP_SETTING_SLUGS', () => {
    expect(SUPPORTED_MARKETPLACE_APP_SETTING_SLUGS).toContain('internal-courier-fleet');
  });

  test('2. getDefaultMarketplaceAppSettings returns complete courier fleet schema', () => {
    const defaults = getDefaultMarketplaceAppSettings('internal-courier-fleet');

    expect(defaults).toBeDefined();
    expect(defaults.general).toBeDefined();
    expect(defaults.general.enabled).toBe(true);
    expect(defaults.general.runCodePrefix).toBe('RUN');
    expect(defaults.general.autoPrintManifestOnDispatch).toBe(false);
    expect(defaults.general.includeCustomerPhoneInManifest).toBe(true);

    expect(defaults.remittance).toBeDefined();
    expect(defaults.remittance.defaultTreasuryAccountId).toBe('');
    expect(defaults.remittance.shortagePolicy).toBe('DEDUCT_FROM_COURIER');
    expect(defaults.remittance.allowPartialRemittance).toBe(true);
    expect(defaults.remittance.requireTreasuryNoteOnVariance).toBe(true);

    expect(defaults.fieldWorkflow).toBeDefined();
    expect(defaults.fieldWorkflow.requireCourierPin).toBe(false);
    expect(defaults.fieldWorkflow.autoUpdateOrderStatusOnDelivery).toBe(true);
    expect(defaults.fieldWorkflow.allowPartialDelivery).toBe(true);
    expect(defaults.fieldWorkflow.requirePhotoProofOnReturn).toBe(false);

    expect(defaults.commission).toBeDefined();
    expect(defaults.commission.defaultType).toBe('PER_ORDER');
    expect(defaults.commission.defaultValue).toBe(30);
  });

  test('3. sanitizeMarketplaceAppSettings handles null/undefined and preserves defaults', () => {
    const sanitizedNull = sanitizeMarketplaceAppSettings('internal-courier-fleet', null);
    expect(sanitizedNull.general.runCodePrefix).toBe('RUN');

    const sanitizedEmpty = sanitizeMarketplaceAppSettings('internal-courier-fleet', {});
    expect(sanitizedEmpty.remittance.shortagePolicy).toBe('DEDUCT_FROM_COURIER');
  });

  test('4. sanitizeMarketplaceAppSettings merges partial merchant overrides cleanly', () => {
    const customSettings = {
      general: {
        runCodePrefix: 'CAI',
        autoPrintManifestOnDispatch: true,
      },
      remittance: {
        defaultTreasuryAccountId: 'acc-treasury-main-cairo',
        shortagePolicy: 'HOLD_SETTLEMENT',
      },
      commission: {
        defaultValue: 50,
      },
    };

    const sanitized = sanitizeMarketplaceAppSettings('internal-courier-fleet', customSettings);

    // Overridden fields
    expect(sanitized.general.runCodePrefix).toBe('CAI');
    expect(sanitized.general.autoPrintManifestOnDispatch).toBe(true);
    expect(sanitized.remittance.defaultTreasuryAccountId).toBe('acc-treasury-main-cairo');
    expect(sanitized.remittance.shortagePolicy).toBe('HOLD_SETTLEMENT');
    expect(sanitized.commission.defaultValue).toBe(50);

    // Retained default fields
    expect(sanitized.general.includeCustomerPhoneInManifest).toBe(true);
    expect(sanitized.remittance.allowPartialRemittance).toBe(true);
    expect(sanitized.remittance.requireTreasuryNoteOnVariance).toBe(true);
    expect(sanitized.fieldWorkflow.requireCourierPin).toBe(false);
    expect(sanitized.fieldWorkflow.autoUpdateOrderStatusOnDelivery).toBe(true);
    expect(sanitized.commission.defaultType).toBe('PER_ORDER');
  });

  test('5. buildInstalledMarketplaceAppSettings correctly layers extra settings', () => {
    const existing = {
      remittance: { defaultTreasuryAccountId: 'acc-existing' },
    };
    const extra = {
      general: { runCodePrefix: 'DISPATCH' },
    };

    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', existing, extra);
    expect(installed.remittance.defaultTreasuryAccountId).toBe('acc-existing');
    expect(installed.general.runCodePrefix).toBe('DISPATCH');
    expect(installed.fieldWorkflow.autoUpdateOrderStatusOnDelivery).toBe(true);
  });
});
