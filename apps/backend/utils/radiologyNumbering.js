/**
 * Sequential per-company numbering helpers for radiology human-friendly IDs.
 *
 * Every company gets its own sequence starting at 1. The raw sequence number is
 * stored on the row (bookingNo / patientNo) and the display prefix/format is
 * configurable through RadiologySetting (see radiologySettingsController).
 */

const DEFAULT_SETTINGS = {
  bookingPrefix: 'B',
  patientPrefix: 'P',
  digits: 4,
  enabled: 'true',
};

/**
 * Compute the next sequential number for a model+field scoped to a company.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} modelName e.g. 'radiologyAppointment' | 'patient'
 * @param {string} field e.g. 'bookingNo' | 'patientNo'
 * @param {string} companyId
 */
async function nextCompanyNumber(prisma, modelName, field, companyId) {
  const model = prisma[modelName];
  if (!model) throw new Error(`Unknown prisma model: ${modelName}`);
  const res = await model.aggregate({
    _max: { [field]: true },
    where: { companyId },
  });
  const max = res._max && res._max[field];
  return (Number.isFinite(max) ? max : 0) + 1;
}

/**
 * Ensure a row carries its sequential number (best-effort, never throws).
 */
async function ensureSequentialNumber(prisma, modelName, field, companyId, rowId, currentValue) {
  if (currentValue && Number.isFinite(Number(currentValue))) return Number(currentValue);
  try {
    const next = await nextCompanyNumber(prisma, modelName, field, companyId);
    await prisma[modelName].update({ where: { id: rowId }, data: { [field]: next } });
    return next;
  } catch (error) {
    console.error(`[radiologyNumbering] failed to assign ${field}:`, error);
    return null;
  }
}

/**
 * Fetch effective radiology ID settings for a company.
 * @returns {Promise<{ bookingPrefix: string; patientPrefix: string; digits: number; enabled: boolean }>}
 */
async function getRadiologyIdSettings(prisma, companyId) {
  const rows = companyId
    ? await prisma.radiologySetting.findMany({ where: { companyId } }).catch(() => [])
    : [];
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  const digits = Number.isFinite(Number(map.digits)) ? Math.min(10, Math.max(1, Number(map.digits))) : DEFAULT_SETTINGS.digits;
  return {
    bookingPrefix: map.bookingPrefix !== undefined ? String(map.bookingPrefix) : DEFAULT_SETTINGS.bookingPrefix,
    patientPrefix: map.patientPrefix !== undefined ? String(map.patientPrefix) : DEFAULT_SETTINGS.patientPrefix,
    digits,
    enabled: map.enabled !== undefined ? map.enabled === 'true' : DEFAULT_SETTINGS.enabled === 'true',
  };
}

/**
 * Format a raw sequence number into a display id, e.g. B-0001.
 * Falls back to the raw number when the numeric ID is missing.
 */
function formatSequentialId(prefix, number, digits, enabled = true) {
  if (!Number.isFinite(Number(number))) return '';
  const n = Number(number);
  const padded = enabled ? String(n).padStart(digits, '0') : String(n);
  const p = enabled ? String(prefix || '') : '';
  return `${p}${p ? '-' : ''}${padded}`;
}

module.exports = {
  DEFAULT_SETTINGS,
  nextCompanyNumber,
  ensureSequentialNumber,
  getRadiologyIdSettings,
  formatSequentialId,
};
