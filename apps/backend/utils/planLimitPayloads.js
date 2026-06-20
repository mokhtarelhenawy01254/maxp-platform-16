// ponytail: plan-based limits removed — all operations allowed.
// Replace per-app/bundle limits when needed.
async function ensureWithinPlanLimit(companyId, type, count = 1) {
  return { allowed: true };
}

module.exports = { ensureWithinPlanLimit };
