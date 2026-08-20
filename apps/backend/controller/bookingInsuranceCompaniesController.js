const { getSharedPrismaClient } = require('../services/sharedDatabase');

const attachPriceList = (company) => ({
  ...company,
  priceList: company.priceList
    ? { ...company.priceList, isBase: !company.priceList.baseListId }
    : undefined
});

const priceListSelect = { id: true, name: true, isActive: true, baseListId: true };

const getAllInsuranceCompanies = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const companies = await getSharedPrismaClient().insuranceCompany.findMany({
      where: { companyId },
      include: { priceList: { select: priceListSelect } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: companies.map(attachPriceList) });
  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب شركات التأمين' });
  }
};

const createInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, priceListId, phone1, fax, contactName, contactPhone } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم شركة التأمين مطلوب' });

    const prisma = getSharedPrismaClient();
    let resolvedPriceListId = null;
    if (priceListId) {
      const list = await prisma.priceList.findFirst({ where: { id: priceListId, companyId } });
      if (!list) return res.status(400).json({ success: false, error: 'قائمة الأسعار غير موجودة' });
      resolvedPriceListId = list.id;
    }

    const company = await prisma.insuranceCompany.create({
      data: {
        companyId,
        name: String(name).trim(),
        priceListId: resolvedPriceListId,
        phone1: phone1 || null,
        fax: fax || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null
      },
      include: { priceList: { select: priceListSelect } }
    });
    res.json({ success: true, data: attachPriceList(company) });
  } catch (error) {
    console.error('Error creating insurance company:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء شركة التأمين' });
  }
};

const updateInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, priceListId, phone1, fax, contactName, contactPhone, isActive } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم شركة التأمين مطلوب' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceCompany.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'شركة التأمين غير موجودة' });

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (priceListId !== undefined) {
      if (priceListId === null) {
        data.priceListId = null;
      } else if (priceListId !== '') {
        const list = await prisma.priceList.findFirst({ where: { id: priceListId, companyId } });
        if (!list) return res.status(400).json({ success: false, error: 'قائمة الأسعار غير موجودة' });
        data.priceListId = list.id;
      }
    }
    if (phone1 !== undefined) data.phone1 = phone1 === '' ? null : phone1;
    if (fax !== undefined) data.fax = fax === '' ? null : fax;
    if (contactName !== undefined) data.contactName = contactName === '' ? null : contactName;
    if (contactPhone !== undefined) data.contactPhone = contactPhone === '' ? null : contactPhone;
    if (isActive !== undefined) data.isActive = isActive;

    const company = await prisma.insuranceCompany.update({
      where: { id },
      data,
      include: { priceList: { select: priceListSelect } }
    });
    res.json({ success: true, data: attachPriceList(company) });
  } catch (error) {
    console.error('Error updating insurance company:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث شركة التأمين' });
  }
};

const deleteInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceCompany.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'شركة التأمين غير موجودة' });

    const company = await prisma.insuranceCompany.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'تم حذف شركة التأمين', data: company });
  } catch (error) {
    console.error('Error deleting insurance company:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف شركة التأمين' });
  }
};

module.exports = {
  getAllInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  deleteInsuranceCompany
};
