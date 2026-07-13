async function ensureWithinPlanLimit(companyId, type, count = 1) {
  return { allowed: true };
}

module.exports = { ensureWithinPlanLimit };
