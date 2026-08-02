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

const getDoctorById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findFirst({
      where: { id, companyId },
      include: {
        branch: { select: { id: true, name: true } },
        doctorServices: {
          include: { service: { select: { id: true, name: true, basePrice: true, durationMinutes: true } } },
        },
        availability: true,
        appointments: {
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
          take: 50,
          include: {
            branch: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!doctor) return res.status(404).json({ success: false, error: 'الدكتور غير موجود' });

    const { password, ...rest } = doctor;

    // Build per-service fee map from booking_doctor_services
    const services = (doctor.doctorServices || [])
      .filter(ds => ds.isActive)
      .map(ds => ({
        id: ds.serviceId,
        name: ds.service?.name || '',
        basePrice: ds.service?.basePrice ?? null,
        durationMinutes: ds.service?.durationMinutes ?? null,
        fee: ds.fee ?? null,
      }));

    // Availability grouped by weekday
    const availability = (doctor.availability || []).map(a => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      isAvailable: a.isAvailable,
    }));

    // Appointment stats
    const appointments = (doctor.appointments || []).map(a => ({
      id: a.id,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      appointmentDate: a.appointmentDate.toISOString().split('T')[0],
      startTime: a.startTime,
      endTime: a.endTime || '',
      status: a.status,
      branchName: a.branch?.name || '',
      serviceName: a.serviceName || a.service?.name || '',
      diagnosis: a.diagnosis || '',
      treatmentPlan: a.treatmentPlan || '',
      prescription: a.prescription || '',
      paymentStatus: a.paymentStatus || null,
      source: a.source || '',
    }));

    const total = await prisma.appointment.count({ where: { companyId, doctorId: id } });
    const upcoming = await prisma.appointment.count({
      where: { companyId, doctorId: id, appointmentDate: { gte: new Date() }, status: { notIn: ['cancelled', 'no_show'] } },
    });
    const completed = await prisma.appointment.count({ where: { companyId, doctorId: id, status: 'completed' } });

    // Revenue from invoices on the doctor's appointments
    const withInvoices = await prisma.appointment.findMany({
      where: { companyId, doctorId: id },
      select: { id: true },
    });
    const appointmentIds = withInvoices.map(a => a.id);
    let revenue = 0;
    if (appointmentIds.length > 0) {
      const invoices = await prisma.medicalInvoice.findMany({
        where: { companyId, appointmentId: { in: appointmentIds }, status: { not: 'REFUNDED' } },
        select: { total: true, amountPaid: true },
      });
      revenue = invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
    }

    res.json({
      success: true,
      data: {
        ...rest,
        branchName: doctor.branch?.name || '',
        services,
        availability,
        appointments,
        stats: { total, upcoming, completed, revenue: +revenue.toFixed(2) },
      },
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل الدكتور' });
  }
};

module.exports = { getAllDoctors, createDoctor, updateDoctor, deleteDoctor, getDoctorById };
