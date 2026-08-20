jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../../../utils/turbo/errorHandler', () => ({
  handleError: jest.fn((error) => { throw error; }),
}));

const axios = require('axios');
const { FALLBACK_GOVERNMENTS } = require('../../../utils/turbo/constants');

// LocationService has module-level cache ΓÇö we reset it between tests by
// clearing the module registry so each describe block gets a fresh cache.
let LocationService;

function createMockClient(overrides = {}) {
  return {
    getApiKey: jest.fn().mockResolvedValue('test-api-key'),
    getHeaders: jest.fn().mockResolvedValue({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    getMainClientCode: jest.fn().mockResolvedValue('37321'),
    baseUrl: 'https://backoffice.turbo-eg.com/external-api',
    timeout: 30000,
    ...overrides,
  };
}

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to get a fresh module-level cache each time
    jest.resetModules();
    // Re-apply mocks after resetModules
    jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    jest.mock('../../../utils/turbo/errorHandler', () => ({
      handleError: jest.fn((error) => { throw error; }),
    }));
    LocationService = require('../../../services/turbo/locationService');
  });

  describe('getGovernments', () => {
    test('fetches from API and returns cleaned governments (feed format)', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: {
          success: 1,
          feed: [
            { id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' },
            { id: '2', name: '╪º┘ä╪¼┘è╪▓╪⌐' },
          ],
        },
      });

      const service = new LocationService(client);
      const result = await service.getGovernments();

      expect(result.success).toBe(true);
      expect(result.governments).toHaveLength(2);
      expect(result.governments[0]).toEqual({ id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' });
      expect(result.count).toBe(2);
    });

    test('returns cached data on second call within TTL', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: { success: 1, feed: [{ id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' }] },
      });

      const service = new LocationService(client);
      await service.getGovernments(); // first call ΓÇö fills cache
      await service.getGovernments(); // second call ΓÇö should use cache

      expect(axiosMock.get).toHaveBeenCalledTimes(1);
      const second = await service.getGovernments();
      expect(second.fromCache).toBe(true);
    });

    test('falls back to FALLBACK_GOVERNMENTS when getApiKey throws', async () => {
      const client = createMockClient({
        getApiKey: jest.fn().mockRejectedValue(new Error('Turbo not enabled')),
      });

      const service = new LocationService(client);
      const result = await service.getGovernments();

      expect(result.success).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.governments).toEqual(FALLBACK_GOVERNMENTS);
      expect(result.count).toBe(27);
    });

    test('falls back to FALLBACK_GOVERNMENTS when API call throws', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockRejectedValue(new Error('network error'));

      const service = new LocationService(client);
      const result = await service.getGovernments();

      expect(result.success).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.governments).toEqual(FALLBACK_GOVERNMENTS);
    });

    test('handles governorates format in response', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: { governorates: [{ id: '3', name: '╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐' }] },
      });

      const service = new LocationService(client);
      const result = await service.getGovernments();
      expect(result.governments[0].name).toBe('╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐');
    });

    test('handles plain array format in response', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: [{ id: '4', name: '╪º┘ä╪»┘é┘ç┘ä┘è╪⌐' }, { id: '5', name: '╪º┘ä╪┤╪▒┘é┘è╪⌐' }],
      });

      const service = new LocationService(client);
      const result = await service.getGovernments();
      expect(result.governments).toHaveLength(2);
      expect(result.governments[0].name).toBe('╪º┘ä╪»┘é┘ç┘ä┘è╪⌐');
    });

    test('normalizes string-only entries', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: { success: 1, feed: ['╪º┘ä┘é╪º┘ç╪▒╪⌐', '╪º┘ä╪¼┘è╪▓╪⌐'] },
      });

      const service = new LocationService(client);
      const result = await service.getGovernments();
      expect(result.governments[0]).toEqual({ id: '╪º┘ä┘é╪º┘ç╪▒╪⌐', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' });
    });
  });

  describe('getAreas', () => {
    test('returns areas for valid governmentId (feed format)', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: {
          success: 1,
          feed: [{ id: 'a1', name: '╪º┘ä┘à╪╣╪º╪»┘è' }, { id: 'a2', name: '╪¡┘ä┘ê╪º┘å' }],
        },
      });

      const service = new LocationService(client);
      const result = await service.getAreas('1');

      expect(result.success).toBe(true);
      expect(result.areas).toHaveLength(2);
      expect(result.areas[0].name).toBe('╪º┘ä┘à╪╣╪º╪»┘è');
      expect(result.count).toBe(2);
    });

    test('returns empty array when no governmentId provided', async () => {
      const client = createMockClient();
      const service = new LocationService(client);
      const result = await service.getAreas(null);

      expect(result.success).toBe(true);
      expect(result.areas).toEqual([]);
    });

    test('caches areas by governmentId', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: { success: 1, feed: [{ id: 'a1', name: '╪º┘ä┘à╪╣╪º╪»┘è' }] },
      });

      const service = new LocationService(client);
      await service.getAreas('1');
      const second = await service.getAreas('1');

      expect(axiosMock.get).toHaveBeenCalledTimes(1);
      expect(second.fromCache).toBe(true);
    });

    test('returns empty on API error', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockRejectedValue(new Error('API error'));

      const service = new LocationService(client);
      const result = await service.getAreas('99');

      expect(result.success).toBe(true);
      expect(result.areas).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getBranches', () => {
    test('returns formatted branches list', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({
        data: {
          branches: [
            {
              id: 'b1', name: '┘ü╪▒╪╣ ╪º┘ä┘é╪º┘ç╪▒╪⌐', address: '╪┤╪º╪▒╪╣ 10',
              city: '╪º┘ä┘é╪º┘ç╪▒╪⌐', governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐', phone: '0225000000',
              working_hours: '9am-5pm', is_active: true,
            },
          ],
        },
      });

      const service = new LocationService(client);
      const result = await service.getBranches('╪º┘ä┘é╪º┘ç╪▒╪⌐', '╪º┘ä┘é╪º┘ç╪▒╪⌐');

      expect(result.success).toBe(true);
      expect(result.branches).toHaveLength(1);
      expect(result.branches[0]).toMatchObject({
        id: 'b1',
        name: '┘ü╪▒╪╣ ╪º┘ä┘é╪º┘ç╪▒╪⌐',
        city: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
        workingHours: '9am-5pm',
        isActive: true,
      });
    });

    test('passes city and governorate as query params', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({ data: { branches: [] } });

      const service = new LocationService(client);
      await service.getBranches('╪º┘ä╪¼┘è╪▓╪⌐', '╪º┘ä╪¼┘è╪▓╪⌐');

      expect(axiosMock.get).toHaveBeenCalledWith(
        expect.stringContaining('/branches'),
        expect.objectContaining({
          params: { city: '╪º┘ä╪¼┘è╪▓╪⌐', governorate: '╪º┘ä╪¼┘è╪▓╪⌐' },
        })
      );
    });

    test('omits params when city and governorate are null', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValue({ data: [] });

      const service = new LocationService(client);
      await service.getBranches(null, null);

      expect(axiosMock.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: {} })
      );
    });
  });

  describe('searchAreaByText', () => {
    test('returns empty matches for empty query', async () => {
      const client = createMockClient();
      const service = new LocationService(client);
      const result = await service.searchAreaByText('  ');
      expect(result.success).toBe(true);
      expect(result.matches).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('matches area by exact name and returns governorate context', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' }, { id: '2', name: '╪º┘ä╪¼┘è╪▓╪⌐' }] },
      });
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: 'a1', name: '╪º┘ä┘à╪╣╪º╪»┘è' }, { id: 'a2', name: '┘à╪»┘è┘å╪⌐ ┘å╪╡╪▒' }] },
      });

      const service = new LocationService(client);
      const result = await service.searchAreaByText('╪º┘ä┘à╪╣╪º╪»┘è');

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      expect(result.matches[0]).toMatchObject({
        governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
        area: '╪º┘ä┘à╪╣╪º╪»┘è',
      });
      expect(result.matches[0].confidence).toBe(1);
    });

    test('restricts to matched governorate when its name appears in the query', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' }, { id: '2', name: '╪º┘ä╪¼┘è╪▓╪⌐' }] },
      });
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: 'a1', name: '╪º┘ä┘à╪╣╪º╪»┘è' }] },
      });

      const service = new LocationService(client);
      const result = await service.searchAreaByText('╪º┘ä┘é╪º┘ç╪▒╪⌐ ╪º┘ä┘à╪╣╪º╪»┘è');

      // Only ╪º┘ä┘é╪º┘ç╪▒╪⌐ areas are loaded (single get-area call)
      expect(result.count).toBeGreaterThan(0);
      expect(result.matches[0].governorate).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('returns governorate-only fallback row when no area matched', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: '1', name: '╪º┘ä┘é╪º┘ç╪▒╪⌐' }] },
      });
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: 'a1', name: '╪¡┘ä┘ê╪º┘å' }] },
      });

      const service = new LocationService(client);
      const result = await service.searchAreaByText('╪º┘ä┘é╪º┘ç╪▒╪⌐ 6 ╪ú┘â╪¬┘ê╪¿╪▒');

      expect(result.count).toBeGreaterThan(0);
      expect(result.matches[0].governorate).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
    });

    test('handles governorate-name-only query with no matched areas', async () => {
      const client = createMockClient();
      const axiosMock = require('axios');
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: '3', name: '╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐' }] },
      });
      axiosMock.get.mockResolvedValueOnce({
        data: { success: 1, feed: [{ id: 'a9', name: '╪│┘à┘ê╪¡╪⌐' }] },
      });

      const service = new LocationService(client);
      const result = await service.searchAreaByText('╪│┘à┘ê╪¡╪⌐');

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      expect(result.matches[0].area).toBe('╪│┘à┘ê╪¡╪⌐');
    });
  });
});
