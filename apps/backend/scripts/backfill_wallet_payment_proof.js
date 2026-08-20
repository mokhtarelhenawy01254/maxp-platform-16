/**
 * Backfill: copy wallet payment proof + wallet fields from GuestOrders
 * onto their mirrored regular Orders, and fix paymentMethod to WALLET.
 *
 * Root cause this fixes:
 *  - publicOrdersRoutes mapPaymentMethodToEnum() didn't map 'wallet' -> WALLET
 *    so mirrored regular orders were stored as CASH.
 *  - The mirror create didn't copy walletPaymentProof / walletDiscount / etc.
 *    from the guest order metadata, so the admin order-detail API returned
 *    walletPaymentProof = null and the merchant never saw the screenshot.
 *
 * Run on the production server:  node scripts/backfill_wallet_payment_proof.js
 */
const { getSharedPrismaClientAsync, closeSharedDatabase } = require('../services/sharedDatabase');

const WALLET_METADATA_KEYS = [
  'walletPaymentProof',
  'walletDiscount',
  'walletApplied',
  'walletCustomerId',
  'walletBalanceBefore',
  'walletBalanceAfter',
];

function parseMetadata(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  console.log('Scanning guest orders that carry a wallet payment proof...');

  const guestOrders = await prisma.guestOrder.findMany({
    where: {
      OR: [{ metadata: { contains: 'walletPaymentProof' } }],
    },
    select: {
      id: true,
      orderNumber: true,
      companyId: true,
      paymentMethod: true,
      metadata: true,
    },
  });

  console.log(`Found ${guestOrders.length} guest order(s) with walletPaymentProof metadata.`);

  let updated = 0;
  let noMirror = 0;
  let skipped = 0;

  for (const guest of guestOrders) {
    const guestMetadata = parseMetadata(guest.metadata);
    const proof = guestMetadata.walletPaymentProof;
    if (!proof) {
      skipped += 1;
      continue;
    }

    // Find the mirrored regular order for this storefront order
    const order = await prisma.order.findFirst({
      where: {
        companyId: guest.companyId,
        orderNumber: guest.orderNumber,
      },
      select: { id: true, metadata: true, paymentMethod: true },
    });

    if (!order) {
      noMirror += 1;
      console.log(`  - No mirrored regular order for ${guest.orderNumber} (guest ${guest.id})`);
      continue;
    }

    const orderMetadata = parseMetadata(order.metadata);

    // Merge wallet fields from the guest order into the regular order metadata
    let changed = false;
    for (const key of WALLET_METADATA_KEYS) {
      if (guestMetadata[key] !== undefined && guestMetadata[key] !== null) {
        if (JSON.stringify(orderMetadata[key]) !== JSON.stringify(guestMetadata[key])) {
          orderMetadata[key] = guestMetadata[key];
          changed = true;
        }
      }
    }

    const shouldBeWallet =
      String(guest.paymentMethod || '').toLowerCase() === 'wallet' || Boolean(proof);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        ...(shouldBeWallet && order.paymentMethod !== 'WALLET'
          ? { paymentMethod: 'WALLET' }
          : {}),
        ...(changed ? { metadata: JSON.stringify(orderMetadata) } : {}),
      },
    });

    updated += 1;
    console.log(
      `  + Fixed ${guest.orderNumber}: paymentMethod=${shouldBeWallet ? 'WALLET' : order.paymentMethod} proof=${proof.status || 'PENDING'}`,
    );
  }

  console.log(
    `\nDone. updated=${updated} noMirror=${noMirror} skipped=${skipped}`,
  );

  await closeSharedDatabase();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err?.message || err);
    process.exit(1);
  });
