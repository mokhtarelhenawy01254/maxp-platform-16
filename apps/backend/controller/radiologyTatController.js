/**
 * ≡ƒôè Radiology TAT Controller ΓÇö ╪¬╪¡┘ä┘è┘ä╪º╪¬ ┘ê┘é╪¬ ╪º┘ä╪»┘ê╪▒╪º┘å (Turnaround Time)
 *
 * ┘è╪│╪¬┘å╪» ╪Ñ┘ä┘ë RadiologyStudyStatusHistory + RadiologyStudy (┘à┘é┘è╪»╪⌐ ╪¿┘Ç companyId
 * ┘ê┘å╪╖╪º┘é ╪¬╪º╪▒┘è╪« ┘à┘å query: dateFrom/dateTo ΓÇö ╪º┘ü╪¬╪▒╪º╪╢┘è: ╪ó╪«╪▒ 30 ┘è┘ê┘à).
 *
 * - stageTimes: ┘à╪¬┘ê╪│╪╖/╪ú╪»┘å┘ë/╪ú┘é╪╡┘ë ╪│╪º╪╣╪º╪¬ ┘ä┘â┘ä ╪º┘å╪¬┘é╪º┘ä ┘à╪▒╪¡┘ä╪⌐ (╪¿╪¬╪▒╪¬┘è╪¿ ╪¡╪▒┘â╪º╪¬ ╪º┘ä╪»╪▒╪º╪│╪⌐ ┘ä┘â┘ä dimension).
 * - byModality: ┘à┘é╪º┘è┘è╪│ ╪▓┘à┘å ╪º┘ä╪¬╪│┘ä┘è┘à ╪º┘ä┘â┘ä┘è ┘à╪¼┘à╪╣╪⌐ ╪¡╪│╪¿ modality.
 * - byRadiologist: ┘å┘ü╪│ ╪º┘ä┘à┘é╪º┘è┘è╪│ ╪¡╪│╪¿ assignedRadiologistName.
 * - stuckEmergencies: ╪¡╪º┘ä╪º╪¬ ╪╖╪º╪▒╪ª╪⌐ ╪╣╪º┘ä┘é╪⌐ (╪║┘è╪▒ ┘à╪│┘ä┘æ┘à╪⌐/┘à┘ä╪║╪º╪⌐ ┘ê╪ú┘é╪»┘à ┘à┘å ╪¡╪»).
 * - overall: ┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å ╪º┘ä╪»┘ê╪▒╪º┘å ╪º┘ä┘â┘ä┘è (╪Ñ┘å╪┤╪º╪í ΓåÆ ╪¬╪│┘ä┘è┘à) ┘ä┘ä╪»╪▒╪º╪│╪º╪¬ ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐.
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
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

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

    // ΓöÇΓöÇ stageTimes: ╪º┘å╪¬┘é╪º┘ä╪º╪¬ ╪º┘ä┘à╪▒╪º╪¡┘ä (diff ╪¿┘è┘å ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪¬╪╣╪º┘é╪¿╪⌐ ┘ä┘â┘ä dimension) ΓöÇΓöÇ
    const stageMap = new Map();
    // ΓöÇΓöÇ delivery by modality / radiologist: ╪▓┘à┘å ╪º┘ä╪¬╪│┘ä┘è┘à ╪º┘ä┘â┘ä┘è (createdAt ΓåÆ DELIVERED) ΓöÇΓöÇ
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

      // ╪▓┘à┘å ╪º┘ä╪¬╪│┘ä┘è┘à ╪º┘ä┘â┘ä┘è: createdAt ΓåÆ ╪ú┘ê┘ä ╪¡╪▒┘â╪⌐ DELIVERED (╪¿╪ú┘è dimension)
      const deliveredRow = history.find((h) => String(h.status).toUpperCase() === 'DELIVERED');
      const deliveredAt = deliveredRow ? deliveredRow.createdAt : null;
      const turnaround = deliveredAt ? hoursBetween(study.createdAt, deliveredAt) : null;
      if (turnaround !== null) {
        deliveredStudies.push(turnaround);
        const modKey = study.modality || '╪║┘è╪▒ ┘à╪¡╪»╪»';
        mergeStats(modalityMap, modKey, turnaround, () => ({ modality: modKey }));
        const radioName = study.assignedRadiologistName || '╪║┘è╪▒ ┘à╪¡╪»╪»';
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

    // ΓöÇΓöÇ stuckEmergencies: ╪╖╪º╪▒╪ª╪⌐ ╪║┘è╪▒ ┘à╪│┘ä┘æ┘à╪⌐/┘à┘ä╪║╪º╪⌐ ┘ê╪ú┘é╪»┘à ┘à┘å ╪º┘ä╪¡╪» ΓöÇΓöÇ
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪│╪º╪¿ ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ┘ê┘é╪¬ ╪º┘ä╪»┘ê╪▒╪º┘å' });
  }
};

module.exports = { getTatStatistics };
