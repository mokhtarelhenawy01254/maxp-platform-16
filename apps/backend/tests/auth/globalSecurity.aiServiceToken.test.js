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
const tenantContext = require('../../services/tenantContext');
const { globalAuthentication } = require('../../middleware/globalSecurity');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('globalSecurity AI service token access', () => {
  const originalAiServiceToken = process.env.AI_SERVICE_TOKEN;
  const originalMaxpServiceToken = process.env.MAXP_SERVICE_TOKEN;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_TOKEN = 'test-ai-service-token';
    delete process.env.MAXP_SERVICE_TOKEN;
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(() => {
    process.env.AI_SERVICE_TOKEN = originalAiServiceToken;
    process.env.MAXP_SERVICE_TOKEN = originalMaxpServiceToken;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  test('accepts service token on protected company routes without JWT verification', async () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/products?companyId=company-123',
      path: '/api/v1/products',
      ip: '127.0.0.1',
      headers: {
        authorization: 'Bearer test-ai-service-token',
        'x-company-id': 'company-123',
      },
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' },
      query: { companyId: 'company-123' },
      body: {},
    };
    const res = createResponse();
    let observedTenant = null;
    const next = jest.fn(() => {
      observedTenant = tenantContext.getCompanyId();
    });

    await globalAuthentication(req, res, next);

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(
      expect.objectContaining({
        id: 'ai-service',
        role: 'AI_SERVICE',
        companyId: 'company-123',
        effectiveCompanyId: 'company-123',
        service: true,
      }),
    );
    expect(req.companyId).toBe('company-123');
    expect(observedTenant).toBe('company-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requires explicit company context for service token access', async () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/products',
      path: '/api/v1/products',
      ip: '127.0.0.1',
      headers: {
        authorization: 'Bearer test-ai-service-token',
      },
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' },
      query: {},
      body: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await globalAuthentication(req, res, next);

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'SERVICE_COMPANY_ID_REQUIRED',
      }),
    );
  });
});
