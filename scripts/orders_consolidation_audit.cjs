/**
 * Orders Consolidation Audit & Backfill Script
 * ---------------------------------------------
 * Inspects all `guest_orders` vs `orders` across tenants.
 * Can run in:
 *   1) Audit mode (default): Reports counts, matching twins, and orphan guest orders without modifying DB.
 *   2) Backfill mode (--execute): Safely backfills orphan guest orders into `orders` + `order_items`.
 *
 * Usage:
 *   node scripts/orders_consolidation_audit.cjs
 *   node scripts/orders_consolidation_audit.cjs --companyId=<id>
 *   node scripts/orders_consolidation_audit.cjs --execute
 */

let PrismaClient;
try {
  PrismaClient = require('/var/www/backend2/node_modules/@prisma/client').PrismaClient;
} catch (_) {
  try {
    PrismaClient = require('../apps/backend/node_modules/@prisma/client').PrismaClient;
  } catch (__) {
    PrismaClient = require('@prisma/client').PrismaClient;
  }
}

const prisma = new PrismaClient();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    execute: args.includes('--execute'),
    companyId: null,
    limit: 1000
  };
  for (const arg of args) {
    if (arg.startsWith('--companyId=')) {
      options.companyId = arg.split('=')[1];
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10) || 1000;
    }
  }
  return options;
};

const normalizeKey = (val) => String(val || '').trim().toLowerCase();

const toSafeAmount = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? fallback : num;
};

const mapPaymentMethodToEnum = (method) => {
  const clean = String(method || '').trim().toLowerCase();
  if (['cash', 'cod', 'cash_on_delivery', 'الدفع عند الاستلام'].includes(clean)) return 'CASH';
  if (['wallet', 'محفظة', 'vodafone_cash', 'instapay', 'انستاباي'].includes(clean)) return 'WALLET';
  if (['credit_card', 'visa', 'mastercard', 'card', 'فوري', 'kashier', 'paymob'].includes(clean)) return 'ONLINE';
  return 'CASH';
};

const mapStatusToEnum = (status) => {
  const clean = String(status || '').trim().toUpperCase();
  const valid = [
    'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED',
    'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED',
    'WOO_TAGHEZ', 'DRAFT', 'TRASH', 'READY_TO_SHIP', 'ON_HOLD',
    'NOT_SHIPPED', 'OUT_FOR_DELIVERY', 'LOST', 'PENDING_PREPARATION',
    'PREPARING', 'READY'
  ];
  return valid.includes(clean) ? clean : 'PENDING';
};

async function main() {
  const options = parseArgs();
  console.log('====================================================');
  console.log('   ORDERS CONSOLIDATION & RECONCILIATION AUDIT    ');
  console.log('====================================================');
  console.log(`Mode: ${options.execute ? '🚨 LIVE EXECUTION (BACKFILL)' : '🔍 DRY-RUN / AUDIT ONLY'}`);
  if (options.companyId) console.log(`Company Filter: ${options.companyId}`);
  console.log('----------------------------------------------------');

  const whereClause = options.companyId ? { companyId: options.companyId } : {};

  const [totalOrders, totalGuestOrders] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.guestOrder.count({ where: whereClause })
  ]);

  console.log(`📊 Total records in 'orders':       ${totalOrders}`);
  console.log(`📊 Total records in 'guest_orders': ${totalGuestOrders}`);

  if (totalGuestOrders === 0) {
    console.log('✅ No guest orders found to reconcile.');
    await prisma.$disconnect();
    return;
  }

  // Scan guest orders in batches
  const batchSize = 500;
  let skip = 0;
  let matchingTwins = 0;
  let orphanGuestOrders = [];

  while (true) {
    const guestBatch = await prisma.guestOrder.findMany({
      where: whereClause,
      take: batchSize,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        companyId: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        total: true,
        finalTotal: true,
        shippingCost: true,
        discountAmount: true,
        shippingAddress: true,
        paymentMethod: true,
        status: true,
        notes: true,
        items: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (guestBatch.length === 0) break;

    const orderNumbers = guestBatch.map(g => g.orderNumber).filter(Boolean);
    const existingOrders = await prisma.order.findMany({
      where: {
        companyId: options.companyId || undefined,
        orderNumber: { in: orderNumbers, mode: 'insensitive' }
      },
      select: { orderNumber: true }
    });

    const existingSet = new Set(existingOrders.map(o => normalizeKey(o.orderNumber)));

    for (const g of guestBatch) {
      if (existingSet.has(normalizeKey(g.orderNumber))) {
        matchingTwins++;
      } else {
        orphanGuestOrders.push(g);
      }
    }

    skip += batchSize;
    process.stdout.write(`Scanned ${skip} / ${totalGuestOrders} guest orders...\r`);
  }

  console.log('\n----------------------------------------------------');
  console.log(`✅ Matching Twins (Already in 'orders'): ${matchingTwins} (${((matchingTwins / totalGuestOrders) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Orphan Guest Orders (Missing in 'orders'): ${orphanGuestOrders.length} (${((orphanGuestOrders.length / totalGuestOrders) * 100).toFixed(1)}%)`);
  console.log('----------------------------------------------------');

  if (orphanGuestOrders.length > 0) {
    console.log('\nSample Orphan Guest Orders:');
    orphanGuestOrders.slice(0, 5).forEach((g, idx) => {
      console.log(`  [${idx + 1}] Order #${g.orderNumber} | Company: ${g.companyId} | Customer: ${g.guestName} (${g.guestPhone}) | Total: ${g.finalTotal || g.total} | Date: ${g.createdAt?.toISOString()}`);
    });
  }

  if (options.execute && orphanGuestOrders.length > 0) {
    console.log('\n🚀 Starting Backfill of Orphan Guest Orders into `orders`...');
    let successCount = 0;
    let failCount = 0;

    for (const g of orphanGuestOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Resolve or create customer
          let customer = null;
          if (g.guestPhone) {
            customer = await tx.customer.findFirst({
              where: { companyId: g.companyId, phone: g.guestPhone }
            });
          }

          if (!customer) {
            const nameParts = String(g.guestName || 'عميل زائر').trim().split(/\s+/);
            const firstName = nameParts[0] || 'عميل';
            const lastName = nameParts.slice(1).join(' ') || '';

            customer = await tx.customer.create({
              data: {
                firstName,
                lastName,
                phone: g.guestPhone || '',
                phoneNormalized: g.guestPhone ? String(g.guestPhone).replace(/\D/g, '') : null,
                email: g.guestEmail || null,
                company: { connect: { id: g.companyId } },
                status: 'LEAD',
                metadata: JSON.stringify({ source: 'guest_order_backfill', legacyGuestOrderId: g.id })
              }
            });
          }

          // 2. Parse Items
          let parsedItems = [];
          try {
            parsedItems = typeof g.items === 'string' ? JSON.parse(g.items) : (Array.isArray(g.items) ? g.items : []);
          } catch (_) {
            parsedItems = [];
          }

          const orderItemsData = parsedItems.map((item, idx) => {
            const price = toSafeAmount(item.price);
            const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
            return {
              productId: item.productId || null,
              variantId: item.variantId || null,
              productName: item.name || item.productName || `منتج #${idx + 1}`,
              productSku: item.sku || item.productSku || null,
              productColor: item.color || item.productColor || null,
              productSize: item.size || item.productSize || null,
              productImage: item.image || item.productImage || null,
              price,
              quantity,
              total: toSafeAmount(item.total, price * quantity),
              metadata: JSON.stringify(item.metadata || {})
            };
          });

          // 3. Resolve shipping address
          let addressText = '';
          let city = '';
          let governorate = '';
          try {
            if (typeof g.shippingAddress === 'string') {
              try {
                const parsedAddr = JSON.parse(g.shippingAddress);
                addressText = parsedAddr.address || parsedAddr.fullAddress || parsedAddr.street || g.shippingAddress;
                city = parsedAddr.city || '';
                governorate = parsedAddr.governorate || parsedAddr.state || '';
              } catch (_) {
                addressText = g.shippingAddress;
              }
            }
          } catch (_) {}

          // 4. Create Order
          const subtotal = toSafeAmount(g.total);
          const shipping = toSafeAmount(g.shippingCost);
          const discount = toSafeAmount(g.discountAmount);
          const total = toSafeAmount(g.finalTotal, subtotal + shipping - discount);

          await tx.order.create({
            data: {
              orderNumber: g.orderNumber,
              customerId: customer.id,
              companyId: g.companyId,
              customerName: g.guestName || customer.firstName,
              customerPhone: g.guestPhone || customer.phone || '',
              customerEmail: g.guestEmail || customer.email || null,
              customerAddress: addressText,
              shippingAddress: addressText,
              city,
              governorate,
              subtotal,
              shipping,
              discount,
              total,
              status: mapStatusToEnum(g.status),
              paymentStatus: 'PENDING',
              paymentMethod: mapPaymentMethodToEnum(g.paymentMethod),
              notes: g.notes || 'طلب من المتجر (تم ترحيله)',
              sourceType: 'storefront',
              extractionMethod: 'storefront',
              orderSource: 'STOREFRONT',
              createdAt: g.createdAt || new Date(),
              updatedAt: g.updatedAt || new Date(),
              metadata: JSON.stringify({
                source: 'storefront',
                legacyGuestOrderId: g.id,
                originalMetadata: g.metadata ? JSON.parse(g.metadata) : null
              }),
              orderItems: {
                create: orderItemsData
              }
            }
          });
        });

        successCount++;
        if (successCount % 20 === 0) {
          process.stdout.write(`Backfilled ${successCount} / ${orphanGuestOrders.length} orphan orders...\r`);
        }
      } catch (err) {
        failCount++;
        console.error(`\n❌ Failed to backfill order #${g.orderNumber}:`, err.message);
      }
    }

    console.log(`\n🎉 Backfill Completed: ${successCount} succeeded, ${failCount} failed.`);
  }

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch(async (e) => {
  console.error('Fatal audit error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
