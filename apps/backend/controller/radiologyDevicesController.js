const { getSharedPrismaClient } = require('../services/sharedDatabase');

const listDevices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;

    const devices = await getSharedPrismaClient().radiologyDevice.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('Error listing radiology devices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أجهزة الأشعة' });
  }
};

const createDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, room, modality } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم الجهاز مطلوب' });

    const device = await getSharedPrismaClient().radiologyDevice.create({
      data: {
        companyId,
        name: String(name).trim(),
        room: room ? String(room) : null,
        modality: modality ? String(modality) : null,
      },
    });
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Error creating radiology device:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الجهاز' });
  }
};

const updateDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyDevice.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });

    const body = req.body || {};
    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم الجهاز مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.room !== undefined) data.room = body.room ? String(body.room) : null;
    if (body.modality !== undefined) data.modality = body.modality ? String(body.modality) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const device = await prisma.radiologyDevice.update({ where: { id }, data });
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Error updating radiology device:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الجهاز' });
  }
};

const deleteDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyDevice.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });

    await prisma.radiologyDevice.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم تعطيل الجهاز', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology device:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الجهاز' });
  }
};

module.exports = { listDevices, createDevice, updateDevice, deleteDevice };
