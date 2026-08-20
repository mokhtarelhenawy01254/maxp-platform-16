const { getSharedPrismaClient } = require('../services/sharedDatabase');

const VALID_CATEGORIES = ['NONE', 'CAT1', 'CAT2', 'CAT3'];

const signerName = (req) => {
  const name = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ');
  return name || req.user?.email || null;
};

const setCriticalFinding = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const category = String(req.body?.category || '').toUpperCase();
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: '┘ü╪ª╪⌐ ╪º┘ä╪╣╪½┘ê╪▒ ╪º┘ä╪¡╪▒╪¼ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: '╪º┘ä╪¬┘é╪▒┘è╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ΓÇö ╪ú┘å╪┤╪ª ┘à╪│┘ê╪»╪⌐ ╪ú┘ê┘ä╪º┘ï' });

    const data = { criticalCategory: category };
    if (category !== 'NONE') {
      data.criticalFindingText = String(req.body?.findingText || '').trim() || null;
      if (!report.criticalFlaggedAt) {
        data.criticalFlaggedBy = signerName(req);
        data.criticalFlaggedAt = new Date();
      }
    } else {
      data.criticalFindingText = null;
    }

    const updated = await prisma.radiologyReport.update({
      where: { id: report.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error setting critical finding:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪º┘ä╪╣╪½┘ê╪▒ ╪º┘ä╪¡╪▒╪¼' });
  }
};

const acknowledgeCriticalFinding = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: '╪º┘ä╪¬┘é╪▒┘è╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ΓÇö ╪ú┘å╪┤╪ª ┘à╪│┘ê╪»╪⌐ ╪ú┘ê┘ä╪º┘ï' });

    if (!report.criticalCategory || report.criticalCategory === 'NONE') {
      return res.status(400).json({ success: false, error: '┘ä╪º ┘è┘ê╪¼╪» ╪╣╪½┘ê╪▒ ╪¡╪▒╪¼ ┘ä┘ä╪º╪╣╪¬╪▒╪º┘ü ╪¿┘ç' });
    }

    if (report.criticalAcknowledgedAt) {
      return res.json({ success: true, data: report });
    }

    const updated = await prisma.radiologyReport.update({
      where: { id: report.id },
      data: {
        criticalAcknowledgedBy: signerName(req),
        criticalAcknowledgedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error acknowledging critical finding:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪º┘ä╪╣╪½┘ê╪▒ ╪º┘ä╪¡╪▒╪¼' });
  }
};

module.exports = { setCriticalFinding, acknowledgeCriticalFinding };
