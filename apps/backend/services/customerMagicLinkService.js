/**
 * 🔗 Customer Magic Link Service
 * روابط سريّة تسمح للعميل بفتح بوابة حسابه (صفحته) من غير ما يكتب رقم الموبايل.
 * - بيتم توليد التوكن وقت إرسال رسالة الواتساب (زر "صفحة العميل").
 * - الرابط بيحتوي التوكن + الرقم، والـ endpoint بيتأكد من صحتهم ويصدر JWT.
 */

const crypto = require('crypto');

const DEFAULT_EXPIRY_DAYS = 30;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * إنشاء رابط سري للعميل.
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
 * التحقق من الرابط السري + تعليمه كمستخدم.
 * @returns {Promise<Object|null>} سجل الرابط لو صالح، null لو غير صالح.
 */
async function validateMagicLink(prisma, { token, phone, companyId }) {
  if (!token || !phone || !companyId) return null;

  const link = await prisma.customerMagicLink.findFirst({
    where: { token, companyId }
  });

  if (!link) return null;

  // تطابق الرقم (بالصيغة المخزنة أو normalized)
  const { toCanonicalE164 } = require('../utils/phoneNormalization');
  const phoneNorm = toCanonicalE164(phone);
  const linkNorm = toCanonicalE164(link.phone);
  if (phoneNorm && linkNorm && phoneNorm !== linkNorm) return null;
  if ((!phoneNorm || !linkNorm) && String(link.phone).replace(/\D/g, '') !== String(phone || '').replace(/\D/g, '')) return null;

  // انتهاء الصلاحية
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return null;

  // بمناسبة الاستخدام (لاحظ: الرسالة ممكن تنضغط أكتر من مرة — بنسمح بالاستخدام
  // المتكرر خلال فترة الصلاحية، بس بنسجّل أول استخدام)
  if (!link.usedAt) {
    await prisma.customerMagicLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() }
    }).catch(() => null);
  }

  return link;
}

/**
 * بناء رابط بوابة العميل (على ساب دومين الشركة).
 * @param {Object} company — لازم يكون فيه id, slug, customDomain
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
