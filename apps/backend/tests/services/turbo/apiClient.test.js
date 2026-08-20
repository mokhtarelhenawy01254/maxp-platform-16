const mockCompanyFindUnique = jest.fn();

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    company: { findUnique: mockCompanyFindUnique },
  })),
  safeQuery: jest.fn(async (operation) => operation()),
}));

const axios = require('axios');
const TurboApiClient = require('../../../services/turbo/apiClient');

describe('TurboApiClient', () => {
  let warnSpy, errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('constructor', () => {
    test('sets apiKey and companyId from arguments', () => {
      const client = new TurboApiClient('my-key', 'comp-1');
      expect(client.apiKey).toBe('my-key');
      expect(client.companyId).toBe('comp-1');
    });

    test('defaults to null when no arguments', () => {
      const client = new TurboApiClient();
      expect(client.apiKey).toBeNull();
      expect(client.companyId).toBeNull();
    });

    test('sets baseUrl from env or default', () => {
      const client = new TurboApiClient();
      expect(client.baseUrl).toBe('https://backoffice.turbo-eg.com/external-api');
    });

    test('sets timeout to 30000', () => {
      const client = new TurboApiClient();
      expect(client.timeout).toBe(30000);
    });
  });

  describe('getApiKey', () => {
    test('returns stored key immediately when available', async () => {
      const client = new TurboApiClient('existing-key', 'comp-1');
      const key = await client.getApiKey();
      expect(key).toBe('existing-key');
      expect(mockCompanyFindUnique).not.toHaveBeenCalled();
    });

    test('fetches from DB when apiKey is null', async () => {
      mockCompanyFindUnique.mockResolvedValue({
        turboEnabled: true,
        turboApiKey: 'db-fetched-key',
      });
      const client = new TurboApiClient(null, 'comp-1');
      const key = await client.getApiKey();
      expect(key).toBe('db-fetched-key');
      expect(client.apiKey).toBe('db-fetched-key'); // cached on instance
    });

    test('throws when no companyId and no apiKey', async () => {
      const client = new TurboApiClient(null, null);
      await expect(client.getApiKey()).rejects.toThrow('Company ID is required to fetch API key');
    });

    test('throws when company not found in DB', async () => {
      mockCompanyFindUnique.mockResolvedValue(null);
      const client = new TurboApiClient(null, 'comp-missing');
      await expect(client.getApiKey()).rejects.toThrow('Turbo is not enabled for this company');
    });

    test('throws when Turbo is disabled for company', async () => {
      mockCompanyFindUnique.mockResolvedValue({ turboEnabled: false, turboApiKey: null });
      const client = new TurboApiClient(null, 'comp-disabled');
      await expect(client.getApiKey()).rejects.toThrow('Turbo is not enabled for this company');
      // Should log as warn (config error), not error
      expect(warnSpy).toHaveBeenCalledWith(
        'ΓÜá∩╕Å [TURBO] API key unavailable:',
        expect.objectContaining({ companyId: 'comp-disabled' })
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    test('throws when turboApiKey is missing but enabled', async () => {
      mockCompanyFindUnique.mockResolvedValue({ turboEnabled: true, turboApiKey: null });
      const client = new TurboApiClient(null, 'comp-no-key');
      await expect(client.getApiKey()).rejects.toThrow('Turbo API key is not configured for this company');
    });

    test('logs error for unexpected DB failures', async () => {
      mockCompanyFindUnique.mockRejectedValue(new Error('DB connection lost'));
      const client = new TurboApiClient(null, 'comp-db-err');
      await expect(client.getApiKey()).rejects.toThrow('DB connection lost');
      expect(errorSpy).toHaveBeenCalledWith(
        'Γ¥î [TURBO] Error fetching API key:',
        expect.objectContaining({ message: 'DB connection lost' })
      );
    });
  });

  describe('getHeaders', () => {
    test('returns JSON headers by default', async () => {
      const client = new TurboApiClient();
      const headers = await client.getHeaders();
      expect(headers).toEqual({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      });
    });

    test('adds authentication_key when apiKey provided', async () => {
      const client = new TurboApiClient();
      const headers = await client.getHeaders('my-api-key');
      expect(headers.authentication_key).toBe('my-api-key');
    });

    test('omits Content-Type when isFormData is true', async () => {
      const client = new TurboApiClient();
      const headers = await client.getHeaders(null, true);
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers['Accept']).toBe('application/json');
    });
  });

  describe('getMainClientCode', () => {
    test('returns code from DB', async () => {
      mockCompanyFindUnique.mockResolvedValue({ turboMainClientCode: '99999' });
      const client = new TurboApiClient(null, 'comp-1');
      const code = await client.getMainClientCode();
      expect(code).toBe('99999');
    });

    test('throws when no companyId', async () => {
      const client = new TurboApiClient(null, null);
      await expect(client.getMainClientCode()).rejects.toThrow('Company ID is required');
    });

    test('returns null on DB error', async () => {
      mockCompanyFindUnique.mockRejectedValue(new Error('timeout'));
      const client = new TurboApiClient(null, 'comp-1');
      const code = await client.getMainClientCode();
      expect(code).toBeNull();
    });

    test('returns null when field not set', async () => {
      mockCompanyFindUnique.mockResolvedValue({ turboMainClientCode: null });
      const client = new TurboApiClient(null, 'comp-1');
      const code = await client.getMainClientCode();
      expect(code).toBeNull();
    });
  });

  describe('getSenderNumber', () => {
    test('returns sender number from DB', async () => {
      mockCompanyFindUnique.mockResolvedValue({ turboSenderNumber: '01234567890' });
      const client = new TurboApiClient(null, 'comp-1');
      const num = await client.getSenderNumber();
      expect(num).toBe('01234567890');
    });

    test('throws when no companyId', async () => {
      const client = new TurboApiClient(null, null);
      await expect(client.getSenderNumber()).rejects.toThrow('Company ID is required');
    });

    test('returns null on DB error', async () => {
      mockCompanyFindUnique.mockRejectedValue(new Error('timeout'));
      const client = new TurboApiClient(null, 'comp-1');
      const num = await client.getSenderNumber();
      expect(num).toBeNull();
    });
  });

  describe('post', () => {
    test('calls axios.post with correct URL, data, headers, and timeout', async () => {
      axios.post.mockResolvedValue({ data: { ok: true } });
      const client = new TurboApiClient('key', 'comp');
      const result = await client.post('/add-order', { foo: 'bar' });
      expect(axios.post).toHaveBeenCalledWith(
        'https://backoffice.turbo-eg.com/external-api/add-order',
        { foo: 'bar' },
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/json' }),
          timeout: 30000,
        })
      );
      expect(result.data).toEqual({ ok: true });
    });

    test('passes extra options to axios', async () => {
      axios.post.mockResolvedValue({ data: {} });
      const client = new TurboApiClient('key', 'comp');
      await client.post('/endpoint', {}, { responseType: 'arraybuffer' });
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({ responseType: 'arraybuffer' })
      );
    });
  });

  describe('get', () => {
    test('calls axios.get with correct URL, params, headers, and timeout', async () => {
      axios.get.mockResolvedValue({ data: { list: [] } });
      const client = new TurboApiClient('key', 'comp');
      const result = await client.get('/branches', { city: 'Cairo' });
      expect(axios.get).toHaveBeenCalledWith(
        'https://backoffice.turbo-eg.com/external-api/branches',
        expect.objectContaining({
          params: { city: 'Cairo' },
          timeout: 30000,
        })
      );
      expect(result.data).toEqual({ list: [] });
    });
  });
});
