const { getSharedPrismaClient } = require('../services/sharedDatabase');

const ROLE_FIELDS = {
  typed: { by: 'typedBy', at: 'typedAt' },
  reviewed: { by: 'reviewedBy', at: 'reviewedAt' },
  finalized: { by: 'finalizedBy', at: 'finalizedAt' },
};

const recordRole = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { role, by } = req.body || {};
    const fields = ROLE_FIELDS[String(role || '').toLowerCase()];
    if (!fields) return res.status(400).json({ success: false, error: 'دور غير صحيح' });
    if (!by || !String(by).trim()) return res.status(400).json({ success: false, error: 'اسم المسؤول مطلوب' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود' });

    const updated = await prisma.radiologyReport.update({
      where: { id: report.id },
      data: { [fields.by]: String(by).trim(), [fields.at]: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error recording radiology report role:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث أدوار التقرير' });
  }
};

const clearRole = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, role } = req.params;
    const fields = ROLE_FIELDS[String(role || '').toLowerCase()];
    if (!fields) return res.status(400).json({ success: false, error: 'دور غير صحيح' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود' });

    const updated = await prisma.radiologyReport.update({
      where: { id: report.id },
      data: { [fields.by]: null, [fields.at]: null },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error clearing radiology report role:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث أدوار التقرير' });
  }
};

module.exports = { recordRole, clearRole };
