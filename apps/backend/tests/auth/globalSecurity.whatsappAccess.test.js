jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    appendFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const {
  isPublicRoute,
  globalAuthentication,
} = require('../../middleware/globalSecurity');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('globalSecurity WhatsApp protections', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  test('keeps debug WhatsApp sessions route protected', () => {
    expect(isPublicRoute('GET', '/api/v1/whatsapp/sessions/debug')).toBe(false);
  });

  test('requires authentication for debug WhatsApp sessions route', async () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/whatsapp/sessions/debug',
      path: '/api/v1/whatsapp/sessions/debug',
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponse();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );
  });

  test('fails closed when JWT_SECRET is missing on protected routes', async () => {
    process.env.JWT_SECRET = '';

    const req = {
      method: 'GET',
      originalUrl: '/api/v1/whatsapp/sessions/debug',
      path: '/api/v1/whatsapp/sessions/debug',
      ip: '127.0.0.1',
      headers: {
        authorization: 'Bearer test-token',
      },
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponse();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'AUTH_CONFIGURATION_ERROR',
      }),
    );
  });
});
