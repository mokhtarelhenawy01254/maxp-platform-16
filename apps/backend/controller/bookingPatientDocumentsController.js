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
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { patientId } = req.params;
    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
    if (!patient) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▒┘è╪╢ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ┘à╪│╪¬┘å╪»╪º╪¬ ╪º┘ä┘à╪▒┘è╪╢' });
  }
};

const addPatientDocument = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { patientId, documentType, name, fileData, mimeType, notes } = req.body || {};
    if (!patientId || !String(patientId).trim()) {
      return res.status(400).json({ success: false, error: '┘à╪╣╪▒┘ü ╪º┘ä┘à╪▒┘è╪╢ ┘à╪╖┘ä┘ê╪¿' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
    if (!patient) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▒┘è╪╢ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    let resolvedType = 'OTHER';
    if (documentType !== undefined && documentType !== null && String(documentType) !== '') {
      const type = String(documentType).toUpperCase();
      if (!DOCUMENT_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: '┘å┘ê╪╣ ╪º┘ä┘à╪│╪¬┘å╪» ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
      }
      resolvedType = type;
    }

    if (fileData !== undefined && fileData !== null && fileData !== '') {
      if (typeof fileData !== 'string') {
        return res.status(400).json({ success: false, error: '╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪│╪¬┘å╪» ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
      }
      if (fileData.length > MAX_FILE_DATA_LENGTH) {
        return res.status(400).json({ success: false, error: '╪¡╪¼┘à ╪º┘ä┘à╪│╪¬┘å╪» ┘â╪¿┘è╪▒ ╪¼╪»╪º┘ï (╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë 5 ┘à┘è╪¼╪º╪¿╪º┘è╪¬)' });
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à╪│╪¬┘å╪»' });
  }
};

const deletePatientDocument = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.patientDocument.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪│╪¬┘å╪» ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.patientDocument.delete({ where: { id } });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä┘à╪│╪¬┘å╪»' });
  } catch (error) {
    console.error('Error deleting patient document:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä┘à╪│╪¬┘å╪»' });
  }
};

module.exports = { getPatientDocuments, addPatientDocument, deletePatientDocument };
