const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

dotenv.config({ path: path.join(__dirname, '..', '.env.production'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('POSTGRES_URL or DATABASE_URL is required');
}

function createSeedPrismaClient() {
  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', '5');
  url.searchParams.set('pool_timeout', '10');
  url.searchParams.set('connect_timeout', '10');

  return new PrismaClient({
    datasources: { db: { url: url.toString() } },
    log: ['error'],
    errorFormat: 'minimal',
    transactionOptions: {
      maxWait: 10000,
      timeout: 30000,
    },
  });
}

const prisma = createSeedPrismaClient();

const stamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

const DEFAULT_COMPANY_NAME = 'MaxP Affiliate Demo';
const DEFAULT_BASE_SLUG = 'maxp-affiliate-demo';
const DEFAULT_OWNER_EMAIL = `affiliate.demo.owner+${stamp}@maxp.online`;
const DEFAULT_AFFILIATE_EMAIL = `affiliate.demo.marketer+${stamp}@maxp.online`;
const DEFAULT_MERCHANT_EMAIL = `affiliate.demo.merchant+${stamp}@maxp.online`;

const AFFILIATE_DEMO_APP_SLUGS = [
  'ecommerce-basic',
  'order-core',
  'order-shipping-turbo',
  'order-invoicing',
  'conversion-suite',
  'inventory-pro',
  'affiliate-pro',
  'procurement-pro',
  'crm-basic',
  'crm-loyalty',
  'analytics-advanced',
  'wallet-system',
];

const config = {
  companyName: process.env.DEMO_COMPANY_NAME || DEFAULT_COMPANY_NAME,
  baseSlug: process.env.DEMO_COMPANY_SLUG || DEFAULT_BASE_SLUG,
  ownerEmail: process.env.DEMO_OWNER_EMAIL || DEFAULT_OWNER_EMAIL,
  affiliateEmail: process.env.DEMO_AFFILIATE_EMAIL || DEFAULT_AFFILIATE_EMAIL,
  merchantEmail: process.env.DEMO_MERCHANT_EMAIL || DEFAULT_MERCHANT_EMAIL,
  password:
    process.env.DEMO_PASSWORD ||
    `Demo#${crypto.randomBytes(5).toString('base64url')}9`,
};

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || DEFAULT_BASE_SLUG;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function suffixEmail(email, suffix) {
  const [local, domain] = normalizeEmail(email).split('@');
  if (!local || !domain) {
    throw new Error(`Invalid email: ${email}`);
  }
  return `${local}+${suffix}@${domain}`.replace(/\++/g, '+');
}

async function uniqueCompanySlug(tx, baseSlug) {
  const normalizedBase = slugify(baseSlug);
  let candidate = normalizedBase;
  let attempt = 0;

  while (await tx.company.findUnique({ where: { slug: candidate } })) {
    attempt += 1;
    candidate = `${normalizedBase}-${stamp}${attempt > 1 ? `-${attempt}` : ''}`;
  }

  return candidate;
}

async function uniqueEmail(tx, email) {
  const normalized = normalizeEmail(email);
  let candidate = normalized;
  let attempt = 0;

  while (
    (await tx.user.findUnique({ where: { email: candidate } })) ||
    (await tx.company.findUnique({ where: { email: candidate } })) ||
    (await tx.merchant.findUnique({ where: { email: candidate } }))
  ) {
    attempt += 1;
    candidate = suffixEmail(normalized, `${stamp}${attempt > 1 ? attempt : ''}`);
  }

  return candidate;
}

async function installApps(tx, companyId, appSlugs) {
  const apps = await tx.marketplaceApp.findMany({
    where: {
      slug: { in: appSlugs },
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  for (const app of apps) {
    await tx.companyApp.upsert({
      where: {
        companyId_appId: {
          companyId,
          appId: app.id,
        },
      },
      update: {
        status: 'ACTIVE',
      },
      create: {
        companyId,
        appId: app.id,
        status: 'ACTIVE',
        activePricingModel: 'SUBSCRIPTION',
      },
    });
  }

  return {
    installed: apps.map((app) => app.slug),
    missing: appSlugs.filter((slug) => !apps.some((app) => app.slug === slug)),
  };
}

async function createUserWithCompany(tx, {
  email,
  passwordHash,
  firstName,
  lastName,
  phone,
  role,
  companyId,
  userCompanyRole,
}) {
  const user = await tx.user.create({
    data: {
      email,
      password: passwordHash,
      firstName,
      lastName,
      phone,
      role,
      companyId,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      timezone: 'Africa/Cairo',
    },
  });

  if (userCompanyRole) {
    await tx.userCompany.create({
      data: {
        userId: user.id,
        companyId,
        role: userCompanyRole,
        isActive: true,
        isDefault: true,
      },
    });
  }

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash(config.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const companySlug = await uniqueCompanySlug(tx, config.baseSlug);
    const ownerEmail = await uniqueEmail(tx, config.ownerEmail);
    const affiliateEmail = await uniqueEmail(tx, config.affiliateEmail);
    const merchantEmail = await uniqueEmail(tx, config.merchantEmail);

    const company = await tx.company.create({
      data: {
        name: config.companyName,
        slug: companySlug,
        email: ownerEmail,
        phone: '+201000000900',
        currency: 'EGP',
        isActive: true,
        sidebarLayout: 'affiliate-demo',
        timezone: 'Africa/Cairo',
        settings: JSON.stringify({
          language: 'en',
          demoPreset: 'affiliate-demo',
          demoCreatedAt: new Date().toISOString(),
        }),
      },
    });

    const owner = await createUserWithCompany(tx, {
      email: ownerEmail,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Owner',
      phone: '+201000000900',
      role: 'OWNER',
      companyId: company.id,
      userCompanyRole: 'OWNER',
    });

    const appInstall = await installApps(tx, company.id, AFFILIATE_DEMO_APP_SLUGS);

    await tx.affiliateSetting.create({
      data: {
        companyId: company.id,
        commissionType: 'PERCENTAGE',
        commissionRate: 12,
        cookieDuration: 45,
        termsAndConditions:
          'Demo affiliate terms: approved marketers can promote active products, create customer orders, and receive commissions after confirmed orders.',
        isActive: true,
        platformMarginType: 'FIXED',
        platformMarginValue: 25,
      },
    });

    const mainWarehouse = await tx.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Cairo Main Warehouse',
        location: 'Nasr City, Cairo',
        type: 'main',
        capacity: 1200,
        isActive: true,
      },
    });

    const backupWarehouse = await tx.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Giza Backup Warehouse',
        location: 'Dokki, Giza',
        type: 'backup',
        capacity: 600,
        isActive: true,
      },
    });

    const shippingCompanies = [];
    for (const carrier of [
      {
        name: 'Turbo',
        slug: 'turbo',
        providerKey: 'TURBO',
        integrationMode: 'API',
        website: 'https://turbo-eg.com',
      },
      {
        name: 'Bosta Demo',
        slug: 'bosta-demo',
        providerKey: 'BOSTA',
        integrationMode: 'MANUAL',
        website: 'https://bosta.co',
      },
      {
        name: 'Aramex Demo',
        slug: 'aramex-demo',
        providerKey: 'ARAMEX',
        integrationMode: 'MANUAL',
        website: 'https://www.aramex.com',
      },
    ]) {
      shippingCompanies.push(
        await tx.shippingCompany.create({
          data: {
            companyId: company.id,
            name: carrier.name,
            slug: carrier.slug,
            providerKey: carrier.providerKey,
            integrationMode: carrier.integrationMode,
            website: carrier.website,
            isActive: true,
            settings: JSON.stringify({ demo: true }),
          },
        }),
      );
    }

    const categories = {};
    for (const category of [
      { key: 'skincare', name: 'Skincare', slug: 'skincare' },
      { key: 'fitness', name: 'Fitness', slug: 'fitness' },
      { key: 'home', name: 'Home Essentials', slug: 'home-essentials' },
    ]) {
      categories[category.key] = await tx.category.create({
        data: {
          companyId: company.id,
          name: category.name,
          slug: category.slug,
          description: `${category.name} products for affiliate demos.`,
          isActive: true,
          displayType: 'default',
        },
      });
    }

    const products = [];
    for (const item of [
      {
        name: 'Glow Serum Starter Kit',
        slug: 'glow-serum-starter-kit',
        sku: 'AFD-SKIN-001',
        categoryId: categories.skincare.id,
        price: 775,
        cost: 490,
        stock: 80,
        image:
          'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1200&auto=format&fit=crop',
      },
      {
        name: 'Smart Resistance Band Set',
        slug: 'smart-resistance-band-set',
        sku: 'AFD-FIT-002',
        categoryId: categories.fitness.id,
        price: 520,
        cost: 310,
        stock: 65,
        image:
          'https://images.unsplash.com/photo-1598289431512-b97b0917affc?q=80&w=1200&auto=format&fit=crop',
      },
      {
        name: 'Aroma Diffuser Home Bundle',
        slug: 'aroma-diffuser-home-bundle',
        sku: 'AFD-HOME-003',
        categoryId: categories.home.id,
        price: 940,
        cost: 625,
        stock: 45,
        image:
          'https://images.unsplash.com/photo-1602928298849-325cec8771c0?q=80&w=1200&auto=format&fit=crop',
      },
    ]) {
      const product = await tx.product.create({
        data: {
          companyId: company.id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description:
            'English demo product ready for affiliate promotion and dropshipping order testing.',
          categoryId: item.categoryId,
          price: item.price,
          comparePrice: Math.round(item.price * 1.25),
          cost: item.cost,
          basePrice: item.cost,
          stock: item.stock,
          isActive: true,
          isFeatured: true,
          isDropshipped: true,
          allowAffiliateMarkup: true,
          affiliateCommission: 12,
          commissionType: 'PERCENTAGE',
          mainImage: item.image,
          images: JSON.stringify([item.image]),
          tags: 'affiliate,dropshipping,demo',
          metadata: JSON.stringify({ demo: true }),
        },
      });
      products.push(product);

      await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId: mainWarehouse.id,
          quantity: Math.floor(item.stock * 0.7),
          available: Math.floor(item.stock * 0.7),
          minStock: 5,
          maxStock: 150,
          reorderPoint: 10,
          reorderQuantity: 40,
          cost: item.cost,
          batchNumber: `${item.sku}-MAIN`,
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId: backupWarehouse.id,
          quantity: item.stock - Math.floor(item.stock * 0.7),
          available: item.stock - Math.floor(item.stock * 0.7),
          minStock: 3,
          maxStock: 80,
          reorderPoint: 8,
          reorderQuantity: 25,
          cost: item.cost,
          batchNumber: `${item.sku}-BACKUP`,
        },
      });
    }

    const merchantUser = await createUserWithCompany(tx, {
      email: merchantEmail,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Merchant',
      phone: '+201000000901',
      role: 'MERCHANT',
      companyId: company.id,
    });

    const merchant = await tx.merchant.create({
      data: {
        companyId: company.id,
        name: 'Demo Supplier Hub',
        email: merchantEmail,
        phone: '+201000000901',
        address: 'Cairo, Egypt',
        commissionRate: 10,
        autoFulfill: false,
        fulfillmentMode: 'COMPANY_WAREHOUSE',
        defaultWarehouseId: mainWarehouse.id,
        defaultShippingCompanyId: shippingCompanies[0].id,
        apiKey: crypto.randomBytes(32).toString('hex'),
        settings: JSON.stringify({ demo: true }),
      },
    });

    for (const product of products) {
      await tx.merchantProduct.create({
        data: {
          merchantId: merchant.id,
          productId: product.id,
          merchantSku: `SUP-${product.sku}`,
          merchantPrice: Number(product.cost || 0),
          stock: product.stock,
          isActive: true,
          syncEnabled: true,
        },
      });
    }

    const affiliateUser = await createUserWithCompany(tx, {
      email: affiliateEmail,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Marketer',
      phone: '+201000000902',
      role: 'AFFILIATE',
      companyId: company.id,
      userCompanyRole: 'AFFILIATE',
    });

    const affiliate = await tx.affiliate.create({
      data: {
        userId: affiliateUser.id,
        companyId: company.id,
        affiliateCode: `DEMO${stamp.slice(-8)}`,
        commissionType: 'PERCENTAGE',
        commissionRate: 12,
        status: 'ACTIVE',
        paymentMethod: 'WALLET',
        paymentDetails: JSON.stringify({ wallet: '+201000000902' }),
        minPayout: 100,
        totalEarnings: 93,
        pendingEarnings: 93,
        totalSales: 1,
        totalClicks: 14,
        conversionRate: 7.14,
      },
    });

    const customer = await tx.customer.create({
      data: {
        companyId: company.id,
        firstName: 'Sarah',
        lastName: 'Demo',
        email: `sarah.demo+${stamp}@maxp.online`,
        phone: '+201000000903',
        status: 'ACTIVE',
        tags: 'affiliate-demo',
      },
    });

    const order = await tx.order.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        orderNumber: `AFD-${stamp}`,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 775,
        shipping: 55,
        discount: 0,
        total: 830,
        currency: 'EGP',
        customerName: 'Sarah Demo',
        customerPhone: '+201000000903',
        customerEmail: customer.email,
        customerAddress: 'Nasr City, Cairo',
        shippingAddress: 'Nasr City, Cairo',
        city: 'Cairo',
        governorate: 'Cairo',
        sourceType: 'affiliate_demo',
        orderSource: 'AFFILIATE_DIRECT',
        affiliateId: affiliate.id,
        isDropshipped: true,
        createdBy: owner.id,
        createdByName: 'Demo Owner',
        notes: 'Seeded demo order for affiliate and merchant portal testing.',
        orderItems: {
          create: [
            {
              productId: products[0].id,
              productName: products[0].name,
              productSku: products[0].sku,
              quantity: 1,
              price: 775,
              total: 775,
              basePrice: Number(products[0].cost || 0),
              merchantPrice: Number(products[0].cost || 0),
              productImage: products[0].mainImage,
            },
          ],
        },
      },
    });

    const merchantOrder = await tx.merchantOrder.create({
      data: {
        merchantId: merchant.id,
        orderId: order.id,
        merchantOrderId: `MO-${stamp}`,
        status: 'CONFIRMED',
        items: JSON.stringify([
          {
            productId: products[0].id,
            name: products[0].name,
            sku: products[0].sku,
            quantity: 1,
          },
        ]),
        totalAmount: 490,
        shippingAddress: 'Nasr City, Cairo',
        fulfillmentSource: 'COMPANY_WAREHOUSE',
        warehouseId: mainWarehouse.id,
        shippingCompanyId: shippingCompanies[0].id,
        notes: 'Demo merchant order connected to the seeded affiliate order.',
      },
    });

    await tx.shipment.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        merchantOrderId: merchantOrder.id,
        merchantId: merchant.id,
        fulfillmentSource: 'COMPANY_WAREHOUSE',
        warehouseId: mainWarehouse.id,
        shippingCompanyId: shippingCompanies[0].id,
        carrierType: 'TURBO',
        status: 'PENDING',
        trackingNumber: `TRB-${stamp.slice(-8)}`,
        serviceLevel: 'Demo Same-Day',
        cost: 55,
        destinationGovernorate: 'Cairo',
        destinationCity: 'Nasr City',
        destinationAddress: 'Nasr City, Cairo',
        metadata: JSON.stringify({ demo: true }),
      },
    });

    await tx.commission.createMany({
      data: [
        {
          orderId: order.id,
          affiliateId: affiliate.id,
          type: 'AFFILIATE',
          calculationType: 'PERCENTAGE',
          amount: 93,
          rate: 12,
          baseAmount: 775,
          status: 'CONFIRMED',
          orderTotal: 830,
          companyId: company.id,
          notes: 'Demo affiliate commission.',
        },
        {
          orderId: order.id,
          merchantId: merchant.id,
          type: 'MERCHANT',
          calculationType: 'PERCENTAGE',
          amount: 49,
          rate: 10,
          baseAmount: 490,
          status: 'CONFIRMED',
          orderTotal: 830,
          companyId: company.id,
          notes: 'Demo merchant commission.',
        },
      ],
    });

    return {
      company,
      owner,
      merchantUser,
      affiliateUser,
      merchant,
      affiliate,
      appInstall,
      counts: {
        products: products.length,
        warehouses: 2,
        shippingCompanies: shippingCompanies.length,
        orders: 1,
      },
    };
  });

  const publicBaseUrl = process.env.FRONTEND_URL || 'https://maxp.online';

  console.log(JSON.stringify({
    success: true,
    company: {
      id: result.company.id,
      name: result.company.name,
      slug: result.company.slug,
      sidebarLayout: result.company.sidebarLayout,
    },
    urls: {
      ownerLogin: `${publicBaseUrl}/auth/login?lang=en`,
      companyLinks: `${publicBaseUrl}/company-links?lang=en`,
      affiliateRegister: `${publicBaseUrl}/affiliate-register/${result.company.slug}?lang=en`,
      merchantRegister: `${publicBaseUrl}/register/merchant?lang=en`,
    },
    credentials: {
      owner: result.owner.email,
      affiliate: result.affiliateUser.email,
      merchant: result.merchantUser.email,
      password: config.password,
    },
    appInstall: result.appInstall,
    counts: result.counts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[seed_affiliate_demo_company_prod] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
