const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getStudyLabel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const { generateStudyLabel } = require('../services/radiologyLabelService');
    const pdfBuffer = await generateStudyLabel(study);

    const filename = `label-${(study.studyNumber || study.id).replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating radiology study label:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء اللاصقة' });
  }
};

module.exports = { getStudyLabel };
