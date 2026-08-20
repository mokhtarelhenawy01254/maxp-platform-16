const { getSharedPrismaClient } = require('../services/sharedDatabase');

const listDevices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;

    const devices = await getSharedPrismaClient().radiologyDevice.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('Error listing radiology devices:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪ú╪¼┘ç╪▓╪⌐ ╪º┘ä╪ú╪┤╪╣╪⌐' });
  }
};

const createDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, room, modality } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪¼┘ç╪º╪▓ ┘à╪╖┘ä┘ê╪¿' });

    const device = await getSharedPrismaClient().radiologyDevice.create({
      data: {
        companyId,
        name: String(name).trim(),
        room: room ? String(room) : null,
        modality: modality ? String(modality) : null,
      },
    });
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Error creating radiology device:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪¼┘ç╪º╪▓' });
  }
};

const updateDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyDevice.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪¼┘ç╪º╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const body = req.body || {};
    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪¼┘ç╪º╪▓ ┘à╪╖┘ä┘ê╪¿' });
      data.name = String(body.name).trim();
    }
    if (body.room !== undefined) data.room = body.room ? String(body.room) : null;
    if (body.modality !== undefined) data.modality = body.modality ? String(body.modality) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const device = await prisma.radiologyDevice.update({ where: { id }, data });
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Error updating radiology device:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪¼┘ç╪º╪▓' });
  }
};

const deleteDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyDevice.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä╪¼┘ç╪º╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.radiologyDevice.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¬╪╣╪╖┘è┘ä ╪º┘ä╪¼┘ç╪º╪▓', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology device:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪¼┘ç╪º╪▓' });
  }
};

module.exports = { listDevices, createDevice, updateDevice, deleteDevice };
