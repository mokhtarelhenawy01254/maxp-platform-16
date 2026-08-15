const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const listExternalPartners = async (req, res) => {
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

    const partners = await getSharedPrismaClient().radiologyExternalPartner.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: partners });
  } catch (error) {
    console.error('Error listing radiology external partners:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الشركاء الخارجيين' });
  }
};

const createExternalPartner = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, phone, contactName } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم الشريك مطلوب' });

    const partner = await getSharedPrismaClient().radiologyExternalPartner.create({
      data: {
        companyId,
        name: String(name).trim(),
        phone: normalizeText(phone),
        contactName: normalizeText(contactName),
      },
    });
    res.json({ success: true, data: partner });
  } catch (error) {
    console.error('Error creating radiology external partner:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الشريك' });
  }
};

const updateExternalPartner = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExternalPartner.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الشريك غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم الشريك مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.phone !== undefined) data.phone = normalizeText(body.phone);
    if (body.contactName !== undefined) data.contactName = normalizeText(body.contactName);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const partner = await prisma.radiologyExternalPartner.update({ where: { id }, data });
    res.json({ success: true, data: partner });
  } catch (error) {
    console.error('Error updating radiology external partner:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الشريك' });
  }
};

const deleteExternalPartner = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExternalPartner.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الشريك غير موجود' });

    await prisma.radiologyExternalPartner.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الشريك', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology external partner:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الشريك' });
  }
};

module.exports = { listExternalPartners, createExternalPartner, updateExternalPartner, deleteExternalPartner };
