const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const authenticatePatientToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '╪▒┘à╪▓ ╪º┘ä┘à╪╡╪º╪»┘é╪⌐ ┘à╪╖┘ä┘ê╪¿' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const patientId = decoded.patientId || decoded.id;
    if (!patientId) {
      return res.status(401).json({ success: false, message: '╪▒┘à╪▓ ╪º┘ä┘à╪╡╪º╪»┘é╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, companyId: true, isActive: true }
    });

    if (!patient) {
      return res.status(401).json({ success: false, message: '╪º┘ä┘à╪▒┘è╪╢ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    if (!patient.isActive) {
      return res.status(403).json({ success: false, message: '╪º┘ä╪¡╪│╪º╪¿ ╪║┘è╪▒ ┘å╪┤╪╖' });
    }

    req.patient = patient;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '╪▒┘à╪▓ ╪º┘ä┘à╪╡╪º╪»┘é╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
  }
};

module.exports = { authenticatePatientToken };
