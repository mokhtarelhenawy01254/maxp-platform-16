const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const normalizePrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

const listAdditions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) where.name = { contains: String(search).trim(), mode: 'insensitive' };

    const items = await getSharedPrismaClient().radiologyExamAddition.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing radiology exam additions:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪Ñ╪╢╪º┘ü╪º╪¬' });
  }
};

const createAddition = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, price } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╖┘ä┘ê╪¿' });

    const item = await getSharedPrismaClient().radiologyExamAddition.create({
      data: { companyId, name: String(name).trim(), price: normalizePrice(price) },
    });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating radiology exam addition:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐' });
  }
};

const updateAddition = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamAddition.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╖┘ä┘ê╪¿' });
      data.name = String(body.name).trim();
    }
    if (body.price !== undefined) data.price = normalizePrice(body.price);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const item = await prisma.radiologyExamAddition.update({ where: { id }, data });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating radiology exam addition:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐' });
  }
};

const deleteAddition = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamAddition.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const item = await prisma.radiologyExamAddition.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐', data: item });
  } catch (error) {
    console.error('Error deleting radiology exam addition:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐' });
  }
};

module.exports = { listAdditions, createAddition, updateAddition, deleteAddition };
