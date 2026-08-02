const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { findOrCreatePatient } = require('../services/bookingPatientService');
const { v4: uuidv4 } = require('uuid');

const resolveCompany = async (slug) => {
  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findFirst({
    where: { OR: [{ id: slug }, { slug }], isActive: true },
    select: { id: true, name: true, slug: true, logo: true }
  });
  return company;
};

const getInfo = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const branchCount = await getSharedPrismaClient().bookingBranch.count({
      where: { companyId: company.id, isActive: true }
    });

    res.json({ success: true, data: { name: company.name, logo: company.logo, slug: company.slug, branchCount } });
  } catch (error) {
    console.error('Error in getInfo:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const getBranches = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const branches = await getSharedPrismaClient().bookingBranch.findMany({
      where: { companyId: company.id, isActive: true },
      select: { id: true, name: true, address: true, phone: true, genderDays: true, workingDays: true },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error in getBranches:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const getDoctors = async (req, res) => {
  try {
    const { slug, branchId } = req.query;
    if (!slug) return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const where = { companyId: company.id, isActive: true };
    if (branchId) where.branchId = branchId;

    const doctors = await getSharedPrismaClient().bookingDoctor.findMany({
      where,
      select: { id: true, name: true, specialty: true, branchId: true },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error in getDoctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const getServices = async (req, res) => {
  try {
    const { slug, branchId } = req.query;
    if (!slug) return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const tryParse = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v;

    if (branchId) {
      const branchServices = await getSharedPrismaClient().bookingBranchService.findMany({
        where: { branchId, isActive: true, service: { companyId: company.id, isActive: true } },
        select: {
          id: true,
          hasPackages: true,
          packages: true,
          service: {
            select: {
              id: true, name: true, description: true, requiresConsultation: true,
              durationMinutes: true, basePrice: true, categoryId: true,
              category: { select: { id: true, name: true, color: true, icon: true } },
              doctorServices: { select: { doctorId: true, fee: true, doctor: { select: { id: true, name: true, title: true, specialty: true } } } }
            }
          }
        },
        orderBy: { service: { name: 'asc' } }
      });
      const data = branchServices.map(bs => ({
        id: bs.service.id,
        name: bs.service.name,
        description: bs.service.description,
        requiresConsultation: bs.service.requiresConsultation,
        durationMinutes: bs.service.durationMinutes,
        basePrice: bs.service.basePrice,
        category: bs.service.category,
        doctors: (bs.service.doctorServices || []).map(ds => ({ id: ds.doctor.id, name: ds.doctor.name, title: ds.doctor.title, specialty: ds.doctor.specialty, fee: ds.fee })),
        branchServiceId: bs.id,
        branchId,
        hasPackages: bs.hasPackages,
        packages: tryParse(bs.packages)
      }));
      return res.json({ success: true, data });
    }

    let services = await getSharedPrismaClient().bookingService.findMany({
      where: { companyId: company.id, isActive: true },
      select: {
        id: true, name: true, description: true, requiresConsultation: true,
        durationMinutes: true, basePrice: true, categoryId: true,
        category: { select: { id: true, name: true, color: true, icon: true } },
        doctorServices: { select: { doctor: { select: { id: true, name: true, title: true, specialty: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    const data2 = services.map(s => ({
      ...s,
      doctors: (s.doctorServices || []).map(ds => ds.doctor)
    }));
    delete data2.doctorServices;

    res.json({ success: true, data: data2 });
  } catch (error) {
    console.error('Error in getServices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { slug, branchId, date, gender } = req.query;
    if (!slug || !branchId || !date) {
      return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة' });
    }

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({
      where: { id: branchId, companyId: company.id }
    });
    if (!branch) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    if (!branch.isActive) return res.status(400).json({ success: false, error: 'الفرع غير متاح حالياً' });

    const tryParse = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
    branch.genderDays = tryParse(branch.genderDays);
    branch.workingDays = tryParse(branch.workingDays);

    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()];

    if (gender && branch.genderDays) {
      const allowedDays = gender === 'male' ? branch.genderDays.male : branch.genderDays.female;
      if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(dayName)) {
        return res.json({ success: true, data: [], message: 'اليوم غير متاح لهذا الجنس' });
      }
    }

    let startHour = 9, endHour = 17;
    if (branch.workingDays && branch.workingDays[dayName]) {
      const [s, e] = branch.workingDays[dayName].split('-');
      if (s) startHour = parseInt(s.split(':')[0]);
      if (e) endHour = parseInt(e.split(':')[0]);
    }

    // Service duration (default 30)
    const { serviceId } = req.query;
    let serviceDuration = 30;
    if (serviceId) {
      const service = await getSharedPrismaClient().bookingService.findFirst({
        where: { id: serviceId, companyId: company.id },
        select: { durationMinutes: true }
      });
      if (service) serviceDuration = service.durationMinutes || 30;
    }

    const existingAppointments = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId: company.id, branchId,
        appointmentDate: new Date(date),
        status: { notIn: ['cancelled', 'no_show'] }
      },
      select: { startTime: true, endTime: true }
    });

    const overlapsAny = (startTimeStr, durationMin) => {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const startMinTotal = sh * 60 + sm;
      const endMinTotal = startMinTotal + durationMin;
      for (const apt of existingAppointments) {
        const [ah, am] = apt.startTime.split(':').map(Number);
        const aptStart = ah * 60 + am;
        let aptEnd = aptStart + 30;
        if (apt.endTime) {
          const [eh, em] = apt.endTime.split(':').map(Number);
          aptEnd = eh * 60 + em;
        }
        if (startMinTotal < aptEnd && endMinTotal > aptStart) return true;
      }
      return false;
    };

    const slots = [];
    const endMinTotal = endHour * 60;
    for (let minTotal = startHour * 60; minTotal + serviceDuration <= endMinTotal; minTotal += 30) {
      const h = Math.floor(minTotal / 60);
      const m = minTotal % 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      if (timeString >= '20:00') continue;
      slots.push({
        startTime: timeString,
        duration: serviceDuration,
        available: !overlapsAny(timeString, serviceDuration)
      });
    }

    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Error in getAvailableSlots:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { slug, customerName, customerPhone, customerEmail, customerGender, branchId, serviceId, startTime, appointmentDate, notes } = req.body;
    if (!slug || !customerName || !branchId || !startTime || !appointmentDate) {
      return res.status(400).json({ success: false, error: 'جميع الحقول المطلوبة غير مكتملة' });
    }

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({
      where: { id: branchId, companyId: company.id }
    });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });
    if (!branch.isActive) return res.status(400).json({ success: false, error: 'الفرع غير متاح حالياً' });

    const tryParse2 = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
    branch.genderDays = tryParse2(branch.genderDays);

    if (customerGender && branch.genderDays) {
      const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(appointmentDate).getDay()];
      const allowedDays = customerGender === 'male' ? branch.genderDays.male : branch.genderDays.female;
      if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(dayName)) {
        return res.status(400).json({ success: false, error: 'اليوم غير متاح لهذا الجنس' });
      }
    }

    // Resolve service + duration + default doctor
    let serviceName = null;
    let serviceDuration = 30;
    let serviceDoctorIds = [];
    if (serviceId) {
      const service = await getSharedPrismaClient().bookingService.findFirst({
        where: { id: serviceId, companyId: company.id },
        select: { id: true, name: true, durationMinutes: true, doctorServices: { select: { doctorId: true } } }
      });
      if (service) {
        serviceName = service.name;
        serviceDuration = service.durationMinutes || 30;
        serviceDoctorIds = (service.doctorServices || []).map(ds => ds.doctorId);
      }
    }

    // Verify selected doctor provides this service (if a doctor was chosen)
    const chosenDoctorId = req.body.doctorId;
    if (chosenDoctorId && serviceDoctorIds.length > 0 && !serviceDoctorIds.includes(chosenDoctorId)) {
      return res.status(400).json({ success: false, error: 'هذا الطبيب لا يقدم هذه الخدمة' });
    }

    const existing = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId: company.id, branchId,
        ...(chosenDoctorId ? { doctorId: chosenDoctorId } : {}),
        appointmentDate: new Date(appointmentDate),
        status: { notIn: ['cancelled', 'no_show'] }
      },
      select: { startTime: true, endTime: true }
    });
    const [rSH, rSM] = startTime.split(':').map(Number);
    const reqStartMin = rSH * 60 + rSM;
    const reqEndMin = reqStartMin + serviceDuration;
    const hasOverlap = existing.some(apt => {
      const [ah, am] = apt.startTime.split(':').map(Number);
      const aptStart = ah * 60 + am;
      let aptEnd = aptStart + 30;
      if (apt.endTime) {
        const [eh, em] = apt.endTime.split(':').map(Number);
        aptEnd = eh * 60 + em;
      }
      return reqStartMin < aptEnd && reqEndMin > aptStart;
    });
    if (hasOverlap) return res.status(400).json({ success: false, error: 'هذا الوقت محجوز بالفعل' });

    // Find-or-create the patient's medical file and link the appointment
    const { id: patientId } = await findOrCreatePatient({
      companyId: company.id,
      customerName,
      customerPhone,
      customerGender,
      customerEmail,
      customerId: req.body.customerId || undefined,
    });

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endMin = startMinute + serviceDuration;
    const endTime = `${(startHour + Math.floor(endMin / 60)).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;

    const appointment = await getSharedPrismaClient().appointment.create({
      data: {
        id: uuidv4(), companyId: company.id,
        customerName: customerName.trim(),
        customerPhone, customerEmail, customerGender,
        patientId,
        staffId: chosenDoctorId || branchId, staffName: serviceName || 'حجز عام',
        branchId, doctorId: chosenDoctorId || undefined, serviceId, serviceName,
        title: serviceName || 'موعد جديد',
        appointmentDate: new Date(appointmentDate),
        startTime, endTime, duration: serviceDuration,
        status: 'pending', type: 'consultation',
        location: branch.name,
        source: 'public-booking',
        notes
      }
    });

    res.json({
      success: true,
      data: {
        id: appointment.id,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        branchName: branch.name,
        serviceName,
        appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status
      }
    });
  } catch (error) {
    console.error('Error in createAppointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حجز الموعد' });
  }
};

const getServiceCategories = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });

    const company = await resolveCompany(slug);
    if (!company) return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });

    const categories = await getSharedPrismaClient().bookingServiceCategory.findMany({
      where: { companyId: company.id, isActive: true },
      select: { id: true, name: true, color: true, icon: true, sortOrder: true, _count: { select: { services: { where: { isActive: true } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    const data = categories.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, sortOrder: c.sortOrder, serviceCount: c._count.services }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getServiceCategories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

module.exports = { getInfo, getBranches, getDoctors, getServices, getServiceCategories, getAvailableSlots, createAppointment };
