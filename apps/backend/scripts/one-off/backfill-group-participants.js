const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BATCH_SIZE = 500;

/**
 * باكفيل المشارك (participant) في رسائل الجروبات القديمة.
 * Baileys الحديثة بتبعت راسل الجروب في المشارك على المستوى الأعلى (metadata.participant)
 * مش في key.participant — فـ الرسائل اللي اتخزنت قبل الإصلاح كانت participant=null.
 * السكريبت ده بيملأ المشارك من الـ metadata للرسائل القديمة.
 */
async function main() {
  console.log('=== Backfilling group message participants from metadata ===');

  let updated = 0;
  let scanned = 0;
  let cursor = null;

  // نمر على الرسائل بالترتيب التصاعدي لمعرف الصف (id) — بدون ترقيم صفحات ثقيل.
  for (;;) {
    const rows = await prisma.whatsAppMessage.findMany({
      where: {
        remoteJid: { endsWith: '@g.us' },
        participant: null,
        metadata: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {})
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: { id: true, messageId: true, metadata: true }
    });

    if (rows.length === 0) break;
    scanned += rows.length;

    const updates = [];
    for (const row of rows) {
      let meta = null;
      try {
        meta = JSON.parse(row.metadata);
      } catch {
        continue; // metadata غير صالح — نتجاهله
      }
      const participant =
        (meta && typeof meta === 'object' && (meta.participant || meta?.key?.participant)) || null;
      if (participant && String(participant).includes('@')) {
        updates.push(prisma.whatsAppMessage.update({
          where: { id: row.id },
          data: { participant: String(participant) }
        }));
      }
    }

    if (updates.length > 0) {
      // تنفيذ التحديثات بشكل متوازي ضمن الدفعة
      await Promise.all(updates);
      updated += updates.length;
    }

    console.log(`  scanned=${scanned} updated=${updated}`);
    cursor = rows[rows.length - 1].id;
  }

  console.log(`Done. Updated ${updated} group message(s) with a resolved participant.`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
