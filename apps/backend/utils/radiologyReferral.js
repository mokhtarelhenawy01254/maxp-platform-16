/**
 * سلسلة الإحالة في نظام الأشعة (RHOS):
 *   المريض ← الطبيب المعالج (referringPhysicianId) ← جهة الإحالة (referralSourceId) ← مندوب التسويق (marketingRepId)
 *
 * المندوب المقترح: مندوب الطبيب أولاً (أقرب للحالة)، ثم مندوب جهة الإحالة، ثم null.
 */

/**
 * اقتراح مندوب التسويق المسؤول بناءً على الطبيب و/أو الجهة.
 * القاعدة: مندوب الطبيب يسبق مندوب الجهة — وإلا null (لا افتراض خاطئ).
 * @param {{ physician?: { marketingRepId?: string | null } | null, source?: { marketingRepId?: string | null } | null }} ctx
 */
const suggestMarketingRep = (ctx = {}) => {
  const physicianRep = ctx?.physician?.marketingRepId || null;
  if (physicianRep) return physicianRep;
  const sourceRep = ctx?.source?.marketingRepId || null;
  if (sourceRep) return sourceRep;
  return null;
};

/**
 * جلب الطبيب والجهة المختارين (company-scoped) لحساب المندوب المقترح عند إنشاء/تحديث حالة أو حجز.
 * لا يرمي أبداً — يعيد القيم null عند عدم التطابق (التأكد من الانتماء للشركة).
 * @returns {Promise<{ physician: object|null, source: object|null, rep: object|null }>}
 */
const resolveReferralContext = async (prisma, { companyId, referringPhysicianId, referralSourceId }) => {
  const result = { physician: null, source: null, rep: null };
  if (referringPhysicianId && String(referringPhysicianId).trim()) {
    result.physician = await prisma.radiologyReferringPhysician
      .findFirst({ where: { id: String(referringPhysicianId).trim(), companyId }, select: { id: true, name: true, marketingRepId: true } })
      .catch(() => null);
  }
  if (referralSourceId && String(referralSourceId).trim()) {
    result.source = await prisma.radiologyReferralSource
      .findFirst({ where: { id: String(referralSourceId).trim(), companyId }, select: { id: true, name: true, marketingRepId: true } })
      .catch(() => null);
  }
  const repId = suggestMarketingRep({ physician: result.physician, source: result.source });
  if (repId) {
    result.rep = await prisma.radiologyMarketingRep
      .findFirst({ where: { id: repId, companyId }, select: { id: true, name: true } })
      .catch(() => null);
  }
  return result;
};

/**
 * بناء حقل المندوب النهائي: اقتراح تلقائي قابلة للتجاوز.
 * لو أُرسل marketingRepId صراحةً نستخدمه، وإلا ناقترح من السياق.
 * @returns {Promise<{ marketingRepId: string|null, marketingRepName: string|null }>}
 */
const resolveMarketingRepForStudy = async (prisma, { companyId, referringPhysicianId, referralSourceId, marketingRepId }) => {
  const explicit = marketingRepId && String(marketingRepId).trim() ? String(marketingRepId).trim() : null;
  if (explicit) {
    const rep = await prisma.radiologyMarketingRep
      .findFirst({ where: { id: explicit, companyId }, select: { id: true, name: true } })
      .catch(() => null);
    if (rep) return { marketingRepId: rep.id, marketingRepName: rep.name };
  }
  const ctx = await resolveReferralContext(prisma, { companyId, referringPhysicianId, referralSourceId });
  if (ctx.rep) return { marketingRepId: ctx.rep.id, marketingRepName: ctx.rep.name };
  return { marketingRepId: null, marketingRepName: null };
};

module.exports = { suggestMarketingRep, resolveReferralContext, resolveMarketingRepForStudy };
