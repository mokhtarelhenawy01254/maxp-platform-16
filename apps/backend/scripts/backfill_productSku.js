/**
 * Backfill productSku for existing OrderItems
 * Fills the productSku field from:
 *   1. Product relation SKU
 *   2. Variant relation SKU
 *   3. metadata JSON sku field
 * Priority: product.sku > productVariant.sku > metadata.sku
 * 
 * Run: node scripts/backfill_productSku.js
 */

const { PrismaClient } = require('@prisma/client');

const BATCH_SIZE = 100;

async function backfillProductSku() {
  const prisma = new PrismaClient();

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let cursor = null;

  console.log('Starting productSku backfill...');

  while (true) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productSku: null,
      },
      select: {
        id: true,
        productId: true,
        variantId: true,
        metadata: true,
        product: {
          select: {
            sku: true,
          },
        },
        productVariant: {
          select: {
            sku: true,
          },
        },
      },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });

    if (orderItems.length === 0) break;

    const updates = [];

    for (const item of orderItems) {
      let sku = null;

      if (item.product?.sku) {
        sku = item.product.sku;
      } else if (item.productVariant?.sku) {
        sku = item.productVariant.sku;
      } else if (item.metadata) {
        try {
          const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
          if (meta && typeof meta.sku === 'string' && meta.sku.trim()) {
            sku = meta.sku;
          }
        } catch (e) {
          // Skip unparseable metadata
        }
      }

      if (sku) {
        updates.push(
          prisma.orderItem.update({
            where: { id: item.id },
            data: { productSku: sku },
          })
        );
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    totalProcessed += orderItems.length;
    cursor = orderItems[orderItems.length - 1].id;

    console.log(`Processed ${totalProcessed} items... (${totalUpdated} updated, ${totalSkipped} skipped)`);
  }

  console.log(`Done! Total: ${totalProcessed} processed, ${totalUpdated} updated, ${totalSkipped} skipped`);
  await prisma.$disconnect();
}

backfillProductSku().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
