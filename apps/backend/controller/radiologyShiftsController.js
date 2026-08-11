const { getSharedPrismaClient } = require('../services/sharedDatabase');

const METHODS = ['CASH', 'CARD', 'VODAFONE_CASH', 'BANK'];

const summarize = (payments) => {
  const byMethod = {};
  for (const m of METHODS) byMethod[m] = 0;
  let collected = 0;
  let refunded = 0;
  let count = 0;
  for (const p of payments) {
    if (p.type === 'REFUND') {
      refunded += p.amount;
    } else {
      collected += p.amount;
      byMethod[p.method || 'CASH'] = (byMethod[p.method || 'CASH'] || 0) + p.amount;
    }
    count += 1;
  }
  return { collected, refunded, net: collected - refunded, byMethod, count };
};

const attachToActiveShift = async (prisma, companyId, studyId, type, amount, method, note) => {
  try {
    const shift = await prisma.radiologyShift.findFirst({ where: { companyId, status: 'OPEN' }, select: { id: true } });
    if (!shift) return null;
    return prisma.radiologyShiftPayment.create({
      data: { companyId, shiftId: shift.id, studyId: studyId || null, type, amount, method: method || 'CASH', note: note || null },
    });
  } catch (e) {
    console.error('Error attaching payment to active shift:', e);
    return null;
  }
};

const openShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { cashierName, branchId } = req.body || {};
    const name = typeof cashierName === 'string' && cashierName.trim() ? cashierName.trim() : req.user?.firstName ? `${req.user.firstName}${req.user.lastName ? ' ' + req.user.lastName : ''}` : 'صراف';

    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyShift.findFirst({ where: { companyId, status: 'OPEN' } });
    if (existing) return res.status(400).json({ success: false, error: 'يوجد وردية مفتوحة — أغلقها أولاً' });

    const shift = await prisma.radiologyShift.create({
      data: { companyId, branchId: branchId || null, cashierName: name, status: 'OPEN', openedBy: req.user?.id || req.user?.email || null },
    });
    res.json({ success: true, data: shift });
  } catch (error) {
    console.error('Error opening radiology shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فتح الوردية' });
  }
};

const getActiveShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const shift = await prisma.radiologyShift.findFirst({ where: { companyId, status: 'OPEN' } });
    if (!shift) return res.json({ success: true, data: null });

    const payments = await prisma.radiologyShiftPayment.findMany({ where: { shiftId: shift.id }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { ...shift, summary: summarize(payments), payments } });
  } catch (error) {
    console.error('Error getting active radiology shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الوردية' });
  }
};

const listShifts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [shifts, total] = await Promise.all([
      prisma.radiologyShift.findMany({ where: { companyId }, orderBy: { openedAt: 'desc' }, skip, take: limitNum }),
      prisma.radiologyShift.count({ where: { companyId } }),
    ]);

    const shiftIds = shifts.map(s => s.id);
    const payments = await prisma.radiologyShiftPayment.findMany({ where: { shiftId: { in: shiftIds } } });
    const byShift = {};
    for (const p of payments) {
      if (!byShift[p.shiftId]) byShift[p.shiftId] = [];
      byShift[p.shiftId].push(p);
    }

    const rows = shifts.map(s => ({ ...s, summary: summarize(byShift[s.id] || []) }));
    res.json({ success: true, data: { items: rows, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing radiology shifts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الورديات' });
  }
};

const closeShift = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const shift = await prisma.radiologyShift.findFirst({ where: { id, companyId } });
    if (!shift) return res.status(404).json({ success: false, error: 'الوردية غير موجودة' });
    if (shift.status !== 'OPEN') return res.status(400).json({ success: false, error: 'الوردية مغلقة بالفعل' });

    const payments = await prisma.radiologyShiftPayment.findMany({ where: { shiftId: id } });
    const closed = await prisma.radiologyShift.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: req.user?.id || req.user?.email || null },
    });

    res.json({ success: true, data: { ...closed, summary: summarize(payments) } });
  } catch (error) {
    console.error('Error closing radiology shift:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إغلاق الوردية' });
  }
};

module.exports = { openShift, getActiveShift, listShifts, closeShift, attachToActiveShift };
