/**
 * Configurable workflow guards for the radiology module, stored as
 * RadiologySetting key/value rows per company.
 *
 * Keys:
 *  - requirePaymentBeforeDelivery ('true' | 'false', default 'false')
 *      block delivering a study billed directly to the patient while unpaid
 *  - blockCancelAfterDelivery ('true' | 'false', default 'true')
 *      block cancelling a booking whose study has already been delivered
 */

const DEFAULT_GUARDS = {
  requirePaymentBeforeDelivery: 'false',
  blockCancelAfterDelivery: 'true',
};

/**
 * Fetch the effective guard flags for a company.
 * @param prisma
 * @param {string|null} companyId
 * @returns {Promise<{ requirePaymentBeforeDelivery: boolean; blockCancelAfterDelivery: boolean }>}
 */
async function getRadiologyGuards(prisma, companyId) {
  const model = prisma && prisma.radiologySetting;
  const rows = companyId && model
    ? await model.findMany({ where: { companyId } }).catch(() => [])
    : [];
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  const flag = (key, dflt) => (map[key] !== undefined ? map[key] === 'true' : dflt === 'true');
  return {
    requirePaymentBeforeDelivery: flag('requirePaymentBeforeDelivery', DEFAULT_GUARDS.requirePaymentBeforeDelivery),
    blockCancelAfterDelivery: flag('blockCancelAfterDelivery', DEFAULT_GUARDS.blockCancelAfterDelivery),
  };
}

module.exports = { DEFAULT_GUARDS, getRadiologyGuards };
