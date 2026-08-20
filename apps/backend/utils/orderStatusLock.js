// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöÆ Order Status Editing Lock (per-status)
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ┘â┘ä ╪¡╪º┘ä╪⌐ (╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿) ┘ü┘è ╪╡┘ü╪¡╪⌐ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä┘ç╪º ╪▓╪▒ "┘à╪│┘à┘ê╪¡ ╪º┘ä╪¬╪╣╪»┘è┘ä / ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡".
// ╪º┘ä╪¡┘é┘ä ╪º┘ä┘à╪«╪▓┘æ┘å ╪╣┘ä┘ë ┘â┘ä ╪¡╪º┘ä╪⌐: orderStatusConfig.allowStatusEdit (╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è true).
//
// - allowStatusEdit = true  (┘à╪│┘à┘ê╪¡): ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ┘ü┘è ┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐ ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪¬╪╣╪»┘è┘ä.
// - allowStatusEdit = false (╪║┘è╪▒ ┘à╪│┘à┘ê╪¡): ╪ú┘è ╪╖┘ä╪¿ ┘à┘ê╪¼┘ê╪» ╪¡╪º┘ä┘è╪º┘ï ┘ü┘è ┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐
//   ┘ä╪º ┘è╪│╪¬╪╖┘è╪╣ ╪ú┘è ┘à╪│╪¬╪«╪»┘à ╪ú┘ê ┘å╪╕╪º┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪¬┘ç (┘è┘Å╪▒┘ü╪╢ ╪¿┘â┘ê╪» 403) ╪¡╪¬┘ë ┘è╪¬┘à ┘ü┘â
//   ╪º┘ä┘é┘ü┘ä ┘à┘å ╪╡┘ü╪¡╪⌐ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬.
//
// ┘à┘ä╪º╪¡╪╕╪⌐: order.status ┘è╪«╪▓┘æ┘å ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ┘à┘å ╪º┘ä┘Ç enum (╪ú┘ê mapsToSystem ┘ä┘ä╪¡╪º┘ä╪º╪¬
// ╪º┘ä┘à╪«╪╡╪╡╪⌐)╪î ┘ä╪░┘ä┘â ┘å╪¿╪¡╪½ ┘ü┘è orderStatusConfig ╪¿╪º┘ä┘â┘ê╪» ╪ú┘ê ╪¿┘Ç mapsToSystem.
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const createLockError = (currentStatusCode = '') => {
  const error = new Error(
    `┘ä╪º ┘è┘à┘â┘å ╪¬╪╣╪»┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿ ΓÇö ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ (${currentStatusCode}) ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¬╪╣╪»┘è┘ä ╪¿┘è╪º┘å╪º╪¬┘ç╪º. ┘è┘à┘â┘å ┘ä┘ä╪ú╪»┘à┘å/╪º┘ä┘à╪º┘ä┘â ┘ü┘â ╪º┘ä┘é┘ü┘ä ┘à┘å ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬.`
  );
  error.statusCode = 403;
  return error;
};

/**
 * ┘ç┘ä ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿ ┘à┘é┘ü┘ä╪⌐ (╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¬╪╣╪»┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪ú┘ê╪▒╪»╪▒) ┘ä┘ç╪░┘ç ╪º┘ä╪┤╪▒┘â╪⌐╪ƒ
 * @param {object} prisma (╪º╪«╪¬┘è╪º╪▒┘è) - ╪¿╪▒┘è╪▓┘à╪º ┘à┘ê╪¼┘ê╪» ┘ä╪¬╪¼┘å╪¿ ╪Ñ┘å╪┤╪º╪í ╪º╪¬╪╡╪º┘ä ╪¼╪»┘è╪»
 * @param {string} companyId
 * @param {string} currentStatusCode - ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿ (order.status)
 */
const isOrderStatusEditingLocked = async (prisma = null, companyId, currentStatusCode) => {
  if (!companyId || !currentStatusCode) return false;
  const client = prisma || getSharedPrismaClient();
  const code = String(currentStatusCode || '').trim().toUpperCase();
  try {
    const config = await client.orderStatusConfig.findFirst({
      where: {
        companyId,
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { mapsToSystem: code },
        ],
      },
      select: { allowStatusEdit: true },
    });
    return config ? config.allowStatusEdit === false : false;
  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS-LOCK] Error reading status lock:', error.message);
    return false;
  }
};

/**
 * ┘è╪▒┘ü╪╢ ┘à╪¡╪º┘ê┘ä╪⌐ ╪¬╪╣╪»┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿ ╪Ñ╪░╪º ┘â╪º┘å╪¬ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿ ┘à┘é┘ü┘ä╪⌐.
 * @param {object} prisma
 * @param {string} companyId
 * @param {string} currentStatusCode - ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿
 */
const assertOrderStatusEditable = async (prisma, companyId, currentStatusCode) => {
  if (await isOrderStatusEditingLocked(prisma, companyId, currentStatusCode)) {
    throw createLockError(currentStatusCode);
  }
};

module.exports = {
  isOrderStatusEditingLocked,
  assertOrderStatusEditable,
};
