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
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const companies = await getSharedPrismaClient().insuranceCompany.findMany({
      where: { companyId },
      include: { priceList: { select: priceListSelect } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: companies.map(attachPriceList) });
  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪┤╪▒┘â╪º╪¬ ╪º┘ä╪¬╪ú┘à┘è┘å' });
  }
};

const createInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, priceListId, phone1, fax, contactName, contactPhone } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ┘à╪╖┘ä┘ê╪¿' });

    const prisma = getSharedPrismaClient();
    let resolvedPriceListId = null;
    if (priceListId) {
      const list = await prisma.priceList.findFirst({ where: { id: priceListId, companyId } });
      if (!list) return res.status(400).json({ success: false, error: '┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å' });
  }
};

const updateInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { name, priceListId, phone1, fax, contactName, contactPhone, isActive } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ┘à╪╖┘ä┘ê╪¿' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceCompany.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (priceListId !== undefined) {
      if (priceListId === null) {
        data.priceListId = null;
      } else if (priceListId !== '') {
        const list = await prisma.priceList.findFirst({ where: { id: priceListId, companyId } });
        if (!list) return res.status(400).json({ success: false, error: '┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å' });
  }
};

const deleteInsuranceCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceCompany.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const company = await prisma.insuranceCompany.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å', data: company });
  } catch (error) {
    console.error('Error deleting insurance company:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å' });
  }
};

module.exports = {
  getAllInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  deleteInsuranceCompany
};
