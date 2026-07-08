const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllBranches = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let branches = await getSharedPrismaClient().bookingBranch.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    const tryParse = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
    branches = branches.map(b => ({ ...b, workingDays: tryParse(b.workingDays), genderDays: tryParse(b.genderDays), phones: tryParse(b.phones) }));
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفروع' });
  }
};

const createBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { name, address, phone, phones, workingDays, genderDays, maxBookingsPerSlot } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });

    if (typeof workingDays === 'string') { try { workingDays = JSON.parse(workingDays); } catch (e) {} }
    if (typeof genderDays === 'string') { try { genderDays = JSON.parse(genderDays); } catch (e) {} }
    if (typeof phones === 'string') { try { phones = JSON.parse(phones); } catch (e) {} }

    const branch = await getSharedPrismaClient().bookingBranch.create({
      data: { companyId, name: name.trim(), address, phone, phones, workingDays, genderDays, maxBookingsPerSlot: maxBookingsPerSlot ?? 1 }
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفرع' });
  }
};

const updateBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    let { name, address, phone, phones, workingDays, genderDays, isActive, maxBookingsPerSlot } = req.body;

    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    if (typeof workingDays === 'string') { try { workingDays = JSON.parse(workingDays); } catch (e) {} }
    if (typeof genderDays === 'string') { try { genderDays = JSON.parse(genderDays); } catch (e) {} }
    if (typeof phones === 'string') { try { phones = JSON.parse(phones); } catch (e) {} }

    const branch = await getSharedPrismaClient().bookingBranch.update({
      where: { id },
      data: { name, address, phone, phones, workingDays, genderDays, isActive, maxBookingsPerSlot }
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفرع' });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    await getSharedPrismaClient().bookingBranch.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الفرع' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفرع' });
  }
};

module.exports = { getAllBranches, createBranch, updateBranch, deleteBranch };
