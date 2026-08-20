/**
 * Configurable delivery-notification flags for the radiology module, stored as
 * RadiologySetting key/value rows per company.
 *
 * Keys:
 *  - deliverSmsPatient ('true' | 'false', default 'true')
 *      send the report PDF to the patient via WhatsApp on study delivery
 *  - notifyReferringDoctor ('true' | 'false', default 'true')
 *      notify the referring physician "result ready" on study delivery
 */

const DEFAULT_DELIVERY = {
  deliverSmsPatient: 'true',
  notifyReferringDoctor: 'true',
};

/**
 * Fetch the effective delivery-notification flags for a company.
 * @param prisma
 * @param {string|null} companyId
 * @returns {Promise<{ deliverSmsPatient: boolean; notifyReferringDoctor: boolean }>}
 */
async function getRadiologyDeliverySettings(prisma, companyId) {
  const model = prisma && prisma.radiologySetting;
  const rows = companyId && model
    ? await model.findMany({ where: { companyId } }).catch(() => [])
    : [];
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  const flag = (key, dflt) => (map[key] !== undefined ? map[key] === 'true' : dflt === 'true');
  return {
    deliverSmsPatient: flag('deliverSmsPatient', DEFAULT_DELIVERY.deliverSmsPatient),
    notifyReferringDoctor: flag('notifyReferringDoctor', DEFAULT_DELIVERY.notifyReferringDoctor),
  };
}

module.exports = { DEFAULT_DELIVERY, getRadiologyDeliverySettings };
