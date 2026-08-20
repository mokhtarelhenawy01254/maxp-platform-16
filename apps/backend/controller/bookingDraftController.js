const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllDrafts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const drafts = await getSharedPrismaClient().bookingDraft.findMany({
      where: { companyId, status: { notIn: ['expired'] } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: drafts });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const createDraft = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const draft = await getSharedPrismaClient().bookingDraft.create({
      data: { companyId, status: 'in_progress', expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
    });
    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const setDraftField = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { field, value } = req.body;
    if (!field) return res.status(400).json({ success: false, error: 'اسم الحقل مطلوب' });

    const allowedFields = ['branchId', 'doctorId', 'serviceId', 'customerName', 'customerPhone', 'customerGender', 'appointmentDate', 'startTime', 'notes'];
    if (!allowedFields.includes(field)) return res.status(400).json({ success: false, error: 'حقل غير مسموح' });

    const existing = await getSharedPrismaClient().bookingDraft.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المسودة غير موجودة' });
    if (existing.status !== 'in_progress') return res.status(400).json({ success: false, error: 'المسودة منتهية' });

    const updateData = {};
    if (field === 'appointmentDate') {
      updateData[field] = new Date(value);
    } else {
      updateData[field] = String(value);
    }

    const draft = await getSharedPrismaClient().bookingDraft.update({ where: { id }, data: updateData });
    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error setting draft field:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const getDraft = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const draft = await getSharedPrismaClient().bookingDraft.findFirst({ where: { id, companyId } });
    if (!draft) return res.status(404).json({ success: false, error: 'المسودة غير موجودة' });

    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error getting draft:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const finalizeDraft = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const draft = await getSharedPrismaClient().bookingDraft.findFirst({ where: { id, companyId } });
    if (!draft) return res.status(404).json({ success: false, error: 'المسودة غير موجودة' });
    if (draft.status !== 'in_progress') return res.status(400).json({ success: false, error: 'المسودة منتهية' });

    const missing = [];
    if (!draft.customerName) missing.push('customerName');
    if (!draft.customerPhone) missing.push('customerPhone');
    if (!draft.appointmentDate) missing.push('appointmentDate');
    if (!draft.startTime) missing.push('startTime');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `بيانات ناقصة: ${missing.join(', ')}` });
    }

    const prisma = getSharedPrismaClient();

    const branch = draft.branchId ? await prisma.bookingBranch.findFirst({ where: { id: draft.branchId, companyId } }) : null;
    if (draft.branchId && !branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });
    const service = draft.serviceId ? await prisma.bookingService.findFirst({ where: { id: draft.serviceId, companyId } }) : null;
    if (draft.serviceId && !service) return res.status(400).json({ success: false, error: 'الخدمة غير موجودة' });
    const doctor = draft.doctorId ? await prisma.bookingDoctor.findFirst({ where: { id: draft.doctorId, companyId } }) : null;
    if (draft.doctorId && !doctor) return res.status(400).json({ success: false, error: 'الطبيب غير موجود' });

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        customerGender: draft.customerGender || 'male',
        appointmentDate: draft.appointmentDate,
        startTime: draft.startTime,
        endTime: (() => {
          const [h, m] = draft.startTime.split(':');
          const end = new Date(0, 0, 0, parseInt(h), parseInt(m) + 30);
          return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        })(),
        status: 'pending',
        title: service?.name || 'حجز علاج طبيعي',
        serviceName: service?.name || null,
        branchId: draft.branchId || null,
        doctorId: draft.doctorId || null,
        serviceId: draft.serviceId || null,
        notes: draft.notes || null,
        staffId: draft.doctorId || draft.branchId || id,
        staffName: doctor?.name || branch?.name || 'النظام الآلي',
        type: 'booking',
        source: 'ai-sandbox'
      }
    });

    await prisma.bookingDraft.update({ where: { id }, data: { status: 'completed' } });

    res.json({ success: true, data: { appointment, draft } });
  } catch (error) {
    console.error('Error finalizing draft:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تأكيد الحجز' });
  }
};

const deleteDraft = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingDraft.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المسودة غير موجودة' });

    await getSharedPrismaClient().bookingDraft.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف المسودة' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المسودة' });
  }
};

module.exports = { getAllDrafts, createDraft, setDraftField, getDraft, finalizeDraft, deleteDraft };
