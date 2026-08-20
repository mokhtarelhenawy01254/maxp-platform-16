const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BATCH_SIZE = 500;

/**
 * ╪¿╪º┘â┘ü┘è┘ä ╪º┘ä┘à╪┤╪º╪▒┘â (participant) ┘ü┘è ╪▒╪│╪º╪ª┘ä ╪º┘ä╪¼╪▒┘ê╪¿╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐.
 * Baileys ╪º┘ä╪¡╪»┘è╪½╪⌐ ╪¿╪¬╪¿╪╣╪¬ ╪▒╪º╪│┘ä ╪º┘ä╪¼╪▒┘ê╪¿ ┘ü┘è ╪º┘ä┘à╪┤╪º╪▒┘â ╪╣┘ä┘ë ╪º┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪ú╪╣┘ä┘ë (metadata.participant)
 * ┘à╪┤ ┘ü┘è key.participant ΓÇö ┘ü┘Ç ╪º┘ä╪▒╪│╪º╪ª┘ä ╪º┘ä┘ä┘è ╪º╪¬╪«╪▓┘å╪¬ ┘é╪¿┘ä ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ┘â╪º┘å╪¬ participant=null.
 * ╪º┘ä╪│┘â╪▒┘è╪¿╪¬ ╪»┘ç ╪¿┘è┘à┘ä╪ú ╪º┘ä┘à╪┤╪º╪▒┘â ┘à┘å ╪º┘ä┘Ç metadata ┘ä┘ä╪▒╪│╪º╪ª┘ä ╪º┘ä┘é╪»┘è┘à╪⌐.
 */
async function main() {
  console.log('=== Backfilling group message participants from metadata ===');

  let updated = 0;
  let scanned = 0;
  let cursor = null;

  // ┘å┘à╪▒ ╪╣┘ä┘ë ╪º┘ä╪▒╪│╪º╪ª┘ä ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪¬╪╡╪º╪╣╪»┘è ┘ä┘à╪╣╪▒┘ü ╪º┘ä╪╡┘ü (id) ΓÇö ╪¿╪»┘ê┘å ╪¬╪▒┘é┘è┘à ╪╡┘ü╪¡╪º╪¬ ╪½┘é┘è┘ä.
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
        continue; // metadata ╪║┘è╪▒ ╪╡╪º┘ä╪¡ ΓÇö ┘å╪¬╪¼╪º┘ç┘ä┘ç
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
      // ╪¬┘å┘ü┘è╪░ ╪º┘ä╪¬╪¡╪»┘è╪½╪º╪¬ ╪¿╪┤┘â┘ä ┘à╪¬┘ê╪º╪▓┘è ╪╢┘à┘å ╪º┘ä╪»┘ü╪╣╪⌐
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
