process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-tests';

const {
  isPublicRoute,
  globalAuthentication,
} = require('../../middleware/globalSecurity');

jest.mock('../../services/courierPortalService', () => ({
  loginCourier: jest.fn(),
}));

const courierPortalService = require('../../services/courierPortalService');
const courierPortalController = require('../../controller/courierPortalController');

describe('globalSecurity Courier Portal Access & Public Routes Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPublicRoute whitelist check', () => {
    test('treats courier login, logout, verify-link-pin, and failure-reasons as public', () => {
      expect(isPublicRoute('POST', '/api/v1/courier-portal/login')).toBe(true);
      expect(isPublicRoute('POST', '/api/v1/courier-portal/logout')).toBe(true);
      expect(isPublicRoute('POST', '/api/v1/courier-portal/verify-link-pin')).toBe(true);
      expect(isPublicRoute('GET', '/api/v1/courier-portal/failure-reasons')).toBe(true);
    });

    test('strictly preserves protection for sensitive portal endpoints (/me, /sync)', () => {
      expect(isPublicRoute('GET', '/api/v1/courier-portal/me')).toBe(false);
      expect(isPublicRoute('POST', '/api/v1/courier-portal/sync')).toBe(false);
      expect(isPublicRoute('DELETE', '/api/v1/courier-portal/me')).toBe(false);
    });
  });

  describe('globalAuthentication middleware without Authorization header', () => {
    test('skips authentication for POST /api/v1/courier-portal/login without Authorization header', async () => {
      const req = {
        method: 'POST',
        originalUrl: '/api/v1/courier-portal/login',
        path: '/api/v1/courier-portal/login',
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

    test('skips authentication for POST /api/v1/courier-portal/verify-link-pin without Authorization header', async () => {
      const req = {
        method: 'POST',
        originalUrl: '/api/v1/courier-portal/verify-link-pin',
        path: '/api/v1/courier-portal/verify-link-pin',
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
    });

    test('blocks GET /api/v1/courier-portal/me without Authorization header with AUTHENTICATION_REQUIRED', async () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/courier-portal/me',
        path: '/api/v1/courier-portal/me',
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

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTHENTICATION_REQUIRED',
        })
      );
    });

    test('blocks GET /api/v1/courier-portal/me with invalid Bearer token with 401', async () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/courier-portal/me',
        path: '/api/v1/courier-portal/me',
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer invalid.garbage.token',
        },
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await globalAuthentication(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Route handler behavior when reached without Authorization', () => {
    test('without Authorization header, valid credentials reach login handler and return 200 + token', async () => {
      courierPortalService.loginCourier.mockResolvedValueOnce({
        token: 'mock-courier-jwt-token-12h',
        courier: {
          id: 'courier-1',
          name: 'كابتن محمود',
          phone: '01012345678',
        },
      });

      const req = {
        body: { phone: '01012345678', pin: '1234' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await courierPortalController.login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: 'mock-courier-jwt-token-12h',
          courier: expect.objectContaining({ name: 'كابتن محمود' }),
        }),
        message: 'تم تسجيل الدخول بنجاح',
      });
    });

    test('without Authorization header, wrong PIN reaches login handler and returns 401 INVALID_CREDENTIALS (not AUTHENTICATION_REQUIRED)', async () => {
      const authErr = new Error('بيانات الدخول غير صحيحة أو رمز PIN غير صحيح');
      authErr.statusCode = 401;
      authErr.code = 'INVALID_CREDENTIALS';
      courierPortalService.loginCourier.mockRejectedValueOnce(authErr);

      const req = {
        body: { phone: '01012345678', pin: '9999' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await courierPortalController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'بيانات الدخول غير صحيحة أو رمز PIN غير صحيح',
        code: 'INVALID_CREDENTIALS', // Explicitly proves it came from courierPortalService, NOT globalSecurity AUTHENTICATION_REQUIRED
      });
    });
  });
});
