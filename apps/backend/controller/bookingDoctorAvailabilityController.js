const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAvailability = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, error: 'معرف الطبيب مطلوب' });

    const doctor = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const data = await getSharedPrismaClient().doctorAvailability.findMany({
      where: { doctorId, companyId },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أوقات الطبيب' });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { doctorId } = req.params;
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ success: false, error: 'بيانات الأوقات غير صحيحة' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

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
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث أوقات الطبيب' });
  }
};

module.exports = { getAvailability, updateAvailability };
