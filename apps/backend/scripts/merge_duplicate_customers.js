const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { toCanonicalE164 } = require('../utils/phoneNormalization');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const companyFilter = args.find(a => a.startsWith('--companyId='))?.split('=')[1] || null;

function hasModel(prisma, name) {
  try {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(prisma)).includes(name);
  } catch (e) {
    return false;
  }
}

function canonicalScore(customer) {
  let score = 0;
  if (customer.firstName && customer.lastName) score += 3;
  else if (customer.firstName) score += 1;
  if (String(customer.phone || '').startsWith('20')) score += 2;
  if (customer.email) score += 1;
  if (customer.status === 'ACTIVE') score += 1;
  if (customer.whatsappId) score += 4;
  return score;
}

(async () => {
  const prisma = getSharedPrismaClient();
  try {
    const where = {};
    if (companyFilter) where.companyId = companyFilter;

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true, companyId: true, firstName: true, lastName: true,
        phone: true, email: true, status: true, phoneNormalized: true,
        createdAt: true, updatedAt: true, avatar: true, whatsappId: true,
        notes: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const groups = new Map();
    const withPhone = customers.filter(c => c.phone && String(c.phone).replace(/\D/g, ''));
    for (const c of withPhone) {
      const canonical = toCanonicalE164(c.phone);
      const key = `${c.companyId}::${canonical || c.phone}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    const seen = new Set();
    let mergedGroups = [];
    for (const c of withPhone) {
      if (seen.has(c.id)) continue;
      const canonical = toCanonicalE164(c.phone);
      const key = `${c.companyId}::${canonical || c.phone}`;
      const members = groups.get(key) || [];
      if (members.length > 1) {
        mergedGroups.push(members);
        members.forEach(m => seen.add(m.id));
      }
    }

    if (mergedGroups.length === 0) {
      console.log(`No duplicate customer groups found${DRY_RUN ? ' (DRY RUN)' : ''}.`);
      return;
    }

    console.log(`Found ${mergedGroups.length} duplicate customer group(s)${DRY_RUN ? ' (DRY RUN — nothing will be written)' : ''}:\n`);

    let totalGroups = 0;
    let totalOrders = 0;
    let totalWalletsMerged = 0;

    for (const group of mergedGroups) {
      const canonical = [...group].sort((a, b) => canonicalScore(b) - canonicalScore(a))[0];
      const duplicates = group.filter(g => g.id !== canonical.id);

      console.log(`• Group (company ${canonical.companyId}, canonical ${canonical.id}):`);
      for (const m of group) {
        const role = m.id === canonical.id ? 'KEEP  ' : 'MERGE→';
        console.log(`   ${role} ${m.id} | ${m.firstName || ''} ${m.lastName || ''} | ${m.phone || ''} | ${m.status} | wa:${m.whatsappId || '-'}`);
      }

      for (const dup of duplicates) {
        const moved = {
          orders: (await prisma.order.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count,
          conversations: (await prisma.conversation.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count,
          whatsappContacts: (await prisma.whatsAppContact.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count,
          returnRequests: (await prisma.returnRequest.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count,
          formSubmissions: (await prisma.formSubmission.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count,
        };
        if (hasModel(prisma, 'whatsappNotificationLog')) {
          moved.whatsappNotificationLogs = (await prisma.whatsappNotificationLog.updateMany({ where: { customerId: dup.id }, data: { customerId: canonical.id } })).count;
        }
        totalOrders += moved.orders;
        console.log(`      → moved from ${dup.id}: ${JSON.stringify(moved)}`);
      }

      const updateData = {};
      if (canonical.status === 'LEAD') updateData.status = 'ACTIVE';
      if (!canonical.phoneNormalized && canonical.phone) {
        updateData.phoneNormalized = toCanonicalE164(canonical.phone);
      }
      if (!canonical.lastName) {
        const withLastName = group.find(g => g.lastName);
        if (withLastName) updateData.lastName = withLastName.lastName;
      }
      if (!canonical.whatsappId) {
        const withWhatsappId = group.find(g => g.whatsappId);
        if (withWhatsappId) updateData.whatsappId = withWhatsappId.whatsappId;
      }
      if (Object.keys(updateData).length > 0 && !DRY_RUN) {
        await prisma.customer.update({ where: { id: canonical.id }, data: updateData });
      }
      console.log(`      → canonical update: ${JSON.stringify(updateData)}`);

      const canonicalWallet = await prisma.customerWallet.findUnique({ where: { customerId: canonical.id } });
      for (const dup of duplicates) {
        const dupWallet = await prisma.customerWallet.findUnique({ where: { customerId: dup.id } });
        if (!dupWallet) continue;

        if (!canonicalWallet) {
          if (!DRY_RUN) {
            await prisma.customerWallet.update({ where: { id: dupWallet.id }, data: { customerId: canonical.id } });
          }
          totalWalletsMerged++;
          console.log(`      → wallet ${dupWallet.id} (balance ${dupWallet.balance}) moved to canonical ${canonical.id}`);
        } else {
          if (!DRY_RUN) {
            await prisma.customerWallet.update({
              where: { id: canonicalWallet.id },
              data: {
                balance: canonicalWallet.balance + dupWallet.balance,
                totalEarned: canonicalWallet.totalEarned + dupWallet.totalEarned,
                totalSpent: canonicalWallet.totalSpent + dupWallet.totalSpent,
              },
            });
          }
          totalWalletsMerged++;
          console.log(`      → wallet ${dupWallet.id} (balance ${dupWallet.balance}) merged into canonical wallet (${canonicalWallet.balance} → ${canonicalWallet.balance + dupWallet.balance})`);
        }
      }

      if (!DRY_RUN) {
        for (const dup of duplicates) {
          await prisma.customer.update({
            where: { id: dup.id },
            data: { status: 'INACTIVE', notes: (dup.notes ? dup.notes + '\n' : '') + `[merged into ${canonical.id} ${new Date().toISOString()}]` },
          }).catch(err => console.error(`      ✗ cannot mark ${dup.id} inactive: ${err.message}`));
          console.log(`      → marked duplicate ${dup.id} INACTIVE (soft merge)`);
        }
      }

      totalGroups++;
    }

    console.log(`\nDone. groups: ${totalGroups}, orders moved: ${totalOrders}, wallets merged/moved: ${totalWalletsMerged}${DRY_RUN ? ' (DRY RUN — no changes written)' : ''}.`);
  } catch (e) {
    console.error('Merge failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
