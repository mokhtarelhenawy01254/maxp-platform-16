const magicLinkService = require('../../services/customerMagicLinkService');

describe('customerMagicLinkService', () => {
  const companyId = 'company-1';
  const customerId = 'customer-1';

  const create = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();
  const prisma = {
    customerMagicLink: { create, findFirst, update },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createMagicLink stores a random token with an expiry', async () => {
    const link = { id: 'link-1', token: 'abc', expiresAt: new Date(Date.now() + 100000) };
    create.mockResolvedValue(link);

    const result = await magicLinkService.createMagicLink(prisma, { companyId, customerId, phone: '01001234567' });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId,
        customerId,
        phone: '01001234567',
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    // التوكن مولّد عشوائياً (64 hex حرف) ومخزّن في DB — والـ service بيرجّع نفس التوكن
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.id).toBe('link-1');
  });

  test('validateMagicLink returns null for unknown token', async () => {
    findFirst.mockResolvedValue(null);
    const result = await magicLinkService.validateMagicLink(prisma, { token: 'nope', phone: '0100', companyId });
    expect(result).toBeNull();
  });

  test('validateMagicLink returns null when phone does not match', async () => {
    findFirst.mockResolvedValue({ id: 'link-1', phone: '01001234567', expiresAt: new Date(Date.now() + 100000), companyId });
    const result = await magicLinkService.validateMagicLink(prisma, { token: 'abc', phone: '01119999999', companyId });
    expect(result).toBeNull();
  });

  test('validateMagicLink returns null when expired', async () => {
    findFirst.mockResolvedValue({ id: 'link-1', phone: '01001234567', expiresAt: new Date(Date.now() - 1000), companyId });
    const result = await magicLinkService.validateMagicLink(prisma, { token: 'abc', phone: '01001234567', companyId });
    expect(result).toBeNull();
  });

  test('validateMagicLink marks usedAt on first successful use and returns the link', async () => {
    const link = { id: 'link-1', phone: '01001234567', expiresAt: new Date(Date.now() + 100000), usedAt: null, companyId };
    findFirst.mockResolvedValue(link);
    update.mockResolvedValue({ ...link, usedAt: new Date() });

    const result = await magicLinkService.validateMagicLink(prisma, { token: 'abc', phone: '01001234567', companyId });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(result).toEqual(link);
  });

  test('buildMagicLinkUrl uses company customDomain when set', () => {
    const url = magicLinkService.buildMagicLinkUrl({ id: 'c1', slug: 'swan', customDomain: 'shop.example.com' }, 'tok123', '01001234567');
    expect(url).toContain('https://shop.example.com/api/v1/public/customers/magic-login');
    expect(url).toContain('token=tok123');
    expect(url).toContain('phone=01001234567');
  });

  test('buildMagicLinkUrl uses slug subdomain when no customDomain', () => {
    const url = magicLinkService.buildMagicLinkUrl({ id: 'c1', slug: 'swan', customDomain: null }, 'tok123', '01001234567');
    expect(url).toContain('https://swan.maxp.online/api/v1/public/customers/magic-login');
  });
});
