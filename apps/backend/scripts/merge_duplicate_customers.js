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
    // ═══ Step 0: Backfill phoneNormalized (idempotent) ═══════════════════
    // من غيره الـ dedupe مش بيشتغل على القديم، والقيد الجديد (companyId, phoneNormalized)
    // مش هيمسك اللي phoneNormalized بتاعهم NULL.
    const needsBackfill = await prisma.customer.findMany({
      where: { phone: { not: null }, OR: [{ phoneNormalized: null }, { phoneNormalized: '' }] },
      select: { id: true, phone: true },
    });
    if (needsBackfill.length > 0) {
      const start = Date.now();
      const CONCURRENCY = 30;
      let backfilled = 0;
      let conflicts = 0;
      let cursor = 0;
      while (cursor < needsBackfill.length) {
        const chunk = needsBackfill.slice(cursor, cursor + CONCURRENCY * 200);
        cursor += chunk.length;
        await Promise.all(chunk.map(async (row) => {
          const canonical = toCanonicalE164(row.phone);
          if (!canonical) return;
          if (!DRY_RUN) {
            try {
              await prisma.customer.updateMany({ where: { id: row.id }, data: { phoneNormalized: canonical } });
              backfilled++;
            } catch (err) {
              // نفس الرقم موجود لعميل تاني في نفس الشركة → القيد (companyId, phoneNormalized)
              // مش هيقدر يتضبط هنا؛ الـ merge step جاي هيجمعهم ويمسح الفون من الـ duplicate.
              if (err?.code === 'P2002') {
                conflicts++;
                return;
              }
              throw err;
            }
            return;
          }
          backfilled++;
        }));
        if (cursor % 5000 < CONCURRENCY * 200) {
          console.log(`  ...backfilled ${backfilled}/${needsBackfill.length} (${Date.now() - start}ms)`);
        }
      }
      console.log(`✅ Backfilled ${backfilled} phoneNormalized${conflicts ? `, skipped ${conflicts} conflicting rows (handled by merge step)` : ''}${DRY_RUN ? ' (DRY RUN — not written)' : ''} in ${Date.now() - start}ms`);
    } else {
      console.log('✅ No phoneNormalized backfill needed.');
    }

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

      // مسح الفون من الـ duplicates قبل تحديث الـ canonical عشان القيد الجديد
      // (companyId, phoneNormalized) يتطبق من غير تعارض — لو الـ duplicate لسه
      // محتفظ بنفس الرقم، تحديث الـ canonical كان هيبوّظ بـ P2002.
      if (!DRY_RUN) {
        for (const dup of duplicates) {
          await prisma.customer.update({
            where: { id: dup.id },
            data: {
              status: 'INACTIVE',
              phone: null,
              phoneNormalized: null,
              whatsappId: null,
              notes: (dup.notes ? dup.notes + '\n' : '') + `[merged into ${canonical.id} ${new Date().toISOString()}]`,
            },
          }).catch(err => console.error(`      ✗ cannot mark ${dup.id} inactive: ${err.message}`));
          console.log(`      → marked duplicate ${dup.id} INACTIVE + phone cleared (soft merge)`);
        }
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
