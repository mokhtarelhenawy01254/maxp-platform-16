const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAvailability = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, error: '┘à╪╣╪▒┘ü ╪º┘ä╪╖╪¿┘è╪¿ ┘à╪╖┘ä┘ê╪¿' });

    const doctor = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: '╪º┘ä╪╖╪¿┘è╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    const data = await getSharedPrismaClient().doctorAvailability.findMany({
      where: { doctorId, companyId },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪ú┘ê┘é╪º╪¬ ╪º┘ä╪╖╪¿┘è╪¿' });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { doctorId } = req.params;
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ success: false, error: '╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪ú┘ê┘é╪º╪¬ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: '╪º┘ä╪╖╪¿┘è╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({ where: { doctorId, companyId } });
      await tx.doctorAvailability.createMany({
        data: slots
          .filter(s => s.isAvailable && s.startTime && s.endTime)
          .map(s => ({
            companyId,
            doctorId,
            dayOfWeek: Number(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: true,
          })),
      });
    });

    const data = await prisma.doctorAvailability.findMany({
      where: { doctorId, companyId },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪ú┘ê┘é╪º╪¬ ╪º┘ä╪╖╪¿┘è╪¿' });
  }
};

module.exports = { getAvailability, updateAvailability };
