const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const listMarketingReps = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const prisma = getSharedPrismaClient();
    const reps = await prisma.radiologyMarketingRep.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: reps });
  } catch (error) {
    console.error('Error listing radiology marketing reps:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ┘à┘å╪»┘ê╪¿┘è ╪º┘ä╪¬╪│┘ê┘è┘é' });
  }
};

const createMarketingRep = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, phone, userId } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä┘à┘å╪»┘ê╪¿ ┘à╪╖┘ä┘ê╪¿' });

    const rep = await getSharedPrismaClient().radiologyMarketingRep.create({
      data: {
        companyId,
        name: String(name).trim(),
        phone: normalizeText(phone),
        userId: normalizeText(userId),
      },
    });
    res.json({ success: true, data: rep });
  } catch (error) {
    console.error('Error creating radiology marketing rep:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘å╪»┘ê╪¿' });
  }
};

const updateMarketingRep = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyMarketingRep.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä┘à┘å╪»┘ê╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä┘à┘å╪»┘ê╪¿ ┘à╪╖┘ä┘ê╪¿' });
      data.name = String(body.name).trim();
    }
    if (body.phone !== undefined) data.phone = normalizeText(body.phone);
    if (body.userId !== undefined) data.userId = normalizeText(body.userId);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const rep = await prisma.radiologyMarketingRep.update({ where: { id }, data });
    res.json({ success: true, data: rep });
  } catch (error) {
    console.error('Error updating radiology marketing rep:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä┘à┘å╪»┘ê╪¿' });
  }
};

const deleteMarketingRep = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyMarketingRep.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä┘à┘å╪»┘ê╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.radiologyMarketingRep.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä┘à┘å╪»┘ê╪¿', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology marketing rep:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä┘à┘å╪»┘ê╪¿' });
  }
};

/**
 * ┘à╪¡┘ü╪╕╪⌐ ┘à┘å╪»┘ê╪¿┘è ╪º┘ä╪¬╪│┘ê┘è┘é: ╪╣╪»╪» ╪º┘ä╪»╪▒╪º╪│╪º╪¬ ┘ê╪º┘ä╪Ñ┘è╪▒╪º╪» ┘ä┘â┘ä ┘à┘å╪»┘ê╪¿ (╪¡╪│╪¿ marketingRepId snapshot ╪╣┘ä┘ë ╪º┘ä╪»╪▒╪º╪│╪º╪¬).
 * ╪¬┘Å╪¡╪│╪¿ ┘à┘å ╪º┘ä╪»╪▒╪º╪│╪º╪¬ ╪º┘ä┘ü╪╣┘ä┘è╪⌐ ┘ü┘é╪╖ ΓÇö ┘ä┘ä┘é╪▒╪º╪í╪⌐ (┘ä╪º ╪¬┘Å╪«╪▓┘Ä┘æ┘å ╪¬╪º╪▒╪¼╪¬ ╪¿╪╣╪»).
 */
const repPortfolio = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { dateFrom, dateTo } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId, marketingRepId: { not: null } };
    if (dateFrom || dateTo) {
      const f = {};
      if (dateFrom) f.gte = new Date(dateFrom);
      if (dateTo) f.lte = new Date(dateTo);
      where.createdAt = f;
    }

    const studies = await prisma.radiologyStudy.findMany({
      where,
      select: {
        marketingRepId: true,
        priceSnapshot: true,
        additionAmount: true,
        billingType: true,
        status: true,
        referralSourceId: true,
        referringPhysicianId: true,
      },
    });

    const reps = await prisma.radiologyMarketingRep.findMany({ where: { companyId }, select: { id: true, name: true } });
    const repNameById = new Map(reps.map((r) => [r.id, r.name]));

    // Count per rep: total, delivered, cash/insurance amounts + distinct sources/physicians
    const byRep = new Map();
    for (const s of studies) {
      if (!s.marketingRepId) continue;
      const row = byRep.get(s.marketingRepId) || {
        repId: s.marketingRepId,
        name: '',
        count: 0,
        deliveredCount: 0,
        revenue: 0,
        deliveredRevenue: 0,
        cashRevenue: 0,
        insuranceRevenue: 0,
        sourceCount: 0,
        physicianCount: 0,
        sourceIds: new Set(),
        physicianIds: new Set(),
      };
      row.count += 1;
      const amount = (s.priceSnapshot || 0) + (s.additionAmount || 0);
      row.revenue += amount;
      if (s.status === 'DELIVERED') {
        row.deliveredCount += 1;
        row.deliveredRevenue += amount;
      }
      if (s.billingType === 'INSURANCE') row.insuranceRevenue += amount;
      else row.cashRevenue += amount;
      if (s.referralSourceId) row.sourceIds.add(s.referralSourceId);
      if (s.referringPhysicianId) row.physicianIds.add(s.referringPhysicianId);
      byRep.set(s.marketingRepId, row);
    }

    const rows = Array.from(byRep.values()).map((r) => ({
      repId: r.repId,
      name: repNameById.get(r.repId) || r.name || 'ΓÇö',
      count: r.count,
      deliveredCount: r.deliveredCount,
      revenue: Math.round(r.revenue),
      deliveredRevenue: Math.round(r.deliveredRevenue),
      cashRevenue: Math.round(r.cashRevenue),
      insuranceRevenue: Math.round(r.insuranceRevenue),
      sourceCount: r.sourceIds.size,
      physicianCount: r.physicianIds.size,
    }));
    rows.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0);
    const totalCount = rows.reduce((acc, r) => acc + r.count, 0);
    res.json({ success: true, data: { rows, totalRevenue: Math.round(totalRevenue), totalCount } });
  } catch (error) {
    console.error('Error computing radiology marketing rep portfolio:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪│╪º╪¿ ┘à╪¡┘ü╪╕╪⌐ ╪º┘ä┘à┘å╪»┘ê╪¿┘è┘å' });
  }
};

module.exports = { listMarketingReps, createMarketingRep, updateMarketingRep, deleteMarketingRep, repPortfolio };
