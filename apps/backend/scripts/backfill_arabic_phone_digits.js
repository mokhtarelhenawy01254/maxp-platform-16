const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { toAsciiDigits, toCanonicalE164 } = require('../utils/phoneNormalization');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const RELATIONS = [
  ['order', 'customerId'],
  ['conversation', 'customerId'],
  ['whatsAppContact', 'customerId'],
  ['returnRequest', 'customerId'],
  ['formSubmission', 'customerId'],
  ['whatsappNotificationLog', 'customerId'],
];

function hasArabicDigits(phone) {
  return /[٠-٩۰-۹]/.test(String(phone || ''));
}

(async () => {
  const prisma = getSharedPrismaClient();
  try {
    const rows = await prisma.customer.findMany({
      where: { phone: { not: null } },
      select: { id: true, companyId: true, phone: true, phoneNormalized: true },
    });

    const arabic = rows.filter(r => hasArabicDigits(r.phone));
    console.log(`Total customers with phone: ${rows.length} | with Arabic digits: ${arabic.length}`);

    if (arabic.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    let converted = 0;
    let merged = 0;

    for (const row of arabic) {
      const asciiPhone = toAsciiDigits(row.phone);
      const canonical = toCanonicalE164(asciiPhone);
      const asciiClean = asciiPhone.replace(/\D/g, '');

      if (canonical) {
        // التحقق المباشر: في حد تاني (إنجليزي/عربي) عنده نفس الـ canonical في نفس الشركة؟
        const existingHolder = await prisma.customer.findFirst({
          where: { companyId: row.companyId, phoneNormalized: canonical, id: { not: row.id } },
          select: { id: true },
        });

        if (existingHolder) {
          // تعارض → دمج في اللي موجود (بيحافظ على الـ unique constraint)
          merged++;
          console.log(`[MERGE] ${row.id} (${row.phone}) -> ${existingHolder.id} (${canonical})`);
          if (!DRY_RUN) {
            for (const [model, field] of RELATIONS) {
              const m = prisma[model];
              if (m && typeof m.updateMany === 'function') {
                await m.updateMany({ where: { [field]: row.id }, data: { [field]: existingHolder.id } }).catch(() => null);
              }
            }
            try {
              const dupWallet = await prisma.customerWallet.findUnique({ where: { customerId: row.id } });
              if (dupWallet) {
                const ownerWallet = await prisma.customerWallet.findUnique({ where: { customerId: existingHolder.id } });
                if (ownerWallet) {
                  await prisma.customerWallet.update({
                    where: { id: ownerWallet.id },
                    data: {
                      balance: (ownerWallet.balance || 0) + (dupWallet.balance || 0),
                      totalEarned: (ownerWallet.totalEarned || 0) + (dupWallet.totalEarned || 0),
                      totalSpent: (ownerWallet.totalSpent || 0) + (dupWallet.totalSpent || 0),
                    },
                  }).catch(() => null);
                  await prisma.customerWallet.delete({ where: { customerId: row.id } }).catch(() => null);
                } else {
                  await prisma.customerWallet.update({ where: { id: dupWallet.id }, data: { customerId: existingHolder.id } }).catch(() => null);
                }
              }
            } catch { /* تجاهل */ }
            await prisma.customer.update({
              where: { id: row.id },
              data: {
                status: 'INACTIVE',
                phone: null,
                phoneNormalized: null,
                notes: `[merged into ${existingHolder.id} ${new Date().toISOString()}]`,
              },
            }).catch(() => null);
          }
          continue;
        }
      }

      // لا يوجد تعارض → تحويل الرقم + ضبط phoneNormalized
      const updateData = {};
      if (asciiClean && asciiClean !== String(row.phone || '').trim()) {
        updateData.phone = asciiClean;
      }
      if (canonical) updateData.phoneNormalized = canonical;
      if (Object.keys(updateData).length > 0) {
        converted++;
        console.log(`[CONVERT] ${row.id} (${row.phone}) -> ${asciiClean} | ${canonical || 'no-canonical'}`);
        if (!DRY_RUN) {
          await prisma.customer.update({ where: { id: row.id }, data: updateData });
        }
      }
    }

    console.log(`\nDone. converted: ${converted}, merged: ${merged}${DRY_RUN ? ' (DRY RUN — no changes written)' : ''}.`);
  } catch (e) {
    console.error('Backfill failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
