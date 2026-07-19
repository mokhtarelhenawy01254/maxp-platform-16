const mockCompanyFindUnique = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    company: {
      findUnique: mockCompanyFindUnique,
    },
  })),
  safeQuery: jest.fn(async (operation) => operation()),
}));

const TurboService = require('../../services/turboService');

describe('TurboService API key logging', () => {
  let warnSpy;
  let errorSpy;
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('logs disabled Turbo as configuration warning, not production error', async () => {
    mockCompanyFindUnique.mockResolvedValue({
      turboEnabled: false,
      turboApiKey: null,
    });

    const service = new TurboService(null, 'company-disabled');

    await expect(service.getApiKey()).rejects.toThrow('Turbo is not enabled for this company');

    expect(warnSpy).toHaveBeenCalledWith('⚠️ [TURBO] API key unavailable:', {
      companyId: 'company-disabled',
      reason: 'Turbo is not enabled for this company',
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('keeps unexpected API key failures as errors', async () => {
    mockCompanyFindUnique.mockRejectedValue(new Error('database exploded'));

    const service = new TurboService(null, 'company-db-error');

    await expect(service.getApiKey()).rejects.toThrow('database exploded');

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ [TURBO] Error fetching API key:',
      expect.objectContaining({ message: 'database exploded' }),
    );
  });
});
