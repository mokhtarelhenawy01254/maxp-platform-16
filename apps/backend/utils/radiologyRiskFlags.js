/**
 * Configurable medical risk indicators (┘à╪ñ╪┤╪▒╪º╪¬ ╪º┘ä╪«╪╖╪▒ ╪º┘ä╪╖╪¿┘è) for radiology
 * bookings, stored per company as a JSON array under RadiologySetting key
 * `riskFlags`.
 *
 * Each flag: { value, label, color }
 *  - value  internal key persisted in RadiologyAppointment/RadiologyStudy.patientFlags
 *  - label  display text (Arabic by default)
 *  - color  tailwind chip classes
 */

const RISK_FLAGS_KEY = 'riskFlags';

const DEFAULT_RISK_FLAGS = [
  { value: 'pregnancy', label: '╪¡┘à┘ä', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  { value: 'contrast_allergy', label: '╪¡╪│╪º╪│┘è╪⌐ ╪¬╪¿╪º┘è┘å', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'renal', label: '┘é╪╡┘ê╪▒ ┘â┘ä┘ê┘è', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'bleeding', label: '╪│┘è┘ê┘ä╪⌐', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'diabetic', label: '╪│┘â╪▒', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'claustrophobia', label: '╪«┘ê┘ü ┘à┘å ╪º┘ä╪ú┘à╪º┘â┘å ╪º┘ä┘à╪║┘ä┘é╪⌐', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'pacemaker', label: '┘à┘å╪╕┘à ╪╢╪▒╪¿╪º╪¬ ╪º┘ä┘é┘ä╪¿', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];

const MAX_FLAGS = 100;

const cleanFlag = (f) => {
  if (!f || typeof f !== 'object') return null;
  const value = String(f.value || '').trim().slice(0, 60);
  const label = String(f.label || '').trim().slice(0, 120);
  if (!value || !label) return null;
  const color = String(f.color || '').trim().slice(0, 200) || DEFAULT_RISK_FLAGS[0].color;
  return { value, label, color };
};

/**
 * Fetch the effective risk flags for a company (model-safe).
 * @param prisma
 * @param {string|null} companyId
 * @returns {Promise<Array<{ value: string; label: string; color: string }>>}
 */
async function getRadiologyRiskFlags(prisma, companyId) {
  const model = prisma && prisma.radiologySetting;
  const row = companyId && model
    ? await model.findUnique({ where: { companyId_key: { companyId, key: RISK_FLAGS_KEY } } }).catch(() => null)
    : null;
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.map(cleanFlag).filter(Boolean);
        if (cleaned.length > 0) return cleaned;
      }
    } catch (error) {
      console.error('[radiologyRiskFlags] invalid stored JSON, using defaults:', error.message);
    }
  }
  return DEFAULT_RISK_FLAGS;
}

/**
 * Persist a company's risk flags (full replace, dedupe by value).
 * @returns {Promise<Array<{ value: string; label: string; color: string }>>}
 */
async function saveRadiologyRiskFlags(prisma, companyId, flags) {
  const model = prisma && prisma.radiologySetting;
  if (!model) throw new Error('radiologySetting model unavailable');
  const cleaned = (Array.isArray(flags) ? flags : []).map(cleanFlag).filter(Boolean).slice(0, MAX_FLAGS);
  const seen = new Set();
  const unique = cleaned.filter((f) => {
    if (seen.has(f.value)) return false;
    seen.add(f.value);
    return true;
  });
  const value = JSON.stringify(unique);
  await model.upsert({
    where: { companyId_key: { companyId, key: RISK_FLAGS_KEY } },
    update: { value },
    create: { companyId, key: RISK_FLAGS_KEY, value },
  });
  return unique;
}

module.exports = { DEFAULT_RISK_FLAGS, getRadiologyRiskFlags, saveRadiologyRiskFlags };
