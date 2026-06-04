const {
  getJwtSecret,
  getJwtRefreshSecret,
  isMissingAuthSecretError,
} = require('../../utils/jwtSecret');

describe('jwtSecret helpers', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
  });

  test('returns the configured JWT secret', () => {
    process.env.JWT_SECRET = 'configured-secret';

    expect(getJwtSecret()).toBe('configured-secret');
  });

  test('falls back to JWT secret for refresh secret when dedicated refresh secret is absent', () => {
    process.env.JWT_SECRET = 'configured-secret';
    process.env.JWT_REFRESH_SECRET = '';

    expect(getJwtRefreshSecret()).toBe('configured-secret');
  });

  test('throws a tagged error when JWT secret is missing', () => {
    process.env.JWT_SECRET = '';

    expect(() => getJwtSecret()).toThrow('JWT_SECRET is not configured');

    try {
      getJwtSecret();
    } catch (error) {
      expect(isMissingAuthSecretError(error)).toBe(true);
      expect(error.code).toBe('AUTH_SECRET_MISSING');
    }
  });
});
