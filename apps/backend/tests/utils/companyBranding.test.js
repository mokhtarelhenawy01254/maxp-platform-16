/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.2) ΓÇö regression tests:
 * getCompanyBranding must resolve name + domain from DB (customDomain ΓåÆ
 * website host ΓåÆ slug.platformDomain) and never fall back to a hardcoded brand
 * ("Mokhtar Elhenawy") in a multi-tenant SaaS.
 */
const mockCompanyFindUnique = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    company: { findUnique: mockCompanyFindUnique },
  })),
}));

const { getCompanyBranding, clearBrandingCache } = require('../../utils/companyBranding');

describe('getCompanyBranding (┬º2.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearBrandingCache();
    delete process.env.PLATFORM_BASE_DOMAIN;
    delete process.env.MAIN_DOMAIN;
  });

  test('uses customDomain when present (highest priority)', async () => {
    mockCompanyFindUnique.mockResolvedValue({
      name: 'Acme Store', slug: 'acme', website: 'https://acme.example.com', customDomain: 'shop.acme.com',
    });
    const result = await getCompanyBranding('c1');
    expect(result).toEqual({ name: 'Acme Store', domain: 'shop.acme.com' });
  });

  test('extracts the host from a website URL (https://) when no customDomain', async () => {
    mockCompanyFindUnique.mockResolvedValue({
      name: 'Acme', slug: 'acme', website: 'https://acme.example.com/path?x=1', customDomain: null,
    });
    const result = await getCompanyBranding('c1');
    expect(result.domain).toBe('acme.example.com');
  });

  test('falls back to slug.platformDomain when neither customDomain nor website', async () => {
    mockCompanyFindUnique.mockResolvedValue({ name: 'Acme', slug: 'acme', website: null, customDomain: null });
    const result = await getCompanyBranding('c1');
    expect(result).toEqual({ name: 'Acme', domain: 'acme.maxp.online' });
  });

  test('company row missing (null) ΓåÆ neutral fallback, does not throw', async () => {
    mockCompanyFindUnique.mockResolvedValue(null);
    const result = await getCompanyBranding('c1');
    expect(result).toEqual({ name: 'Store', domain: 'maxp.online' });
  });

  test('no companyId ΓåÆ neutral fallback, does not touch DB', async () => {
    const result = await getCompanyBranding(null);
    expect(result).toEqual({ name: 'Store', domain: 'maxp.online' });
    expect(mockCompanyFindUnique).not.toHaveBeenCalled();
  });

  test('DB error ΓåÆ neutral fallback, does not throw', async () => {
    mockCompanyFindUnique.mockRejectedValue(new Error('db down'));
    const result = await getCompanyBranding('c1');
    expect(result).toEqual({ name: 'Store', domain: 'maxp.online' });
  });

  test('≡ƒö┤ regression: neutral/slug-only companies never get a hardcoded brand injected', async () => {
    // Companies whose DB data contains NO "mokhtar" ΓÇö the resolver must not
    // inject the hardcoded brand anywhere (footer/domain fallbacks).
    const companies = [
      { name: 'Store', slug: 'store', website: null, customDomain: null },            // ΓåÆ store.maxp.online
      { name: 'Acme', slug: 'acme', website: null, customDomain: null },              // ΓåÆ acme.maxp.online
      { name: 'Acme', slug: 'acme', website: 'https://acme.example.com', customDomain: null }, // ΓåÆ acme.example.com
      null,                                                                           // ΓåÆ maxp.online (neutral)
    ];
    for (const company of companies) {
      mockCompanyFindUnique.mockResolvedValue(company);
      const result = await getCompanyBranding('cid-' + companies.indexOf(company));
      const json = JSON.stringify(result).toLowerCase();
      expect(json).not.toContain('mokhtar');
      expect(json).not.toContain('mokhtarelhenawy');
    }
  });
});
