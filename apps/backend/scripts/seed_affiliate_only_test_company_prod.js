const { t: i18n } = require('./i18n');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

dotenv.config({ path: path.join(__dirname, '..', '.env.production'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

if (process.env.CONFIRM_PROD_AFFILIATE_ONLY_SEED !== 'YES') {
  throw new Error(
    'Set CONFIRM_PROD_AFFILIATE_ONLY_SEED=YES before running this production seed.',
  );
}

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
      timeout: 45000,
    },
  });
}

const prisma = createSeedPrismaClient();

const stamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);

const config = {
  companyName: process.env.AFF_ONLY_COMPANY_NAME || i18n.t('msg.9e6dc56a'),
  baseSlug: process.env.AFF_ONLY_COMPANY_SLUG || 'link',
  ownerEmail:
    process.env.AFF_ONLY_OWNER_EMAIL || `link.owner+${stamp}@maxp.online`,
  activeAffiliateEmail:
    process.env.AFF_ONLY_AFFILIATE_EMAIL || `link.aff+${stamp}@maxp.online`,
  pendingAffiliateEmail:
    process.env.AFF_ONLY_PENDING_AFFILIATE_EMAIL ||
    `link.pending+${stamp}@maxp.online`,
  password: process.env.AFF_ONLY_PASSWORD || `Link#${stamp.slice(0, 8)}!`,
};

const ONLY_ENABLED_APP_SLUGS = ['affiliate-pro'];

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'link';
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

async function installAffiliateOnlyApp(tx, companyId) {
  const apps = await tx.marketplaceApp.findMany({
    where: {
      slug: { in: ONLY_ENABLED_APP_SLUGS },
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  const missing = ONLY_ENABLED_APP_SLUGS.filter(
    (slug) => !apps.some((app) => app.slug === slug),
  );

  if (missing.length > 0) {
    throw new Error(`Missing active marketplace apps: ${missing.join(', ')}`);
  }

  for (const app of apps) {
    await tx.companyApp.create({
      data: {
        companyId,
        appId: app.id,
        status: 'ACTIVE',
        activePricingModel: 'SUBSCRIPTION',
        settings: {
          installedBy: 'codex-production-affiliate-only-seed',
          reason: 'affiliate-only-external-review',
        },
      },
    });
  }

  return apps;
}

async function createUser(tx, {
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

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function createAffiliate(tx, {
  user,
  companyId,
  code,
  status,
  pendingEarnings = 0,
  paidEarnings = 0,
  totalSales = 0,
  totalClicks = 0,
}) {
  return tx.affiliate.create({
    data: {
      userId: user.id,
      companyId,
      affiliateCode: code,
      commissionType: 'PERCENTAGE',
      commissionRate: 10,
      status,
      paymentMethod: 'WALLET',
      paymentDetails: JSON.stringify({ wallet: user.phone || '+201010000000' }),
      minPayout: 100,
      totalEarnings: money(pendingEarnings + paidEarnings),
      pendingEarnings: money(pendingEarnings),
      paidEarnings: money(paidEarnings),
      totalSales,
      totalClicks,
      conversionRate:
        totalClicks > 0 ? money((totalSales / totalClicks) * 100) : 0,
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      identityDocumentStatus: status === 'ACTIVE' ? 'APPROVED' : 'NOT_SUBMITTED',
      reviewedAt: status === 'ACTIVE' ? new Date() : null,
      reviewedBy: status === 'ACTIVE' ? 'codex-production-seed' : null,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(config.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const companySlug = await uniqueCompanySlug(tx, config.baseSlug);
    const ownerEmail = await uniqueEmail(tx, config.ownerEmail);
    const activeAffiliateEmail = await uniqueEmail(tx, config.activeAffiliateEmail);
    const pendingAffiliateEmail = await uniqueEmail(
      tx,
      config.pendingAffiliateEmail,
    );

    const company = await tx.company.create({
      data: {
        name: config.companyName,
        slug: companySlug,
        email: ownerEmail,
        phone: '+201010040001',
        currency: 'EGP',
        plan: 'PRO',
        isActive: true,
        sidebarLayout: 'affiliate-only',
        timezone: 'Africa/Cairo',
        settings: JSON.stringify({
          language: 'ar',
          demoPreset: 'affiliate-only-review',
          demoCreatedAt: new Date().toISOString(),
          enabledAppsScope: ONLY_ENABLED_APP_SLUGS,
        }),
      },
    });

    const owner = await createUser(tx, {
      email: ownerEmail,
      passwordHash,
      firstName: i18n.t('msg.99d7ff35'),
      lastName: i18n.t('msg.9e6dc56a'),
      phone: '+201010040001',
      role: 'OWNER',
      companyId: company.id,
      userCompanyRole: 'OWNER',
    });

    const installedApps = await installAffiliateOnlyApp(tx, company.id);

    await tx.affiliateSetting.create({
      data: {
        companyId: company.id,
        commissionType: 'PERCENTAGE',
        commissionRate: 10,
        cookieDuration: 30,
        termsAndConditions:
          i18n.t('msg.de541c4b'),
        isActive: true,
        autoApproveAffiliates: true,
        defaultMinPayout: 100,
        defaultCanCreateOrdersForOthers: true,
        defaultCanViewCustomerData: true,
        requireIdentityDocument: false,
        payoutSlaDays: 2,
        platformMarginType: 'FIXED',
        platformMarginValue: 20,
      },
    });

    const warehouse = await tx.warehouse.create({
      data: {
        companyId: company.id,
        name: i18n.t('msg.7b6724b7'),
        location: i18n.t('msg.98dfb7b0'),
        type: 'main',
        capacity: 500,
        isActive: true,
      },
    });

    const category = await tx.category.create({
      data: {
        companyId: company.id,
        name: i18n.t('msg.a72a9099'),
        slug: 'demo-products',
        description: i18n.t('msg.820e18d1'),
        isActive: true,
        displayType: 'default',
      },
    });

    const productSeeds = [
      {
        name: i18n.t('msg.b2b06c3d'),
        slug: 'link-serum',
        sku: `LINK-${stamp}-SERUM`,
        price: 420,
        cost: 260,
        stock: 30,
        image:
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1200&auto=format&fit=crop',
      },
      {
        name: i18n.t('msg.e1333d1a'),
        slug: 'link-bag',
        sku: `LINK-${stamp}-BAG`,
        price: 650,
        cost: 410,
        stock: 24,
        image:
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop',
      },
      {
        name: i18n.t('msg.fb6a368c'),
        slug: 'link-headset',
        sku: `LINK-${stamp}-HEADSET`,
        price: 780,
        cost: 520,
        stock: 18,
        image:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
      },
    ];

    const products = [];
    for (const item of productSeeds) {
      const product = await tx.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: i18n.t('msg.cc9c85ed'),
          price: item.price,
          comparePrice: Math.round(item.price * 1.2),
          cost: item.cost,
          basePrice: item.cost,
          stock: item.stock,
          isActive: true,
          isFeatured: true,
          allowAffiliateMarkup: true,
          affiliateCommission: 10,
          commissionType: 'PERCENTAGE',
          mainImage: item.image,
          images: JSON.stringify([item.image]),
          tags: 'affiliate-only,demo,link',
          metadata: JSON.stringify({
            demo: true,
            seed: 'affiliate-only-production-review',
          }),
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: item.stock,
          available: item.stock,
          minStock: 3,
          maxStock: 100,
          reorderPoint: 5,
          reorderQuantity: 15,
          cost: item.cost,
          batchNumber: `${item.sku}-MAIN`,
        },
      });

      products.push(product);
    }

    const activeAffiliateUser = await createUser(tx, {
      email: activeAffiliateEmail,
      passwordHash,
      firstName: i18n.t('msg.48ec9f15'),
      lastName: i18n.t('msg.8caaf953'),
      phone: '+201010040002',
      role: 'AFFILIATE',
      companyId: company.id,
      userCompanyRole: 'AFFILIATE',
    });

    const pendingAffiliateUser = await createUser(tx, {
      email: pendingAffiliateEmail,
      passwordHash,
      firstName: i18n.t('msg.48ec9f15'),
      lastName: i18n.t('msg.f73ee1fe'),
      phone: '+201010040003',
      role: 'AFFILIATE',
      companyId: company.id,
      userCompanyRole: 'AFFILIATE',
    });

    const activeAffiliate = await createAffiliate(tx, {
      user: activeAffiliateUser,
      companyId: company.id,
      code: `LINK${stamp.slice(-8)}`,
      status: 'ACTIVE',
      pendingEarnings: 142,
      paidEarnings: 70,
      totalSales: 4,
      totalClicks: 76,
    });

    const pendingAffiliate = await createAffiliate(tx, {
      user: pendingAffiliateUser,
      companyId: company.id,
      code: `LINKP${stamp.slice(-7)}`,
      status: 'PENDING',
      totalClicks: 8,
    });

    await tx.affiliateReviewLog.createMany({
      data: [
        {
          affiliateId: activeAffiliate.id,
          companyId: company.id,
          actorUserId: owner.id,
          eventType: 'APPROVED',
          title: i18n.t('msg.b4a15843'),
          note: i18n.t('msg.0c554bba'),
          nextStatus: 'ACTIVE',
          nextDocumentStatus: 'APPROVED',
        },
        {
          affiliateId: pendingAffiliate.id,
          companyId: company.id,
          actorUserId: owner.id,
          eventType: 'REGISTERED',
          title: i18n.t('msg.d12deb68'),
          note: i18n.t('msg.3c3be9d4'),
          nextStatus: 'PENDING',
          nextDocumentStatus: 'NOT_SUBMITTED',
        },
      ],
    });

    for (const [index, product] of products.entries()) {
      const markup = [35, 45, 55][index];
      await tx.affiliateProduct.create({
        data: {
          affiliateId: activeAffiliate.id,
          productId: product.id,
          basePrice: product.basePrice || product.price,
          markup,
          finalPrice: Number(product.price) + markup,
          isActive: true,
        },
      });
    }

    const customers = [];
    for (let index = 1; index <= 4; index += 1) {
      customers.push(
        await tx.customer.create({
          data: {
            companyId: company.id,
            firstName: i18n.t('msg.a1d0c2aci18n.t('msg.b45f4917')ACTIVE',
            tags: 'affiliate-only-demo',
          },
        }),
      );
    }

    const orderSeeds = [
      {
        index: 1,
        status: 'DELIVERED',
        product: products[0],
        quantity: 1,
        commissionStatus: 'PAID',
        commissionAmount: 70,
      },
      {
        index: 2,
        status: 'CONFIRMED',
        product: products[1],
        quantity: 1,
        commissionStatus: 'CONFIRMED',
        commissionAmount: 65,
      },
      {
        index: 3,
        status: 'PENDING',
        product: products[2],
        quantity: 1,
        commissionStatus: 'PENDING',
        commissionAmount: 77,
      },
      {
        index: 4,
        status: 'CANCELLED',
        product: products[0],
        quantity: 2,
        commissionStatus: 'CANCELLED',
        commissionAmount: 0,
      },
    ];

    const orders = [];
    const commissions = [];
    for (const seed of orderSeeds) {
      const productPrice = Number(seed.product.price);
      const subtotal = productPrice * seed.quantity;
      const shipping = seed.status === 'CANCELLED' ? 0 : 35;
      const total = subtotal + shipping;

      const order = await tx.order.create({
        data: {
          companyId: company.id,
          customerId: customers[seed.index - 1].id,
          orderNumber: `LINK-${stamp}-${String(seed.index).padStart(2, '0')}`,
          status: seed.status,
          paymentStatus:
            seed.status === 'DELIVERED' ? 'COMPLETED' : 'PENDING',
          paymentMethod: 'CASH',
          subtotal,
          shipping,
          discount: 0,
          total,
          currency: 'EGP',
          customerName: `${customers[seed.index - 1].firstName} ${
            customers[seed.index - 1].lastName
          }`,
          customerPhone: customers[seed.index - 1].phone,
          customerEmail: customers[seed.index - 1].email,
          customerAddress: i18n.t('msg.014c2400'),
          shippingAddress: i18n.t('msg.014c2400'),
          city: i18n.t('msg.98dfb7b0'),
          governorate: i18n.t('msg.98dfb7b0'),
          sourceType: 'affiliate_direct',
          orderSource: 'AFFILIATE_DIRECT',
          affiliateId: activeAffiliate.id,
          createdBy: owner.id,
          createdByName: i18n.t('msg.f701e76c'),
          notes: i18n.t('msg.454b6962'),
          orderItems: {
            create: [
              {
                productId: seed.product.id,
                productName: seed.product.name,
                productSku: seed.product.sku,
                quantity: seed.quantity,
                price: productPrice,
                total: subtotal,
                basePrice: Number(seed.product.basePrice || seed.product.cost),
                productImage: seed.product.mainImage,
              },
            ],
          },
        },
      });

      const referral = await tx.affiliateReferral.create({
        data: {
          affiliateId: activeAffiliate.id,
          customerId: customers[seed.index - 1].id,
          orderId: order.id,
          referralCode: activeAffiliate.affiliateCode,
          referralUrl: `https://example.com/link-affiliate-${seed.index}`,
          source: 'seeded-review',
          converted: seed.status !== 'PENDING' && seed.status !== 'CANCELLED',
          convertedAt:
            seed.status !== 'PENDING' && seed.status !== 'CANCELLED'
              ? new Date()
              : null,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { affiliateReferralId: referral.id },
      });

      const commission = await tx.commission.create({
        data: {
          orderId: order.id,
          affiliateId: activeAffiliate.id,
          type: 'AFFILIATE',
          calculationType: 'PERCENTAGE',
          amount: seed.commissionAmount,
          rate: 10,
          baseAmount: subtotal,
          status: seed.commissionStatus,
          orderTotal: total,
          companyId: company.id,
          paidAt: seed.commissionStatus === 'PAIDi18n.t('msg.1cd655ab')PAID',
    );
    const payout = await tx.affiliatePayout.create({
      data: {
        affiliateId: activeAffiliate.id,
        amount: 70,
        currency: 'EGP',
        status: 'PROCESSED',
        paymentMethod: 'WALLET',
        paymentDetails: JSON.stringify({ wallet: '+201010040002' }),
        transactionId: `LINK-PAY-${stamp}`,
        externalReference: `LINK-AFF-PAYOUT-${stamp}`,
        processedAt: new Date(),
        processedBy: owner.id,
        isExternalPayment: true,
        externalPaymentDate: new Date(),
        notes: i18n.t('msg.5953734b'),
      },
    });

    if (paidCommission) {
      await tx.commission.update({
        where: { id: paidCommission.id },
        data: { payoutId: payout.id },
      });
    }

    const activeCompanyApps = await tx.companyApp.findMany({
      where: { companyId: company.id, status: 'ACTIVE' },
      select: {
        app: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      company,
      owner,
      activeAffiliateUser,
      pendingAffiliateUser,
      activeAffiliate,
      pendingAffiliate,
      installedApps,
      activeCompanyApps,
      counts: {
        products: products.length,
        affiliates: 2,
        orders: orders.length,
        commissions: commissions.length,
        payouts: 1,
        warehouses: 1,
      },
    };
  });

  const configuredPublicUrl =
    process.env.FRONTEND_URL ||
    String(process.env.CORS_ORIGIN || '')
      .split(',')
      .map((value) => value.trim())
      .find((value) => value.startsWith('https://')) ||
    'https://mokhtarelhenawy.online';

  console.log(
    JSON.stringify(
      {
        success: true,
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
          plan: result.company.plan,
          sidebarLayout: result.company.sidebarLayout,
        },
        urls: {
          login: `${configuredPublicUrl}/auth/login`,
          affiliateManagement: `${configuredPublicUrl}/affiliates/management`,
          affiliateSettings: `${configuredPublicUrl}/affiliates/settings`,
          affiliateDashboard: `${configuredPublicUrl}/affiliates/dashboard`,
          affiliateRegister: `${configuredPublicUrl}/affiliate-register/${result.company.slug}`,
        },
        credentials: {
          owner: result.owner.email,
          activeAffiliate: result.activeAffiliateUser.email,
          pendingAffiliate: result.pendingAffiliateUser.email,
          password: config.password,
        },
        affiliateCodes: {
          active: result.activeAffiliate.affiliateCode,
          pending: result.pendingAffiliate.affiliateCode,
        },
        activeApps: result.activeCompanyApps.map((companyApp) => companyApp.app),
        counts: result.counts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('[seed_affiliate_only_test_company_prod] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
