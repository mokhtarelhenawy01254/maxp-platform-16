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

const parseUnitCount = (teethStr) => {
  if (!teethStr || typeof teethStr !== 'string') return 1;
  const cleaned = teethStr.trim();
  if (!cleaned) return 1;
  const parts = cleaned.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  const validUnits = parts.filter((p) => /^[0-9A-Za-z#]+$/.test(p));
  return Math.max(1, validUnits.length > 0 ? validUnits.length : (parts.length || 1));
};

/**
 * أجور الفنيين عن المراحل المكتملة (status=DONE) المسندة إليهم.
 * يدعم تعيين أكثر من فني في نفس المرحلة (assignees) مع توزيع نسب الأجر (sharePercent)،
 * والتوافق التام مع التعيين الفردي التقليدي (assigneeId).
 * المعدل: wagePerStage للفني، أو المعدل الافتراضي من الإعدادات، مضروباً بعدد وحدات الشغل ونسبة المساهمة.
 */
const computeTechnicianEarnings = async (prisma, companyId, { technicianId, from, to } = {}) => {
  const db = prisma || getSharedPrismaClient();
  const where = { companyId, status: 'DONE' };
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

  if (technicianId) {
    where.OR = [
      { assigneeId: technicianId },
      { assignees: { some: { technicianId } } },
    ];
  } else {
    where.OR = [
      { assigneeId: { not: null } },
      { assignees: { some: {} } },
    ];
  }

  const selectStageFields = {
    id: true,
    assigneeId: true,
    stageWage: true,
    case: { select: { teeth: true } },
  };
  // فقط إذا كان النموذج أو الموك يدعم assignees نختاره لتفادي الأخطاء في البيئات التجريبية القديمة
  if (db.dentalStageAssignee || db.dentalCaseStage?.findMany) {
    selectStageFields.assignees = {
      select: {
        technicianId: true,
        role: true,
        sharePercent: true,
      },
    };
  }

  let stages = [];
  try {
    stages = (await db.dentalCaseStage.findMany({
      where,
      select: selectStageFields,
    })) || [];
  } catch (err) {
    // في حال عدم وجود جدول dental_stage_assignees بعد أو خطأ في الموك، تراجع للاستعلام القديم
    stages = (await db.dentalCaseStage.findMany({
      where: {
        companyId,
        status: 'DONE',
        ...(technicianId ? { assigneeId: technicianId } : { assigneeId: { not: null } }),
        ...(where.completedAt ? { completedAt: where.completedAt } : {}),
      },
      select: {
        assigneeId: true,
        stageWage: true,
        case: { select: { teeth: true } },
      },
    })) || [];
  }

  const defaults = await getTechnicianWageDefaults(db, companyId);
  const techIdSet = new Set();
  for (const s of stages) {
    if (Array.isArray(s.assignees) && s.assignees.length > 0) {
      for (const a of s.assignees) {
        if (a.technicianId) techIdSet.add(a.technicianId);
      }
    } else if (s.assigneeId) {
      techIdSet.add(s.assigneeId);
    }
  }
  const techIds = [...techIdSet];

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
    const units = s.case && s.case.teeth ? parseUnitCount(s.case.teeth) : 1;
    const stageWageNum = s.stageWage != null && Number(s.stageWage) > 0 ? Number(s.stageWage) : null;

    if (Array.isArray(s.assignees) && s.assignees.length > 0) {
      for (const a of s.assignees) {
        const id = a.technicianId;
        if (!id) continue;
        if (technicianId && id !== technicianId) continue;
        const rate = stageWageNum != null ? stageWageNum : (rateById.get(id) || 0);
        const shareFactor = Math.max(0, Number(a.sharePercent) || 100) / 100;
        const earned = rate * units * shareFactor;
        const proRatedUnits = units * shareFactor;

        if (!agg[id]) agg[id] = { technicianId: id, name: nameById.get(id) || 'غير محدد', completedStages: 0, completedUnits: 0, wage: 0 };
        agg[id].completedStages += 1;
        agg[id].completedUnits += proRatedUnits;
        agg[id].wage += earned;
      }
    } else if (s.assigneeId) {
      const id = s.assigneeId;
      if (technicianId && id !== technicianId) continue;
      const rate = stageWageNum != null ? stageWageNum : (rateById.get(id) || 0);
      if (!agg[id]) agg[id] = { technicianId: id, name: nameById.get(id) || 'غير محدد', completedStages: 0, completedUnits: 0, wage: 0 };
      agg[id].completedStages += 1;
      agg[id].completedUnits += units;
      agg[id].wage += rate * units;
    }
  }

  const result = Object.values(agg);
  for (const r of result) {
    r.wage = round2(r.wage);
    r.completedUnits = round2(r.completedUnits);
  }
  return result;
};

// ==================== DOCTOR-SPECIFIC PRICING (rate sheet) ====================

const resolveDoctorWorkTypePrice = async (prisma, companyId, doctorId, workType) => {
  const basePrice = workType ? round2(Number(workType.price) || 0) : 0;
  if (!doctorId || !workType) return basePrice;
  const map = await readSetting(prisma, companyId, 'doctorPricing');
  const doctorMap = map && typeof map === 'object' ? map[doctorId] : null;
  const over = doctorMap && typeof doctorMap === 'object' ? doctorMap[workType.id] : null;
  // لا يوجد تسعير مخصص => السعر الافتراضي (Number(null)=0 كان يخفي الأسعار كلها)
  if (over === null || over === undefined || over === '') return basePrice;
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