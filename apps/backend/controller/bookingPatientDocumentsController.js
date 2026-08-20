const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DOCUMENT_TYPES = ['DRIVING_LICENSE', 'INSURANCE', 'PRESCRIPTION', 'IMAGE', 'VIDEO', 'OTHER'];
const MAX_FILE_DATA_LENGTH = 5 * 1024 * 1024;

const buildUploadedBy = (req) => {
  if (req.user?.role === 'AI_SERVICE') return req.user.name || 'AI Service';
  const name = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
  return name || req.user?.id || null;
};

const getPatientDocuments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientId } = req.params;
    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
    if (!patient) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    const documents = await prisma.patientDocument.findMany({
      where: { companyId, patientId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب مستندات المريض' });
  }
};

const addPatientDocument = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientId, documentType, name, fileData, mimeType, notes } = req.body || {};
    if (!patientId || !String(patientId).trim()) {
      return res.status(400).json({ success: false, error: 'معرف المريض مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
    if (!patient) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    let resolvedType = 'OTHER';
    if (documentType !== undefined && documentType !== null && String(documentType) !== '') {
      const type = String(documentType).toUpperCase();
      if (!DOCUMENT_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: 'نوع المستند غير صحيح' });
      }
      resolvedType = type;
    }

    if (fileData !== undefined && fileData !== null && fileData !== '') {
      if (typeof fileData !== 'string') {
        return res.status(400).json({ success: false, error: 'بيانات المستند غير صحيحة' });
      }
      if (fileData.length > MAX_FILE_DATA_LENGTH) {
        return res.status(400).json({ success: false, error: 'حجم المستند كبير جداً (الحد الأقصى 5 ميجابايت)' });
      }
    }

    const document = await prisma.patientDocument.create({
      data: {
        companyId,
        patientId,
        documentType: resolvedType,
        name: name ? String(name).trim() : null,
        fileData: fileData || null,
        mimeType: mimeType ? String(mimeType).trim() : null,
        notes: notes ? String(notes).trim() : null,
        uploadedBy: buildUploadedBy(req),
      },
    });
    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error adding patient document:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة المستند' });
  }
};

const deletePatientDocument = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.patientDocument.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المستند غير موجود' });

    await prisma.patientDocument.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف المستند' });
  } catch (error) {
    console.error('Error deleting patient document:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المستند' });
  }
};

module.exports = { getPatientDocuments, addPatientDocument, deletePatientDocument };
