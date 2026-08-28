const { getSharedPrismaClient } = require('./sharedDatabase');
const { parseSettingValue, parseDate } = require('../utils/dentalLabHelpers');

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

async function readSetting(prisma, companyId, key) {
  const db = prisma || getSharedPrismaClient();
  const rows = await db.dentalSetting.findMany({ where: { companyId } });
  const row = (rows || []).find((r) => r && r.key === key);
  return parseSettingValue(row);
}

// ==================== TECHNICIAN WAGES ====================

const getTechnicianWageDefaults = async (prisma, companyId) => {
  const value = await readSetting(prisma, companyId, 'wages');
  const w = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return { defaultPerStage: Number(w.defaultPerStage) || 0 };
};

/**
 * أجور الفنيين عن المراحل المكتملة (status=DONE) المسندة إليهم.
 * المعدل: wagePerStage للفني، أو المعدل الافتراضي من الإعدادات.
 */
const computeTechnicianEarnings = async (prisma, companyId, { technicianId, from, to } = {}) => {
  const db = prisma || getSharedPrismaClient();
  const where = { companyId, status: 'DONE', assigneeId: { not: null } };
  if (technicianId) where.assigneeId = technicianId;
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    where.completedAt = {};
    if (fromDate) where.completedAt.gte = fromDate;
    if (toDate) {
      const { getEndOfDayInTimezone } = require('../utils/dateUtils');
      where.completedAt.lte = getEndOfDayInTimezone(toDate);
    }
  }
  const stages = await db.dentalCaseStage.findMany({ where, select: { assigneeId: true } });
  const defaults = await getTechnicianWageDefaults(db, companyId);
  const techIds = [...new Set(stages.map((s) => s.assigneeId).filter(Boolean))];
  const techs = techIds.length
    ? await db.dentalTechnician.findMany({
        where: { companyId, id: { in: techIds } },
        select: { id: true, name: true, wagePerStage: true },
      })
    : [];
  const rateById = new Map(techs.map((t) => [t.id, t.wagePerStage != null ? Number(t.wagePerStage) : defaults.defaultPerStage]));
  const nameById = new Map(techs.map((t) => [t.id, t.name]));
  const agg = {};
  for (const s of stages) {
    const id = s.assigneeId;
    if (!agg[id]) agg[id] = { technicianId: id, name: nameById.get(id) || 'غير محدد', completedStages: 0, wage: 0 };
    agg[id].completedStages += 1;
    agg[id].wage += rateById.get(id) || 0;
  }
  const result = Object.values(agg);
  for (const r of result) r.wage = round2(r.wage);
  return result;
};

// ==================== DOCTOR-SPECIFIC PRICING (rate sheet) ====================

const resolveDoctorWorkTypePrice = async (prisma, companyId, doctorId, workType) => {
  const basePrice = workType ? round2(Number(workType.price) || 0) : 0;
  if (!doctorId || !workType) return basePrice;
  const map = await readSetting(prisma, companyId, 'doctorPricing');
  const doctorMap = map && typeof map === 'object' ? map[doctorId] : null;
  const over = doctorMap && typeof doctorMap === 'object' ? doctorMap[workType.id] : null;
  const p = Number(over);
  return Number.isFinite(p) && p >= 0 ? round2(p) : basePrice;
};

const setDoctorWorkTypePrice = async (prisma, companyId, doctorId, workTypeId, price) => {
  const db = prisma || getSharedPrismaClient();
  const map = (await readSetting(db, companyId, 'doctorPricing')) || {};
  const doctorMap = map[doctorId] || {};
  if (price == null || price === '' || Number(price) < 0) {
    delete doctorMap[workTypeId];
  } else {
    doctorMap[workTypeId] = round2(Number(price) || 0);
  }
  map[doctorId] = doctorMap;
  await db.dentalSetting.upsert({
    where: { companyId_key: { companyId, key: 'doctorPricing' } },
    update: { value: map },
    create: { companyId, key: 'doctorPricing', value: map },
  });
  return map;
};

module.exports = {
  getTechnicianWageDefaults,
  computeTechnicianEarnings,
  resolveDoctorWorkTypePrice,
  setDoctorWorkTypePrice,
};