jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    appendFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});

const {
  isPublicRoute,
  globalAuthentication,
} = require('../../middleware/globalSecurity');

describe('globalSecurity public shipping quote access', () => {
  test('treats POST public shipping quote routes as public', () => {
    expect(
      isPublicRoute(
        'POST',
        '/api/v1/shipping-zones/public/company-123/calculate',
      ),
    ).toBe(true);
  });

  test('skips authentication for POST public shipping quote requests', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/shipping-zones/public/company-123/calculate',
      path: '/api/v1/shipping-zones/public/company-123/calculate',
      ip: '127.0.0.1',
      headers: {},
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('keeps non-public shipping zone writes protected', () => {
    expect(isPublicRoute('POST', '/api/v1/shipping-zones')).toBe(false);
  });
});
