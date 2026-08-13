const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');

const STUCK_ORDER_STATUSES = ['PENDING', 'CHECKED_IN', 'IN_PROGRESS'];
const TERMINAL_STUDY_STATUSES = ['DELIVERED', 'CANCELLED'];
const DEFAULT_STUCK_HOURS = 3;
const MAX_LIST_LIMIT = 100;

const normalizeListLimit = (value) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return MAX_LIST_LIMIT;
  return Math.min(MAX_LIST_LIMIT, n);
};

const buildStudyWhere = (companyId, { deviceName, modality } = {}) => {
  const where = { companyId };
  if (deviceName && String(deviceName).trim()) {
    where.deviceName = { contains: String(deviceName).trim(), mode: 'insensitive' };
  }
  if (modality && String(modality).trim()) {
    where.modality = String(modality).trim();
  }
  return where;
};

/**
 * احسب عدد الساعات منذ آخر حركة في statusHistory (أو منذ الإنشاء إن لم توجد حركات)
 * — best-effort: لا تعطّل الطابور إن تعذّر قراءة السجل.
 */
const attachStuckHours = async (prisma, studies, now) => {
  if (!studies.length) return [];
  const ids = studies.map(s => s.id);
  const lastMoveAt = {};
  try {
    const grouped = await prisma.radiologyStudyStatusHistory.groupBy({
      by: ['studyId'],
      where: { studyId: { in: ids } },
      _max: { createdAt: true },
    });
    grouped.forEach(g => { lastMoveAt[g.studyId] = g._max?.createdAt || null; });
  } catch {
    // تجاهل الأخطاء — نعود لوقت الإنشاء
  }
  return studies.map(study => {
    const base = lastMoveAt[study.id] || study.createdAt || now;
    const hours = Math.max(0, (now.getTime() - new Date(base).getTime()) / 3600000);
    return { ...study, stuckHours: Math.round(hours * 10) / 10 };
  });
};

const getDailyQueue = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { deviceName, modality } = req.query;
    const limit = normalizeListLimit(req.query.limit);

    const now = new Date();
    const dayStart = getStartOfDayInTimezone(now);
    const dayEnd = getEndOfDayInTimezone(now);
    const cutoff = new Date(now.getTime() - DEFAULT_STUCK_HOURS * 3600 * 1000);

    const studyWhere = buildStudyWhere(companyId, { deviceName, modality });

    const appointmentWhere = {
      companyId,
      status: 'SCHEDULED',
      appointmentDate: { gte: dayStart, lte: dayEnd },
    };
    if (deviceName && String(deviceName).trim()) {
      appointmentWhere.deviceName = { contains: String(deviceName).trim(), mode: 'insensitive' };
    }

    const stuckWhere = {
      ...studyWhere,
      createdAt: { lt: cutoff },
      orderStatus: { in: STUCK_ORDER_STATUSES },
      status: { notIn: TERMINAL_STUDY_STATUSES },
    };

    const prisma = getSharedPrismaClient();

    const [pendingCheckIn, imagingQueue, readyForReport, readyForDelivery, stuck, countRows] = await Promise.all([
      prisma.radiologyAppointment.findMany({
        where: appointmentWhere,
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      prisma.radiologyStudy.findMany({
        where: { ...studyWhere, status: 'PENDING_IMAGING' },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      prisma.radiologyStudy.findMany({
        where: { ...studyWhere, status: { in: ['IMAGED', 'PENDING_REPORT'] } },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      prisma.radiologyStudy.findMany({
        where: { ...studyWhere, status: 'REPORTED' },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      prisma.radiologyStudy.findMany({
        where: stuckWhere,
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      Promise.all([
        prisma.radiologyAppointment.count({ where: appointmentWhere }),
        prisma.radiologyStudy.count({ where: { ...studyWhere, status: 'PENDING_IMAGING' } }),
        prisma.radiologyStudy.count({ where: { ...studyWhere, status: { in: ['IMAGED', 'PENDING_REPORT'] } } }),
        prisma.radiologyStudy.count({ where: { ...studyWhere, status: 'REPORTED' } }),
        prisma.radiologyStudy.count({ where: stuckWhere }),
        prisma.radiologyStudy.count({ where: { ...studyWhere, status: { notIn: TERMINAL_STUDY_STATUSES } } }),
      ]),
    ]);

    // حجوزات اليوم مرتبة حسب موعد الحجز (الوقت ثم تاريخ الإنشاء)
    pendingCheckIn.sort((a, b) => {
      const ta = a.appointmentTime || '';
      const tb = b.appointmentTime || '';
      if (ta && tb && ta !== tb) return ta.localeCompare(tb);
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const stuckWithHours = await attachStuckHours(prisma, stuck, now);

    res.json({
      success: true,
      data: {
        counts: {
          pendingCheckIn: countRows[0],
          imagingQueue: countRows[1],
          readyForReport: countRows[2],
          readyForDelivery: countRows[3],
          stuck: countRows[4],
          totalActive: countRows[5],
        },
        pendingCheckIn,
        imagingQueue,
        readyForReport,
        readyForDelivery,
        stuck: stuckWithHours,
      },
    });
  } catch (error) {
    console.error('Error fetching radiology daily queue:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب طابور اليوم' });
  }
};

module.exports = { getDailyQueue, DEFAULT_STUCK_HOURS, STUCK_ORDER_STATUSES };
