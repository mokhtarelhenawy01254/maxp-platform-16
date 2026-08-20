/**
 * Backfill: Populate new turbo captain/branch/delay/return fields from existing turboMetadata
 * Run: node scripts/backfill_turbo_fields.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('≡ƒöü Backfilling turbo captain/branch/delay/return fields from turboMetadata...\n');

  // Standard Orders
  const orders = await prisma.order.findMany({
    where: { turboMetadata: { not: null }, turboShipmentId: { not: null } },
    select: { id: true, orderNumber: true, turboMetadata: true }
  });

  let updated = 0;
  for (const order of orders) {
    let meta = {};
    try { meta = typeof order.turboMetadata === 'object' ? order.turboMetadata : JSON.parse(order.turboMetadata); } catch(e) { continue; }

    const updateData = {};
    if (meta.captain_name || meta.captain) updateData.turboCaptainName = meta.captain_name || meta.captain;
    if (meta.captain_number1) updateData.turboCaptainPhone = meta.captain_number1;
    if (meta.branch_name || meta.branch) updateData.turboBranchName = meta.branch_name || meta.branch;
    if (meta.branch_number1) updateData.turboBranchPhone = meta.branch_number1;
    if (meta.delay_reason) updateData.turboDelayReason = meta.delay_reason;
    if (meta.return_reason || meta.return_status_text) updateData.turboReturnReason = meta.return_reason || meta.return_status_text;
    if (meta.expected_branch) updateData.turboExpectedBranch = meta.expected_branch;

    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({ where: { id: order.id }, data: updateData });
      updated++;
    }
  }

  console.log(`Γ£à Orders updated: ${updated}/${orders.length}`);

  // Guest Orders
  const guestOrders = await prisma.guestOrder.findMany({
    where: { turboMetadata: { not: null } },
    select: { id: true, orderNumber: true, turboMetadata: true }
  });

  let guestUpdated = 0;
  for (const order of guestOrders) {
    let meta = {};
    try { meta = typeof order.turboMetadata === 'object' ? order.turboMetadata : JSON.parse(order.turboMetadata); } catch(e) { continue; }

    const updateData = {};
    if (meta.captain_name || meta.captain) updateData.turboCaptainName = meta.captain_name || meta.captain;
    if (meta.captain_number1) updateData.turboCaptainPhone = meta.captain_number1;
    if (meta.branch_name || meta.branch) updateData.turboBranchName = meta.branch_name || meta.branch;
    if (meta.branch_number1) updateData.turboBranchPhone = meta.branch_number1;
    if (meta.delay_reason) updateData.turboDelayReason = meta.delay_reason;
    if (meta.return_reason || meta.return_status_text) updateData.turboReturnReason = meta.return_reason || meta.return_status_text;
    if (meta.expected_branch) updateData.turboExpectedBranch = meta.expected_branch;

    if (Object.keys(updateData).length > 0) {
      await prisma.guestOrder.update({ where: { id: order.id }, data: updateData });
      guestUpdated++;
    }
  }

  console.log(`Γ£à GuestOrders updated: ${guestUpdated}/${guestOrders.length}`);
  console.log('\nΓ£à Backfill complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
