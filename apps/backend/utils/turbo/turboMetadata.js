/**
 * Turbo metadata helpers — single source for safely merging turboMetadata.
 *
 * Turbo shipment writers must MERGE onto existing metadata instead of
 * replacing it. Several flows (auto-create on confirmation, manual create,
 * bulk create, cancel, manual track) used to write `JSON.stringify(patch)`,
 * which silently wiped every existing key — including the settlement state
 * (`settlementStatus`/`settledAt`/`settledBy`) written by the shipping
 * settlement flow and the `actualShippingCost` written by the Turbo report.
 */

const SETTLEMENT_KEYS = ['settlementStatus', 'settledAt', 'settledBy'];

const parseTurboMetadata = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Merge a patch onto existing turboMetadata without losing existing keys.
 *
 * Settlement state is owned by the settlement flow only: when the existing
 * metadata carries a settlement, generic Turbo writers are never allowed to
 * alter it — even if the patch happens to include a settlement key.
 *
 * @param {string|object|null} existing - existing turboMetadata
 * @param {object} patch - new metadata to merge in
 */
const mergeTurboMetadata = (existing, patch) => {
  const base = parseTurboMetadata(existing);
  const incoming = parseTurboMetadata(patch);
  const merged = { ...base, ...incoming };
  for (const key of SETTLEMENT_KEYS) {
    const hasExisting = base[key] !== undefined && base[key] !== null;
    if (hasExisting) {
      merged[key] = base[key];
    }
  }
  return merged;
};

const serializeTurboMetadata = (existing, patch) =>
  JSON.stringify(mergeTurboMetadata(existing, patch));

module.exports = {
  SETTLEMENT_KEYS,
  parseTurboMetadata,
  mergeTurboMetadata,
  serializeTurboMetadata,
};
