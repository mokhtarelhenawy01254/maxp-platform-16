const {
  buildPresentationResponse,
  findConvertedPresentationBySlug,
  findUniquePresentationSlug,
  slugify,
} = require('../../utils/presentationConversion');

describe('presentationConversion slugify', () => {
  test('slugifies latin text', () => {
    expect(slugify('My Product!')).toBe('my-product');
  });

  test('keeps Arabic characters', () => {
    expect(slugify(' ┘à┘å╪¬╪¼ ╪¬╪¼╪▒┘è╪¿┘è ')).toBe('┘à┘å╪¬╪¼-╪¬╪¼╪▒┘è╪¿┘è');
  });

  test('collapses multiple dashes and strips leading/trailing dashes', () => {
    expect(slugify('--Hello   World--')).toBe('hello-world');
  });

  test('returns empty string for falsy input', () => {
    expect(slugify(null)).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('presentationConversion findUniquePresentationSlug', () => {
  const mockPrisma = {
    productPresentation: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns the base slug when it is free', async () => {
    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);

    const result = await findUniquePresentationSlug(mockPrisma, 'product-1', 'My Product');

    expect(result).toBe('my-product');
    expect(mockPrisma.productPresentation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-1', slug: 'my-product' },
      }),
    );
  });

  test('appends -2 suffix when the base slug is taken', async () => {
    mockPrisma.productPresentation.findFirst
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce(null);

    const result = await findUniquePresentationSlug(mockPrisma, 'product-1', 'my-product');

    expect(result).toBe('my-product-2');
  });

  test('keeps incrementing the suffix until a free slug is found', async () => {
    mockPrisma.productPresentation.findFirst
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce({ id: 'existing-2' })
      .mockResolvedValueOnce(null);

    const result = await findUniquePresentationSlug(mockPrisma, 'product-1', 'my-product');

    expect(result).toBe('my-product-3');
  });

  test('returns empty string when no slug can be generated', async () => {
    const result = await findUniquePresentationSlug(mockPrisma, 'product-1', '!!!');

    expect(result).toBe('');
  });
});

describe('presentationConversion buildPresentationResponse', () => {
  test('parses the images JSON string', () => {
    const result = buildPresentationResponse({
      id: 'pres-1',
      images: '["/uploads/a.jpg","/uploads/b.jpg"]',
      name: 'Pres',
    });

    expect(result.images).toEqual(['/uploads/a.jpg', '/uploads/b.jpg']);
    expect(result.id).toBe('pres-1');
  });

  test('returns empty images array when images is null', () => {
    const result = buildPresentationResponse({ id: 'pres-2', images: null });

    expect(result.images).toEqual([]);
  });
});

describe('presentationConversion findConvertedPresentationBySlug', () => {
  const buildMetadata = (overrides = {}) =>
    JSON.stringify({
      convertedFromProductId: 'src-1',
      convertedFromSku: 'SKU-1',
      convertedAt: '2026-08-11T00:00:00.000Z',
      ...overrides,
    });

  const mockPrisma = () => ({
    product: { findFirst: jest.fn() },
    productPresentation: { findMany: jest.fn() },
  });

  test('returns null when no deleted source product matches and no presentation references the slug', async () => {
    const prisma = mockPrisma();
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.productPresentation.findMany.mockResolvedValue([]);

    const result = await findConvertedPresentationBySlug(prisma, 'company-1', 'old-slug');

    expect(result).toBeNull();
    expect(prisma.productPresentation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { metadata: { contains: 'old-slug' } },
          ]),
        }),
      }),
    );
  });

  test('returns the presentation + target product when the source is found by slug', async () => {
    const prisma = mockPrisma();
    prisma.product.findFirst
      .mockResolvedValueOnce({ id: 'src-1', slug: 'old-slug', sku: 'SKU-1' })
      .mockResolvedValueOnce({ id: 'tgt-1', slug: 'tgt-slug' });
    prisma.productPresentation.findMany.mockResolvedValue([
      { id: 'pres-1', slug: 'pres-slug', productId: 'tgt-1', metadata: buildMetadata() },
    ]);

    const result = await findConvertedPresentationBySlug(prisma, 'company-1', 'old-slug');

    expect(result).not.toBeNull();
    expect(result.targetProduct.slug).toBe('tgt-slug');
    expect(result.presentation.slug).toBe('pres-slug');
  });

  test('matches the convertedFromSku directly when the slug is a legacy SKU', async () => {
    const prisma = mockPrisma();
    prisma.product.findFirst.mockResolvedValueOnce(null);
    prisma.productPresentation.findMany.mockResolvedValue([
      {
        id: 'pres-2',
        slug: 'p2',
        productId: 'tgt-2',
        metadata: buildMetadata({ convertedFromProductId: 'zzz', convertedFromSku: 'sw33-1' }),
      },
    ]);
    prisma.product.findFirst.mockResolvedValueOnce({ id: 'tgt-2', slug: 'tgt-2-slug' });

    const result = await findConvertedPresentationBySlug(prisma, 'company-1', 'sw33-1');

    expect(result).not.toBeNull();
    expect(result.targetProduct.slug).toBe('tgt-2-slug');
    expect(result.presentation.slug).toBe('p2');
  });

  test('returns null when the target product is gone or deleted', async () => {
    const prisma = mockPrisma();
    prisma.product.findFirst
      .mockResolvedValueOnce({ id: 'src-1', slug: 'old-slug', sku: null })
      .mockResolvedValueOnce(null);
    prisma.productPresentation.findMany.mockResolvedValue([
      {
        id: 'pres-3',
        slug: 'p3',
        productId: 'tgt-3',
        metadata: buildMetadata({ convertedFromSku: null }),
      },
    ]);

    const result = await findConvertedPresentationBySlug(prisma, 'company-1', 'old-slug');

    expect(result).toBeNull();
  });

  test('returns null for missing arguments', async () => {
    const prisma = mockPrisma();
    expect(await findConvertedPresentationBySlug(prisma, null, 'old-slug')).toBeNull();
    expect(await findConvertedPresentationBySlug(prisma, 'company-1', '')).toBeNull();
    expect(await findConvertedPresentationBySlug(null, 'company-1', 'old-slug')).toBeNull();
  });
});
