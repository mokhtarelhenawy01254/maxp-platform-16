const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const data = await getSharedPrismaClient().serviceOrder.findMany({
      where: { companyId },
      include: { service: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const data = await getSharedPrismaClient().serviceOrder.findFirst({
      where: { id, companyId },
      include: { service: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلب' });
  }
};

const createPublic = async (req, res) => {
  try {
    const { companyId, serviceId, customerName, phone, description, referenceFiles } = req.body;
    if (!companyId || !serviceId || !customerName || !phone) {
      return res.status(400).json({ success: false, error: 'جميع الحقول المطلوبة: الشركة، الخدمة، الاسم، الهاتف' });
    }
    const service = await getSharedPrismaClient().service.findFirst({ where: { id: serviceId, companyId, isActive: true } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
    const data = await getSharedPrismaClient().serviceOrder.create({
      data: { companyId, serviceId, customerName, phone, description, referenceFiles: referenceFiles || [] }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطلب' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { customerName, phone, description, notes, assignedTo } = req.body;
    const existing = await getSharedPrismaClient().serviceOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    const data = await getSharedPrismaClient().serviceOrder.update({
      where: { id },
      data: { customerName, phone, description, notes, assignedTo }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطلب' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'حالة غير صالحة' });
    const existing = await getSharedPrismaClient().serviceOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    const data = await getSharedPrismaClient().serviceOrder.update({ where: { id }, data: { status } });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

module.exports = { getAll, getById, createPublic, update, updateStatus };
