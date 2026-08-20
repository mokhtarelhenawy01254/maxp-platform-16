/**
 * ≡ƒöù Customer Magic Link Service
 * ╪▒┘ê╪º╪¿╪╖ ╪│╪▒┘è┘æ╪⌐ ╪¬╪│┘à╪¡ ┘ä┘ä╪╣┘à┘è┘ä ╪¿┘ü╪¬╪¡ ╪¿┘ê╪º╪¿╪⌐ ╪¡╪│╪º╪¿┘ç (╪╡┘ü╪¡╪¬┘ç) ┘à┘å ╪║┘è╪▒ ┘à╪º ┘è┘â╪¬╪¿ ╪▒┘é┘à ╪º┘ä┘à┘ê╪¿╪º┘è┘ä.
 * - ╪¿┘è╪¬┘à ╪¬┘ê┘ä┘è╪» ╪º┘ä╪¬┘ê┘â┘å ┘ê┘é╪¬ ╪Ñ╪▒╪│╪º┘ä ╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ (╪▓╪▒ "╪╡┘ü╪¡╪⌐ ╪º┘ä╪╣┘à┘è┘ä").
 * - ╪º┘ä╪▒╪º╪¿╪╖ ╪¿┘è╪¡╪¬┘ê┘è ╪º┘ä╪¬┘ê┘â┘å + ╪º┘ä╪▒┘é┘à╪î ┘ê╪º┘ä┘Ç endpoint ╪¿┘è╪¬╪ú┘â╪» ┘à┘å ╪╡╪¡╪¬┘ç┘à ┘ê┘è╪╡╪»╪▒ JWT.
 */

const crypto = require('crypto');

const DEFAULT_EXPIRY_DAYS = 30;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * ╪Ñ┘å╪┤╪º╪í ╪▒╪º╪¿╪╖ ╪│╪▒┘è ┘ä┘ä╪╣┘à┘è┘ä.
 * @param {Object} prisma
 * @param {{ companyId: string, customerId: string, phone: string, expiresInDays?: number }} params
 */
async function createMagicLink(prisma, { companyId, customerId, phone, expiresInDays = DEFAULT_EXPIRY_DAYS }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const link = await prisma.customerMagicLink.create({
    data: { companyId, customerId, phone, token, expiresAt }
  });

  return { token, expiresAt, id: link.id };
}

/**
 * ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪▒╪º╪¿╪╖ ╪º┘ä╪│╪▒┘è + ╪¬╪╣┘ä┘è┘à┘ç ┘â┘à╪│╪¬╪«╪»┘à.
 * @returns {Promise<Object|null>} ╪│╪¼┘ä ╪º┘ä╪▒╪º╪¿╪╖ ┘ä┘ê ╪╡╪º┘ä╪¡╪î null ┘ä┘ê ╪║┘è╪▒ ╪╡╪º┘ä╪¡.
 */
async function validateMagicLink(prisma, { token, phone, companyId }) {
  if (!token || !phone || !companyId) return null;

  const link = await prisma.customerMagicLink.findFirst({
    where: { token, companyId }
  });

  if (!link) return null;

  // ╪¬╪╖╪º╪¿┘é ╪º┘ä╪▒┘é┘à (╪¿╪º┘ä╪╡┘è╪║╪⌐ ╪º┘ä┘à╪«╪▓┘å╪⌐ ╪ú┘ê normalized)
  const { toCanonicalE164 } = require('../utils/phoneNormalization');
  const phoneNorm = toCanonicalE164(phone);
  const linkNorm = toCanonicalE164(link.phone);
  if (phoneNorm && linkNorm && phoneNorm !== linkNorm) return null;
  if ((!phoneNorm || !linkNorm) && String(link.phone).replace(/\D/g, '') !== String(phone || '').replace(/\D/g, '')) return null;

  // ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return null;

  // ╪¿┘à┘å╪º╪│╪¿╪⌐ ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à (┘ä╪º╪¡╪╕: ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘à┘à┘â┘å ╪¬┘å╪╢╪║╪╖ ╪ú┘â╪¬╪▒ ┘à┘å ┘à╪▒╪⌐ ΓÇö ╪¿┘å╪│┘à╪¡ ╪¿╪º┘ä╪º╪│╪¬╪«╪»╪º┘à
  // ╪º┘ä┘à╪¬┘â╪▒╪▒ ╪«┘ä╪º┘ä ┘ü╪¬╪▒╪⌐ ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐╪î ╪¿╪│ ╪¿┘å╪│╪¼┘æ┘ä ╪ú┘ê┘ä ╪º╪│╪¬╪«╪»╪º┘à)
  if (!link.usedAt) {
    await prisma.customerMagicLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() }
    }).catch(() => null);
  }

  return link;
}

/**
 * ╪¿┘å╪º╪í ╪▒╪º╪¿╪╖ ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╣┘à┘è┘ä (╪╣┘ä┘ë ╪│╪º╪¿ ╪»┘ê┘à┘è┘å ╪º┘ä╪┤╪▒┘â╪⌐).
 * @param {Object} company ΓÇö ┘ä╪º╪▓┘à ┘è┘â┘ê┘å ┘ü┘è┘ç id, slug, customDomain
 * @param {string} token
 * @param {string} phone
 */
function buildMagicLinkUrl(company, token, phone) {
  const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
  const host = (company.customDomain && String(company.customDomain).trim())
    ? String(company.customDomain).trim().replace(/^https?:\/\//, '')
    : `${String(company.slug || company.id).trim()}${baseDomain.startsWith('.') ? '' : '.'}${baseDomain}`;

  const qs = new URLSearchParams({ token, phone });
  return `https://${host}/api/v1/public/customers/magic-login?${qs.toString()}`;
}

module.exports = {
  createMagicLink,
  validateMagicLink,
  buildMagicLinkUrl,
  generateToken,
};
