/**
 * ╪│┘ä╪│┘ä╪⌐ ╪º┘ä╪Ñ╪¡╪º┘ä╪⌐ ┘ü┘è ┘å╪╕╪º┘à ╪º┘ä╪ú╪┤╪╣╪⌐ (RHOS):
 *   ╪º┘ä┘à╪▒┘è╪╢ ΓåÉ ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪╣╪º┘ä╪¼ (referringPhysicianId) ΓåÉ ╪¼┘ç╪⌐ ╪º┘ä╪Ñ╪¡╪º┘ä╪⌐ (referralSourceId) ΓåÉ ┘à┘å╪»┘ê╪¿ ╪º┘ä╪¬╪│┘ê┘è┘é (marketingRepId)
 *
 * ╪º┘ä┘à┘å╪»┘ê╪¿ ╪º┘ä┘à┘é╪¬╪▒╪¡: ┘à┘å╪»┘ê╪¿ ╪º┘ä╪╖╪¿┘è╪¿ ╪ú┘ê┘ä╪º┘ï (╪ú┘é╪▒╪¿ ┘ä┘ä╪¡╪º┘ä╪⌐)╪î ╪½┘à ┘à┘å╪»┘ê╪¿ ╪¼┘ç╪⌐ ╪º┘ä╪Ñ╪¡╪º┘ä╪⌐╪î ╪½┘à null.
 */

/**
 * ╪º┘é╪¬╪▒╪º╪¡ ┘à┘å╪»┘ê╪¿ ╪º┘ä╪¬╪│┘ê┘è┘é ╪º┘ä┘à╪│╪ñ┘ê┘ä ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ä╪╖╪¿┘è╪¿ ┘ê/╪ú┘ê ╪º┘ä╪¼┘ç╪⌐.
 * ╪º┘ä┘é╪º╪╣╪»╪⌐: ┘à┘å╪»┘ê╪¿ ╪º┘ä╪╖╪¿┘è╪¿ ┘è╪│╪¿┘é ┘à┘å╪»┘ê╪¿ ╪º┘ä╪¼┘ç╪⌐ ΓÇö ┘ê╪Ñ┘ä╪º null (┘ä╪º ╪º┘ü╪¬╪▒╪º╪╢ ╪«╪º╪╖╪ª).
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
 * ╪¼┘ä╪¿ ╪º┘ä╪╖╪¿┘è╪¿ ┘ê╪º┘ä╪¼┘ç╪⌐ ╪º┘ä┘à╪«╪¬╪º╪▒┘è┘å (company-scoped) ┘ä╪¡╪│╪º╪¿ ╪º┘ä┘à┘å╪»┘ê╪¿ ╪º┘ä┘à┘é╪¬╪▒╪¡ ╪╣┘å╪» ╪Ñ┘å╪┤╪º╪í/╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪ú┘ê ╪¡╪¼╪▓.
 * ┘ä╪º ┘è╪▒┘à┘è ╪ú╪¿╪»╪º┘ï ΓÇö ┘è╪╣┘è╪» ╪º┘ä┘é┘è┘à null ╪╣┘å╪» ╪╣╪»┘à ╪º┘ä╪¬╪╖╪º╪¿┘é (╪º┘ä╪¬╪ú┘â╪» ┘à┘å ╪º┘ä╪º┘å╪¬┘à╪º╪í ┘ä┘ä╪┤╪▒┘â╪⌐).
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
 * ╪¿┘å╪º╪í ╪¡┘é┘ä ╪º┘ä┘à┘å╪»┘ê╪¿ ╪º┘ä┘å┘ç╪º╪ª┘è: ╪º┘é╪¬╪▒╪º╪¡ ╪¬┘ä┘é╪º╪ª┘è ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪¬╪¼╪º┘ê╪▓.
 * ┘ä┘ê ╪ú┘Å╪▒╪│┘ä marketingRepId ╪╡╪▒╪º╪¡╪⌐┘ï ┘å╪│╪¬╪«╪»┘à┘ç╪î ┘ê╪Ñ┘ä╪º ┘å╪º┘é╪¬╪▒╪¡ ┘à┘å ╪º┘ä╪│┘è╪º┘é.
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
