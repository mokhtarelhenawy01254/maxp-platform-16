jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    customer: {
      upsert: jest.fn(),
      create: jest.fn(),
    },
  })),
  safeQuery: jest.fn(),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: jest.fn(),
}));

const internalSyncService = require('../../services/internalSyncService');

describe('internalSyncService customer identity mapping', () => {
  test('uses facebookId compound unique key when a synced customer has no whatsapp identity', () => {
    const args = internalSyncService.buildSyncedCustomerUpsertArgs(
      {
        firstName: 'Aya',
        lastName: 'Gamal',
        phone: '',
        whatsappId: null,
        facebookId: '26921579934121326',
        email: 'facebook_26921579934121326@example.com',
      },
      'provider-company'
    );

    expect(args.where).toEqual({
      facebookId_companyId: {
        facebookId: '26921579934121326',
        companyId: 'provider-company',
      },
    });
    expect(args.create).toMatchObject({
      whatsappId: null,
      facebookId: '26921579934121326',
      companyId: 'provider-company',
    });
  });

  test('prefers phone or whatsapp identity when available', () => {
    const args = internalSyncService.buildSyncedCustomerUpsertArgs(
      {
        firstName: 'Mona',
        lastName: 'Ali',
        phone: '01012345678',
        whatsappId: null,
        facebookId: 'fb-123',
      },
      'provider-company'
    );

    expect(args.where).toEqual({
      whatsappId_companyId: {
        whatsappId: '01012345678',
        companyId: 'provider-company',
      },
    });
    expect(args.create).toMatchObject({
      phone: '01012345678',
      whatsappId: '01012345678',
      facebookId: 'fb-123',
    });
  });

  test('matches provider variant from synced order item color and size', () => {
    const variant = internalSyncService.findMatchingProviderVariantForOrderItem(
      {
        productColor: '\u0623\u0628\u064a\u0636',
        productSize: '39',
      },
      {
        productVariants: [
          {
            id: 'black-39',
            name: '\u0623\u0633\u0648\u062f - 39',
            metadata: JSON.stringify({
              attributeValues: {
                '\u0627\u0644\u0644\u0648\u0646': '\u0623\u0633\u0648\u062f',
                '\u0627\u0644\u0645\u0642\u0627\u0633': '39',
              },
            }),
          },
          {
            id: 'white-39',
            name: '\u0623\u0628\u064a\u0636 - 39',
            metadata: JSON.stringify({
              attributeValues: {
                '\u0627\u0644\u0644\u0648\u0646': '\u0623\u0628\u064a\u0636',
                '\u0627\u0644\u0645\u0642\u0627\u0633': '39',
              },
            }),
          },
        ],
      }
    );

    expect(variant).toMatchObject({ id: 'white-39' });
  });
});
