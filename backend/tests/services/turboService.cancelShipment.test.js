jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const TurboService = require('../../services/turboService');

describe('TurboService.cancelShipment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retries with the next identifier when Turbo rejects the first search key as not found', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: {
          success: 0,
          error_msg: 'Shipments not found',
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: 1,
          message: 'Cancelled successfully',
        },
      });

    const turboService = new TurboService('api-key', 'company-1');
    jest.spyOn(turboService, 'getMainClientCode').mockResolvedValue(37321);

    const result = await turboService.cancelShipment(['CODE-123', 'BAR-999']);

    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      'https://backoffice.turbo-eg.com/external-api/delete-order',
      expect.objectContaining({
        search_Key: 'CODE-123',
      }),
      expect.any(Object),
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      'https://backoffice.turbo-eg.com/external-api/delete-order',
      expect.objectContaining({
        search_Key: 'BAR-999',
      }),
      expect.any(Object),
    );
    expect(result).toMatchObject({
      success: true,
      shipmentId: 'BAR-999',
      status: 'cancelled',
    });
  });

  test('preserves raw shipment identifiers instead of coercing them with parseInt', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: 1,
        message: 'Cancelled successfully',
      },
    });

    const turboService = new TurboService('api-key', 'company-1');
    jest.spyOn(turboService, 'getMainClientCode').mockResolvedValue(37321);

    await turboService.cancelShipment('00012345');

    expect(axios.post).toHaveBeenCalledWith(
      'https://backoffice.turbo-eg.com/external-api/delete-order',
      expect.objectContaining({
        search_Key: '00012345',
      }),
      expect.any(Object),
    );
  });

  test('treats repeated not-found responses as an idempotent local cancellation', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: {
          success: 0,
          error_msg: 'Shipments not found',
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: 0,
          error_msg: 'Shipments not found',
        },
      });

    const turboService = new TurboService('api-key', 'company-1');
    jest.spyOn(turboService, 'getMainClientCode').mockResolvedValue(37321);

    const result = await turboService.cancelShipment(['37406238', 'ORD-941086-907']);

    expect(result).toMatchObject({
      success: true,
      shipmentId: '37406238',
      status: 'cancelled',
      data: {
        providerStatus: 'not_found',
        resolvedLocally: true,
      },
    });
  });
});
