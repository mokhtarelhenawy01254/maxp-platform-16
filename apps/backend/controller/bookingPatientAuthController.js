const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    const identifier = phone || email;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: '╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ╪ú┘ê ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘ê┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘à╪╖┘ä┘ê╪¿╪º┘å' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true, email: true,
        password: true, companyId: true, gender: true, bloodType: true,
      },
    });

    if (!patient || !patient.password) {
      return res.status(401).json({ success: false, message: '╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ╪ú┘ê ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const isPasswordValid = await bcrypt.compare(password, patient.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ╪ú┘ê ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const token = jwt.sign(
      { patientId: patient.id, companyId: patient.companyId, role: 'PATIENT' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...patientData } = patient;
    res.json({ success: true, message: '╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿┘å╪¼╪º╪¡', data: { patient: patientData, token, expiresIn: '24h' } });
  } catch (error) {
    console.error('[PatientAuth] Login error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä' });
  }
};

const me = async (req, res) => {
  try {
    const patientId = req.patient?.id;
    if (!patientId) return res.status(401).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastName: true, phone: true, email: true,
        companyId: true, gender: true, birthDate: true, bloodType: true,
        allergies: true, chronicDiseases: true, medications: true, isActive: true,
      },
    });

    if (!patient) return res.status(404).json({ success: false, message: '╪º┘ä┘à╪▒┘è╪╢ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('[PatientAuth] Me error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú' });
  }
};

const changePassword = async (req, res) => {
  try {
    const patientId = req.patient?.id;
    if (!patientId) return res.status(401).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ê╪º┘ä╪¼╪»┘è╪»╪⌐ ┘à╪╖┘ä┘ê╪¿╪¬╪º┘å' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { password: true } });

    if (!patient || !patient.password) {
      return res.status(400).json({ success: false, message: '┘ä╪º ┘è┘à┘â┘å ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒' });
    }

    const isValid = await bcrypt.compare(currentPassword, patient.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: '┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    await prisma.patient.update({ where: { id: patientId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: '╪¬┘à ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('[PatientAuth] Change password error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒' });
  }
};

module.exports = { login, me, changePassword };
