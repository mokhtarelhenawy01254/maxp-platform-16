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

describe('globalSecurity public FAQ access', () => {
  const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('treats public FAQ reads as public', () => {
    expect(isPublicRoute('GET', '/api/v1/support/faq')).toBe(true);
    expect(isPublicRoute('GET', '/api/v1/support/faq/categories')).toBe(true);
  });

  test('treats public FAQ rating as public', () => {
    expect(isPublicRoute('POST', '/api/v1/support/faq/faq-123/rate')).toBe(true);
  });

  test('skips authentication for public FAQ category requests', async () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/support/faq/categories',
      path: '/api/v1/support/faq/categories',
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponse();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
