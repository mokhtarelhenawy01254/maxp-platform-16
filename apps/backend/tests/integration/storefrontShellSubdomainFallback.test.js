const {
  isPublicStorefrontShellRequest,
} = require('../../middleware/globalSecurity');
const { inferSubdomainSlug } = require('../../middleware/subdomainMiddleware');

describe('Storefront shell subdomain fallback', () => {
  test('treats storefront shell requests on tenant-style hosts as public even without MAIN_DOMAIN', () => {
    const originalMainDomain = process.env.MAIN_DOMAIN;
    delete process.env.MAIN_DOMAIN;

    const req = {
      method: 'GET',
      originalUrl: '/shop',
      path: '/shop',
      headers: {
        host: 'swan.tenant-example.com',
        'x-subdomain': 'swan.tenant-example.com',
      },
    };

    expect(isPublicStorefrontShellRequest(req)).toBe(true);

    if (originalMainDomain === undefined) {
      delete process.env.MAIN_DOMAIN;
    } else {
      process.env.MAIN_DOMAIN = originalMainDomain;
    }
  });

  test('treats HEAD storefront shell requests on tenant-style hosts as public', () => {
    const req = {
      method: 'HEAD',
      originalUrl: '/shop',
      path: '/shop',
      headers: {
        host: 'swan.maxp.online',
        'x-subdomain': 'swan.maxp.online',
      },
    };

    expect(isPublicStorefrontShellRequest(req)).toBe(true);
  });

  test('infers the slug from tenant-style hosts when MAIN_DOMAIN is unset', () => {
    expect(inferSubdomainSlug('swan.tenant-example.com', undefined)).toBe('swan');
    expect(inferSubdomainSlug('www.tenant-example.com', undefined)).toBeNull();
    expect(inferSubdomainSlug('tenant-example.com', undefined)).toBeNull();
  });

  test('infers the slug from local dev wildcard hosts', () => {
    expect(inferSubdomainSlug('maxp.lvh.me', 'mokhtarelhenawy.online')).toBe('maxp');
    expect(inferSubdomainSlug('maxp.localhost', 'mokhtarelhenawy.online')).toBe('maxp');
  });
});
