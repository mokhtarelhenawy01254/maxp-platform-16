const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: '╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪º┘ä┘ç╪º╪¬┘ü ┘ê┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘à╪╖┘ä┘ê╪¿╪º┘å' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier },
        ],
        isActive: true,
      },
      select: {
        id: true, title: true, name: true, email: true, phone: true, password: true,
        companyId: true, branchId: true, avatarUrl: true, specialty: true,
        consultationFee: true, commissionRate: true,
      },
    });

    if (!doctor || !doctor.password) {
      return res.status(401).json({ success: false, message: '╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const token = jwt.sign(
      { doctorId: doctor.id, companyId: doctor.companyId, role: 'DOCTOR' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...doctorData } = doctor;
    res.json({ success: true, message: '╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿┘å╪¼╪º╪¡', data: { doctor: doctorData, token, expiresIn: '24h' } });
  } catch (error) {
    console.error('[DoctorAuth] Login error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä' });
  }
};

const me = async (req, res) => {
  try {
    const doctorId = req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true, title: true, name: true, email: true, phone: true, companyId: true,
        branchId: true, avatarUrl: true, specialty: true, consultationFee: true,
        commissionRate: true, bio: true, isActive: true,
        branch: { select: { id: true, name: true } },
      },
    });

    if (!doctor) return res.status(404).json({ success: false, message: '╪º┘ä╪╖╪¿┘è╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[DoctorAuth] Me error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú' });
  }
};

const changePassword = async (req, res) => {
  try {
    const doctorId = req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ê╪º┘ä╪¼╪»┘è╪»╪⌐ ┘à╪╖┘ä┘ê╪¿╪¬╪º┘å' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findUnique({ where: { id: doctorId }, select: { password: true } });

    if (!doctor || !doctor.password) {
      return res.status(400).json({ success: false, message: '┘ä╪º ┘è┘à┘â┘å ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒' });
    }

    const isValid = await bcrypt.compare(currentPassword, doctor.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: '┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    await prisma.bookingDoctor.update({ where: { id: doctorId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: '╪¬┘à ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('[DoctorAuth] Change password error:', error);
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒' });
  }
};

module.exports = { login, me, changePassword };
