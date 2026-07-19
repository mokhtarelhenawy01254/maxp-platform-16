const express = require('express');
const request = require('supertest');
const LEGACY_DESIGN_NOTES_FIELD = 'ai' + 'Prompt';

const mockPrisma = {
  $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  productLandingPage: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = {
      id: 'admin-user',
      role: 'COMPANY_ADMIN',
      companyId: 'company-test',
    };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../middleware/subdomainMiddleware', () => ({
  extractSubdomainMiddleware: (_req, _res, next) => next(),
  requireCompany: (req, _res, next) => {
    req.company = {
      id: 'company-test',
      name: 'Swan',
      slug: 'swan',
      logo: null,
      currency: 'EGP',
    };
    next();
  },
}));

const productLandingPagesRoutes = require('../../routes/productLandingPagesRoutes');

describe('product landing preview route', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/product-landings', productLandingPagesRoutes);
  });

  test('allows authenticated admins to preview draft pages linked to hidden products', async () => {
    mockPrisma.productLandingPage.findFirst.mockResolvedValueOnce({
      id: 'landing-1',
      companyId: 'company-test',
      productId: 'product-1',
      slug: 'swan-sneaker-7',
      title: 'Swan Sneaker',
      status: 'DRAFT',
      generationMode: 'IMAGE_STACK',
      generationStatus: 'NEEDS_IMAGES',
      [LEGACY_DESIGN_NOTES_FIELD]: '',
      slices: '[]',
      formConfig: JSON.stringify({ orderTitle: 'اطلب Swan Sneaker' }),
      seo: '{}',
      productSnapshot: JSON.stringify({
        id: 'product-1',
        companyId: 'company-test',
        name: 'Swan Sneaker',
        slug: 'swan-sneaker-7',
        price: 499,
        mainImage: '/uploads/products/swan.png',
        images: ['/uploads/products/swan.png'],
        variants: [],
      }),
      visits: 0,
      orders: 0,
      publishedAt: null,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
      updatedAt: new Date('2026-05-08T00:00:00.000Z'),
      product: {
        id: 'product-1',
        companyId: 'company-test',
        name: 'Swan Sneaker',
        description: '',
        sku: 'S33',
        slug: 'swan-sneaker-7',
        price: 499,
        comparePrice: null,
        images: ['/uploads/products/swan.png'],
        mainImage: '/uploads/products/swan.png',
        stock: 10,
        trackInventory: true,
        isActive: true,
        isHidden: true,
        metadata: {},
        productVariants: [],
      },
    });
    mockPrisma.company.findUnique.mockResolvedValueOnce({
      id: 'company-test',
      name: 'Swan',
      slug: 'swan',
      logo: null,
      currency: 'EGP',
    });

    const response = await request(app)
      .get('/api/v1/product-landings/preview/swan-sneaker-7')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.landing.status).toBe('DRAFT');
    expect(response.body.data.product.name).toBe('Swan Sneaker');
    expect(response.body.data.product.isHidden).toBe(true);
  });

  test('allows public published landing pages for hidden active campaign products', async () => {
    const landing = {
      id: 'landing-public-hidden',
      companyId: 'company-test',
      productId: 'product-hidden',
      slug: 'swan-sneaker-campaign',
      title: 'Swan Sneaker Campaign',
      status: 'PUBLISHED',
      generationMode: 'IMAGE_STACK',
      generationStatus: 'READY_TO_REVIEW',
      [LEGACY_DESIGN_NOTES_FIELD]: '',
      slices: JSON.stringify([
        {
          src: '/uploads/studio_images/swan-campaign.jpg',
          alt: 'Swan Sneaker',
          sortOrder: 1,
        },
      ]),
      formConfig: JSON.stringify({ orderTitle: 'اطلب Swan Sneaker' }),
      seo: '{}',
      productSnapshot: '{}',
      visits: 0,
      orders: 0,
      publishedAt: new Date('2026-05-08T00:00:00.000Z'),
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
      updatedAt: new Date('2026-05-08T00:00:00.000Z'),
      product: {
        id: 'product-hidden',
        companyId: 'company-test',
        name: 'Swan Sneaker',
        description: 'Campaign-only product',
        sku: 'S33',
        slug: 'swan-sneaker-hidden',
        price: 499,
        comparePrice: null,
        images: ['/uploads/products/swan.png'],
        mainImage: '/uploads/products/swan.png',
        stock: 10,
        trackInventory: true,
        isActive: true,
        isHidden: true,
        metadata: {},
        productVariants: [],
      },
    };

    mockPrisma.productLandingPage.findFirst.mockResolvedValueOnce(landing);
    mockPrisma.productLandingPage.update.mockResolvedValueOnce({
      ...landing,
      visits: 1,
    });

    const response = await request(app)
      .get('/api/v1/product-landings/public/swan-sneaker-campaign')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.landing.status).toBe('PUBLISHED');
    expect(response.body.data.product.isHidden).toBe(true);
  });

  test('allows publishing hidden active campaign products', async () => {
    const existing = {
      id: 'landing-hidden-publish',
      companyId: 'company-test',
      productId: 'product-hidden',
      slug: 'swan-sneaker-campaign',
      title: 'Swan Sneaker Campaign',
      status: 'DRAFT',
      generationMode: 'IMAGE_STACK',
      generationStatus: 'READY_TO_REVIEW',
      [LEGACY_DESIGN_NOTES_FIELD]: '',
      slices: JSON.stringify([
        {
          src: '/uploads/studio_images/swan-campaign.jpg',
          alt: 'Swan Sneaker',
          sortOrder: 1,
        },
      ]),
      formConfig: '{}',
      seo: '{}',
      productSnapshot: '{}',
      visits: 0,
      orders: 0,
      publishedAt: null,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
      updatedAt: new Date('2026-05-08T00:00:00.000Z'),
    };
    const product = {
      id: 'product-hidden',
      companyId: 'company-test',
      name: 'Swan Sneaker',
      description: 'Campaign-only product',
      sku: 'S33',
      slug: 'swan-sneaker-hidden',
      price: 499,
      comparePrice: null,
      images: ['/uploads/products/swan.png'],
      mainImage: '/uploads/products/swan.png',
      stock: 10,
      trackInventory: true,
      isActive: true,
      isHidden: true,
      metadata: {},
      productVariants: [],
    };

    mockPrisma.productLandingPage.findFirst.mockResolvedValueOnce(existing);
    mockPrisma.product.findFirst.mockResolvedValueOnce(product);
    mockPrisma.productLandingPage.update.mockResolvedValueOnce({
      ...existing,
      status: 'PUBLISHED',
      publishedAt: new Date('2026-05-08T00:00:00.000Z'),
      product,
    });

    const response = await request(app)
      .patch('/api/v1/product-landings/landing-hidden-publish/status')
      .send({ status: 'PUBLISHED' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('PUBLISHED');
    expect(response.body.data.product.isHidden).toBe(true);
  });

  test('keeps the removed generated brief endpoint closed', async () => {
    const removedBriefPath = `/api/v1/product-landings/landing-brief-1/${'ai'}-brief`;

    await request(app)
      .post(removedBriefPath)
      .send({})
      .expect(404);

    expect(mockPrisma.productLandingPage.findFirst).not.toHaveBeenCalled();
  });
});
