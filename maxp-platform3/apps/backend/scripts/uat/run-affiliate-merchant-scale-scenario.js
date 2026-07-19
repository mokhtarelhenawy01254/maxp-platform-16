const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.START_INLINE_WEBHOOK_WORKER = 'false';

const {
  initializeSharedDatabase,
  getSharedPrismaClientAsync,
  closeSharedDatabase,
} = require('../../services/sharedDatabase');
const affiliateService = require('../../services/affiliateService');
const commissionService = require('../../services/commissionService');
const dropshippingService = require('../../services/dropshippingService');
const merchantService = require('../../services/merchantService');

const stamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);
const runId = `codex-affiliate-merchant-scale-${stamp}`;
const password = `CodexScale#${stamp}`;
const AFFILIATE_REQUIRED_APP_SLUGS = [
  'affiliate-pro',
  'order-core',
  'inventory-pro',
  'ecommerce-basic',
];

const MERCHANT_PAYOUT_SQL = [
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_payouts_status') THEN
    CREATE TYPE "merchant_payouts_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');
  END IF;
END $$;`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_payouts_paymentMethod') THEN
    CREATE TYPE "merchant_payouts_paymentMethod" AS ENUM ('TRANSFERS', 'WALLET', 'CASH');
  END IF;
END $$;`,
  `CREATE TABLE IF NOT EXISTS "merchant_payouts" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" "merchant_payouts_status" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" "merchant_payouts_paymentMethod" NOT NULL,
  "paymentDetails" TEXT,
  "transactionId" TEXT,
  "externalReference" TEXT,
  "processedAt" TIMESTAMP(3),
  "processedBy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_payouts_pkey" PRIMARY KEY ("id")
);`,
  `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merchant_payouts_merchantId_fkey'
  ) THEN
    ALTER TABLE "merchant_payouts"
      ADD CONSTRAINT "merchant_payouts_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;`,
  `CREATE INDEX IF NOT EXISTS "merchant_payouts_merchantId_idx" ON "merchant_payouts"("merchantId");`,
  `CREATE INDEX IF NOT EXISTS "merchant_payouts_paymentMethod_idx" ON "merchant_payouts"("paymentMethod");`,
  `CREATE INDEX IF NOT EXISTS "merchant_payouts_status_idx" ON "merchant_payouts"("status");`,
  `ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "merchantPayoutId" TEXT;`,
  `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_merchantPayoutId_fkey'
  ) THEN
    ALTER TABLE "commissions"
      ADD CONSTRAINT "commissions_merchantPayoutId_fkey"
      FOREIGN KEY ("merchantPayoutId") REFERENCES "merchant_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;`,
  `CREATE INDEX IF NOT EXISTS "commissions_merchantPayoutId_idx" ON "commissions"("merchantPayoutId");`,
];

function safe(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'bigint') return item.toString();
    if (item && typeof item === 'object' && item.constructor?.name === 'Decimal') {
      return item.toString();
    }
    return item;
  }));
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function step(results, id, title, fn) {
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

async function ensureMerchantPayoutSchema(prisma) {
  for (const statement of MERCHANT_PAYOUT_SQL) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function installAffiliateRequiredApps(prisma, companyId) {
  const apps = await prisma.marketplaceApp.findMany({
    where: {
      slug: {
        in: AFFILIATE_REQUIRED_APP_SLUGS,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  await Promise.all(
    apps.map((app) =>
      prisma.companyApp.upsert({
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
          settings: {
            installedBy: runId,
            reason: 'affiliate-merchant-scale-core-tools',
          },
        },
      })
    )
  );

  return apps.map((app) => app.slug);
}

async function createUser(prisma, {
  companyId,
  email,
  firstName,
  lastName,
  role,
  phone,
  userCompanyRole,
}) {
  const user = await prisma.user.create({
    data: {
      companyId,
      email,
      password: await bcrypt.hash(password, 10),
      firstName,
      lastName,
      phone,
      role,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      timezone: 'Africa/Cairo',
    },
  });

  if (userCompanyRole) {
    await prisma.userCompany.create({
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

async function createProduct(prisma, { companyId, merchantIndex, mode }) {
  const wholesalePrice = 190 + merchantIndex * 18;
  const platformBasePrice = wholesalePrice + 45;
  const customerPrice = platformBasePrice + 95;

  return prisma.product.create({
    data: {
      companyId,
      name: `سيناريو ${runId} منتج تاجر ${merchantIndex}`,
      description: `منتج اختبار واسع للتاجر ${merchantIndex} بنمط ${mode}`,
      sku: `SCN-${stamp}-M${merchantIndex}`,
      slug: `scenario-${stamp}-merchant-${merchantIndex}`,
      price: customerPrice,
      comparePrice: customerPrice + 90,
      cost: wholesalePrice,
      stock: 0,
      isActive: true,
      isFeatured: merchantIndex <= 3,
      allowAffiliateMarkup: true,
      affiliateCommission: 10,
      commissionType: 'PERCENTAGE',
      source: 'codex-scale-scenario',
      basePrice: platformBasePrice,
      isDropshipped: true,
      metadata: JSON.stringify({
        runId,
        merchantIndex,
        fulfillmentMode: mode,
      }),
    },
  });
}

async function createOrderForScenario(prisma, {
  companyId,
  orderIndex,
  product,
  merchant,
  affiliate,
  statusPlan,
  owner,
}) {
  const quantity = (orderIndex % 3) + 1;
  const unitPrice = Number(product.price);
  const subtotal = money(unitPrice * quantity);
  const shipping = 35 + (orderIndex % 4) * 5;
  const total = money(subtotal + shipping);

  const customer = await prisma.customer.create({
    data: {
      companyId,
      firstName: `عميل-${orderIndex}`,
      lastName: runId.slice(-6),
      email: `customer-${orderIndex}+${runId}@codex.local`,
      phone: `+20155${String(orderIndex).padStart(8, '0')}`,
      status: 'ACTIVE',
    },
  });

  const order = await prisma.order.create({
    data: {
      companyId,
      orderNumber: `SCN-${stamp}-${String(orderIndex).padStart(3, '0')}`,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: `عنوان اختبار ${orderIndex}`,
      city: orderIndex % 2 === 0 ? 'القاهرة' : 'الجيزة',
      governorate: orderIndex % 2 === 0 ? 'القاهرة' : 'الجيزة',
      shippingAddress: JSON.stringify({
        address: `شارع السيناريو ${orderIndex}`,
        city: orderIndex % 2 === 0 ? 'القاهرة' : 'الجيزة',
        governorate: orderIndex % 2 === 0 ? 'القاهرة' : 'الجيزة',
      }),
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      subtotal,
      shipping,
      total,
      currency: 'EGP',
      affiliateId: affiliate.id,
      orderSource: 'AFFILIATE_DIRECT',
      sourceType: 'codex_scale_scenario',
      createdBy: owner.id,
      createdByName: `${owner.firstName} ${owner.lastName}`,
      notes: `سيناريو ${statusPlan.label} للتاجر ${merchant.name}`,
      metadata: JSON.stringify({
        runId,
        statusPlan,
        merchantId: merchant.id,
        affiliateId: affiliate.id,
      }),
      orderItems: {
        create: [{
          productId: product.id,
          quantity,
          price: unitPrice,
          total: subtotal,
          productName: product.name,
          productSku: product.sku,
          basePrice: product.basePrice,
          merchantPrice: product.cost,
          metadata: JSON.stringify({
            runId,
            merchantId: merchant.id,
            statusPlan: statusPlan.code,
          }),
        }],
      },
      statusHistory: {
        create: [{
          status: 'CONFIRMED',
          oldStatus: null,
          changedBy: owner.id,
          userName: `${owner.firstName} ${owner.lastName}`,
          reason: 'تم إنشاء الطلب من سيناريو Codex',
        }],
      },
    },
    include: {
      orderItems: true,
    },
  });

  const merchantOrders = await dropshippingService.routeOrderToMerchant(order.id);
  await commissionService.calculateCommissions(order.id);

  for (const merchantOrder of merchantOrders) {
    if (statusPlan.code === 'DELIVERED') {
      const fulfilled = merchantOrder.status === 'FULFILLED'
        ? merchantOrder
        : await merchantService.fulfillMerchantOrder(merchantOrder.id, {
            trackingNumber: `DLV-${stamp}-${orderIndex}`,
            merchantOrderId: `MORD-${stamp}-${orderIndex}`,
            notes: 'تم تجهيز وتسليم الطلب داخل سيناريو Codex',
          });

      await prisma.shipment.updateMany({
        where: { merchantOrderId: fulfilled.id },
        data: {
          status: 'DELIVERED',
          trackingNumber: fulfilled.trackingNumber || `DLV-${stamp}-${orderIndex}`,
        },
      });
    } else if (statusPlan.code === 'RETURNED') {
      await prisma.merchantOrder.update({
        where: { id: merchantOrder.id },
        data: {
          status: 'FAILED',
          notes: 'مرتجع في سيناريو Codex',
        },
      });
      await prisma.shipment.updateMany({
        where: { merchantOrderId: merchantOrder.id },
        data: {
          status: 'RETURNED',
        },
      });
    } else if (statusPlan.code === 'AT_COMPANY') {
      await prisma.merchantOrder.update({
        where: { id: merchantOrder.id },
        data: {
          status: merchant.fulfillmentMode === 'COMPANY_WAREHOUSE' ? 'CONFIRMED' : 'SENT',
          notes: 'الطلب لا يزال داخل الشركة أو تحت التجهيز',
        },
      });
      await prisma.shipment.updateMany({
        where: { merchantOrderId: merchantOrder.id },
        data: {
          status: merchant.fulfillmentMode === 'COMPANY_WAREHOUSE' ? 'PENDING' : 'WITH_MERCHANT',
        },
      });
    }
  }

  const finalStatus =
    statusPlan.code === 'DELIVERED'
      ? 'DELIVERED'
      : statusPlan.code === 'RETURNED'
        ? 'RETURNED'
        : 'PROCESSING';

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: finalStatus,
      statusHistory: {
        create: {
          status: finalStatus,
          oldStatus: 'CONFIRMED',
          changedBy: owner.id,
          userName: `${owner.firstName} ${owner.lastName}`,
          reason: `تطبيق حالة السيناريو: ${statusPlan.label}`,
        },
      },
    },
  });

  if (statusPlan.code === 'RETURNED') {
    await commissionService.cancelAffiliateCommissionsForOrder(order.id, {
      reason: 'الطلب مرتجع في سيناريو Codex',
    });
    await commissionService.cancelMerchantCommissionsForOrder(order.id, {
      reason: 'الطلب مرتجع في سيناريو Codex',
    });
  }

  return prisma.order.findUnique({
    where: { id: order.id },
    include: {
      merchantOrders: true,
      commissions: true,
      orderItems: true,
    },
  });
}

async function main() {
  await initializeSharedDatabase();
  const prisma = await getSharedPrismaClientAsync();
  const results = [];
  const context = {
    runId,
    password,
    entities: {},
  };

  try {
    await step(results, 'DB-01', 'تجهيز جدول سحب مستحقات التجار إذا لم يكن موجوداً', async () => {
      await ensureMerchantPayoutSchema(prisma);
      return { schema: 'merchant_payouts ready' };
    });

    await step(results, 'SETUP-01', 'إنشاء شركة جديدة وتفعيل نظام الأفليت مرة واحدة', async () => {
      const company = await prisma.company.create({
        data: {
          name: `شركة سيناريو الأفليت والتجار ${stamp}`,
          slug: `affiliate-merchant-scale-${stamp}`,
          email: `owner+${runId}@codex.local`,
          phone: '+201000009001',
          isActive: true,
          sidebarLayout: 'three-tier',
          timezone: 'Africa/Cairo',
          settings: JSON.stringify({
            runId,
            scenario: 'affiliate-merchant-scale',
          }),
        },
      });

      const owner = await createUser(prisma, {
        companyId: company.id,
        email: company.email,
        firstName: 'مدير',
        lastName: 'السيناريو',
        role: 'OWNER',
        phone: '+201000009001',
        userCompanyRole: 'OWNER',
      });

      await prisma.affiliateSetting.create({
        data: {
          companyId: company.id,
          commissionType: 'PERCENTAGE',
          commissionRate: 10,
          cookieDuration: 45,
          termsAndConditions: 'شروط سيناريو Codex: المسوقون نشطون والتجار يديرون التنفيذ حسب نمط الوفاء.',
          isActive: true,
          autoApproveAffiliates: true,
          defaultMinPayout: 100,
          platformMarginType: 'FIXED',
          platformMarginValue: 45,
        },
      });

      const enabledCoreApps = await installAffiliateRequiredApps(prisma, company.id);

      context.company = company;
      context.owner = owner;
      return {
        companyId: company.id,
        slug: company.slug,
        ownerEmail: owner.email,
        enabledCoreApps,
      };
    });

    await step(results, 'SETUP-02', 'إنشاء مخازن شركة مشتركة وشركات شحن', async () => {
      const warehouses = await Promise.all([
        prisma.warehouse.create({
          data: {
            companyId: context.company.id,
            name: `مخزن القاهرة المشترك ${stamp}`,
            location: 'القاهرة - مدينة نصر',
            type: 'company',
            isActive: true,
          },
        }),
        prisma.warehouse.create({
          data: {
            companyId: context.company.id,
            name: `مخزن الجيزة المشترك ${stamp}`,
            location: 'الجيزة - الهرم',
            type: 'company',
            isActive: true,
          },
        }),
      ]);

      const shippingCompanies = await Promise.all([
        prisma.shippingCompany.create({
          data: {
            companyId: context.company.id,
            name: `شحن سريع ${stamp}`,
            slug: `fast-${stamp}`,
            phone: '+201000009100',
            isActive: true,
          },
        }),
        prisma.shippingCompany.create({
          data: {
            companyId: context.company.id,
            name: `شحن اقتصادي ${stamp}`,
            slug: `economy-${stamp}`,
            phone: '+201000009101',
            isActive: true,
          },
        }),
      ]);

      context.sharedWarehouses = warehouses;
      context.shippingCompanies = shippingCompanies;
      return {
        warehouses: warehouses.map((item) => ({ id: item.id, name: item.name })),
        shippingCompanies: shippingCompanies.map((item) => ({ id: item.id, name: item.name })),
      };
    });

    await step(results, 'AFF-01', 'تسجيل 10 مسوقين نشطين على الشركة', async () => {
      const affiliates = [];
      for (let index = 1; index <= 10; index += 1) {
        const user = await createUser(prisma, {
          companyId: context.company.id,
          email: `affiliate-${index}+${runId}@codex.local`,
          firstName: `مسوق`,
          lastName: `${index}`,
          role: 'AFFILIATE',
          phone: `+20110${String(index).padStart(8, '0')}`,
          userCompanyRole: 'AFFILIATE',
        });

        const affiliate = await affiliateService.registerAffiliate(user.id, {
          companyId: context.company.id,
          commissionType: 'PERCENTAGE',
          commissionRate: 8 + (index % 4),
          paymentMethod: 'WALLET',
          paymentDetails: { walletPhone: user.phone },
          minPayout: 100,
          status: 'ACTIVE',
        });

        affiliates.push({ ...affiliate, user });
      }

      context.affiliates = affiliates;
      return {
        count: affiliates.length,
        sampleCodes: affiliates.slice(0, 3).map((item) => item.affiliateCode),
      };
    });

    await step(results, 'MRCH-01', 'تسجيل 10 تجار: 5 يشحنون من عندهم و5 من مخازن الشركة المشتركة', async () => {
      const merchants = [];
      for (let index = 1; index <= 10; index += 1) {
        const selfFulfillment = index <= 5;
        const sharedWarehouse = index <= 8
          ? context.sharedWarehouses[0]
          : context.sharedWarehouses[1];
        const merchant = await merchantService.createMerchant(context.company.id, {
          name: `تاجر سيناريو ${index}`,
          email: `merchant-${index}+${runId}@codex.local`,
          password,
          phone: `+20120${String(index).padStart(8, '0')}`,
          address: selfFulfillment ? `مخزن تاجر ${index}` : `تسليم لمخزن شركة ${sharedWarehouse.name}`,
          commissionRate: 10,
          autoFulfill: false,
          isActive: true,
          fulfillmentMode: selfFulfillment ? 'MERCHANT' : 'COMPANY_WAREHOUSE',
          defaultWarehouseId: selfFulfillment ? undefined : sharedWarehouse.id,
          defaultShippingCompanyId:
            context.shippingCompanies[index % context.shippingCompanies.length].id,
        });

        merchants.push(merchant);
      }

      context.merchants = merchants;
      const refreshedSharedWarehouses = await prisma.warehouse.findMany({
        where: { id: { in: context.sharedWarehouses.map((item) => item.id) } },
        select: { id: true, name: true, merchantId: true },
      });

      assert(
        refreshedSharedWarehouses.every((warehouse) => warehouse.merchantId === null),
        'المخازن المشتركة لا يجب أن تصبح مملوكة لتاجر واحد',
        refreshedSharedWarehouses,
      );

      return {
        merchants: merchants.map((item) => ({
          id: item.id,
          name: item.name,
          fulfillmentMode: item.fulfillmentMode,
          defaultWarehouseId: item.defaultWarehouseId,
        })),
        sharedWarehouses: refreshedSharedWarehouses,
      };
    });

    await step(results, 'CAT-01', 'إنشاء منتج لكل تاجر وربط المخزون حسب نمط التنفيذ', async () => {
      const products = [];
      for (let index = 1; index <= context.merchants.length; index += 1) {
        const merchant = context.merchants[index - 1];
        const product = await createProduct(prisma, {
          companyId: context.company.id,
          merchantIndex: index,
          mode: merchant.fulfillmentMode,
        });

        await merchantService.addMerchantProduct(merchant.id, product.id, {
          merchantSku: `M${index}-${stamp}`,
          merchantPrice: Number(product.cost),
          stock: 80 + index * 5,
          syncEnabled: true,
        });

        products.push(product);
      }

      context.products = products;
      return {
        count: products.length,
        firstProduct: products[0]?.sku,
      };
    });

    await step(results, 'ORD-01', 'إنشاء 50 طلب موزعين بين التجار والمسوقين وحالات مختلفة', async () => {
      const statusPlans = Array.from({ length: 50 }, (_unused, index) => {
        if (index < 20) return { code: 'DELIVERED', label: 'اتسلم' };
        if (index < 35) return { code: 'RETURNED', label: 'مرتجع' };
        return { code: 'AT_COMPANY', label: 'في الشركة' };
      });

      const orders = [];
      for (let index = 1; index <= 50; index += 1) {
        const merchantIndex = ((index - 1) % 10);
        const affiliateIndex = ((index - 1) % 10);
        const order = await createOrderForScenario(prisma, {
          companyId: context.company.id,
          orderIndex: index,
          product: context.products[merchantIndex],
          merchant: context.merchants[merchantIndex],
          affiliate: context.affiliates[affiliateIndex],
          statusPlan: statusPlans[index - 1],
          owner: context.owner,
        });
        orders.push(order);
      }

      context.orders = orders;
      const byStatus = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      return { count: orders.length, byStatus };
    });

    await step(results, 'PAY-01', 'التجار يطلبون سحب مستحقاتهم بعد التسليم والشركة تعالج جزءاً منها', async () => {
      const payoutResults = [];
      for (let index = 0; index < context.merchants.length; index += 1) {
        const merchant = context.merchants[index];
        const summary = await commissionService.getMerchantPayoutSummary(merchant.id);
        const amount = summary.balances.availableAmount;
        if (amount <= 0) {
          payoutResults.push({
            merchantId: merchant.id,
            merchantName: merchant.name,
            status: 'NO_AVAILABLE_BALANCE',
            amount,
          });
          continue;
        }

        if (index === 0) {
          try {
            await commissionService.processMerchantPayout(merchant.id, Math.max(1, amount - 1), {
              method: 'WALLET',
            });
            throw new Error('كان يجب رفض السحب الجزئي للتاجر الأول');
          } catch (error) {
            assert(
              /الرصيد|المتاح بالكامل|مستحقات/.test(error.message),
              'رسالة رفض السحب الجزئي غير متوقعة',
              { message: error.message },
            );
          }
        }

        const payout = await commissionService.processMerchantPayout(merchant.id, amount, {
          method: 'WALLET',
          details: { walletPhone: merchant.phone },
        });

        const shouldProcess = index < 6;
        const finalPayout = shouldProcess
          ? await commissionService.recordExternalMerchantPayout(payout.id, {
              transactionId: `MERCH-TX-${stamp}-${index + 1}`,
              externalReference: `BANK-${index + 1}`,
              processedBy: context.owner.id,
            })
          : payout;

        payoutResults.push({
          merchantId: merchant.id,
          merchantName: merchant.name,
          amount,
          status: finalPayout.status,
        });
      }

      context.merchantPayouts = payoutResults;
      return {
        requested: payoutResults.filter((item) => item.status !== 'NO_AVAILABLE_BALANCE').length,
        processed: payoutResults.filter((item) => item.status === 'PROCESSED').length,
        pending: payoutResults.filter((item) => item.status === 'PENDING').length,
      };
    });

    await step(results, 'RPT-01', 'حساب أرباح المسوق والتاجر والشركة ومتبقي المخزون', async () => {
      const [commissions, merchantProducts, inventories, merchantOrders] = await Promise.all([
        prisma.commission.findMany({
          where: { companyId: context.company.id },
          include: {
            merchant: { select: { id: true, name: true, fulfillmentMode: true } },
            affiliate: {
              select: {
                id: true,
                affiliateCode: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
            order: { select: { id: true, orderNumber: true, status: true } },
          },
        }),
        prisma.merchantProduct.findMany({
          where: { merchant: { companyId: context.company.id } },
          include: {
            merchant: true,
            product: true,
          },
        }),
        prisma.inventory.findMany({
          where: { warehouse: { companyId: context.company.id } },
          include: { warehouse: true, product: true },
        }),
        prisma.merchantOrder.findMany({
          where: { merchant: { companyId: context.company.id } },
          include: { merchant: true, order: true },
        }),
      ]);

      const commissionTotals = commissions.reduce((acc, commission) => {
        const key = `${commission.type}_${commission.status}`;
        acc[key] = money((acc[key] || 0) + Number(commission.amount || 0));
        acc[commission.type] = money((acc[commission.type] || 0) + Number(commission.amount || 0));
        return acc;
      }, {});

      const stockByMerchant = context.merchants.map((merchant) => {
        const linkedProducts = merchantProducts.filter((item) => item.merchantId === merchant.id);
        const merchantInventories = inventories.filter((inventory) =>
          linkedProducts.some((item) => item.productId === inventory.productId) &&
          (
            merchant.fulfillmentMode === 'COMPANY_WAREHOUSE'
              ? inventory.warehouseId === merchant.defaultWarehouseId
              : inventory.warehouse.merchantId === merchant.id
          )
        );

        return {
          merchantId: merchant.id,
          merchantName: merchant.name,
          fulfillmentMode: merchant.fulfillmentMode,
          defaultWarehouseId: merchant.defaultWarehouseId,
          linkedProducts: linkedProducts.length,
          merchantProductStock: linkedProducts.reduce((sum, item) => sum + Number(item.stock || 0), 0),
          physicalQuantity: merchantInventories.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          availableQuantity: merchantInventories.reduce((sum, item) => sum + Number(item.available || 0), 0),
          reservedQuantity: merchantInventories.reduce((sum, item) => sum + Number(item.reserved || 0), 0),
        };
      });

      const merchantOrderStates = merchantOrders.reduce((acc, merchantOrder) => {
        const key = `${merchantOrder.fulfillmentSource}_${merchantOrder.status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const report = {
        runId,
        status: 'SCENARIO_COMPLETE',
        createdAt: new Date().toISOString(),
        company: {
          id: context.company.id,
          name: context.company.name,
          slug: context.company.slug,
        },
        counts: {
          affiliates: context.affiliates.length,
          merchants: context.merchants.length,
          products: context.products.length,
          orders: context.orders.length,
          merchantOrders: merchantOrders.length,
          commissions: commissions.length,
        },
        orderStatusCounts: context.orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {}),
        merchantOrderStates,
        commissionTotals,
        merchantPayouts: context.merchantPayouts,
        stockByMerchant,
        credentials: {
          ownerEmail: context.owner.email,
          sampleAffiliateEmails: context.affiliates.slice(0, 3).map((item) => item.user.email),
          sampleMerchantEmails: context.merchants.slice(0, 3).map((item) => item.email),
          password,
        },
        urls: {
          ownerLogin: 'http://127.0.0.1:3000/auth/login',
          merchantPortal: 'http://127.0.0.1:3000/merchant-portal',
          merchantsAdmin: 'http://127.0.0.1:3000/merchants',
          affiliateSettings: 'http://127.0.0.1:3000/affiliate-settings',
        },
        results,
      };

      const reportDir = path.join(__dirname, '..', '..', 'tmp');
      fs.mkdirSync(reportDir, { recursive: true });
      const jsonPath = path.join(reportDir, `${runId}.json`);
      const markdownPath = path.join(reportDir, `${runId}.md`);
      fs.writeFileSync(jsonPath, `${JSON.stringify(safe(report), null, 2)}\n`, 'utf8');
      fs.writeFileSync(
        markdownPath,
        [
          `# Affiliate Merchant Scale Scenario`,
          ``,
          `- Run: ${runId}`,
          `- Company: ${context.company.name} (${context.company.slug})`,
          `- Orders: ${context.orders.length}`,
          `- Merchants: ${context.merchants.length}`,
          `- Affiliates: ${context.affiliates.length}`,
          ``,
          `## Commission Totals`,
          ``,
          ...Object.entries(commissionTotals).map(([key, value]) => `- ${key}: ${value}`),
          ``,
          `## Merchant Payouts`,
          ``,
          ...context.merchantPayouts.map((item) => `- ${item.merchantName}: ${item.status} ${item.amount || 0}`),
          ``,
          `## Stock By Merchant`,
          ``,
          ...stockByMerchant.map((item) =>
            `- ${item.merchantName} (${item.fulfillmentMode}): available ${item.availableQuantity}, reserved ${item.reservedQuantity}, merchantProductStock ${item.merchantProductStock}`,
          ),
          ``,
        ].join('\n'),
        'utf8',
      );

      context.report = { jsonPath, markdownPath, report };
      return {
        jsonPath,
        markdownPath,
        counts: report.counts,
        orderStatusCounts: report.orderStatusCounts,
        commissionTotals,
      };
    });

    const failed = results.filter((item) => item.status !== 'PASS');
    const finalSummary = {
      status: failed.length === 0 ? 'SCENARIO_COMPLETE' : 'SCENARIO_FAILED',
      runId,
      reportPath: context.report?.jsonPath,
      markdownPath: context.report?.markdownPath,
      company: context.report?.report.company,
      counts: context.report?.report.counts,
      orderStatusCounts: context.report?.report.orderStatusCounts,
      merchantPayouts: context.report?.report.merchantPayouts,
    };

    console.log(JSON.stringify(finalSummary, null, 2));
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await closeSharedDatabase().catch(() => {});
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode || 0);
  });
