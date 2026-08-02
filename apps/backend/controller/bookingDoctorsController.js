const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const stripPassword = (doctor) => {
  if (!doctor) return doctor;
  const { password, ...rest } = doctor;
  return rest;
};

const getAllDoctors = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId } = req.query;
    const where = { companyId };
    if (branchId) where.branchId = branchId;

    const doctors = await getSharedPrismaClient().bookingDoctor.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        doctorServices: { select: { id: true, serviceId: true, doctorId: true, fee: true, isActive: true } }
      },
      orderBy: { title: 'asc' }
    });
    const data = doctors.map(d => {
      const { password, ...rest } = d;
      return { ...rest, serviceIds: (d.doctorServices || []).filter(ds => ds.isActive).map(ds => ds.serviceId) };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباء' });
  }
};

const createDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { branchId, title, name, specialty, phone, gender, email, password, employeeId, consultationFee, commissionRate, bio, avatarUrl, serviceIds } = req.body;
    if (!branchId) return res.status(400).json({ success: false, error: 'الفرع مطلوب' });
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'اللقب مطلوب' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });

    const doctor = await getSharedPrismaClient().bookingDoctor.create({
      data: {
        companyId, branchId, title: title.trim(), name, specialty, phone, gender,
        email, employeeId, consultationFee: consultationFee !== undefined ? Number(consultationFee) : null,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : null,
        bio, avatarUrl,
        password: password ? await bcrypt.hash(password, 10) : null,
        doctorServices: Array.isArray(serviceIds) && serviceIds.length > 0 ? {
          create: serviceIds.map(serviceId => ({ companyId, serviceId, isActive: true }))
        } : undefined
      },
      include: { doctorServices: { select: { id: true, serviceId: true, doctorId: true, fee: true, isActive: true } } }
    });
    const { password: _pw, ...rest } = doctor;
    res.json({ success: true, data: { ...rest, serviceIds: (doctor.doctorServices || []).filter(ds => ds.isActive).map(ds => ds.serviceId) } });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الدكتور' });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { branchId, title, name, specialty, phone, gender, email, password, employeeId, consultationFee, commissionRate, bio, avatarUrl, isActive, serviceIds } = req.body;

    const existing = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدكتور غير موجود' });

    const data = {};
    if (branchId !== undefined) data.branchId = branchId;
    if (title !== undefined) data.title = title;
    if (name !== undefined) data.name = name;
    if (specialty !== undefined) data.specialty = specialty;
    if (phone !== undefined) data.phone = phone;
    if (gender !== undefined) data.gender = gender;
    if (email !== undefined) data.email = email;
    if (employeeId !== undefined) data.employeeId = employeeId;
    if (consultationFee !== undefined) data.consultationFee = Number(consultationFee);
    if (commissionRate !== undefined) data.commissionRate = Number(commissionRate);
    if (bio !== undefined) data.bio = bio;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 10);

    const doctor = await getSharedPrismaClient().bookingDoctor.update({ where: { id }, data });

    // Replace doctor-service links when serviceIds is provided
    if (Array.isArray(serviceIds)) {
      await getSharedPrismaClient().bookingDoctorService.deleteMany({ where: { doctorId: id, companyId } });
      if (serviceIds.length > 0) {
        await getSharedPrismaClient().bookingDoctorService.createMany({
          data: serviceIds.map(serviceId => ({ companyId, doctorId: id, serviceId, isActive: true }))
        });
      }
    }

    const { password: _pw, ...rest } = doctor;
    res.json({ success: true, data: rest });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الدكتور' });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدكتور غير موجود' });

    await getSharedPrismaClient().bookingDoctor.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الدكتور' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الدكتور' });
  }
};

module.exports = { getAllDoctors, createDoctor, updateDoctor, deleteDoctor };
