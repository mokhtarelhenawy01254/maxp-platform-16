/**
 * Patch Prisma Decimal Serialization (FIN-B5)
 *
 * By default, Prisma / decimal.js serializes Decimal instances to strings (e.g. "8500.00")
 * during JSON.stringify (res.json in Express).
 * This module patches Prisma.Decimal.prototype.toJSON so that numeric values serialize as
 * native JavaScript numbers across Treasury, Store, Purchases, Orders, and Dental Lab APIs,
 * while preserving high-precision database storage.
 */

function applyDecimalPatch() {
  const candidateModules = [
    '../prisma/generated/postgresql_v2',
    '@prisma/client',
  ];

  let patched = false;

  for (const modulePath of candidateModules) {
    try {
      const client = require(modulePath);
      const DecimalClass = client.Prisma?.Decimal || client.Decimal;
      if (DecimalClass && DecimalClass.prototype) {
        if (!DecimalClass.prototype.__jsonNumberPatched) {
          DecimalClass.prototype.toJSON = function () {
            const num = Number(this.toString());
            return Number.isFinite(num) ? num : this.toString();
          };
          DecimalClass.prototype.__jsonNumberPatched = true;
          patched = true;
        }
      }
    } catch (_) {
      // Ignore if module is not found or not yet generated
    }
  }

  return patched;
}

// Execute immediately on require
applyDecimalPatch();

module.exports = {
  applyDecimalPatch
};
