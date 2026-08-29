jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/amazonCreatorsApiClient', () => ({
  getItems: jest.fn(),
  normalizeCreatorsItem: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getItems, normalizeCreatorsItem } = require('../../services/amazonCreatorsApiClient');
const service = require('../../services/amazonAffiliateService');

describe('resolveAsinFromUrl', () => {
  test('accepts a raw ASIN', () => {
    expect(service.resolveAsinFromUrl('B0DLFMFBJW')).toBe('B0DLFMFBJW');
  });

  test('accepts an ISBN', () => {
    expect(service.resolveAsinFromUrl('9780134685991')).toBe('9780134685991');
  });

  test('parses /dp/ URLs (any marketplace, with query/hash)', () => {
    expect(service.resolveAsinFromUrl('https://www.amazon.com/dp/B0DLFMFBJW?tag=x-20')).toBe('B0DLFMFBJW');
    expect(service.resolveAsinFromUrl('https://www.amazon.eg/dp/B0DLFMFBJW/ref=sr_1_1')).toBe('B0DLFMFBJW');
    expect(service.resolveAsinFromUrl('https://www.amazon.sa/dp/B0DLFMFBJW#anchor')).toBe('B0DLFMFBJW');
  });

  test('parses gp/product and /product paths', () => {
    expect(service.resolveAsinFromUrl('https://www.amazon.com/gp/product/B0DLFMFBJW/ref=as_li_tl')).toBe('B0DLFMFBJW');
    expect(service.resolveAsinFromUrl('https://www.amazon.com/product/B0DLFMFBJW')).toBe('B0DLFMFBJW');
  });

  test('returns null for garbage / short links / empty', () => {
    expect(service.resolveAsinFromUrl('https://amzn.eu/xyz123')).toBe(null);
    expect(service.resolveAsinFromUrl('hello world')).toBe(null);
    expect(service.resolveAsinFromUrl('')).toBe(null);
    expect(service.resolveAsinFromUrl(null)).toBe(null);
  });
});

describe('normalizeMarketplace (SSRF guard)', () => {
  test('allows known Amazon domains', () => {
    expect(service.normalizeMarketplace('amazon.eg')).toBe('amazon.eg');
    expect(service.normalizeMarketplace('www.amazon.com')).toBe('www.amazon.com');
    expect(service.normalizeMarketplace('amazon.sa')).toBe('amazon.sa');
  });

  test('strips protocol / path / www and still resolves', () => {
    expect(service.normalizeMarketplace('https://amazon.eg/dp/B0X')).toBe('amazon.eg');
    expect(service.normalizeMarketplace('AMAZON.EG')).toBe('amazon.eg');
  });

  test('rejects internal / arbitrary hosts -> default', () => {
    expect(service.normalizeMarketplace('169.254.169.254')).toBe('www.amazon.com');
    expect(service.normalizeMarketplace('evil.example.com')).toBe('www.amazon.com');
    expect(service.normalizeMarketplace('localhost:3000')).toBe('www.amazon.com');
    expect(service.normalizeMarketplace('')).toBe('www.amazon.com');
    expect(service.normalizeMarketplace(null)).toBe('www.amazon.com');
  });
});

describe('resolveMarketplaceForCountry / buildAffiliateUrl', () => {
  test('maps country codes to marketplace domains', () => {
    expect(service.resolveMarketplaceForCountry('EG')).toBe('amazon.eg');
    expect(service.resolveMarketplaceForCountry('SA')).toBe('amazon.sa');
    expect(service.resolveMarketplaceForCountry('AE')).toBe('amazon.ae');
    expect(service.resolveMarketplaceForCountry('US')).toBe('www.amazon.com');
    expect(service.resolveMarketplaceForCountry('GB')).toBe('amazon.co.uk');
    expect(service.resolveMarketplaceForCountry('XX')).toBe('www.amazon.com');
    expect(service.resolveMarketplaceForCountry(null)).toBe('www.amazon.com');
  });

  test('builds affiliate URL with tag', () => {
    const url = service.buildAffiliateUrl({ asin: 'B0DLFMFBJW', associateTag: 'mytag-20', marketplace: 'amazon.eg' });
    expect(url).toBe('https://amazon.eg/dp/B0DLFMFBJW?tag=mytag-20');
  });

  test('builds plain URL without tag', () => {
    const url = service.buildAffiliateUrl({ asin: 'B0DLFMFBJW', associateTag: null, marketplace: 'amazon.eg' });
    expect(url).toBe('https://amazon.eg/dp/B0DLFMFBJW');
  });

  test('geotargets by country when no marketplace given', () => {
    const url = service.buildAffiliateUrl({ asin: 'B0DLFMFBJW', associateTag: 't-20', country: 'SA' });
    expect(url).toBe('https://amazon.sa/dp/B0DLFMFBJW?tag=t-20');
  });

  test('returns null without an asin', () => {
    expect(service.buildAffiliateUrl({ asin: null, associateTag: 't-20' })).toBe(null);
  });
});

describe('parseOgMeta', () => {
  test('parses og meta tags (property-first order)', () => {
    const html = `<html><head>
      <meta property="og:title" content="Sony Headphones">
      <meta property="og:image" content="https://m.media-amazon.com/images/x.jpg">
      <meta property="og:price:amount" content="199.99">
      <meta property="og:price:currency" content="EGP">
      <meta property="og:availability" content="In Stock">
    </head></html>`;
    const data = service.parseOgMeta(html);
    expect(data.name).toBe('Sony Headphones');
    expect(data.price).toBe(199.99);
    expect(data.currency).toBe('EGP');
    expect(data.inStock).toBe(true);
    expect(data.imageUrl).toContain('m.media-amazon.com');
  });

  test('parses meta tags with reversed attribute order', () => {
    const html = `<meta content="Reversed Title" property="og:title">`;
    const data = service.parseOgMeta(html);
    expect(data.name).toBe('Reversed Title');
  });

  test('returns null when nothing recognizable', () => {
    expect(service.parseOgMeta('<html><head><title>nothing</title></head></html>')).toBe(null);
    expect(service.parseOgMeta(null)).toBe(null);
  });
});

describe('importProduct', () => {
  const prisma = {
    amazonAffiliateSettings: { findUnique: jest.fn() },
    product: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    amazonAffiliateProduct: { upsert: jest.fn() },
  };

  beforeEach(() => {
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.clearAllMocks();
  });

  test('creates a product + link from manual data', async () => {
    prisma.amazonAffiliateSettings.findUnique.mockResolvedValue(null);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockImplementation(async (args) => ({ id: 'p1', ...args.data }));
    prisma.amazonAffiliateProduct.upsert.mockResolvedValue({});

    const result = await service.importProduct({
      companyId: 'c1',
      input: 'https://www.amazon.eg/dp/B0DLFMFBJW',
      manualData: { name: 'Test Product', price: 100 },
    });

    expect(result.ok).toBe(true);
    expect(result.asin).toBe('B0DLFMFBJW');
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        companyId: 'c1',
        source: 'amazon',
        externalId: 'B0DLFMFBJW',
        sku: 'AMZN-B0DLFMFBJW',
        trackInventory: false,
      }),
    }));
    expect(prisma.amazonAffiliateProduct.upsert).toHaveBeenCalled();
  });

  test('updates an existing product (idempotent, no duplicate)', async () => {
    prisma.amazonAffiliateSettings.findUnique.mockResolvedValue(null);
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Old', price: 10 });
    prisma.product.update.mockImplementation(async (args) => ({ id: 'p1', ...args.data }));
    prisma.amazonAffiliateProduct.upsert.mockResolvedValue({});

    const result = await service.importProduct({ companyId: 'c1', input: 'B0DLFMFBJW', manualData: { name: 'New', price: 200 } });
    expect(result.ok).toBe(true);
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalled();
  });

  test('falls back to Creators API when credentials exist', async () => {
    prisma.amazonAffiliateSettings.findUnique.mockResolvedValue({
      marketplace: 'amazon.eg', associateTag: 't-20',
      credentialId: 'cid', credentialSecret: 'sec', credentialVersion: '3.2',
    });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockImplementation(async (args) => ({ id: 'p1', ...args.data }));
    prisma.amazonAffiliateProduct.upsert.mockResolvedValue({});
    getItems.mockResolvedValue({ asin: 'B0DLFMFBJW' });
    normalizeCreatorsItem.mockReturnValue({ name: 'From API', price: 99, currency: 'EGP', imageUrl: 'img', inStock: true, dataSource: 'creators' });

    const result = await service.importProduct({ companyId: 'c1', input: 'B0DLFMFBJW' });
    expect(result.ok).toBe(true);
    expect(getItems).toHaveBeenCalled();
    expect(normalizeCreatorsItem).toHaveBeenCalled();
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'From API', price: 99 }),
    }));
  });

  test('returns INVALID_ASIN for garbage input', async () => {
    const result = await service.importProduct({ companyId: 'c1', input: 'amzn.eu/xyz' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_ASIN');
  });
});

describe('syncProducts', () => {
  test('syncs links and reports summary', async () => {
    const prisma = {
      amazonAffiliateSettings: { findUnique: jest.fn().mockResolvedValue({ marketplace: 'amazon.eg', associateTag: 't-20' }) },
      amazonAffiliateProduct: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'l1', productId: 'p1', asin: 'B0AAA', marketplace: 'amazon.eg', lastPriceCurrency: 'EGP' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      amazonImportJob: {
        create: jest.fn().mockResolvedValue({ id: 'j1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      product: { update: jest.fn().mockResolvedValue({}) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.spyOn(service, 'fetchAmazonProductData').mockResolvedValue({ name: 'X', price: 50, currency: 'EGP', imageUrl: null, inStock: true, dataSource: 'og' });

    const result = await service.syncProducts('c1');
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.status).toBe('SUCCESS');
    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ price: 50 }),
    }));
  });

  test('marks failed links when no data', async () => {
    const prisma = {
      amazonAffiliateSettings: { findUnique: jest.fn().mockResolvedValue(null) },
      amazonAffiliateProduct: {
        findMany: jest.fn().mockResolvedValue([{ id: 'l1', productId: 'p1', asin: 'B0BBB', marketplace: 'amazon.eg' }]),
        update: jest.fn().mockResolvedValue({}),
      },
      amazonImportJob: { create: jest.fn().mockResolvedValue({ id: 'j1' }), update: jest.fn().mockResolvedValue({}) },
      product: { update: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.spyOn(service, 'fetchAmazonProductData').mockResolvedValue(null);

    const result = await service.syncProducts('c1');
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.status).toBe('FAILED');
    expect(prisma.amazonAffiliateProduct.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'ERROR', syncError: 'NO_DATA' }),
    }));
  });
});

describe('listProducts / deleteProduct', () => {
  test('listProducts returns product snapshots', async () => {
    const prisma = {
      amazonAffiliateProduct: { findMany: jest.fn().mockResolvedValue([{ id: 'l1', productId: 'p1', asin: 'B0AAA', lastPrice: 10, marketplace: 'amazon.eg' }]) },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'X' }]) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const rows = await service.listProducts('c1');
    expect(rows).toHaveLength(1);
    expect(rows[0].product.name).toBe('X');
    expect(rows[0].lastPrice).toBe(10);
  });

  test('deleteProduct soft-deletes the product and removes the link', async () => {
    const prisma = {
      amazonAffiliateProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: 'l1', productId: 'p1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      product: { update: jest.fn().mockResolvedValue({}) },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const result = await service.deleteProduct('c1', 'l1');
    expect(result.ok).toBe(true);
    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }));
  });

  test('deleteProduct returns NOT_FOUND', async () => {
    const prisma = {
      amazonAffiliateProduct: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
      product: { update: jest.fn() },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const result = await service.deleteProduct('c1', 'missing');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('NOT_FOUND');
  });
});