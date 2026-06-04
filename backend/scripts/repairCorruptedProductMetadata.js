#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const {
  parseProductMetadata,
  isCorruptedProductMetadata,
} = require('../utils/productMetadataUtils');

const prisma = new PrismaClient();

const APPLY_MODE = process.argv.includes('--apply');
const BATCH_SIZE = 100;

async function main() {
  let cursorId = null;
  let scanned = 0;
  let repaired = 0;
  const repairedProducts = [];

  while (true) {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        metadata: true,
        updatedAt: true,
      },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
    });

    if (products.length === 0) {
      break;
    }

    for (const product of products) {
      scanned += 1;

      if (!isCorruptedProductMetadata(product.metadata)) {
        continue;
      }

      const normalizedMetadata = parseProductMetadata(product.metadata);
      const nextMetadata = JSON.stringify(normalizedMetadata);

      repaired += 1;
      repairedProducts.push({
        id: product.id,
        name: product.name,
        beforeLength: typeof product.metadata === 'string' ? product.metadata.length : 0,
        afterLength: nextMetadata.length,
        updatedAt: product.updatedAt,
      });

      if (APPLY_MODE) {
        await prisma.product.update({
          where: { id: product.id },
          data: { metadata: nextMetadata },
        });
      }
    }

    cursorId = products[products.length - 1].id;
  }

  console.log(JSON.stringify({
    mode: APPLY_MODE ? 'apply' : 'dry-run',
    scanned,
    repaired,
    products: repairedProducts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[repairCorruptedProductMetadata] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
