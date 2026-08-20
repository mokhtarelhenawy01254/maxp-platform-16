const { getSharedPrismaClient } = require('../services/sharedDatabase');

const parseCoveragePercent = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return Math.min(100, Math.max(0, num));
};

const getAllMemberTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const memberTypes = await getSharedPrismaClient().insuranceMemberType.findMany({
      where: { companyId },
      include: { _count: { select: { patients: true } } },
      orderBy: { coveragePercent: 'asc' },
    });
    res.json({ success: true, data: memberTypes });
  } catch (error) {
    console.error('Error fetching insurance member types:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪ú┘å┘ê╪º╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐' });
  }
};

const createMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, coveragePercent } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ┘à╪╖┘ä┘ê╪¿' });

    const parsedCoverage = parseCoveragePercent(coveragePercent);
    if (parsedCoverage === null) return res.status(400).json({ success: false, error: '┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪║╪╖┘è╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐' });

    const memberType = await getSharedPrismaClient().insuranceMemberType.create({
      data: {
        companyId,
        name: String(name).trim(),
        coveragePercent: parsedCoverage,
      },
    });
    res.json({ success: true, data: { ...memberType, _count: { patients: 0 } } });
  } catch (error) {
    console.error('Error creating insurance member type:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐' });
  }
};

const updateMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { name, coveragePercent, isActive } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ┘à╪╖┘ä┘ê╪¿' });
    if (coveragePercent !== undefined) {
      const parsedCoverage = parseCoveragePercent(coveragePercent);
      if (parsedCoverage === null) return res.status(400).json({ success: false, error: '┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪║╪╖┘è╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceMemberType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const memberType = await prisma.insuranceMemberType.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(coveragePercent !== undefined ? { coveragePercent: parseCoveragePercent(coveragePercent) } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
    });
    res.json({ success: true, data: memberType });
  } catch (error) {
    console.error('Error updating insurance member type:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐' });
  }
};

const deleteMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceMemberType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const memberType = await prisma.insuranceMemberType.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐', data: memberType });
  } catch (error) {
    console.error('Error deleting insurance member type:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä╪╣╪╢┘ê┘è╪⌐' });
  }
};

module.exports = {
  getAllMemberTypes,
  createMemberType,
  updateMemberType,
  deleteMemberType,
};
