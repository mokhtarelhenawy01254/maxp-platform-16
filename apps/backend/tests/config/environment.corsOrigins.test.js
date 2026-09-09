const ORIGINAL_ENV = process.env;

const runCorsCheck = (envConfig, origin) =>
  new Promise((resolve) => {
    envConfig.corsOrigins(origin, (error, allowed) => {
      resolve({ error, allowed });
    });
  });

describe('environment corsOrigins', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MAIN_DOMAIN;
    delete process.env.ALLOWED_FRONTEND_DOMAINS;
    delete process.env.ADDITIONAL_ALLOWED_DOMAINS;
    delete process.env.DOMAIN_ALIASES;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('allows both mokhtarelhenawy.online and maxp.online domain families in production', async () => {
    process.env.NODE_ENV = 'production';

    const envConfig = require('../../config/environment');
    const allowedOrigins = [
      'https://mokhtarelhenawy.online',
      'https://www.mokhtarelhenawy.online',
      'https://alpha.mokhtarelhenawy.online',
      'https://maxp.online',
      'https://www.maxp.online',
      'https://swan.maxp.online'
    ];

    for (const origin of allowedOrigins) {
      const result = await runCorsCheck(envConfig, origin);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(true);
    }
  });

  test('allows explicitly configured additional domains', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ADDITIONAL_ALLOWED_DOMAINS = 'custom-brand.com, preview.custom-brand.com';

    const envConfig = require('../../config/environment');
    const allowedOrigins = [
      'https://custom-brand.com',
      'https://www.custom-brand.com',
      'https://preview.custom-brand.com'
    ];

    for (const origin of allowedOrigins) {
      const result = await runCorsCheck(envConfig, origin);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(true);
    }
  });

  test('allows mobile Capacitor and localhost app origins in production', async () => {
    process.env.NODE_ENV = 'production';

    const envConfig = require('../../config/environment');
    const mobileOrigins = [
      'https://localhost',
      'capacitor://localhost',
      'http://localhost',
      'ionic://localhost'
    ];

    for (const origin of mobileOrigins) {
      const result = await runCorsCheck(envConfig, origin);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(true);
    }
  });
});
