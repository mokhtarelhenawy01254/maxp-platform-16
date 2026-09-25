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

/**
 * يقترح تاريخ استحقاق ذكي مع مراعاة أيام العمل (استثناء الجمعة افتراضياً) والأولوية (URGENT / STAT).
 */
async function suggestDueDate(prisma, companyId, workTypeId, base = new Date(), options = {}) {
  let workType = null;
  if (workTypeId && prisma && prisma.dentalWorkType) {
    try {
      workType = await prisma.dentalWorkType.findFirst({ where: { id: String(workTypeId) } });
    } catch (_) {}
  }

  const estimate = await estimateLeadDays(prisma, companyId, workTypeId);
  let days = Math.max(1, Math.round(estimate.days));

  // مراعاة درجة الأولوية
  const priority = typeof options === 'string' ? options.toUpperCase() : String(options?.priority || '').toUpperCase();
  if (priority === 'STAT') {
    days = Math.max(1, Math.round(days * 0.25));
  } else if (priority === 'URGENT') {
    if (workType && Number(workType.urgentLeadTimeDays) > 0) {
      days = Number(workType.urgentLeadTimeDays);
    } else {
      days = Math.max(1, Math.round(days * 0.5));
    }
  }

  const baseDate = base instanceof Date && !Number.isNaN(base.getTime()) ? new Date(base) : new Date();
  const current = new Date(baseDate);

  // تخطي عطلة نهاية الأسبوع (الجمعة = 5)
  let addedWorkingDays = 0;
  while (addedWorkingDays < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    // 5 = Friday
    if (dayOfWeek !== 5) {
      addedWorkingDays++;
    }
  }

  return current;
}

module.exports = { estimateLeadDays, suggestDueDate };