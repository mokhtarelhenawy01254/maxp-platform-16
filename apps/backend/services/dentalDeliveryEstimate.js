const DAY_MS = 86400000;

async function defaultLeadDays(prisma, workTypeId) {
  try {
    if (prisma && prisma.dentalWorkType && typeof prisma.dentalWorkType.findUnique === 'function') {
      const workType = await prisma.dentalWorkType.findUnique({ where: { id: workTypeId } });
      const lead = workType && Number.isFinite(Number(workType.leadTimeDays)) ? Number(workType.leadTimeDays) : 5;
      return Math.max(1, lead);
    }
  } catch (error) {
    console.error('Error loading dental work type lead time:', error);
  }
  return 5;
}

async function estimateLeadDays(prisma, companyId, workTypeId) {
  const rows = await prisma.dentalLabCase.findMany({
    where: {
      companyId,
      workTypeId,
      status: { in: ['DELIVERED', 'CLOSED'] },
      deliveredAt: { not: null },
    },
    select: { receivedDate: true, deliveredAt: true },
  });

  const sampleSize = (rows || []).length;
  if (sampleSize === 0) {
    return { days: await defaultLeadDays(prisma, workTypeId), source: 'default', sampleSize: 0 };
  }

  let totalMs = 0;
  let valid = 0;
  for (const row of rows || []) {
    if (!row.receivedDate || !row.deliveredAt) continue;
    const diff = new Date(row.deliveredAt) - new Date(row.receivedDate);
    if (!Number.isFinite(diff) || diff < 0) continue;
    totalMs += diff;
    valid += 1;
  }

  if (valid === 0) {
    return { days: await defaultLeadDays(prisma, workTypeId), source: 'default', sampleSize: 0 };
  }

  const avgDays = (totalMs / valid) / DAY_MS;
  const days = Math.max(1, Math.round(avgDays * 10) / 10);
  return { days, source: 'history', sampleSize };
}

async function suggestDueDate(prisma, companyId, workTypeId, base = new Date()) {
  const estimate = await estimateLeadDays(prisma, companyId, workTypeId);
  const due = new Date(base);
  due.setDate(due.getDate() + Math.max(1, Math.round(estimate.days)));
  return due;
}

module.exports = { estimateLeadDays, suggestDueDate };