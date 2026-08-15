const { getSharedPrismaClient } = require('../services/sharedDatabase');

const SOURCE_TYPES = ['CLINIC', 'MEDICAL_CENTER', 'LAB', 'HOSPITAL', 'COMPANY', 'MEDICAL_NETWORK', 'OTHER'];

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const resolveSourceLinks = async (prisma, companyId, source) => {
  const links = await prisma.radiologyPhysicianSourceLink.findMany({
    where: { companyId, sourceId: source.id },
    select: { physicianId: true },
  });
  const physicianIds = links.map((l) => l.physicianId);
  let physicians = [];
  if (physicianIds.length) {
    physicians = await prisma.radiologyReferringPhysician.findMany({
      where: { id: { in: physicianIds }, companyId },
      select: { id: true, name: true },
    });
  }
  return physicians;
};

const listSources = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

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
    const sources = await prisma.radiologyReferralSource.findMany({ where, orderBy: { name: 'asc' } });

    const repIds = [...new Set(sources.map((s) => s.marketingRepId).filter(Boolean))];
    let reps = [];
    if (repIds.length) {
      reps = await prisma.radiologyMarketingRep.findMany({
        where: { id: { in: repIds }, companyId },
        select: { id: true, name: true },
      });
    }
    const repById = new Map(reps.map((r) => [r.id, r.name]));

    // Resolve per-source physician links (limited to keep the list light)
    const linkedIds = [...new Set(sources.map((s) => s.id))];
    let links = [];
    if (linkedIds.length) {
      links = await prisma.radiologyPhysicianSourceLink.findMany({
        where: { companyId, sourceId: { in: linkedIds } },
        select: { sourceId: true, physicianId: true },
      });
    }
    const bySource = new Map();
    for (const l of links) {
      if (!bySource.has(l.sourceId)) bySource.set(l.sourceId, []);
      bySource.get(l.sourceId).push(l.physicianId);
    }
    const allPhysicianIds = [...new Set(links.map((l) => l.physicianId))];
    let physicians = [];
    if (allPhysicianIds.length) {
      physicians = await prisma.radiologyReferringPhysician.findMany({
        where: { id: { in: allPhysicianIds }, companyId },
        select: { id: true, name: true },
      });
    }
    const physicianById = new Map(physicians.map((p) => [p.id, p.name]));

    const data = sources.map((s) => ({
      ...s,
      marketingRepName: s.marketingRepId ? repById.get(s.marketingRepId) || null : null,
      physicianIds: bySource.get(s.id) || [],
      physicians: (bySource.get(s.id) || []).map((pid) => ({ id: pid, name: physicianById.get(pid) || '—' })),
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing radiology referral sources:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب جهات الإحالة' });
  }
};

const createSource = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'اسم جهة الإحالة مطلوب' });
    const type = String(body.type || 'OTHER').toUpperCase();
    if (!SOURCE_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع الجهة غير صالح' });

    const prisma = getSharedPrismaClient();

    // Validate optional marketing rep (company-scoped)
    let marketingRepId = null;
    if (body.marketingRepId) {
      const rep = await prisma.radiologyMarketingRep.findFirst({
        where: { id: String(body.marketingRepId), companyId, isActive: true },
        select: { id: true },
      });
      if (!rep) return res.status(400).json({ success: false, error: 'المندوب غير موجود' });
      marketingRepId = rep.id;
    }

    // Validate optional insurance company link (billing entity) — optional, never required
    let insuranceCompanyId = null;
    if (body.insuranceCompanyId) {
      const entity = await prisma.insuranceCompany.findFirst({
        where: { id: String(body.insuranceCompanyId), companyId },
        select: { id: true },
      }).catch(() => null);
      if (!entity) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
      insuranceCompanyId = entity.id;
    }

    let source;
    try {
      source = await prisma.radiologyReferralSource.create({
        data: {
          companyId,
          name,
          type,
          phone: normalizeText(body.phone),
          contactName: normalizeText(body.contactName),
          marketingRepId,
          insuranceCompanyId,
        },
      });
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'جهة إحالة بهذا الاسم موجودة بالفعل' });
      }
      throw e;
    }

    res.json({ success: true, data: source });
  } catch (error) {
    console.error('Error creating radiology referral source:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء جهة الإحالة' });
  }
};

const updateSource = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReferralSource.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'جهة الإحالة غير موجودة' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم جهة الإحالة مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.type !== undefined) {
      const type = String(body.type).toUpperCase();
      if (!SOURCE_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع الجهة غير صالح' });
      data.type = type;
    }
    if (body.phone !== undefined) data.phone = normalizeText(body.phone);
    if (body.contactName !== undefined) data.contactName = normalizeText(body.contactName);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    if (body.marketingRepId !== undefined) {
      if (body.marketingRepId) {
        const rep = await prisma.radiologyMarketingRep.findFirst({
          where: { id: String(body.marketingRepId), companyId, isActive: true },
          select: { id: true },
        });
        if (!rep) return res.status(400).json({ success: false, error: 'المندوب غير موجود' });
        data.marketingRepId = rep.id;
      } else {
        data.marketingRepId = null;
      }
    }

    if (body.insuranceCompanyId !== undefined) {
      if (body.insuranceCompanyId) {
        const entity = await prisma.insuranceCompany.findFirst({
          where: { id: String(body.insuranceCompanyId), companyId },
          select: { id: true },
        }).catch(() => null);
        if (!entity) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
        data.insuranceCompanyId = entity.id;
      } else {
        data.insuranceCompanyId = null;
      }
    }

    const source = await prisma.radiologyReferralSource.update({ where: { id }, data });
    res.json({ success: true, data: source });
  } catch (error) {
    console.error('Error updating radiology referral source:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث جهة الإحالة' });
  }
};

const deleteSource = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReferralSource.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'جهة الإحالة غير موجودة' });

    await prisma.radiologyReferralSource.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف جهة الإحالة', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology referral source:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف جهة الإحالة' });
  }
};

/** Set the list of referring physicians working at a referral source (physicianId[] replace-all). */
const setSourcePhysicians = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const physicianIds = Array.isArray(req.body?.physicianIds) ? req.body.physicianIds.map(String).filter(Boolean) : [];
    const prisma = getSharedPrismaClient();

    const source = await prisma.radiologyReferralSource.findFirst({ where: { id, companyId } });
    if (!source) return res.status(404).json({ success: false, error: 'جهة الإحالة غير موجودة' });

    if (physicianIds.length) {
      const found = await prisma.radiologyReferringPhysician.findMany({
        where: { id: { in: physicianIds }, companyId },
        select: { id: true },
      });
      if (found.length !== physicianIds.length) {
        return res.status(400).json({ success: false, error: 'أحد الأطباء غير موجود' });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.radiologyPhysicianSourceLink.deleteMany({ where: { companyId, sourceId: id } });
      if (physicianIds.length) {
        await tx.radiologyPhysicianSourceLink.createMany({
          data: physicianIds.map((pid) => ({ companyId, physicianId: pid, sourceId: id })),
        });
      }
    });

    const physicians = await resolveSourceLinks(prisma, companyId, source);
    res.json({ success: true, data: { sourceId: id, physicianIds, physicians } });
  } catch (error) {
    console.error('Error setting radiology source physicians:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في ربط أطباء جهة الإحالة' });
  }
};

/** Get the referral sources a referring physician works at. */
const getPhysicianSources = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const physician = await prisma.radiologyReferringPhysician.findFirst({ where: { id, companyId } });
    if (!physician) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const links = await prisma.radiologyPhysicianSourceLink.findMany({
      where: { companyId, physicianId: id },
      select: { sourceId: true },
    });
    const sourceIds = links.map((l) => l.sourceId);
    let sources = [];
    if (sourceIds.length) {
      sources = await prisma.radiologyReferralSource.findMany({
        where: { id: { in: sourceIds }, companyId },
        select: { id: true, name: true, type: true },
      });
    }
    res.json({ success: true, data: { physicianId: id, sources } });
  } catch (error) {
    console.error('Error fetching physician referral sources:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب جهات الطبيب' });
  }
};

module.exports = { listSources, createSource, updateSource, deleteSource, setSourcePhysicians, getPhysicianSources };
