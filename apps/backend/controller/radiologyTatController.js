/**
 * 📊 Radiology TAT Controller — تحليلات وقت الدوران (Turnaround Time)
 *
 * يستند إلى RadiologyStudyStatusHistory + RadiologyStudy (مقيدة بـ companyId
 * ونطاق تاريخ من query: dateFrom/dateTo — افتراضي: آخر 30 يوم).
 *
 * - stageTimes: متوسط/أدنى/أقصى ساعات لكل انتقال مرحلة (بترتيب حركات الدراسة لكل dimension).
 * - byModality: مقاييس زمن التسليم الكلي مجمعة حسب modality.
 * - byRadiologist: نفس المقاييس حسب assignedRadiologistName.
 * - stuckEmergencies: حالات طارئة عالقة (غير مسلّمة/ملغاة وأقدم من حد).
 * - overall: متوسط زمن الدوران الكلي (إنشاء → تسليم) للدراسات المسلّمة.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');

const STUCK_HOURS = Number(process.env.RADIOLOGY_STUCK_HOURS || 24);

const round2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v);

const hoursBetween = (a, b) => {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms / 3600000;
};

const mergeStats = (map, key, hours, make) => {
  let row = map.get(key);
  if (!row) {
    row = { ...make(), count: 0, totalHours: 0, minHours: Infinity, maxHours: -Infinity };
    map.set(key, row);
  }
  if (!Number.isFinite(hours)) return;
  row.count += 1;
  row.totalHours += hours;
  row.minHours = Math.min(row.minHours, hours);
  row.maxHours = Math.max(row.maxHours, hours);
};

const finalizeStats = (map, mapper) =>
  Array.from(map.values())
    .filter((r) => r.count > 0 && Number.isFinite(r.maxHours))
    .map((r) => ({
      ...mapper(r),
      count: r.count,
      avgHours: round2(r.totalHours / r.count),
      minHours: round2(r.minHours),
      maxHours: round2(r.maxHours),
    }))
    .sort((a, b) => b.avgHours - a.avgHours);

const getTatStatistics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { dateFrom, dateTo, limit } = req.query;
    const prisma = getSharedPrismaClient();

    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? getEndOfDayInTimezone(new Date(dateTo)) : new Date();
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));

    const where = { companyId, createdAt: { gte: from, lte: to } };

    const studies = await prisma.radiologyStudy.findMany({
      where,
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: { dimension: true, status: true, oldStatus: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });

    // ── stageTimes: انتقالات المراحل (diff بين الحالات المتعاقبة لكل dimension) ──
    const stageMap = new Map();
    // ── delivery by modality / radiologist: زمن التسليم الكلي (createdAt → DELIVERED) ──
    const modalityMap = new Map();
    const radiologistMap = new Map();
    const deliveredStudies = [];

    for (const study of studies) {
      const history = Array.isArray(study.statusHistory) ? study.statusHistory : [];
      const byDim = {};
      for (const h of history) {
        const dim = h.dimension || 'PREP';
        (byDim[dim] = byDim[dim] || []).push(h);
      }
      for (const [dim, rows] of Object.entries(byDim)) {
        for (let i = 0; i < rows.length - 1; i++) {
          const fromRow = rows[i];
          const toRow = rows[i + 1];
          const hours = hoursBetween(fromRow.createdAt, toRow.createdAt);
          const key = `${dim}|${fromRow.status}|${toRow.status}`;
          mergeStats(stageMap, key, hours, () => ({
            fromStatus: fromRow.status,
            toStatus: toRow.status,
            dimension: dim,
          }));
        }
      }

      // زمن التسليم الكلي: createdAt → أول حركة DELIVERED (بأي dimension)
      const deliveredRow = history.find((h) => String(h.status).toUpperCase() === 'DELIVERED');
      const deliveredAt = deliveredRow ? deliveredRow.createdAt : null;
      const turnaround = deliveredAt ? hoursBetween(study.createdAt, deliveredAt) : null;
      if (turnaround !== null) {
        deliveredStudies.push(turnaround);
        const modKey = study.modality || 'غير محدد';
        mergeStats(modalityMap, modKey, turnaround, () => ({ modality: modKey }));
        const radioName = study.assignedRadiologistName || 'غير محدد';
        mergeStats(radiologistMap, radioName, turnaround, () => ({ radiologist: radioName }));
      }
    }

    const stageTimes = finalizeStats(stageMap, (r) => ({
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      dimension: r.dimension,
    }));
    const byModality = finalizeStats(modalityMap, (r) => ({ modality: r.modality }));
    const byRadiologist = finalizeStats(radiologistMap, (r) => ({ radiologist: r.radiologist }));

    const overall =
      deliveredStudies.length > 0
        ? {
            count: deliveredStudies.length,
            avgHours: round2(deliveredStudies.reduce((s, v) => s + v, 0) / deliveredStudies.length),
            minHours: round2(Math.min(...deliveredStudies)),
            maxHours: round2(Math.max(...deliveredStudies)),
          }
        : null;

    // ── stuckEmergencies: طارئة غير مسلّمة/ملغاة وأقدم من الحد ──
    const stuckCutoff = new Date(Date.now() - STUCK_HOURS * 60 * 60 * 1000);
    const stuckEmergencies = await prisma.radiologyStudy.findMany({
      where: {
        companyId,
        emergency: true,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        createdAt: { lte: stuckCutoff },
      },
      select: {
        id: true,
        studyNumber: true,
        patientName: true,
        examTypeName: true,
        modality: true,
        status: true,
        createdAt: true,
        assignedRadiologistName: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limitNum,
    });

    res.json({
      success: true,
      data: { stageTimes, byModality, byRadiologist, stuckEmergencies, overall },
    });
  } catch (error) {
    console.error('Error computing radiology TAT statistics:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب إحصائيات وقت الدوران' });
  }
};

module.exports = { getTatStatistics };
