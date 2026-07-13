const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockCompany = {
  id: 'company-123',
  name: 'Test Store',
  currency: 'EGP',
  slug: 'test-store',
  settings: { description: 'Test Store Description' }
};

const mockPrisma = {
  _runtimeDataModel: {
    models: {
      StorefrontSettings: {
        fields: [
          { name: 'paymentGatewayConfig' },
          { name: 'enabledPaymentMethods' },
          { name: 'designTokens' }
        ]
      }
    }
  },
  storefrontSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  storefrontThemeCatalog: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue({ id: 'modern-minimal' }),
    findUnique: jest.fn().mockResolvedValue({ id: 'modern-minimal' })
  },
  company: {
    findUnique: jest.fn()
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  safeQuery: async (fn) => fn(mockPrisma)
}));

jest.mock('../../services/tenantContext', () => ({
  run: (id, fn) => fn()
}));

jest.mock('../../services/redisCacheService', () => ({
  del: jest.fn()
}));

jest.mock('../../services/storefrontThemeCatalogService', () => ({
  storefrontThemeCatalogService: {
    ensureThemeSelection: jest.fn().mockResolvedValue({ ok: true }),
    getDefaultThemeId: jest.fn().mockResolvedValue('modern-minimal')
  }
}));

const controller = require('../../controller/storefrontSettingsController');

describe('storefrontSettingsController - Payment Gateway Configuration Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue(mockCompany);
  });

  test('successfully merges masked payment gateway credentials with existing database credentials', async () => {
    const existingConfig = {
      merchantId: 'MID-12345',
      apiKey: 'real-api-key-1234567890',
      secretKey: 'real-secret-key-0987654321',
      mode: 'test'
    };

    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      designTokens: { themeId: 'modern-minimal' },
      paymentGatewayConfig: JSON.stringify(existingConfig)
    });

    mockPrisma.storefrontSettings.upsert.mockImplementation((args) => {
      return {
        id: 'settings-123',
        companyId: 'company-123',
        designTokens: args.update.designTokens,
        paymentGatewayConfig: args.update.paymentGatewayConfig,
        enabledPaymentMethods: '["cod","card"]'
      };
    });

    const req = {
      user: { companyId: 'company-123' },
      body: {
        paymentGatewayConfig: {
          merchantId: 'MID-12345',
          apiKey: 'real...7890', // Masked token
          secretKey: '********', // Masked token
          mode: 'test'
        },
        enabledPaymentMethods: '["cod","card"]'
      }
    };
    const res = createResponse();

    await controller.updateSettings(req, res);
    expect(mockPrisma.storefrontSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          paymentGatewayConfig: {
            merchantId: 'MID-12345',
            apiKey: 'real-api-key-1234567890',
            secretKey: 'real-secret-key-0987654321',
            mode: 'test'
          }
        })
      })
    );

    // Verify response contains masked keys
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          paymentGatewayConfig: expect.objectContaining({
            merchantId: 'MID-12345',
            apiKey: 'real...7890', // Masked version returned to client
            secretKey: 'real...4321' // Masked version returned to client
          })
        })
      })
    );
  });

  test('overwrites keys when client sends new unmasked credentials', async () => {
    const existingConfig = {
      merchantId: 'MID-12345',
      apiKey: 'old-api-key',
      secretKey: 'old-secret-key',
      mode: 'test'
    };

    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      designTokens: { themeId: 'modern-minimal' },
      paymentGatewayConfig: existingConfig
    });

    mockPrisma.storefrontSettings.upsert.mockImplementation((args) => {
      return {
        id: 'settings-123',
        companyId: 'company-123',
        designTokens: args.update.designTokens,
        paymentGatewayConfig: args.update.paymentGatewayConfig,
        enabledPaymentMethods: '["cod"]'
      };
    });

    const req = {
      user: { companyId: 'company-123' },
      body: {
        paymentGatewayConfig: {
          merchantId: 'MID-12345',
          apiKey: 'new-unmasked-api-key-here',
          secretKey: 'new-unmasked-secret-key-here',
          mode: 'live'
        }
      }
    };
    const res = createResponse();

    await controller.updateSettings(req, res);

    // Verify database update has the new keys saved
    expect(mockPrisma.storefrontSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          paymentGatewayConfig: {
            merchantId: 'MID-12345',
            apiKey: 'new-unmasked-api-key-here',
            secretKey: 'new-unmasked-secret-key-here',
            mode: 'live'
          }
        })
      })
    );
  });
});
