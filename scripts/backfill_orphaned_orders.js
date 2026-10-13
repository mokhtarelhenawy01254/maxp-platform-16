const path = require('path');

// Determine environment paths
let sharedDb;
let customerIdentity;
let phoneNorm;
let customerNameUtil;

try {
  sharedDb = require('../services/sharedDatabase');
  customerIdentity = require('../utils/customerIdentity');
  phoneNorm = require('../utils/phoneNormalization');
  customerNameUtil = require('../utils/customerName');
} catch (e) {
  // Running from apps/backend or root
  sharedDb = require('./services/sharedDatabase');
  customerIdentity = require('./utils/customerIdentity');
  phoneNorm = require('./utils/phoneNormalization');
  customerNameUtil = require('./utils/customerName');
}

const { getSharedPrismaClient } = sharedDb;
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = customerIdentity;
const { toCanonicalE164 } = phoneNorm;
const { splitCustomerName } = customerNameUtil;

function mapPaymentMethodToEnum(method) {
  const methodMap = {
    'cash': 'CASH',
    'card': 'CREDIT_CARD',
    'bank_transfer': 'BANK_TRANSFER',
    'online': 'STRIPE',
    'paypal': 'PAYPAL',
    'stripe': 'STRIPE',
    'cod': 'CASH',
    'wallet': 'WALLET',
    'instapay': 'INSTAPAY',
  };
  return methodMap[(method || '').toLowerCase()] || 'CASH';
}

async function backfill() {
  const prisma = getSharedPrismaClient();

  console.log('🔍 [BACKFILL] Finding orphaned guest orders since 2026-10-10 12:00:00...');

  // 1. Fetch orphaned guest orders
  const orphaned = await prisma.$queryRaw`
    SELECT go.* 
    FROM guest_orders go
    WHERE go."createdAt" >= '2026-10-10 12:00:00'
      AND NOT EXISTS (
        SELECT 1 FROM orders o WHERE o."orderNumber" = go."orderNumber"
      )
    ORDER BY go."createdAt" ASC;
  `;

  console.log(`📋 [BACKFILL] Found ${orphaned.length} orphaned guest orders.`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < orphaned.length; i++) {
    const go = orphaned[i];
    const orderNum = go.orderNumber;

    try {
      // Check again if already exists
      const already = await prisma.order.findFirst({
        where: { companyId: go.companyId, orderNumber: orderNum },
        select: { id: true },
      });

      if (already) {
        skippedCount++;
        continue;
      }

      const companyId = go.companyId;

      // Find or create customer
      let customer = await findCustomerByPhone(prisma, go.guestPhone, companyId);
      if (!customer) {
        const nameParts = splitCustomerName(go.guestName || '');
        customer = await safeCreateCustomer(
          prisma,
          {
            data: {
              firstName: nameParts.firstName || 'عميل',
              lastName: nameParts.lastName || '',
              phone: go.guestPhone,
              phoneNormalized: toCanonicalE164(go.guestPhone),
              email: go.guestEmail || null,
              company: { connect: { id: companyId } },
              status: 'ACTIVE',
              metadata: JSON.stringify({ source: 'guest_order_backfill', guestOrderId: go.id }),
            },
          },
          buildPhoneWhere(go.guestPhone, companyId)
        );
      }

      // Parse items
      let rawItems = [];
      try {
        rawItems = typeof go.items === 'string' ? JSON.parse(go.items) : (go.items || []);
      } catch (e) {
        rawItems = [];
      }

      const orderItems = [];
      for (const item of rawItems) {
        let vExists = false;
        if (item.variantId) {
          try {
            const v = await prisma.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true },
            });
            vExists = Boolean(v);
          } catch (_) {
            vExists = false;
          }
        }

        orderItems.push({
          productName: item.name || item.productName || 'منتج',
          quantity: Number(item.quantity) || 1,
          price: parseFloat(item.price || 0),
          total: parseFloat((item.price || 0) * (item.quantity || 1)),
          productSku: item.productSku || item.sku || null,
          productColor: item.productColor ? String(item.productColor) : null,
          productSize: item.productSize ? String(item.productSize) : null,
          productId: item.productId || null,
          variantId: vExists ? item.variantId : null,
          productImage: item.productImage || item.image || null,
        });
      }

      // Address
      let shippingAddressStr = '';
      let gov = '';
      let city = '';
      if (typeof go.shippingAddress === 'string') {
        shippingAddressStr = go.shippingAddress;
        try {
          const parsedAddr = JSON.parse(go.shippingAddress);
          if (parsedAddr && typeof parsedAddr === 'object') {
            gov = parsedAddr.governorate || parsedAddr.state || parsedAddr.region || '';
            city = parsedAddr.city || '';
          }
        } catch (_) {}
      } else if (go.shippingAddress && typeof go.shippingAddress === 'object') {
        shippingAddressStr = JSON.stringify(go.shippingAddress);
        gov = go.shippingAddress.governorate || go.shippingAddress.state || go.shippingAddress.region || '';
        city = go.shippingAddress.city || '';
      }

      // Metadata
      let metaObj = {};
      try {
        metaObj = typeof go.metadata === 'string' ? JSON.parse(go.metadata) : (go.metadata || {});
      } catch (_) {}
      metaObj.backfilledFromGuestOrder = {
        guestOrderId: go.id,
        backfilledAt: new Date().toISOString(),
      };

      const VALID_ORDER_STATUSES = new Set([
        'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
        'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED',
        'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED',
        'WOO_TAGHEZ', 'DRAFT', 'TRASH', 'READY_TO_SHIP', 'ON_HOLD',
        'NOT_SHIPPED', 'OUT_FOR_DELIVERY', 'LOST', 'PENDING_PREPARATION', 'PREPARING', 'READY'
      ]);
      const finalStatus = VALID_ORDER_STATUSES.has(go.status) ? go.status : 'PENDING';

      // Create Order
      await prisma.order.create({
        data: {
          orderNumber: orderNum,
          customerId: customer.id,
          companyId,
          customerName: go.guestName,
          customerPhone: go.guestPhone,
          customerEmail: go.guestEmail || null,
          customerAddress: shippingAddressStr,
          shippingAddress: shippingAddressStr,
          governorate: gov,
          city,
          subtotal: parseFloat(go.total || 0),
          shipping: parseFloat(go.shippingCost || 0),
          discount: parseFloat(go.discountAmount || 0),
          total: parseFloat(go.finalTotal || go.total || 0),
          status: finalStatus,
          paymentStatus: 'PENDING',
          paymentMethod: mapPaymentMethodToEnum(go.paymentMethod),
          notes: go.notes || `طلب من الموقع - ${orderNum}`,
          sourceType: 'storefront',
          extractionMethod: 'storefront',
          isViewed: false,
          orderSource: 'REGULAR',
          metadata: JSON.stringify(metaObj),
          createdAt: go.createdAt,
          updatedAt: go.updatedAt || go.createdAt,
          orderItems: {
            create: orderItems,
          },
        },
      });

      createdCount++;
      if (createdCount % 25 === 0 || createdCount === orphaned.length) {
        console.log(` progress: [${createdCount}/${orphaned.length}] orders synced...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ [BACKFILL] Error on order ${orderNum}:`, err.message);
    }
  }

  console.log('==============================================');
  console.log(`✅ [BACKFILL COMPLETED]`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors:  ${errorCount}`);
  console.log('==============================================');
}

backfill()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  });
