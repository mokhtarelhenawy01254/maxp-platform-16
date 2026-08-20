const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllReferringPhysicians = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;

    const list = await getSharedPrismaClient().referringPhysician.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching referring physicians:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪ú╪╖╪¿╪º╪í ╪º┘ä┘à╪¡┘ê┘æ┘ä┘è┘å' });
  }
};

const createReferringPhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, phone, specialty, isActive } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä ┘à╪╖┘ä┘ê╪¿' });

    const created = await getSharedPrismaClient().referringPhysician.create({
      data: {
        companyId,
        name: String(name).trim(),
        phone: phone || null,
        specialty: specialty || null,
        isActive: isActive ?? true,
      },
    });
    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating referring physician:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä' });
  }
};

const updateReferringPhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().referringPhysician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const { name, phone, specialty, isActive } = req.body;
    const data = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä ┘à╪╖┘ä┘ê╪¿' });
      data.name = trimmed;
    }
    if (phone !== undefined) data.phone = phone || null;
    if (specialty !== undefined) data.specialty = specialty || null;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await getSharedPrismaClient().referringPhysician.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating referring physician:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä' });
  }
};

const deleteReferringPhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().referringPhysician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await getSharedPrismaClient().referringPhysician.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¬╪╣╪╖┘è┘ä ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä' });
  } catch (error) {
    console.error('Error deleting referring physician:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘ê┘æ┘ä' });
  }
};

module.exports = { getAllReferringPhysicians, createReferringPhysician, updateReferringPhysician, deleteReferringPhysician };
