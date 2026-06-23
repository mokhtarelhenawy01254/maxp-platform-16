const fs = require('fs');
const path = require('path');
const express = require('express');
const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.START_INLINE_WEBHOOK_WORKER = 'false';

const {
  initializeSharedDatabase,
  getSharedPrismaClientAsync,
  closeSharedDatabase,
} = require('../../services/sharedDatabase');
const dropshippingService = require('../../services/dropshippingService');
const { getJwtSecret, getJwtRefreshSecret } = require('../../utils/jwtSecret');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/public/affiliates', require('../../routes/publicAffiliateRoutes'));
app.use('/api/v1/public/merchants', require('../../routes/publicMerchantRoutes'));
app.use('/api/v1/affiliate-settings', require('../../routes/affiliateSettingsRoutes'));
app.use('/api/v1/merchants', require('../../routes/merchantRoutes'));
app.use('/api/v1/merchant-portal', require('../../routes/merchantPortalRoutes'));
app.use('/api/v1/affiliates', require('../../routes/affiliateRoutes'));
app.use('/api/v1/commissions', require('../../routes/commissionRoutes'));
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});
const request = supertest(app);

const results = [];

const stamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);
const runId = `codex-affiliate-full-uat-${stamp}`;
const password = `CodexUat#${stamp}`;

function safe(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'bigint') return item.toString();
    if (item && typeof item === 'object' && item.constructor?.name === 'Decimal') {
      return item.toString();
    }
    return item;
  }));
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function step(id, title, fn) {
  const startedAt = Date.now();
  try {
    const data = await fn();
    results.push({
      id,
      title,
      status: 'PASS',
      durationMs: Date.now() - startedAt,
      data: safe(data),
    });
    console.log(`PASS ${id} - ${title}`);
    return data;
  } catch (error) {
    results.push({
      id,
      title,
      status: 'FAIL',
      durationMs: Date.now() - startedAt,
      error: error.message,
      details: safe(error.details),
    });
    console.error(`FAIL ${id} - ${title}: ${error.message}`);
    throw error;
  }
}

async function api(method, url, { token, body, expected = 200 } = {}) {
  let req = request[method](url).set('Accept', 'application/json');
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) req = req.send(body);
  const response = await req;

  if (response.status !== expected) {
    const error = new Error(`Expected HTTP ${expected}, got ${response.status} for ${method.toUpperCase()} ${url}`);
    error.details = response.body || response.text;
    throw error;
  }

  return response.body;
}

async function createRegisteredCompany(prisma, { suffix, companyName }) {
  const email = `${suffix}+${runId}@codex-uat.local`;
  const slug = `${suffix}-${runId}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      email,
      phone: suffix === 'owner' ? '+201000000501' : '+201000000502',
      isActive: true,
      sidebarLayout: 'three-tier',
      timezone: 'Africa/Cairo',
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Codex',
      lastName: suffix === 'owner' ? 'Owner' : 'Isolation Owner',
      phone: suffix === 'owner' ? '+201000000501' : '+201000000502',
      role: 'OWNER',
      companyId: company.id,
      isActive: true,
      timezone: 'Africa/Cairo',
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: 'OWNER',
      isActive: true,
      isDefault: true,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, companyId: company.id },
    getJwtSecret(),
    { expiresIn: '24h' },
  );
  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role, companyId: company.id },
    getJwtRefreshSecret(),
    { expiresIn: '7d' },
  );

  return {
    token,
    refreshToken,
    user: {
      ...user,
      company,
    },
    company,
    email,
  };
}

function createUserToken(user, companyId = user.companyId) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, companyId },
    getJwtSecret(),
    { expiresIn: '24h' },
  );
}

async function loadMerchantUser(prisma, email, companyId) {
  const merchantUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
  });

  assert(merchantUser, 'Merchant login user was not created', { email });
  assert(merchantUser.role === 'MERCHANT', 'Merchant user should have MERCHANT role', merchantUser);
  assert(merchantUser.companyId === companyId, 'Merchant user should be linked to target company', merchantUser);

  return merchantUser;
}

async function main() {
  await initializeSharedDatabase();
  const prisma = await getSharedPrismaClientAsync();

  const context = {
    runId,
    password,
    urls: {},
  };

  const primary = await step('SETUP-01', 'إنشاء شركة جديدة من البداية بمالك وصلاحية OWNER', async () => {
    const created = await createRegisteredCompany(prisma, {
      suffix: 'owner',
      companyName: `Codex Affiliate UAT ${stamp}`,
    });
    assert(created.company?.id, 'Company id missing from register response', created);
    assert(created.company?.slug, 'Company slug missing from register response', created);
    context.owner = created;
    context.companyId = created.company.id;
    context.companySlug = created.company.slug;
    context.urls.ownerLogin = 'http://localhost:3000/auth/login';
    context.urls.affiliateRegister = `http://localhost:3000/affiliate-register/${context.companySlug}`;
    context.urls.merchantRegister = 'http://localhost:3000/register/merchant';
    context.urls.merchantPortal = 'http://localhost:3000/merchant-portal';
    return {
      companyId: context.companyId,
      companySlug: context.companySlug,
      ownerEmail: created.email,
    };
  });

  await step('SETUP-02', 'إنشاء شركة ثانية لاختبار عزل الشركات', async () => {
    const created = await createRegisteredCompany(prisma, {
      suffix: 'isolation-owner',
      companyName: `Codex Isolation UAT ${stamp}`,
    });
    context.otherOwner = created;
    return {
      companyId: created.company.id,
      companySlug: created.company.slug,
      ownerEmail: created.email,
    };
  });

  await step('SP-01A', 'إغلاق برنامج الأفليت من إعدادات الشركة', async () => {
    const response = await api('put', '/api/v1/affiliate-settings', {
      token: context.owner.token,
      body: {
        commissionType: 'PERCENTAGE',
        commissionRate: 12,
        cookieDuration: 45,
        termsAndConditions: `شروط UAT لبرنامج ${runId}`,
        isActive: false,
        platformMarginType: 'FIXED',
        platformMarginValue: 25,
      },
    });
    assert(response.success === true, 'Affiliate settings inactive update failed', response);
    return response.data;
  });

  await step('AF-03', 'منع تسجيل المسوق عند إغلاق البرنامج', async () => {
    const response = await api('post', '/api/v1/public/affiliates/register', {
      expected: 403,
      body: {
        companySlug: context.companySlug,
        email: `blocked-affiliate+${runId}@codex-uat.local`,
        password,
        firstName: 'Blocked',
        lastName: 'Affiliate',
        phone: '+201000000510',
      },
    });
    assert(response.success === false, 'Inactive affiliate registration should fail', response);
    return { message: response.message };
  });

  await step('SP-01B/SP-02', 'فتح البرنامج وحفظ إعدادات العمولات والهامش والشروط', async () => {
    const response = await api('put', '/api/v1/affiliate-settings', {
      token: context.owner.token,
      body: {
        commissionType: 'PERCENTAGE',
        commissionRate: 12,
        cookieDuration: 45,
        termsAndConditions: `شروط UAT لبرنامج ${runId}`,
        isActive: true,
        platformMarginType: 'FIXED',
        platformMarginValue: 25,
      },
    });
    assert(response.data.platformMarginType === 'FIXED', 'Platform margin type was not saved', response);
    assert(Number(response.data.platformMarginValue) === 25, 'Platform margin value was not saved', response);
    return response.data;
  });

  await step('AF-02A', 'تحميل بيانات الشركة العامة وشروط الأفليت عبر slug', async () => {
    const response = await api('get', `/api/v1/public/affiliates/companies/${context.companySlug}`);
    assert(response.data?.id === context.companyId, 'Public company lookup returned wrong company', response);
    assert(response.data.affiliateProgram?.isActive === true, 'Affiliate program should be active', response);
    assert(response.data.affiliateProgram?.termsAndConditions?.includes(runId), 'Custom terms missing from public lookup', response);
    return response.data;
  });

  await step('AF-05', 'رفض رابط شركة غير صالح', async () => {
    const response = await api('get', `/api/v1/public/affiliates/companies/not-found-${runId}`, {
      expected: 404,
    });
    assert(response.success === false, 'Invalid company slug should fail', response);
    return { message: response.message };
  });

  await step('AF-05B', 'رفض تسجيل مسوق على slug شركة غير صالح', async () => {
    const response = await api('post', '/api/v1/public/affiliates/register', {
      expected: 400,
      body: {
        companySlug: `not-found-${runId}`,
        email: `affiliate-invalid-company+${runId}@codex-uat.local`,
        password,
        firstName: 'Invalid',
        lastName: 'Company',
        paymentMethod: 'BANK_TRANSFER',
        paymentDetails: 'Invalid company must reject before create',
      },
    });
    assert(response.success === false, 'Invalid company slug registration should fail', response);
    return { message: response.message };
  });

  await step('DATA-01', 'إنشاء منتجات اختبار للشركة الجديدة', async () => {
    const productA = await prisma.product.create({
      data: {
        companyId: context.companyId,
        name: `UAT Hero Dropship Bag ${stamp}`,
        description: 'منتج UAT للتاجر الأول والمسوق',
        sku: `UAT-BAG-${stamp}`,
        slug: `uat-bag-${stamp}`,
        price: 1000,
        comparePrice: 1200,
        cost: 650,
        stock: 40,
        isActive: true,
        isFeatured: true,
        allowAffiliateMarkup: true,
        commissionType: 'PERCENTAGE',
        affiliateCommission: 12,
        source: 'uat',
      },
    });

    const productB = await prisma.product.create({
      data: {
        companyId: context.companyId,
        name: `UAT Split Merchant Watch ${stamp}`,
        description: 'منتج UAT للتاجر الثاني وتقسيم الطلب',
        sku: `UAT-WATCH-${stamp}`,
        slug: `uat-watch-${stamp}`,
        price: 620,
        comparePrice: 760,
        cost: 360,
        stock: 25,
        isActive: true,
        isFeatured: true,
        allowAffiliateMarkup: true,
        commissionType: 'PERCENTAGE',
        affiliateCommission: 12,
        source: 'uat',
      },
    });

    context.productA = productA;
    context.productB = productB;
    return {
      products: [
        { id: productA.id, sku: productA.sku },
        { id: productB.id, sku: productB.sku },
      ],
    };
  });

  await step('DATA-02', 'إنشاء مخازن وشركات شحن وربط مخزون الشركة بالمنتج الثاني', async () => {
    const [mainWarehouse, backupWarehouse] = await Promise.all([
      prisma.warehouse.create({
        data: {
          companyId: context.companyId,
          name: `UAT Main Warehouse ${stamp}`,
          location: 'القاهرة - مدينة نصر',
          type: 'main',
          isActive: true,
        },
      }),
      prisma.warehouse.create({
        data: {
          companyId: context.companyId,
          name: `UAT Backup Warehouse ${stamp}`,
          location: 'الجيزة',
          type: 'backup',
          isActive: true,
        },
      }),
    ]);

    const [fastShipping, economyShipping] = await Promise.all([
      prisma.shippingCompany.create({
        data: {
          companyId: context.companyId,
          name: `UAT Fast Ship ${stamp}`,
          slug: `uat-fast-${stamp}`,
          phone: '+201000000560',
          isActive: true,
        },
      }),
      prisma.shippingCompany.create({
        data: {
          companyId: context.companyId,
          name: `UAT Economy Ship ${stamp}`,
          slug: `uat-economy-${stamp}`,
          phone: '+201000000561',
          isActive: true,
        },
      }),
    ]);

    const inventory = await prisma.inventory.create({
      data: {
        productId: context.productB.id,
        warehouseId: mainWarehouse.id,
        quantity: 10,
        available: 10,
        reserved: 0,
        minStock: 1,
        reorderPoint: 2,
        cost: 360,
        batchNumber: `BATCH-${stamp}`,
      },
    });

    context.mainWarehouse = mainWarehouse;
    context.backupWarehouse = backupWarehouse;
    context.fastShipping = fastShipping;
    context.economyShipping = economyShipping;
    context.productBInventory = inventory;

    return {
      warehouses: [mainWarehouse.id, backupWarehouse.id],
      shippingCompanies: [fastShipping.id, economyShipping.id],
      productBInventory: {
        id: inventory.id,
        available: inventory.available,
        reserved: inventory.reserved,
      },
    };
  });

  await step('MR-02', 'تسجيل تاجر على الشركة من الدومين الرئيسي باستخدام slug بدون اعتماد إعدادات تشغيل من التاجر', async () => {
    context.merchantAEmail = `merchant-auto+${runId}@codex-uat.local`;
    const response = await api('post', '/api/v1/public/merchants/register', {
      body: {
        companyId: context.companySlug,
        name: `UAT Auto Merchant ${stamp}`,
        email: context.merchantAEmail,
        password,
        phone: '+201000000520',
        address: 'مدينة نصر - القاهرة',
        commissionRate: 9,
        autoFulfill: true,
        webhookUrl: `https://example.com/${runId}/auto`,
      },
    });
    assert(response.success === true, 'Public merchant registration failed', response);
    assert(response.data.companyId === context.companyId, 'Merchant not linked to target company', response);
    assert(Number(response.data.commissionRate) === 10, 'Public merchant should not set its own commission rate', response.data);
    assert(response.data.autoFulfill === false, 'Public merchant should not enable auto fulfill itself', response.data);
    assert(!response.data.webhookUrl, 'Public merchant should not set its own webhook URL', response.data);
    assert(response.data.isActive === false, 'Public merchant should wait for company approval before portal access', response.data);
    context.merchantA = response.data;

    const pendingMerchantUser = await loadMerchantUser(prisma, context.merchantAEmail, context.companyId);
    assert(pendingMerchantUser.isActive === false, 'Public merchant user should be inactive until company approval', pendingMerchantUser);

    const pendingPortal = await api('get', '/api/v1/merchant-portal/me', {
      token: createUserToken(pendingMerchantUser, context.companyId),
      expected: 403,
    });
    assert(pendingPortal.success === false, 'Pending merchant should be blocked from portal', pendingPortal);

    return {
      merchant: response.data,
      pendingPortalMessage: pendingPortal.message,
    };
  });

  await step('MR-02B', 'الشركة تضبط عمولة التاجر والوفاء التلقائي والـ webhook بعد التسجيل', async () => {
    const response = await api('put', `/api/v1/merchants/${context.merchantA.id}`, {
      token: context.owner.token,
      body: {
        commissionRate: 9,
        autoFulfill: true,
        isActive: true,
        fulfillmentMode: 'MERCHANT',
        defaultShippingCompanyId: context.fastShipping.id,
        webhookUrl: `https://example.com/${runId}/auto`,
      },
    });
    assert(response.success === true, 'Company merchant settings update failed', response);
    assert(Number(response.data.commissionRate) === 9, 'Company did not set merchant commission rate', response);
    assert(response.data.autoFulfill === true, 'Company did not enable merchant auto fulfill', response);
    assert(response.data.isActive === true, 'Company did not approve public merchant', response);
    assert(response.data.fulfillmentMode === 'MERCHANT', 'Company did not keep merchant A in merchant fulfillment mode', response);
    assert(response.data.defaultShippingCompanyId === context.fastShipping.id, 'Company did not set merchant A default shipping company', response);
    assert(response.data.webhookUrl === `https://example.com/${runId}/auto`, 'Company did not set merchant webhook URL', response);
    context.merchantA = response.data;
    return response.data;
  });

  await step('MP-01', 'التاجر العام يحصل على حساب دخول وبورتال مرتبط بنفس الشركة', async () => {
    context.merchantAUser = await loadMerchantUser(prisma, context.merchantAEmail, context.companyId);
    assert(context.merchantAUser.isActive === true, 'Company approval should activate merchant login user', context.merchantAUser);
    context.merchantAToken = createUserToken(context.merchantAUser, context.companyId);

    const profile = await api('get', '/api/v1/merchant-portal/me', {
      token: context.merchantAToken,
    });

    assert(profile.success === true, 'Merchant portal profile failed', profile);
    assert(profile.data.id === context.merchantA.id, 'Merchant portal resolved the wrong merchant', profile);

    return {
      merchantId: profile.data.id,
      merchantEmail: context.merchantAUser.email,
      role: context.merchantAUser.role,
      companyId: context.merchantAUser.companyId,
    };
  });

  await step('MR-03', 'رفض تسجيل تاجر بدون تحديد شركة', async () => {
    const response = await api('post', '/api/v1/public/merchants/register', {
      expected: 400,
      body: {
        name: `UAT Merchant Missing Company ${stamp}`,
        email: `merchant-missing-company+${runId}@codex-uat.local`,
      },
    });
    assert(response.success === false, 'Merchant registration without company should fail', response);
    return { message: response.message };
  });

  await step('MR-04', 'رفض تسجيل تاجر على شركة غير موجودة', async () => {
    const response = await api('post', '/api/v1/public/merchants/register', {
      expected: 400,
      body: {
        companyId: `missing-${runId}`,
        name: `UAT Merchant Missing Slug ${stamp}`,
        email: `merchant-missing-slug+${runId}@codex-uat.local`,
      },
    });
    assert(response.success === false, 'Merchant registration with invalid company should fail', response);
    return { message: response.message };
  });

  await step('SP-04A', 'إنشاء تاجر ثان من لوحة/صلاحيات الشركة', async () => {
    context.merchantBEmail = `merchant-manual+${runId}@codex-uat.local`;
    const response = await api('post', '/api/v1/merchants', {
      token: context.owner.token,
      body: {
        name: `UAT Manual Merchant ${stamp}`,
        email: context.merchantBEmail,
        password,
        phone: '+201000000521',
        address: 'التجمع الخامس - القاهرة',
        commissionRate: 11,
        autoFulfill: false,
        fulfillmentMode: 'COMPANY_WAREHOUSE',
        defaultWarehouseId: context.mainWarehouse.id,
        defaultShippingCompanyId: context.economyShipping.id,
      },
    });
    assert(response.success === true, 'Admin merchant creation failed', response);
    assert(response.data.fulfillmentMode === 'COMPANY_WAREHOUSE', 'Merchant B should be fulfilled from company warehouse', response);
    assert(response.data.defaultWarehouseId === context.mainWarehouse.id, 'Merchant B should have a default warehouse', response);
    assert(response.data.defaultShippingCompanyId === context.economyShipping.id, 'Merchant B should have a default shipping company', response);
    context.merchantB = response.data;
    return response.data;
  });

  await step('MP-01B', 'التاجر المنشأ من لوحة الشركة يحصل على بورتال مستقل', async () => {
    context.merchantBUser = await loadMerchantUser(prisma, context.merchantBEmail, context.companyId);
    context.merchantBToken = createUserToken(context.merchantBUser, context.companyId);

    const profile = await api('get', '/api/v1/merchant-portal/me', {
      token: context.merchantBToken,
    });

    assert(profile.data.id === context.merchantB.id, 'Admin-created merchant portal resolved the wrong merchant', profile);

    return {
      merchantId: profile.data.id,
      merchantEmail: context.merchantBUser.email,
      role: context.merchantBUser.role,
    };
  });

  await step('SP-04B', 'قائمة التجار تعرض تجار الشركة فقط', async () => {
    const response = await api('get', '/api/v1/merchants', { token: context.owner.token });
    const ids = response.data.map((merchant) => merchant.id);
    assert(ids.includes(context.merchantA.id), 'Public merchant missing from admin list', ids);
    assert(ids.includes(context.merchantB.id), 'Admin merchant missing from admin list', ids);
    return { count: response.data.length, merchantIds: ids };
  });

  await step('SP-05A', 'ربط المنتج الأول بالتاجر الأول مع هامش المنصة', async () => {
    const response = await api('post', `/api/v1/merchants/${context.merchantA.id}/products`, {
      token: context.owner.token,
      body: {
        productId: context.productA.id,
        merchantSku: `MR-A-${stamp}`,
        merchantPrice: 800,
        stock: 18,
        syncEnabled: true,
      },
    });
    assert(response.success === true, 'Merchant product A link failed', response);
    context.merchantProductA = response.data;
    return response.data;
  });

  await step('SP-05B', 'ربط المنتج الثاني بالتاجر الثاني لتقسيم الطلب', async () => {
    const response = await api('post', `/api/v1/merchants/${context.merchantB.id}/products`, {
      token: context.owner.token,
      body: {
        productId: context.productB.id,
        merchantSku: `MR-B-${stamp}`,
        merchantPrice: 420,
        stock: 0,
        syncEnabled: true,
      },
    });
    assert(response.success === true, 'Merchant product B link failed', response);
    context.merchantProductB = response.data;
    return response.data;
  });

  await step('MP-02', 'التاجر يرى منتجاته فقط ويحدّث السعر والمخزون من البورتال', async () => {
    const productsBefore = await api('get', '/api/v1/merchant-portal/products', {
      token: context.merchantAToken,
    });
    const productIds = productsBefore.data.map((item) => item.productId);
    assert(productIds.includes(context.productA.id), 'Merchant A should see product A', productsBefore);
    assert(!productIds.includes(context.productB.id), 'Merchant A should not see product B', productsBefore);

    const updated = await api('patch', `/api/v1/merchant-portal/products/${context.merchantProductA.id}`, {
      token: context.merchantAToken,
      body: {
        merchantSku: `MR-A-PORTAL-${stamp}`,
        merchantPrice: 810,
        stock: 20,
        syncEnabled: true,
      },
    });

    assert(Number(updated.data.merchantPrice) === 810, 'Merchant portal did not update merchant price', updated);
    assert(Number(updated.data.stock) === 20, 'Merchant portal did not update stock', updated);

    return {
      visibleProductIds: productIds,
      updatedMerchantProductId: updated.data.id,
      merchantPrice: updated.data.merchantPrice,
      stock: updated.data.stock,
    };
  });

  await step('MP-03', 'عزل صلاحيات البورتال بين التجار ولوحة الإدارة', async () => {
    const merchantAUpdateProductB = await api('patch', `/api/v1/merchant-portal/products/${context.merchantProductB.id}`, {
      token: context.merchantAToken,
      expected: 404,
      body: {
        stock: 10,
      },
    });

    const merchantAAdminList = await api('get', '/api/v1/merchants', {
      token: context.merchantAToken,
      expected: 403,
    });

    const merchantBProducts = await api('get', '/api/v1/merchant-portal/products', {
      token: context.merchantBToken,
    });
    const merchantBProductIds = merchantBProducts.data.map((item) => item.productId);
    assert(merchantBProductIds.includes(context.productB.id), 'Merchant B should see product B', merchantBProducts);
    assert(!merchantBProductIds.includes(context.productA.id), 'Merchant B should not see product A', merchantBProducts);

    return {
      merchantAUpdateProductB: merchantAUpdateProductB.message,
      merchantAAdminList: merchantAAdminList.message,
      merchantBProductIds,
    };
  });

  await step('SP-05C', 'إضافة تاجر أرخص لكن مخزونه غير كافي لنفس المنتج', async () => {
    const merchantResponse = await api('post', '/api/v1/merchants', {
      token: context.owner.token,
      body: {
        name: `UAT Low Stock Merchant ${stamp}`,
        email: `merchant-low-stock+${runId}@codex-uat.local`,
        phone: '+201000000522',
        address: 'اختبار اختيار المورد',
        commissionRate: 8,
        autoFulfill: false,
      },
    });
    assert(merchantResponse.success === true, 'Low-stock merchant creation failed', merchantResponse);
    context.merchantLowStock = merchantResponse.data;

    const productResponse = await api('post', `/api/v1/merchants/${context.merchantLowStock.id}/products`, {
      token: context.owner.token,
      body: {
        productId: context.productA.id,
        merchantSku: `MR-LOW-${stamp}`,
        merchantPrice: 700,
        stock: 1,
        syncEnabled: true,
      },
    });
    assert(productResponse.success === true, 'Low-stock merchant product link failed', productResponse);
    return {
      merchantId: context.merchantLowStock.id,
      merchantPrice: productResponse.data.merchantPrice,
      stock: productResponse.data.stock,
    };
  });

  await step('SP-05D', 'تشغيل مزامنة مخزون التاجر', async () => {
    const response = await api('post', `/api/v1/merchants/${context.merchantA.id}/sync`, {
      token: context.owner.token,
    });
    assert(response.success === true, 'Merchant sync failed', response);
    assert(Number(response.data.synced) >= 1, 'Expected at least one synced product', response);
    return response.data;
  });

  await step('DS-00', 'التحقق من توفر منتجات الدروب شيبنج قبل الطلب', async () => {
    const result = await dropshippingService.validateOrderItems([
      { productId: context.productA.id, quantity: 2 },
      { productId: context.productB.id, quantity: 1 },
    ]);
    assert(result.allAvailable === true, 'Dropshipping products should be available', result);
    assert(
      result.results[0].merchant.id === context.merchantA.id,
      'Dropshipping should skip cheaper merchant when stock is insufficient',
      result.results[0],
    );
    return result;
  });

  await step('AF-02B', 'تسجيل مسوق على الشركة عبر slug', async () => {
    const response = await api('post', '/api/v1/public/affiliates/register', {
      body: {
        companySlug: context.companySlug,
        email: `affiliate+${runId}@codex-uat.local`,
        password,
        firstName: 'UAT',
        lastName: 'Affiliate',
        phone: '+201000000530',
        paymentMethod: 'WALLET',
        paymentDetails: { walletPhone: '+201000000530' },
        minPayout: 50,
      },
    });
    assert(response.success === true, 'Public affiliate registration failed', response);
    assert(response.data.affiliate.companyId === context.companyId, 'Affiliate not linked to target company', response);
    assert(response.data.affiliate.status === 'PENDING', 'New affiliate should be pending', response);
    context.affiliate = response.data.affiliate;
    context.affiliateUser = response.data.user;
    context.affiliateToken = response.data.token;
    return {
      affiliateId: context.affiliate.id,
      affiliateCode: context.affiliate.affiliateCode,
      userId: context.affiliateUser.id,
    };
  });

  await step('AF-04', 'رفض البريد الإلكتروني المكرر للمسوق', async () => {
    const response = await api('post', '/api/v1/public/affiliates/register', {
      expected: 400,
      body: {
        companySlug: context.companySlug,
        email: `affiliate+${runId}@codex-uat.local`,
        password,
        firstName: 'Duplicate',
        lastName: 'Affiliate',
      },
    });
    assert(response.success === false, 'Duplicate affiliate registration should fail', response);
    return { message: response.message };
  });

  await step('AF-06A', 'المسوق المعلق يرى حسابه ولا يستطيع إنشاء طلب', async () => {
    const me = await api('get', '/api/v1/affiliates/me', { token: context.affiliateToken });
    assert(me.data.status === 'PENDING', 'Affiliate should still be pending', me);
    const orderAttempt = await api('post', '/api/v1/affiliates/orders', {
      token: context.affiliateToken,
      expected: 403,
      body: {
        items: [{ productId: context.productA.id, quantity: 1 }],
        customerData: { firstName: 'Pending', phone: '+201000000540' },
      },
    });
    return { affiliateStatus: me.data.status, rejectedMessage: orderAttempt.message };
  });

  await step('SP-03A', 'إدارة الشركة ترى المسوق وتفعله', async () => {
    const list = await api('get', '/api/v1/affiliates/list', { token: context.owner.token });
    const managed = list.data.find((affiliate) => affiliate.id === context.affiliate.id);
    assert(managed, 'New affiliate missing from admin list', list);

    await api('put', `/api/v1/affiliates/${context.affiliate.id}/status`, {
      token: context.owner.token,
      body: { status: 'ACTIVE' },
    });

    await api('put', `/api/v1/affiliates/${context.affiliate.id}/commission`, {
      token: context.owner.token,
      body: { commissionRate: 15 },
    });

    const activeAffiliate = await prisma.affiliate.findUnique({
      where: { id: context.affiliate.id },
    });
    assert(activeAffiliate.status === 'ACTIVE', 'Affiliate status was not activated', activeAffiliate);
    assert(Number(activeAffiliate.commissionRate) === 15, 'Affiliate commission was not updated', activeAffiliate);
    context.affiliate = activeAffiliate;
    return {
      affiliateId: activeAffiliate.id,
      status: activeAffiliate.status,
      commissionRate: activeAffiliate.commissionRate,
    };
  });

  await step('AF-07/AF-08', 'المسوق يضيف منتجات ويحسب سعره', async () => {
    const linkedA = await api('post', '/api/v1/affiliates/products', {
      token: context.affiliateToken,
      body: { productId: context.productA.id, markup: 75 },
    });
    const linkedB = await api('post', '/api/v1/affiliates/products', {
      token: context.affiliateToken,
      body: { productId: context.productB.id, markup: 55 },
    });
    const priceA = await api('get', `/api/v1/affiliates/products/${context.productA.id}/price`, {
      token: context.affiliateToken,
    });
    const products = await api('get', '/api/v1/affiliates/products', {
      token: context.affiliateToken,
    });
    assert(products.data.length >= 2, 'Affiliate products list should include both products', products);
    assert(Number(priceA.data.price) > 0, 'Affiliate product price should be available', priceA);
    assert(priceA.data.type === 'PERCENTAGE', 'UAT affiliate should use percentage pricing in this scenario', priceA);
    return {
      affiliateProductIds: [linkedA.data.id, linkedB.data.id],
      priceA: priceA.data,
      productCount: products.data.length,
    };
  });

  await step('SEC-01/SEC-02', 'المسوق ممنوع من أدوات الإدارة', async () => {
    const merchantList = await api('get', '/api/v1/merchants', {
      token: context.affiliateToken,
      expected: 403,
    });
    const merchantPortal = await api('get', '/api/v1/merchant-portal/me', {
      token: context.affiliateToken,
      expected: 403,
    });
    const settings = await api('get', '/api/v1/affiliate-settings', {
      token: context.affiliateToken,
      expected: 403,
    });
    const commissions = await api('get', '/api/v1/commissions', {
      token: context.affiliateToken,
      expected: 403,
    });
    return {
      merchantList: merchantList.message,
      merchantPortal: merchantPortal.message,
      settings: settings.message,
      commissions: commissions.message,
    };
  });

  await step('AF-09/DS-01/DS-02/DS-03', 'إنشاء طلب أفليت وتقسيمه على التجار مع auto fulfill', async () => {
    const orderResponse = await api('post', '/api/v1/affiliates/orders', {
      token: context.affiliateToken,
      body: {
        items: [
          { productId: context.productA.id, quantity: 2 },
          { productId: context.productB.id, quantity: 1 },
        ],
        customerData: {
          firstName: 'عميل',
          lastName: 'UAT',
          phone: '+201000000550',
          email: `customer+${runId}@codex-uat.local`,
        },
        shippingAddress: {
          address: 'شارع الاختبار، مدينة نصر',
          city: 'القاهرة',
          governorate: 'القاهرة',
          shippingCost: 40,
        },
        paymentMethod: 'CASH',
        notes: `UAT affiliate order ${runId}`,
      },
    });

    assert(orderResponse.success === true, 'Affiliate order creation failed', orderResponse);
    context.order = orderResponse.data;

    const merchantOrders = await dropshippingService.routeOrderToMerchant(context.order.id);
    const orderService = require('../../services/orderService');
    const confirmedOrder = await orderService.updateOrderStatus(
      context.order.orderNumber,
      context.companyId,
      'CONFIRMED',
      `UAT confirms affiliate order ${runId}`,
      context.owner.user.id,
      `${context.owner.user.firstName} ${context.owner.user.lastName}`.trim(),
    );
    assert(confirmedOrder.status === 'CONFIRMED', 'Affiliate order confirmation failed', confirmedOrder);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const commissionCount = await prisma.commission.count({
        where: { orderId: context.order.id },
      });
      if (commissionCount > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const refreshedOrder = await prisma.order.findUnique({
      where: { id: context.order.id },
      include: {
        merchantOrders: {
          include: {
            shipments: {
              include: {
                shippingCompany: true,
                warehouse: true,
              },
            },
          },
        },
        commissions: true,
        orderItems: true,
      },
    });

    assert(refreshedOrder.isDropshipped === true, 'Order was not marked dropshipped', refreshedOrder);
    assert(refreshedOrder.merchantOrders.length === 2, 'Expected order split across two merchants', refreshedOrder.merchantOrders);
    assert(
      refreshedOrder.merchantOrders.some((item) => item.merchantId === context.merchantA.id),
      'Expected product A to route to the sufficiently stocked merchant',
      refreshedOrder.merchantOrders,
    );
    assert(
      !refreshedOrder.merchantOrders.some((item) => item.merchantId === context.merchantLowStock.id),
      'Low-stock merchant should not receive the order even with lower price',
      refreshedOrder.merchantOrders,
    );
    assert(refreshedOrder.merchantOrders.some((item) => item.status === 'FULFILLED'), 'Expected one auto-fulfilled merchant order', refreshedOrder.merchantOrders);
    assert(refreshedOrder.merchantOrders.some((item) => item.status === 'PENDING'), 'Expected one pending merchant order for manual merchant', refreshedOrder.merchantOrders);
    const merchantAOrder = refreshedOrder.merchantOrders.find((item) => item.merchantId === context.merchantA.id);
    const merchantBOrder = refreshedOrder.merchantOrders.find((item) => item.merchantId === context.merchantB.id);
    assert(merchantAOrder?.fulfillmentSource === 'MERCHANT', 'Merchant A order should be fulfilled by merchant stock', merchantAOrder);
    assert(merchantAOrder?.shipments?.[0]?.shippingCompanyId === context.fastShipping.id, 'Merchant A shipment should use the company-selected fast carrier', merchantAOrder);
    assert(merchantBOrder?.fulfillmentSource === 'COMPANY_WAREHOUSE', 'Merchant B order should be fulfilled by company warehouse', merchantBOrder);
    assert(merchantBOrder?.warehouseId === context.mainWarehouse.id, 'Merchant B order should reserve from the default warehouse', merchantBOrder);
    assert(merchantBOrder?.shipments?.[0]?.shippingCompanyId === context.economyShipping.id, 'Merchant B shipment should use company-selected economy carrier', merchantBOrder);

    const productBInventoryAfterRoute = await prisma.inventory.findUnique({
      where: { id: context.productBInventory.id },
    });
    assert(Number(productBInventoryAfterRoute.available) === 9, 'Company warehouse available stock should be reserved by dropshipping route', productBInventoryAfterRoute);
    assert(Number(productBInventoryAfterRoute.reserved) === 1, 'Company warehouse reserved stock should increase after route', productBInventoryAfterRoute);

    const commissionTypes = new Set(refreshedOrder.commissions.map((commission) => commission.type));
    assert(commissionTypes.has('AFFILIATE'), 'Missing affiliate commission', refreshedOrder.commissions);
    assert(commissionTypes.has('MERCHANT'), 'Missing merchant commission', refreshedOrder.commissions);
    assert(commissionTypes.has('PLATFORM'), 'Missing platform commission from platform margin', refreshedOrder.commissions);

    return {
      orderId: refreshedOrder.id,
      orderNumber: refreshedOrder.orderNumber,
      total: refreshedOrder.total,
      merchantOrders: refreshedOrder.merchantOrders.map((item) => ({
        id: item.id,
        merchantId: item.merchantId,
        status: item.status,
        trackingNumber: item.trackingNumber,
        fulfillmentSource: item.fulfillmentSource,
        warehouseId: item.warehouseId,
        shipment: item.shipments?.[0] ? {
          id: item.shipments[0].id,
          shippingCompanyId: item.shipments[0].shippingCompanyId,
          warehouseId: item.shipments[0].warehouseId,
        } : null,
      })),
      commissions: refreshedOrder.commissions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        status: item.status,
      })),
      routeResultCount: merchantOrders.length,
    };
  });

  await step('MP-04', 'التاجر يرى طلباته فقط وينفذ الطلب اليدوي من البورتال', async () => {
    const merchantAOrders = await api('get', '/api/v1/merchant-portal/orders', {
      token: context.merchantAToken,
    });
    const merchantBOrders = await api('get', '/api/v1/merchant-portal/orders', {
      token: context.merchantBToken,
    });

    const merchantAOrder = merchantAOrders.data.find((item) => item.orderId === context.order.id);
    const merchantBOrder = merchantBOrders.data.find((item) => item.orderId === context.order.id);

    assert(merchantAOrder, 'Merchant A should see its routed order', merchantAOrders);
    assert(merchantBOrder, 'Merchant B should see its routed order', merchantBOrders);
    assert(merchantAOrder.status === 'FULFILLED', 'Auto-fulfill merchant order should already be fulfilled', merchantAOrder);
    assert(merchantBOrder.status === 'PENDING', 'Manual merchant order should be pending before portal update', merchantBOrder);
    assert(merchantAOrder.shipments?.[0]?.shippingCompany?.id === context.fastShipping.id, 'Merchant A portal should show fast shipping company', merchantAOrder);
    assert(merchantBOrder.fulfillmentSource === 'COMPANY_WAREHOUSE', 'Merchant B portal should expose company warehouse fulfillment', merchantBOrder);
    assert(merchantBOrder.shipments?.[0]?.warehouse?.id === context.mainWarehouse.id, 'Merchant B portal should show selected warehouse', merchantBOrder);
    assert(merchantBOrder.shipments?.[0]?.shippingCompany?.id === context.economyShipping.id, 'Merchant B portal should show economy shipping company', merchantBOrder);

    const fulfilled = await api('patch', `/api/v1/merchant-portal/orders/${merchantBOrder.id}/status`, {
      token: context.merchantBToken,
      body: {
        status: 'FULFILLED',
        trackingNumber: `TRK-${stamp}`,
        externalOrderId: `EXT-${stamp}`,
        notes: `Fulfilled by merchant portal ${runId}`,
      },
    });

    assert(fulfilled.data.status === 'FULFILLED', 'Merchant portal did not fulfill order', fulfilled);
    assert(fulfilled.data.trackingNumber === `TRK-${stamp}`, 'Tracking number was not saved', fulfilled);
    const productBInventoryAfterFulfill = await prisma.inventory.findUnique({
      where: { id: context.productBInventory.id },
    });
    assert(Number(productBInventoryAfterFulfill.available) === 9, 'Fulfilling reserved warehouse order should keep available stock unchanged', productBInventoryAfterFulfill);
    assert(Number(productBInventoryAfterFulfill.reserved) === 0, 'Fulfilling reserved warehouse order should release reserved stock', productBInventoryAfterFulfill);
    assert(Number(productBInventoryAfterFulfill.quantity) === 9, 'Fulfilling reserved warehouse order should decrement physical quantity', productBInventoryAfterFulfill);

    return {
      merchantAOrderId: merchantAOrder.id,
      merchantAStatus: merchantAOrder.status,
      merchantBOrderId: fulfilled.data.id,
      merchantBStatus: fulfilled.data.status,
      trackingNumber: fulfilled.data.trackingNumber,
      productBInventoryAfterFulfill: {
        quantity: productBInventoryAfterFulfill.quantity,
        available: productBInventoryAfterFulfill.available,
        reserved: productBInventoryAfterFulfill.reserved,
      },
    };
  });

  await step('AF-10/AF-11', 'المسوق يرى طلباته وعملاءه وعمولاته وإحصائياته', async () => {
    const [orders, customers, commissions, stats] = await Promise.all([
      api('get', '/api/v1/affiliates/orders', { token: context.affiliateToken }),
      api('get', '/api/v1/affiliates/customers', { token: context.affiliateToken }),
      api('get', '/api/v1/affiliates/commissions', { token: context.affiliateToken }),
      api('get', '/api/v1/affiliates/stats', { token: context.affiliateToken }),
    ]);

    assert(orders.data.some((order) => order.id === context.order.id), 'Affiliate orders missing created order', orders);
    assert(customers.data.length >= 1, 'Affiliate customers should include created customer', customers);
    assert(commissions.data.some((commission) => commission.orderId === context.order.id), 'Affiliate commissions missing created order commission', commissions);
    assert(Number(stats.data.totalOrders) >= 1, 'Affiliate stats totalOrders should increase', stats);
    assert(Number(stats.data.pendingEarnings) > 0, 'Affiliate pending earnings should be positive', stats);
    context.affiliateStats = stats.data;

    return {
      orderCount: orders.data.length,
      customerCount: customers.data.length,
      commissionCount: commissions.data.length,
      stats: stats.data,
    };
  });

  await step('AF-11B', 'رفض سحب أقل من الحد الأدنى ثم قبول سحب صحيح', async () => {
    const availablePayoutAmount = Number(context.affiliateStats?.pendingEarnings || 0);
    assert(availablePayoutAmount >= 100, 'Affiliate pending earnings should meet the minimum payout', context.affiliateStats);

    const rejected = await api('post', '/api/v1/affiliates/payout-request', {
      token: context.affiliateToken,
      expected: 400,
      body: {
        amount: 10,
        paymentMethod: 'WALLET',
        paymentDetails: { walletPhone: '+201000000530' },
      },
    });

    const accepted = await api('post', '/api/v1/affiliates/payout-request', {
      token: context.affiliateToken,
      body: {
        amount: availablePayoutAmount,
        paymentMethod: 'WALLET',
        paymentDetails: { walletPhone: '+201000000530' },
      },
    });

    assert(accepted.success === true, 'Valid payout request failed', accepted);
    return {
      rejected: rejected.message,
      payoutId: accepted.data.id,
      amount: accepted.data.amount,
      status: accepted.data.status,
    };
  });

  await step('SP-06', 'الشركة ترى العمولات والإحصائيات', async () => {
    const response = await api('get', '/api/v1/commissions', { token: context.owner.token });
    const commissionTypes = new Set(response.data.commissions.map((commission) => commission.type));
    assert(response.data.total >= 3, 'Admin commissions should include split commissions', response);
    assert(commissionTypes.has('AFFILIATE'), 'Admin missing affiliate commission', response);
    assert(commissionTypes.has('MERCHANT'), 'Admin missing merchant commission', response);
    assert(commissionTypes.has('PLATFORM'), 'Admin missing platform commission', response);
    return {
      total: response.data.total,
      stats: response.data.stats,
      types: Array.from(commissionTypes),
    };
  });

  await step('SEC-03', 'شركة ثانية لا تستطيع قراءة موارد الشركة الأولى', async () => {
    const merchantRead = await api('get', `/api/v1/merchants/${context.merchantA.id}`, {
      token: context.otherOwner.token,
      expected: 404,
    });
    const affiliateUpdate = await api('put', `/api/v1/affiliates/${context.affiliate.id}/status`, {
      token: context.otherOwner.token,
      expected: 404,
      body: { status: 'SUSPENDED' },
    });
    const foreignCommission = await prisma.commission.findFirst({
      where: {
        orderId: context.order.id,
        type: 'AFFILIATE',
      },
    });
    const commissionUpdate = await api('put', `/api/v1/commissions/${foreignCommission.id}/status`, {
      token: context.otherOwner.token,
      expected: 404,
      body: { status: 'PAID' },
    });
    return {
      merchantRead: merchantRead.message,
      affiliateUpdate: affiliateUpdate.message,
      commissionUpdate: commissionUpdate.message,
    };
  });

  await step('SEC-04', 'تثبيت أن التاجر Role مستقل محدود بالبورتال فقط', async () => {
    const merchantUser = await prisma.user.findUnique({
      where: { email: context.merchantAEmail },
    });
    assert(merchantUser?.role === 'MERCHANT', 'Merchant should have a MERCHANT login user', merchantUser);

    const portalProfile = await api('get', '/api/v1/merchant-portal/me', {
      token: context.merchantAToken,
    });
    const adminSettings = await api('get', '/api/v1/affiliate-settings', {
      token: context.merchantAToken,
      expected: 403,
    });

    return {
      merchantHasLoginUser: Boolean(merchantUser),
      merchantRole: merchantUser.role,
      portalMerchantId: portalProfile.data.id,
      adminSettingsRejected: adminSettings.message,
    };
  });

  const failed = results.filter((item) => item.status !== 'PASS');
  const summary = {
    runId,
    status: failed.length === 0 ? 'UAT_COMPLETE' : 'UAT_FAILED',
    createdAt: new Date().toISOString(),
    environment: 'local-development',
    company: {
      id: context.companyId,
      slug: context.companySlug,
      name: context.owner.company.name,
    },
    credentials: {
      ownerEmail: context.owner.email,
      affiliateEmail: `affiliate+${runId}@codex-uat.local`,
      merchantAutoEmail: context.merchantAEmail,
      merchantManualEmail: context.merchantBEmail,
      password,
    },
    urls: context.urls,
    entities: {
      products: [context.productA?.id, context.productB?.id].filter(Boolean),
      merchants: [context.merchantA?.id, context.merchantB?.id].filter(Boolean),
      affiliateId: context.affiliate?.id,
      orderId: context.order?.id,
    },
    counts: {
      total: results.length,
      passed: results.filter((item) => item.status === 'PASS').length,
      failed: failed.length,
    },
    results,
  };

  const tmpDir = path.join(__dirname, '..', '..', 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const reportPath = path.join(tmpDir, `${runId}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    reportPath,
    company: summary.company,
    credentials: summary.credentials,
    counts: summary.counts,
    urls: summary.urls,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSharedDatabase().catch(() => {});
    process.exit(process.exitCode || 0);
  });
