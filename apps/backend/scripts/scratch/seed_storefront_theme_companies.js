const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getSharedPrismaClient } = require('./services/sharedDatabase');

const prisma = getSharedPrismaClient();

const COMPANY_FIXTURES = [
  {
    slug: 'maxp-minimal-demo',
    name: 'MaxP Minimal Demo',
    email: 'minimal-demo@maxp.local',
    currency: 'EGP',
    themeId: 'modern-minimal',
    description: 'Minimal storefront demo company for theme verification',
    heroTitle: 'Minimal Edit 2026',
  },
  {
    slug: 'maxp-luxe-demo',
    name: 'MaxP Luxe Demo',
    email: 'luxe-demo@maxp.local',
    currency: 'EGP',
    themeId: 'elegant-luxe',
    description: 'Luxe storefront demo company for theme verification',
    heroTitle: 'Luxe Capsule 2026',
  },
];

const CATEGORY_FIXTURES = [
  { name: 'New Arrivals', slug: 'new-arrivals' },
  { name: 'Best Sellers', slug: 'best-sellers' },
  { name: 'Accessories', slug: 'accessories' },
];

const PRODUCT_FIXTURES = [
  {
    name: 'Aura Everyday Tote',
    slug: 'aura-everyday-tote',
    sku: 'DEMO-TOTE-001',
    price: 1490,
    comparePrice: 1790,
    stock: 18,
    categorySlug: 'new-arrivals',
    mainImage:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&auto=format&fit=crop&q=80',
    description:
      'Structured everyday tote designed for storefront theme verification and catalog smoke tests.',
  },
  {
    name: 'Noir Statement Heels',
    slug: 'noir-statement-heels',
    sku: 'DEMO-HEEL-001',
    price: 2390,
    comparePrice: 2890,
    stock: 9,
    categorySlug: 'best-sellers',
    mainImage:
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1200&auto=format&fit=crop&q=80',
    description:
      'Event-ready heels used to validate PDP rendering, price presentation, and cart workflows.',
  },
  {
    name: 'Studio Silk Scarf',
    slug: 'studio-silk-scarf',
    sku: 'DEMO-SCARF-001',
    price: 890,
    comparePrice: 1090,
    stock: 24,
    categorySlug: 'accessories',
    mainImage:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&auto=format&fit=crop&q=80',
    description:
      'Premium scarf that gives the shop and cart pages enough variation for multi-theme validation.',
  },
];

const buildHomepageContent = (fixture) => ({
  format: 'storefront-theme-v1',
  settings: {
    themeId: fixture.themeId,
    storeName: fixture.name,
    description: fixture.description,
    designTokens: {
      typography: {
        bodyFont: '"Inter", sans-serif',
      },
    },
  },
  sections: [
    {
      id: 'hero',
      type: 'hero-banner',
      settings: {
        title: fixture.heroTitle,
        subtitle: fixture.description,
        ctaText: 'Shop Now',
      },
    },
    {
      id: 'featured-products',
      type: 'featured-products',
      settings: {
        title: 'Featured Picks',
        limit: 6,
      },
    },
    {
      id: 'newsletter',
      type: 'newsletter',
      settings: {
        title: 'Stay in the loop',
      },
    },
  ],
});

const ensureCompany = async (fixture) => {
  return prisma.company.upsert({
    where: { slug: fixture.slug },
    update: {
      name: fixture.name,
      email: fixture.email,
      currency: fixture.currency,
      isActive: true,
      settings: JSON.stringify({
        language: 'ar',
        currency: fixture.currency,
        description: fixture.description,
      }),
    },
    create: {
      name: fixture.name,
      slug: fixture.slug,
      email: fixture.email,
      currency: fixture.currency,
      isActive: true,
      settings: JSON.stringify({
        language: 'ar',
        currency: fixture.currency,
        description: fixture.description,
      }),
    },
  });
};

const ensureCategories = async (companyId) => {
  const categoryMap = new Map();

  for (const category of CATEGORY_FIXTURES) {
    const existing = await prisma.category.findFirst({
      where: {
        companyId,
        slug: category.slug,
      },
      select: { id: true, slug: true },
    });

    const record =
      existing ||
      (await prisma.category.create({
        data: {
          companyId,
          name: category.name,
          slug: category.slug,
          isActive: true,
        },
      }));

    categoryMap.set(category.slug, record.id);
  }

  return categoryMap;
};

const ensureProducts = async (companyId, categoryMap) => {
  for (const product of PRODUCT_FIXTURES) {
    const categoryId = categoryMap.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${product.categorySlug} for ${companyId}`);
    }

    const existing = await prisma.product.findFirst({
      where: {
        companyId,
        slug: product.slug,
      },
      select: { id: true },
    });

    const productData = {
      companyId,
      categoryId,
      name: product.name,
      slug: product.slug,
      sku: `${product.sku}-${companyId.slice(-4)}`,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice,
      stock: product.stock,
      isActive: true,
      isFeatured: true,
      source: 'manual',
      trackInventory: true,
      mainImage: product.mainImage,
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: productData,
      });
      continue;
    }

    await prisma.product.create({
      data: productData,
    });
  }
};

const ensureHomepageTemplate = async (companyId, fixture) => {
  const content = buildHomepageContent(fixture);
  const existing = await prisma.homepageTemplate.findFirst({
    where: {
      companyId,
      pageType: 'HOMEPAGE',
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.homepageTemplate.update({
      where: { id: existing.id },
      data: {
        name: `${fixture.name} Homepage`,
        description: fixture.description,
        slug: 'home',
        isActive: true,
        content,
        publishedContent: content,
        version: 1,
      },
    });
    return existing.id;
  }

  const created = await prisma.homepageTemplate.create({
    data: {
      companyId,
      name: `${fixture.name} Homepage`,
      description: fixture.description,
      slug: 'home',
      pageType: 'HOMEPAGE',
      isActive: true,
      content,
      publishedContent: content,
      version: 1,
    },
  });

  return created.id;
};

const ensureStorefrontSettings = async (company, fixture) => {
  return prisma.storefrontSettings.upsert({
    where: { companyId: company.id },
    update: {
      supportedLanguages: 'ar,en',
      quickViewEnabled: true,
      comparisonEnabled: false,
      wishlistEnabled: true,
      recentlyViewedEnabled: true,
      advancedFiltersEnabled: false,
      productCardStyle: fixture.themeId === 'elegant-luxe' ? 'editorial' : 'default',
      gridAddToCartIcon: fixture.themeId === 'elegant-luxe' ? 'cart' : 'plus',
      gridDiscountBanner: true,
      productPageShowCheckoutForm: true,
      designTokens: {
        themeId: fixture.themeId,
        storeName: fixture.name,
        description: fixture.description,
        heroTitle: fixture.heroTitle,
      },
    },
    create: {
      companyId: company.id,
      supportedLanguages: 'ar,en',
      quickViewEnabled: true,
      comparisonEnabled: false,
      wishlistEnabled: true,
      recentlyViewedEnabled: true,
      advancedFiltersEnabled: false,
      productCardStyle: fixture.themeId === 'elegant-luxe' ? 'editorial' : 'default',
      gridAddToCartIcon: fixture.themeId === 'elegant-luxe' ? 'cart' : 'plus',
      gridDiscountBanner: true,
      productPageShowCheckoutForm: true,
      designTokens: {
        themeId: fixture.themeId,
        storeName: fixture.name,
        description: fixture.description,
        heroTitle: fixture.heroTitle,
      },
    },
  });
};

const main = async () => {
  const results = [];

  for (const fixture of COMPANY_FIXTURES) {
    const company = await ensureCompany(fixture);
    await ensureStorefrontSettings(company, fixture);
    const categoryMap = await ensureCategories(company.id);
    await ensureProducts(company.id, categoryMap);
    const templateId = await ensureHomepageTemplate(company.id, fixture);

    results.push({
      companyId: company.id,
      slug: company.slug,
      themeId: fixture.themeId,
      templateId,
      previewUrl: `http://localhost:3000/store?companyId=${encodeURIComponent(company.slug)}`,
      subdomainUrl: `https://${company.slug}.mokhtarelhenawy.online`,
    });
  }

  console.log('Seeded storefront theme demo companies:');
  console.table(results);
};

main()
  .catch((error) => {
    console.error('Failed to seed storefront theme demo companies:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
