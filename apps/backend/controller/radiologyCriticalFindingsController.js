const { getSharedPrismaClient } = require('../services/sharedDatabase');

const VALID_CATEGORIES = ['NONE', 'CAT1', 'CAT2', 'CAT3'];

const signerName = (req) => {
  const name = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ');
  return name || req.user?.email || null;
};

const setCriticalFinding = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const category = String(req.body?.category || '').toUpperCase();
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: 'فئة العثور الحرج غير صحيحة' });
    }

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود — أنشئ مسودة أولاً' });

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
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ العثور الحرج' });
  }
};

const acknowledgeCriticalFinding = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود — أنشئ مسودة أولاً' });

    if (!report.criticalCategory || report.criticalCategory === 'NONE') {
      return res.status(400).json({ success: false, error: 'لا يوجد عثور حرج للاعتراف به' });
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
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ العثور الحرج' });
  }
};

module.exports = { setCriticalFinding, acknowledgeCriticalFinding };
