const express = require('express');
const request = require('supertest');
const path = require('path');
const jwt = require('jsonwebtoken');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.local'),
  quiet: true,
});

let mockOrderSequence = 0;

jest.mock('../../services/socketService', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  })),
}));

jest.mock('../../services/orderService', () => ({
  getDuplicateSettings: jest.fn().mockResolvedValue(null),
  findDuplicateOrder: jest.fn().mockResolvedValue(null),
  generateOrderNumber: jest.fn().mockImplementation(async () => {
    mockOrderSequence += 1;
    return `ORD-INT-${Date.now()}-${mockOrderSequence}`;
  }),
}));

jest.mock('../../services/walletService', () => ({
  getWalletByCustomer: jest.fn(),
}));

jest.mock('../../middleware/affiliateTracking', () => ({
  trackAffiliateReferral: (req, res, next) => next(),
  linkOrderToAffiliate: jest.fn(),
}));

jest.mock('../../services/affiliateService', () => ({
  trackReferral: jest.fn(),
}));

jest.mock('../../services/commissionService', () => ({
  calculateOrderCommissions: jest.fn(),
}));

jest.mock('../../services/dropshippingService', () => ({
  routeOrderToMerchant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/email/EmailService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../services/internalSyncService', () => ({
  pushOrderToProvider: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendOrderCreatedNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../services/orderConfirmationService', () => ({
  autoAssignOnCreation: jest.fn().mockResolvedValue(undefined),
}));

const {
  getSharedPrismaClientAsync,
  closeSharedDatabase,
} = require('../../services/sharedDatabase');
const { globalSecurity } = require('../../middleware/globalSecurity');
const { sanitizeRequest } = require('../../middleware/securityEnhancements');
const { sanitizeInput } = require('../../middleware/inputValidation');
const publicStorefrontRoutes = require('../../routes/publicStorefrontRoutes');
const publicProductsRoutes = require('../../routes/publicProductsRoutes');
const publicOrdersRoutes = require('../../routes/publicOrdersRoutes');
const publicAnalyticsRoutes = require('../../routes/publicAnalyticsRoutes');
const analyticsRoutes = require('../../routes/analyticsRoutes');
const shippingZoneRoutes = require('../../routes/shippingZoneRoutes');
const healthRoute = require('../../routes/healthRoute');
const geolocationRoutes = require('../../routes/geolocation');

describe('Storefront public routes', () => {
  let app;
  let prisma;
  let company;
  let quantityOffersApp;
  let conversionSuiteApp;
  let createdQuantityOffersApp = false;
  let createdConversionSuiteApp = false;
  let quantityOffersInstallation;
  let conversionSuiteInstallation;
  let category;
  let alphaProduct;
  let betaProduct;
  let alphaVariant;
  let betaVariant;
  let homepageTemplate;
  let storefrontSettings;
  let shippingZone;
  let adminUser;
  let token;

  beforeAll(async () => {
    prisma = await getSharedPrismaClientAsync();

    app = express();
    app.use(express.json());
    app.use(globalSecurity);
    app.use(sanitizeRequest);
    app.use(sanitizeInput);
    app.use('/api/v1/public/storefront', publicStorefrontRoutes);
    app.use('/api/v1/public/products', publicProductsRoutes);
    app.use('/api/v1/public/orders', publicOrdersRoutes);
    app.use('/api/v1/public/analytics', publicAnalyticsRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);
    app.use('/api/v1/shipping-zones', shippingZoneRoutes);
    app.use('/api/v1/health', healthRoute);
    app.use('/api/geolocation', geolocationRoutes);

    const unique = `${Date.now()}-${Math.round(Math.random() * 10000)}`;

    company = await prisma.company.create({
      data: {
        name: 'Storefront Public Test',
        email: `storefront-public-${unique}@test.local`,
        slug: `storefront-public-${unique}`,
        currency: 'EGP',
        settings: JSON.stringify({
          description: 'Integration test storefront company',
        }),
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        id: `storefront-public-admin-${unique}`,
        email: `storefront-public-admin-${unique}@test.local`,
        password: 'test-password',
        firstName: 'Storefront',
        lastName: 'Admin',
        role: 'MANAGER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true,
        availability: 'available',
        timezone: 'Africa/Cairo',
      },
    });

    await prisma.userCompany.create({
      data: {
        userId: adminUser.id,
        companyId: company.id,
        role: 'MANAGER',
        isActive: true,
        isDefault: true,
      },
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'maxp-super-secret-jwt-key-2026';
    process.env.JWT_SECRET = JWT_SECRET;
    token = jwt.sign(
      {
        userId: adminUser.id,
        companyId: company.id,
        role: 'MANAGER',
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    storefrontSettings = await prisma.storefrontSettings.create({
      data: {
        companyId: company.id,
        supportedLanguages: 'ar,en',
        quickViewEnabled: true,
        advancedFiltersEnabled: true,
        productCardStyle: 'editorial',
        gridAddToCartIcon: 'cart',
        gridDiscountBanner: true,
        designTokens: {
          themeId: 'elegant-luxe',
          storeName: 'Storefront Public Test',
          description: 'Integration test storefront company',
        },
      },
    });

    homepageTemplate = await prisma.homepageTemplate.create({
      data: {
        companyId: company.id,
        name: 'Storefront Public Template',
        pageType: 'HOMEPAGE',
        isActive: true,
        content: {
          format: 'storefront-theme-v1',
          pages: {
            shop: { sections: ['filters-sidebar', 'product-grid'] },
            pdp: { sections: ['product-gallery', 'product-info', 'reviews'] },
            checkout: { sections: ['checkout-form', 'payment'] },
          },
          settings: {
            themeId: 'elegant-luxe',
            designTokens: {
              colors: {
                primary: '#111827',
                accent: '#f97316',
              },
              typography: {
                headingFont: "'Inter', sans-serif",
              },
              heroTitle: 'Integration Hero',
            },
          },
        },
        publishedContent: {
          format: 'storefront-theme-v1',
          pages: {
            shop: { sections: ['filters-sidebar', 'product-grid'] },
            pdp: { sections: ['product-gallery', 'product-info', 'reviews'] },
            checkout: { sections: ['checkout-form', 'payment'] },
          },
          settings: {
            themeId: 'elegant-luxe',
            designTokens: {
              colors: {
                primary: '#111827',
                accent: '#f97316',
              },
              typography: {
                headingFont: "'Inter', sans-serif",
              },
              heroTitle: 'Integration Hero',
            },
          },
        },
      },
    });

    category = await prisma.category.create({
      data: {
        name: 'Integration Accessories',
        slug: `integration-accessories-${unique}`,
        companyId: company.id,
      },
    });

    alphaProduct = await prisma.product.create({
      data: {
        name: 'Alpha Scarf',
        slug: `alpha-scarf-${unique}`,
        description: 'Primary product for storefront public route tests.',
        price: 890,
        comparePrice: 1090,
        stock: 10,
        trackInventory: true,
        companyId: company.id,
        categoryId: category.id,
        images: JSON.stringify(['https://example.com/alpha-scarf.jpg', null]),
        isActive: true,
        isHidden: false,
      },
    });

    alphaVariant = await prisma.productVariant.create({
      data: {
        productId: alphaProduct.id,
        name: 'Blue / M',
        sku: `ALPHA-BLUE-M-${unique}`,
        price: 990,
        comparePrice: 1090,
        stock: 7,
        trackInventory: true,
        metadata: JSON.stringify({
          image: 'https://example.com/alpha-scarf-blue.jpg',
          attributeValues: {
            color: 'Blue',
            size: 'M',
          },
        }),
        isActive: true,
        sortOrder: 0,
      },
    });

    betaProduct = await prisma.product.create({
      data: {
        name: 'Beta Tote',
        slug: `beta-tote-${unique}`,
        description: 'Secondary product for sorting and mainImage fallback.',
        price: 1490,
        companyId: company.id,
        categoryId: category.id,
        mainImage: 'https://example.com/beta-tote.jpg',
        isActive: true,
        isHidden: false,
      },
    });

    betaVariant = await prisma.productVariant.create({
      data: {
        productId: betaProduct.id,
        name: 'Black / L',
        sku: `BETA-BLACK-L-${unique}`,
        price: 1590,
        stock: 4,
        trackInventory: true,
        metadata: null,
        isActive: true,
        sortOrder: 0,
      },
    });

    shippingZone = await prisma.shippingZone.create({
      data: {
        companyId: company.id,
        name: 'Cairo Express',
        governorates: JSON.stringify(['القاهرة']),
        price: 75,
        deliveryTime: '2-3 days',
        isActive: true,
      },
    });

    quantityOffersApp = await prisma.marketplaceApp.findUnique({
      where: { slug: 'quantity-offers-pro' },
    });

    if (!quantityOffersApp) {
      createdQuantityOffersApp = true;
      quantityOffersApp = await prisma.marketplaceApp.create({
        data: {
          slug: 'quantity-offers-pro',
          name: 'Quantity Offers Pro',
          description: 'Integration test quantity offers app.',
          monthlyPrice: 0,
          yearlyPrice: 0,
          category: 'ecommerce',
          isActive: true,
          isPublic: true,
          icon: '📦',
        },
      });
    }

    conversionSuiteApp = await prisma.marketplaceApp.findUnique({
      where: { slug: 'conversion-suite' },
    });

    if (!conversionSuiteApp) {
      createdConversionSuiteApp = true;
      conversionSuiteApp = await prisma.marketplaceApp.create({
        data: {
          slug: 'conversion-suite',
          name: 'Conversion Suite',
          description: 'Integration test conversion suite app.',
          monthlyPrice: 0,
          yearlyPrice: 0,
          category: 'ecommerce',
          isActive: true,
          isPublic: true,
          icon: '⚡',
        },
      });
    }

    quantityOffersInstallation = await prisma.companyApp.create({
      data: {
        companyId: company.id,
        appId: quantityOffersApp.id,
        status: 'ACTIVE',
        settings: {
          general: {
            enabled: true,
          },
        },
      },
    });

    conversionSuiteInstallation = await prisma.companyApp.create({
      data: {
        companyId: company.id,
        appId: conversionSuiteApp.id,
        status: 'ACTIVE',
        settings: {
          general: {
            enabled: true,
          },
          modules: {
            freeShippingBar: false,
          },
          thresholds: {
            freeShippingAmount: 799,
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      const createdOrders = await prisma.order.findMany({
        where: { companyId: company?.id },
        select: { id: true },
      });

      if (createdOrders.length > 0) {
        await prisma.orderItem.deleteMany({
          where: {
            orderId: {
              in: createdOrders.map((order) => order.id),
            },
          },
        });
      }

      await prisma.order.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.guestOrder.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.guestCart.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.companyApp.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.userCompany.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.user.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.customer.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.productVariant.deleteMany({
        where: {
          productId: {
            in: [alphaProduct?.id, betaProduct?.id].filter(Boolean),
          },
        },
      });
      await prisma.product.deleteMany({
        where: {
          id: {
            in: [alphaProduct?.id, betaProduct?.id].filter(Boolean),
          },
        },
      });
      await prisma.category.deleteMany({
        where: { id: category?.id },
      });
      await prisma.shippingZone.deleteMany({
        where: { id: shippingZone?.id },
      });
      await prisma.homepageTemplate.deleteMany({
        where: { id: homepageTemplate?.id },
      });
      await prisma.storefrontSettings.deleteMany({
        where: { id: storefrontSettings?.id },
      });
      await prisma.company.deleteMany({
        where: { id: company?.id },
      });

      if (createdQuantityOffersApp && quantityOffersApp?.id) {
        await prisma.marketplaceApp.deleteMany({
          where: { id: quantityOffersApp.id },
        });
      }

      if (createdConversionSuiteApp && conversionSuiteApp?.id) {
        await prisma.marketplaceApp.deleteMany({
          where: { id: conversionSuiteApp.id },
        });
      }
    } finally {
      await closeSharedDatabase();
    }
  });

  test('GET /api/v1/public/storefront/settings resolves company by slug query and returns merged storefront payload', async () => {
    const response = await request(app)
      .get('/api/v1/public/storefront/settings')
      .query({ companyId: company.slug });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.company.id).toBe(company.id);
    expect(response.body.data.company.slug).toBe(company.slug);
    expect(response.body.data.storefront.themeId).toBe('elegant-luxe');
    expect(response.body.data.storefront.settings.storeName).toBe(company.name);
    expect(response.body.data.storefront.settings.currency).toBe(company.currency);
    expect(response.body.data.storefront.pages).toBeUndefined();
    expect(response.body.data.storefront.sections).toBeUndefined();
    expect(response.body.data.storefront.settings.designTokens).toBeUndefined();
    expect(response.body.data.storefront.designTokens).toEqual(
      expect.objectContaining({
        themeId: 'elegant-luxe',
        storeName: 'Storefront Public Test',
      }),
    );
    expect(response.body.data.storefront.designTokens.colors).toBeUndefined();
    expect(response.body.data.storefront.designTokens.typography).toBeUndefined();
    expect(response.body.data.storefront.storefrontFeatures.advancedFiltersEnabled).toBe(true);
    expect(response.body.data.storefront.apps['conversion-suite']).toEqual(
      expect.objectContaining({
        enabled: true,
        status: 'ACTIVE',
      }),
    );
    expect(response.body.data.storefront.apps['quantity-offers-pro']).toEqual(
      expect.objectContaining({
        enabled: true,
        status: 'ACTIVE',
      }),
    );
    expect(
      response.body.data.storefront.apps['quantity-offers-pro'].settings.modules.renderOnProductPage,
    ).toBe(true);
    expect(response.body.data.templateId).toBe(homepageTemplate.id);
  });

  test('GET /api/v1/public/storefront/settings ignores stale template chrome after applying a different marketplace theme', async () => {
    const originalTemplateContent = homepageTemplate.content;
    const originalPublishedContent = homepageTemplate.publishedContent;
    const originalDesignTokens = storefrontSettings.designTokens;
    const staleTemplateContent = {
      format: 'storefront-theme-v1',
      themeId: 'elegant-luxe',
      settings: {
        themeId: 'elegant-luxe',
        header: {
          variant: 'legacy-floating',
          brandName: 'Legacy Luxe',
        },
        footer: {
          description: 'Legacy footer should not override KHEMET.',
        },
        seo: {
          description: 'Legacy SEO should not override KHEMET.',
        },
        contentOverrides: {
          hero: {
            title: 'Legacy hero should not render.',
          },
        },
        pageOverrides: {
          home: {
            sections: [{ type: 'legacy-section' }],
          },
        },
        designTokens: {
          heroTitle: 'Legacy Hero',
          productCard: {
            buttonRadius: '0px',
          },
          layout: {
            contentAlign: 'start',
          },
        },
      },
    };

    try {
      await prisma.storefrontSettings.update({
        where: { id: storefrontSettings.id },
        data: {
          designTokens: {
            themeId: 'khemet-luxe-eg',
            storeName: 'KHEMET Applied Test',
            description: 'Applied KHEMET storefront theme',
          },
        },
      });
      await prisma.homepageTemplate.update({
        where: { id: homepageTemplate.id },
        data: {
          content: staleTemplateContent,
          publishedContent: staleTemplateContent,
        },
      });

      const response = await request(app)
        .get('/api/v1/public/storefront/settings')
        .query({ companyId: company.slug });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.storefront.themeId).toBe('khemet-luxe-eg');
      expect(response.body.data.storefront.designTokens).toEqual(
        expect.objectContaining({
          themeId: 'khemet-luxe-eg',
          storeName: 'KHEMET Applied Test',
        }),
      );
      expect(response.body.data.storefront.designTokens.heroTitle).toBeUndefined();
      expect(response.body.data.storefront.designTokens.productCard).toBeUndefined();
      expect(response.body.data.storefront.designTokens.layout).toBeUndefined();
      expect(response.body.data.storefront.settings.header).toBeUndefined();
      expect(response.body.data.storefront.settings.footer).toBeUndefined();
      expect(response.body.data.storefront.settings.seo).toBeUndefined();
      expect(response.body.data.storefront.settings.contentOverrides).toBeUndefined();
      expect(response.body.data.storefront.settings.pageOverrides).toBeUndefined();
    } finally {
      await prisma.storefrontSettings.update({
        where: { id: storefrontSettings.id },
        data: {
          designTokens: originalDesignTokens,
        },
      });
      await prisma.homepageTemplate.update({
        where: { id: homepageTemplate.id },
        data: {
          content: originalTemplateContent,
          publishedContent: originalPublishedContent,
        },
      });
    }
  });

  test('GET /api/v1/public/products returns normalized images, variants, and price sorting', async () => {
    const response = await request(app)
      .get('/api/v1/public/products')
      .query({
        companyId: company.id,
        category: category.id,
        sortBy: 'price',
        sortOrder: 'asc',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((item) => item.slug)).toEqual([
      alphaProduct.slug,
      betaProduct.slug,
    ]);
    expect(response.body.data[0].images).toEqual(['https://example.com/alpha-scarf.jpg']);
    expect(response.body.data[0].variants).toHaveLength(1);
    expect(response.body.data[0].variants[0].id).toBe(alphaVariant.id);
    expect(response.body.data[0].variants[0].attributeValues).toEqual({
      Color: 'Blue',
      Size: 'M',
    });
    expect(response.body.data[0]).not.toHaveProperty('embedding');
    expect(response.body.data[0]).not.toHaveProperty('cost');
    expect(response.body.data[0]).not.toHaveProperty('metadata');
    expect(response.body.data[0].variants[0]).not.toHaveProperty('cost');
    expect(response.body.data[0].variants[0]).not.toHaveProperty('metadata');
    expect(response.body.data[0].variants[0]).not.toHaveProperty('createdAt');
    expect(response.body.data[1].images).toEqual(['https://example.com/beta-tote.jpg']);
    expect(response.body.data[1].variants).toHaveLength(1);
    expect(response.body.data[1].variants[0].id).toBe(betaVariant.id);
    expect(response.body.data[1].variants[0].attributeValues).toEqual({
      Color: 'Black',
      Size: 'L',
    });
  });

  test('POST /api/v1/public/orders creates a guest order that trusts backend variant pricing and persists variantId end-to-end', async () => {
    const quantity = 2;

    const response = await request(app)
      .post('/api/v1/public/orders')
      .query({ companyId: company.id })
      .send({
        guestName: 'Variant Checkout User',
        guestPhone: '01012345678',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: '12 Integration Street',
        },
        paymentMethod: 'cash',
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            quantity,
            price: 1,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orderNumber).toMatch(/^ORD-INT-/);
    expect(Number(response.body.data.total)).toBe(1980);
    expect(Number(response.body.data.shippingCost)).toBe(75);
    expect(Number(response.body.data.finalTotal)).toBe(2055);

    const savedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: response.body.data.id },
    });
    const savedGuestItems = JSON.parse(savedGuestOrder.items);

    expect(savedGuestItems).toHaveLength(1);
    expect(savedGuestItems[0].variantId).toBe(alphaVariant.id);
    expect(savedGuestItems[0].variantName).toBe('Blue / M');
    expect(savedGuestItems[0].price).toBe(990);
    expect(savedGuestItems[0].productColor).toBe('Blue');
    expect(savedGuestItems[0].productSize).toBe('M');
    expect(savedGuestItems[0].image).toBe('https://example.com/alpha-scarf-blue.jpg');

    const persistedOrder = await prisma.order.findUnique({
      where: {
        companyId_orderNumber: {
          companyId: company.id,
          orderNumber: response.body.data.orderNumber,
        },
      },
      include: {
        orderItems: true,
        customer: true,
      },
    });

    if (persistedOrder) {
      expect(Number(persistedOrder.total)).toBe(2055);
      expect(persistedOrder.customerPhone).toBe('01012345678');
      expect(persistedOrder.customer?.phone).toBe('01012345678');
      expect(persistedOrder.orderItems).toHaveLength(1);
      expect(persistedOrder.orderItems[0].variantId).toBe(alphaVariant.id);
      expect(Number(persistedOrder.orderItems[0].price)).toBe(990);
      expect(persistedOrder.orderItems[0].productColor).toBe('Blue');
      expect(persistedOrder.orderItems[0].productSize).toBe('M');
      expect(persistedOrder.orderItems[0].productImage).toBe('https://example.com/alpha-scarf-blue.jpg');
      expect(JSON.parse(persistedOrder.orderItems[0].metadata)).toMatchObject({
        image: 'https://example.com/alpha-scarf-blue.jpg',
      });
    }

    const refreshedVariant = await prisma.productVariant.findUnique({
      where: { id: alphaVariant.id },
    });
    const refreshedProduct = await prisma.product.findUnique({
      where: { id: alphaProduct.id },
    });

    expect(refreshedVariant.stock).toBe(5);
    expect(refreshedProduct.stock).toBe(8);
  });

  test('POST /api/v1/public/orders applies conversion-suite free shipping threshold to the final total', async () => {
    await prisma.companyApp.update({
      where: { id: conversionSuiteInstallation.id },
      data: {
        settings: {
          general: {
            enabled: true,
          },
          modules: {
            freeShippingBar: true,
          },
          thresholds: {
            freeShippingAmount: 799,
          },
        },
      },
    });

    try {
      const response = await request(app)
        .post('/api/v1/public/orders')
        .query({ companyId: company.id })
        .send({
          guestName: 'Free Shipping Threshold User',
          guestPhone: '01088888888',
          shippingAddress: {
            governorate: 'Cairo',
            city: 'Cairo',
            addressLine1: '75 Free Shipping Street',
          },
          paymentMethod: 'cash',
          items: [
            {
              productId: alphaProduct.id,
              variantId: alphaVariant.id,
              quantity: 1,
              price: 1,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Number(response.body.data.total)).toBe(990);
      expect(Number(response.body.data.shippingCost)).toBe(0);
      expect(Number(response.body.data.finalTotal)).toBe(990);

      const savedGuestOrder = await prisma.guestOrder.findUnique({
        where: { id: response.body.data.id },
      });
      const metadata = JSON.parse(savedGuestOrder.metadata || '{}');

      expect(metadata.freeShipping).toMatchObject({
        source: 'conversion-suite',
        threshold: 799,
        originalShippingCost: 75,
        discountAmount: 75,
        appliedShippingCost: 0,
      });
    } finally {
      await prisma.companyApp.update({
        where: { id: conversionSuiteInstallation.id },
        data: {
          settings: {
            general: {
              enabled: true,
            },
            modules: {
              freeShippingBar: false,
            },
            thresholds: {
              freeShippingAmount: 799,
            },
          },
        },
      });
    }
  });

  test('POST /api/v1/public/orders persists campaign attribution on guest and regular orders', async () => {
    const attributionPayload = {
      source: 'facebook',
      medium: 'paid_social',
      campaignName: 'summer-sale',
      campaignId: 'cmp_12001',
      adSetId: 'adset_450',
      adId: 'ad_990',
      content: 'creative_a',
      landingPath:
        `/shop?companyId=${company.id}` +
        '&utm_source=facebook' +
        '&utm_medium=paid_social' +
        '&utm_campaign=summer-sale' +
        '&utm_id=cmp_12001' +
        '&utm_content=creative_a',
      referrer: 'https://l.facebook.com/',
      capturedAt: '2026-04-20T12:00:00.000Z',
      rawParams: {
        utm_source: 'facebook',
        utm_medium: 'paid_social',
        utm_campaign: 'summer-sale',
        utm_id: 'cmp_12001',
        utm_content: 'creative_a',
      },
    };

    const response = await request(app)
      .post('/api/v1/public/orders')
      .query({ companyId: company.id })
      .send({
        guestName: 'Attribution Checkout User',
        guestPhone: '01077777777',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: '21 Campaign Street',
        },
        paymentMethod: 'cash',
        attribution: attributionPayload,
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            quantity: 1,
            price: 1,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const savedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: response.body.data.id },
    });
    const guestMetadata = JSON.parse(savedGuestOrder.metadata || '{}');

    expect(guestMetadata.attribution).toMatchObject({
      source: 'facebook',
      medium: 'paid_social',
      platform: 'facebook',
      campaignName: 'summer-sale',
      campaignId: 'cmp_12001',
      adSetId: 'adset_450',
      adId: 'ad_990',
      content: 'creative_a',
      landingPath:
        `/shop?companyId=${company.id}` +
        '&utm_source=facebook' +
        '&utm_medium=paid_social' +
        '&utm_campaign=summer-sale' +
        '&utm_id=cmp_12001' +
        '&utm_content=creative_a',
      referrer: 'https://l.facebook.com/',
    });

    const persistedOrder = await prisma.order.findUnique({
      where: {
        companyId_orderNumber: {
          companyId: company.id,
          orderNumber: response.body.data.orderNumber,
        },
      },
    });

    expect(persistedOrder).toBeTruthy();

    const orderMetadata = JSON.parse(persistedOrder.metadata || '{}');
    expect(orderMetadata.guestOrderId).toBe(savedGuestOrder.id);
    expect(orderMetadata.attribution).toMatchObject({
      source: 'facebook',
      medium: 'paid_social',
      platform: 'facebook',
      campaignId: 'cmp_12001',
      adSetId: 'adset_450',
      adId: 'ad_990',
      content: 'creative_a',
    });
    expect(orderMetadata.attribution.landingPath).toContain('&utm_content=creative_a');
  });

  test('POST /api/v1/public/orders preserves quantity offer metadata, applies free shipping, and logs app usage', async () => {
    const quantityOfferGroupId = `qo-group-${Date.now()}`;
    const quantityOfferLabel = 'اشتري القطعتين بـ1980 بدل 2180';

    const quantityOfferUsageBefore = await prisma.appUsageLog.count({
      where: {
        companyAppId: quantityOffersInstallation.id,
        feature: 'quantity_offer_order_created',
      },
    });

    const conversionUsageBefore = await prisma.appUsageLog.count({
      where: {
        companyAppId: conversionSuiteInstallation.id,
        feature: 'order_created',
      },
    });

    const response = await request(app)
      .post('/api/v1/public/orders')
      .query({ companyId: company.id })
      .send({
        guestName: 'Quantity Offer User',
        guestPhone: '01055555555',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: '44 Offer Street',
        },
        paymentMethod: 'cash',
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            quantity: 1,
            price: 305,
            attributes: {
              Color: 'Blue',
              Size: 'M',
            },
            quantityOffer: {
              groupId: quantityOfferGroupId,
              offerId: 'offer-2',
              offerLabel: quantityOfferLabel,
              offerQuantity: 2,
              slotIndex: 1,
              freeShipping: true,
            },
          },
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            quantity: 1,
            price: 305,
            attributes: {
              Color: 'Blue',
              Size: 'M',
            },
            quantityOffer: {
              groupId: quantityOfferGroupId,
              offerId: 'offer-2',
              offerLabel: quantityOfferLabel,
              offerQuantity: 2,
              slotIndex: 2,
              freeShipping: true,
            },
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Number(response.body.data.shippingCost)).toBe(0);
    expect(Number(response.body.data.total)).toBe(1980);
    expect(Number(response.body.data.finalTotal)).toBe(1980);

    const savedGuestOrder = await prisma.guestOrder.findUnique({
      where: { id: response.body.data.id },
    });
    const savedGuestItems = JSON.parse(savedGuestOrder.items);

    expect(savedGuestItems).toHaveLength(2);
    expect(savedGuestItems[0].quantityOffer).toMatchObject({
      groupId: quantityOfferGroupId,
      offerId: 'offer-2',
      offerLabel: quantityOfferLabel,
      offerQuantity: 2,
      slotIndex: 1,
      freeShipping: true,
    });
    expect(savedGuestItems[1].quantityOffer).toMatchObject({
      groupId: quantityOfferGroupId,
      slotIndex: 2,
    });

    const persistedOrder = await prisma.order.findUnique({
      where: {
        companyId_orderNumber: {
          companyId: company.id,
          orderNumber: response.body.data.orderNumber,
        },
      },
      include: {
        orderItems: true,
      },
    });

    expect(persistedOrder).toBeTruthy();
    expect(Number(persistedOrder.shipping)).toBe(0);
    expect(Number(persistedOrder.total)).toBe(1980);
    expect(persistedOrder.orderItems).toHaveLength(2);

    const orderItemMetadata = persistedOrder.orderItems.map((item) =>
      JSON.parse(item.metadata || '{}'),
    );

    expect(orderItemMetadata[0].quantityOffer).toMatchObject({
      groupId: quantityOfferGroupId,
      offerId: 'offer-2',
      offerLabel: quantityOfferLabel,
      offerQuantity: 2,
      slotIndex: 1,
      freeShipping: true,
    });
    expect(orderItemMetadata[1].quantityOffer).toMatchObject({
      groupId: quantityOfferGroupId,
      slotIndex: 2,
    });

    const quantityOfferUsageAfter = await prisma.appUsageLog.count({
      where: {
        companyAppId: quantityOffersInstallation.id,
        feature: 'quantity_offer_order_created',
      },
    });

    const conversionUsageAfter = await prisma.appUsageLog.count({
      where: {
        companyAppId: conversionSuiteInstallation.id,
        feature: 'order_created',
      },
    });

    expect(quantityOfferUsageAfter).toBe(quantityOfferUsageBefore + 1);
    expect(conversionUsageAfter).toBe(conversionUsageBefore + 1);

    const latestQuantityOfferLog = await prisma.appUsageLog.findFirst({
      where: {
        companyAppId: quantityOffersInstallation.id,
        feature: 'quantity_offer_order_created',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(Number(latestQuantityOfferLog.quantity)).toBe(2);
    expect(Number(latestQuantityOfferLog.totalCost)).toBe(1980);
    expect(latestQuantityOfferLog.metadata).toMatchObject({
      offerId: 'offer-2',
      offerLabel: quantityOfferLabel,
      productId: alphaProduct.id,
      productName: alphaProduct.name,
      freeShipping: true,
      itemsCount: 2,
      totalUnits: 2,
    });
  });

  test('POST /api/v1/public/orders/checkout-draft persists checkout progress and the saved cart is deleted after order completion', async () => {
    const firstDraftResponse = await request(app)
      .post('/api/v1/public/orders/checkout-draft')
      .query({ companyId: company.id })
      .send({
        customerName: 'Draft Checkout User',
        email: 'draft-checkout@test.local',
        phone: '01044444444',
        address: '88 Draft Street',
        city: 'Cairo',
        governorate: 'Cairo',
        notes: 'Customer paused before confirmation',
        paymentMethod: 'cod',
        subtotal: 990,
        shippingCost: 75,
        total: 1065,
        attribution: {
          source: 'tiktok',
          medium: 'paid_social',
          platform: 'tiktok',
          campaignName: 'تيك توك صيف',
          campaignId: 'tt-777',
          ttclid: 'ttclid_xyz',
        },
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            name: alphaProduct.name,
            quantity: 1,
            price: 990,
            attributes: {
              Color: 'Blue',
              Size: 'M',
            },
          },
        ],
      });

    expect(firstDraftResponse.status).toBe(200);
    expect(firstDraftResponse.body.success).toBe(true);
    expect(firstDraftResponse.body.data.cartId).toBeTruthy();

    const cartId = firstDraftResponse.body.data.cartId;
    const firstSavedCart = await prisma.guestCart.findUnique({
      where: { cartId },
    });

    expect(firstSavedCart).toBeTruthy();
    expect(firstSavedCart.companyId).toBe(company.id);
    expect(firstSavedCart.checkoutStartedAt).toBeTruthy();
    expect(firstSavedCart.checkoutUpdatedAt).toBeTruthy();
    expect(JSON.parse(firstSavedCart.checkoutData || '{}')).toMatchObject({
      customerName: 'Draft Checkout User',
      email: 'draft-checkout@test.local',
      phone: '01044444444',
      governorate: 'Cairo',
    });
    expect(JSON.parse(firstSavedCart.checkoutData || '{}').attribution).toEqual(
      expect.objectContaining({
        source: 'tiktok',
        campaignName: 'تيك توك صيف',
        campaignId: 'tt-777',
      }),
    );

    const firstStartedAt = firstSavedCart.checkoutStartedAt.toISOString();

    const secondDraftResponse = await request(app)
      .post('/api/v1/public/orders/checkout-draft')
      .set('x-cart-id', cartId)
      .query({ companyId: company.id })
      .send({
        customerName: 'Draft Checkout User Updated',
        email: 'draft-checkout@test.local',
        phone: '01044444444',
        address: '88 Draft Street',
        city: 'Cairo',
        governorate: 'Cairo',
        notes: 'Customer updated the draft once',
        paymentMethod: 'cod',
        subtotal: 990,
        shippingCost: 75,
        total: 1065,
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            name: alphaProduct.name,
            quantity: 1,
            price: 990,
          },
        ],
      });

    expect(secondDraftResponse.status).toBe(200);
    expect(secondDraftResponse.body.success).toBe(true);
    expect(secondDraftResponse.body.data.cartId).toBe(cartId);

    const updatedCart = await prisma.guestCart.findUnique({
      where: { cartId },
    });

    expect(updatedCart.checkoutStartedAt.toISOString()).toBe(firstStartedAt);
    expect(JSON.parse(updatedCart.checkoutData || '{}')).toMatchObject({
      customerName: 'Draft Checkout User Updated',
      notes: 'Customer updated the draft once',
    });

    const orderResponse = await request(app)
      .post('/api/v1/public/orders')
      .set('x-cart-id', cartId)
      .query({ companyId: company.id })
      .send({
        guestName: 'Draft Checkout User Updated',
        guestEmail: 'draft-checkout@test.local',
        guestPhone: '01044444444',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: '88 Draft Street',
        },
        paymentMethod: 'cash',
        items: [
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            quantity: 1,
            price: 990,
          },
        ],
      });

    expect(orderResponse.status).toBe(200);
    expect(orderResponse.body.success).toBe(true);

    const deletedCart = await prisma.guestCart.findUnique({
      where: { cartId },
    });

    expect(deletedCart).toBeNull();
  });

  test('PATCH public guest order status endpoints are forbidden', async () => {
    const orderNumber = `PUBLIC-MUTATION-${Date.now()}`;

    await prisma.guestOrder.create({
      data: {
        orderNumber,
        guestEmail: `public-mutation-${Date.now()}@test.local`,
        guestPhone: '01044444444',
        guestName: 'Public Mutation Guard',
        items: JSON.stringify([
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            name: alphaProduct.name,
            quantity: 1,
            price: 990,
            total: 990,
          },
        ]),
        total: 990,
        shippingCost: 50,
        finalTotal: 1040,
        shippingAddress: JSON.stringify({
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: 'Public Mutation Street',
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id,
      },
    });

    const [statusResponse, paymentResponse] = await Promise.all([
      request(app)
        .patch(`/api/v1/public/orders/orders/${orderNumber}/status`)
        .query({ companyId: company.id })
        .send({ status: 'CANCELLED', notes: 'malicious public update' }),
      request(app)
        .patch(`/api/v1/public/orders/orders/${orderNumber}/payment-status`)
        .query({ companyId: company.id })
        .send({ paymentStatus: 'COMPLETED', notes: 'malicious public payment update' }),
    ]);

    expect(statusResponse.status).toBe(403);
    expect(statusResponse.body.success).toBe(false);
    expect(paymentResponse.status).toBe(403);
    expect(paymentResponse.body.success).toBe(false);

    const savedOrder = await prisma.guestOrder.findFirst({
      where: { orderNumber, companyId: company.id },
    });

    expect(savedOrder.status).toBe('pending');
    expect(savedOrder.notes || '').not.toContain('malicious public');
  });

  test('GET /api/v1/public/analytics falls back to guest orders when no mirrored regular order exists', async () => {
    const guestOnlyOrderNumber = `ORD-GUEST-ONLY-${Date.now()}`;

    await prisma.guestOrder.create({
      data: {
        orderNumber: guestOnlyOrderNumber,
        guestEmail: 'guest-only@test.local',
        guestPhone: '01033333333',
        guestName: 'Guest Only Analytics',
        items: JSON.stringify([
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            name: alphaProduct.name,
            quantity: 2,
            price: 990,
            total: 1980,
            productColor: 'Blue',
            productSize: 'M',
          },
        ]),
        total: 1980,
        shippingCost: 75,
        finalTotal: 2055,
        shippingAddress: JSON.stringify({
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: 'Analytics Guest Street',
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id,
      },
    });

    const [storeResponse, topProductsResponse, dailyResponse] = await Promise.all([
      request(app)
        .get('/api/v1/public/analytics/store')
        .query({ companyId: company.id, period: '30' }),
      request(app)
        .get('/api/v1/public/analytics/products/top')
        .query({ companyId: company.id, period: '30', limit: 10 }),
      request(app)
        .get('/api/v1/public/analytics/daily')
        .query({ companyId: company.id, period: '30' }),
    ]);

    expect(storeResponse.status).toBe(200);
    expect(storeResponse.body.success).toBe(true);
    expect(storeResponse.body.data.purchases).toBeGreaterThanOrEqual(1);
    expect(Number(storeResponse.body.data.totalRevenue)).toBeGreaterThanOrEqual(2055);

    expect(topProductsResponse.status).toBe(200);
    expect(topProductsResponse.body.success).toBe(true);
    expect(topProductsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: alphaProduct.id,
          purchases: expect.any(Number),
        }),
      ]),
    );

    const alphaAnalytics = topProductsResponse.body.data.find(
      (product) => product.id === alphaProduct.id,
    );
    expect(alphaAnalytics.purchases).toBeGreaterThanOrEqual(1);
    expect(alphaAnalytics.sales).toBeGreaterThanOrEqual(2);

    expect(dailyResponse.status).toBe(200);
    expect(dailyResponse.body.success).toBe(true);
    expect(dailyResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          totalPurchases: expect.any(Number),
          totalRevenue: expect.any(Number),
        }),
      ]),
    );

    const dailyPurchaseRow = dailyResponse.body.data.find(
      (entry) => Number(entry.totalPurchases) >= 1,
    );
    expect(dailyPurchaseRow).toBeTruthy();
    expect(Number(dailyPurchaseRow.totalRevenue)).toBeGreaterThanOrEqual(2055);
  });

  test('POST /api/v1/analytics/track/* stays public for storefront event tracking', async () => {
    const sessionId = `session-track-${Date.now()}`;

    const storeVisitResponse = await request(app)
      .post('/api/v1/analytics/track/store-visit')
      .set('x-company-id', company.id)
      .send({
        sessionId,
        userAgent: 'Jest Storefront Tracker',
        landingPage: `/product/${alphaProduct.slug}`,
      });

    expect(storeVisitResponse.status).toBe(200);
    expect(storeVisitResponse.body.success).toBe(true);

    const productViewResponse = await request(app)
      .post('/api/v1/analytics/track/product-view')
      .set('x-company-id', company.id)
      .send({
        sessionId,
        productId: alphaProduct.id,
        source: 'storefront',
      });

    expect(productViewResponse.status).toBe(200);
    expect(productViewResponse.body.success).toBe(true);

    const conversionResponse = await request(app)
      .post('/api/v1/analytics/track/conversion')
      .set('x-company-id', company.id)
      .send({
        sessionId,
        eventType: 'add_to_cart',
        productId: alphaProduct.id,
        value: 990,
      });

    expect(conversionResponse.status).toBe(200);
    expect(conversionResponse.body.success).toBe(true);
  });

  test('storefront analytics accepts slug company identifiers for tracking and reporting', async () => {
    const sessionId = `session-track-slug-${Date.now()}`;

    const storeVisitResponse = await request(app)
      .post('/api/v1/analytics/track/store-visit')
      .set('x-company-id', company.slug)
      .send({
        sessionId,
        userAgent: 'Jest Storefront Tracker Slug',
        landingPage: `/product/${alphaProduct.slug}`,
      });

    expect(storeVisitResponse.status).toBe(200);
    expect(storeVisitResponse.body.success).toBe(true);

    const productViewResponse = await request(app)
      .post('/api/v1/analytics/track/product-view')
      .set('x-company-id', company.slug)
      .send({
        sessionId,
        productId: alphaProduct.id,
        source: 'storefront-slug',
      });

    expect(productViewResponse.status).toBe(200);
    expect(productViewResponse.body.success).toBe(true);

    const conversionResponse = await request(app)
      .post('/api/v1/analytics/track/conversion')
      .set('x-company-id', company.slug)
      .send({
        sessionId,
        eventType: 'add_to_cart',
        productId: alphaProduct.id,
        value: 990,
      });

    expect(conversionResponse.status).toBe(200);
    expect(conversionResponse.body.success).toBe(true);

    const [trackedStoreVisit, trackedProductVisit, trackedConversionEvent] = await Promise.all([
      prisma.storeVisit.findFirst({
        where: { companyId: company.id, sessionId },
      }),
      prisma.productVisit.findFirst({
        where: { companyId: company.id, sessionId, productId: alphaProduct.id },
      }),
      prisma.conversionEvent.findFirst({
        where: {
          companyId: company.id,
          sessionId,
          productId: alphaProduct.id,
          eventType: 'add_to_cart',
        },
      }),
    ]);

    expect(trackedStoreVisit).toBeTruthy();
    expect(trackedProductVisit).toBeTruthy();
    expect(trackedConversionEvent).toBeTruthy();

    const [storeResponse, topProductsResponse, dailyResponse] = await Promise.all([
      request(app)
        .get('/api/v1/public/analytics/store')
        .query({ companyId: company.slug, period: '30' }),
      request(app)
        .get('/api/v1/public/analytics/products/top')
        .query({ companyId: company.slug, period: '30', limit: 10 }),
      request(app)
        .get('/api/v1/public/analytics/daily')
        .query({ companyId: company.slug, period: '30' }),
    ]);

    expect(storeResponse.status).toBe(200);
    expect(storeResponse.body.success).toBe(true);
    expect(Number(storeResponse.body.data.totalVisits)).toBeGreaterThanOrEqual(1);
    expect(Number(storeResponse.body.data.totalProductViews)).toBeGreaterThanOrEqual(1);
    expect(Number(storeResponse.body.data.addToCarts)).toBeGreaterThanOrEqual(1);

    expect(topProductsResponse.status).toBe(200);
    expect(topProductsResponse.body.success).toBe(true);
    expect(topProductsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: alphaProduct.id,
          views: expect.any(Number),
        }),
      ]),
    );

    const alphaAnalytics = topProductsResponse.body.data.find(
      (product) => product.id === alphaProduct.id,
    );
    expect(Number(alphaAnalytics.views)).toBeGreaterThanOrEqual(1);

    expect(dailyResponse.status).toBe(200);
    expect(dailyResponse.body.success).toBe(true);
    expect(dailyResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          totalVisits: expect.any(Number),
          totalProductViews: expect.any(Number),
        }),
      ]),
    );
  });

  test('storefront analytics period=1 resolves to the current calendar day window', async () => {
    const [storeResponse, topProductsResponse, dailyResponse] = await Promise.all([
      request(app)
        .get('/api/v1/public/analytics/store')
        .query({ companyId: company.slug, period: '1' }),
      request(app)
        .get('/api/v1/public/analytics/products/top')
        .query({ companyId: company.slug, period: '1', limit: 10 }),
      request(app)
        .get('/api/v1/public/analytics/daily')
        .query({ companyId: company.slug, period: '1' }),
    ]);

    const expectedStart = new Date();
    expectedStart.setHours(0, 0, 0, 0);

    for (const response of [storeResponse, topProductsResponse, dailyResponse]) {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const periodStart = new Date(response.body.period.start);
      expect(periodStart.toISOString()).toBe(expectedStart.toISOString());
    }

    const periodEnd = new Date(storeResponse.body.period.end);
    expect(periodEnd.getTime()).toBeGreaterThanOrEqual(expectedStart.getTime());
    expect(periodEnd.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test('GET /api/v1/analytics/funnel reflects direct-order storefront semantics', async () => {
    const baseTime = new Date('2030-04-01T10:00:00.000Z');
    const endTime = new Date('2030-04-01T23:59:59.999Z');
    const sessionPrefix = `funnel-${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: 'Funnel',
        lastName: 'Customer',
        email: `funnel-customer-${Date.now()}@test.local`,
        phone: '01077777777',
      },
    });

    await prisma.storeVisit.createMany({
      data: [
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-1`,
          visitedAt: baseTime,
          userAgent: 'Jest Funnel',
          landingPage: '/collections/test',
        },
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-2`,
          visitedAt: baseTime,
          userAgent: 'Jest Funnel',
          landingPage: '/products/test',
        },
      ],
    });

    await prisma.productVisit.createMany({
      data: [
        {
          companyId: company.id,
          productId: alphaProduct.id,
          sessionId: `${sessionPrefix}-1`,
          source: 'funnel-test',
          visitedAt: baseTime,
        },
        {
          companyId: company.id,
          productId: alphaProduct.id,
          sessionId: `${sessionPrefix}-1`,
          source: 'funnel-test',
          visitedAt: baseTime,
        },
        {
          companyId: company.id,
          productId: betaProduct.id,
          sessionId: `${sessionPrefix}-2`,
          source: 'funnel-test',
          visitedAt: baseTime,
        },
        {
          companyId: company.id,
          productId: betaProduct.id,
          sessionId: `${sessionPrefix}-2`,
          source: 'funnel-test',
          visitedAt: baseTime,
        },
      ],
    });

    await prisma.conversionEvent.createMany({
      data: [
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-1`,
          eventType: 'add_to_cart',
          productId: alphaProduct.id,
          value: 990,
          createdAt: baseTime,
        },
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-1`,
          eventType: 'checkout',
          value: 990,
          createdAt: baseTime,
        },
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-2`,
          eventType: 'checkout',
          value: 1490,
          createdAt: baseTime,
        },
        {
          companyId: company.id,
          sessionId: `${sessionPrefix}-3`,
          eventType: 'checkout',
          value: 2490,
          createdAt: baseTime,
        },
      ],
    });

    await prisma.order.createMany({
      data: [
        {
          id: `funnel-order-delivered-${Date.now()}`,
          orderNumber: `FUNNEL-DELIVERED-${Date.now()}`,
          customerId: customer.id,
          companyId: company.id,
          status: 'DELIVERED',
          paymentStatus: 'COMPLETED',
          paymentMethod: 'CASH',
          subtotal: 990,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 990,
          currency: 'EGP',
          customerName: 'Funnel Customer',
          customerPhone: customer.phone,
          customerEmail: customer.email,
          city: 'Cairo',
          governorate: 'Cairo',
          sourceType: 'storefront',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: `funnel-order-pending-${Date.now()}`,
          orderNumber: `FUNNEL-PENDING-${Date.now()}`,
          customerId: customer.id,
          companyId: company.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'CASH',
          subtotal: 1490,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 1490,
          currency: 'EGP',
          customerName: 'Funnel Customer',
          customerPhone: customer.phone,
          customerEmail: customer.email,
          city: 'Cairo',
          governorate: 'Cairo',
          sourceType: 'storefront',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ],
    });

    await prisma.guestOrder.create({
      data: {
        orderNumber: `FUNNEL-GUEST-${Date.now()}`,
        guestEmail: `funnel-guest-${Date.now()}@test.local`,
        guestPhone: '01088888888',
        guestName: 'Funnel Guest',
        items: JSON.stringify([
          {
            productId: alphaProduct.id,
            variantId: alphaVariant.id,
            name: alphaProduct.name,
            quantity: 1,
            price: 1100,
            total: 1100,
          },
        ]),
        total: 1100,
        shippingCost: 0,
        finalTotal: 1100,
        shippingAddress: JSON.stringify({
          governorate: 'Cairo',
          city: 'Cairo',
          addressLine1: 'Guest Funnel Street',
        }),
        paymentMethod: 'cash',
        status: 'pending',
        companyId: company.id,
        createdAt: baseTime,
        updatedAt: baseTime,
      },
    });

    const response = await request(app)
      .get('/api/v1/analytics/funnel')
      .set('Authorization', `Bearer ${token}`)
      .query({
        startDate: '2030-04-01',
        endDate: '2030-04-01',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.supportingSignals.addToCarts).toBe(1);
    expect(response.body.data.funnelSteps).toEqual([
      expect.objectContaining({ key: 'visits', step: 'زيارات المتجر', count: 2, rate: 100 }),
      expect.objectContaining({ key: 'views', step: 'مشاهدات المنتجات', count: 4, rate: 200 }),
      expect.objectContaining({ key: 'started_orders', step: 'بدء الطلب', count: 3, rate: 75 }),
      expect.objectContaining({ key: 'purchases', step: 'إتمام الطلب', count: 3, rate: 100 }),
      expect.objectContaining({
        key: 'delivered',
        step: 'تسليم ناجح',
        count: 1,
        rate: expect.closeTo(33.33, 2),
      }),
    ]);
    expect(response.body.data.biggestDropOff).toEqual(
      expect.objectContaining({
        from: 'إتمام الطلب',
        to: 'تسليم ناجح',
        dropRate: expect.closeTo(66.67, 2),
      }),
    );
    const expectedStart = new Date('2030-04-01');
    expectedStart.setHours(0, 0, 0, 0);
    const expectedEnd = new Date('2030-04-01');
    expectedEnd.setHours(23, 59, 59, 999);

    expect(new Date(response.body.period.start).toISOString()).toBe(expectedStart.toISOString());
    expect(new Date(response.body.period.end).toISOString()).toBe(expectedEnd.toISOString());
  });

  test('GET /api/v1/public/products/:slug returns the active product with aliased variants', async () => {
    const response = await request(app)
      .get(`/api/v1/public/products/${alphaProduct.slug}`)
      .query({ companyId: company.id });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(alphaProduct.id);
    expect(response.body.data).not.toHaveProperty('embedding');
    expect(response.body.data).not.toHaveProperty('cost');
    expect(response.body.data.productVariants).toHaveLength(1);
    expect(response.body.data.variants).toHaveLength(1);
    expect(response.body.data.productVariants[0].name).toBe('Blue / M');
    expect(response.body.data.productVariants[0]).not.toHaveProperty('cost');
    expect(response.body.data.productVariants[0]).not.toHaveProperty('metadata');
    expect(response.body.data.productVariants[0].attributeValues).toEqual({
      Color: 'Blue',
      Size: 'M',
    });
  });

  test('GET /api/v1/shipping-zones/public/:companyId/calculate stays public and returns a live quote without auth', async () => {
    const response = await request(app)
      .get(`/api/v1/shipping-zones/public/${company.id}/calculate`)
      .query({ governorate: 'Cairo' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.zoneId).toBe(shippingZone.id);
    expect(response.body.data.price).toBe(75);
  });

  test('GET /api/v1/health remains publicly reachable', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.database).toBe('Connected');
  });

  test('GET /api/geolocation/detect remains publicly reachable in development', async () => {
    const response = await request(app)
      .get('/api/geolocation/detect')
      .set('x-forwarded-for', '127.0.0.1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.countryCode).toBe('EG');
    expect(response.body.data.language).toBe('ar');
  });
});
