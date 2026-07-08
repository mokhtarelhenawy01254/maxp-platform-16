const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

const BOOKING_SLOT_DURATION = 30;
const BOOKING_LAST_SLOT = '20:00';

const getAllAppointments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { status, branchId, doctorId, serviceId, customerGender, dateFrom, dateTo } = req.query;
    const where = { companyId };
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (doctorId) where.doctorId = doctorId;
    if (serviceId) where.serviceId = serviceId;
    if (customerGender) where.customerGender = customerGender;
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) where.appointmentDate.gte = new Date(dateFrom);
      if (dateTo) where.appointmentDate.lte = new Date(dateTo);
    }

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        branch: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } }
      },
      orderBy: { appointmentDate: 'desc' }
    });

    const formatted = appointments.map(a => ({
      id: a.id, customerId: a.customerId || '', customerName: a.customerName,
      customerEmail: a.customerEmail, customerPhone: a.customerPhone,
      customerGender: a.customerGender,
      staffId: a.staffId, staffName: a.staffName,
      title: a.title, description: a.description,
      appointmentDate: a.appointmentDate.toISOString().split('T')[0],
      startTime: a.startTime, endTime: a.endTime || '', duration: a.duration,
      status: a.status, type: a.type, location: a.location,
      branchId: a.branchId, branchName: a.branch?.name || '',
      doctorId: a.doctorId, serviceId: a.serviceId, serviceName: a.serviceName,
      source: a.source, paymentRequired: a.paymentRequired, paymentStatus: a.paymentStatus,
      meetingLink: a.meetingLink, notes: a.notes,
      confirmedAt: a.confirmedAt, createdAt: a.createdAt.toISOString()
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المواعيد' });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId, date, gender } = req.query;
    if (!branchId || !date) {
      return res.status(400).json({ success: false, error: 'معرف الفرع والتاريخ مطلوبان' });
    }

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    const tryParse = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
    branch.workingDays = tryParse(branch.workingDays);
    branch.genderDays = tryParse(branch.genderDays);

    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()];

    // Check gender-based access if genderDays is configured
    if (gender && branch.genderDays) {
      const genderMap = branch.genderDays;
      const genderLower = gender.toLowerCase();
      const allowedDays = genderLower === 'male' ? genderMap.male : genderMap.female;
      if (allowedDays && !allowedDays.includes(dayName)) {
        return res.json({ success: true, data: [], message: 'اليوم غير متاح لهذا الجنس' });
      }
    }

    // Parse working hours for this day
    let startHour = 9, endHour = 17;
    if (branch.workingDays && branch.workingDays[dayName]) {
      const [s, e] = branch.workingDays[dayName].split('-');
      if (s) startHour = parseInt(s.split(':')[0]);
      if (e) endHour = parseInt(e.split(':')[0]);
    }

    // Get existing appointments for this branch and date
    const existingAppointments = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId, branchId,
        appointmentDate: new Date(date),
        status: { notIn: ['cancelled', 'no_show'] }
      },
      select: { startTime: true, endTime: true }
    });

    // Max bookings per slot from branch config
    const maxPerSlot = branch.maxBookingsPerSlot ?? 1;

    // Count existing appointments per time window (30-min bucket)
    const countInWindow = (time) => {
      const [h, m] = time.split(':').map(Number);
      const windowStart = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const windowEndM = m + BOOKING_SLOT_DURATION;
      const windowEnd = `${(h + Math.floor(windowEndM / 60)).toString().padStart(2, '0')}:${(windowEndM % 60).toString().padStart(2, '0')}`;
      return existingAppointments.filter(apt =>
        apt.startTime === windowStart || (apt.endTime && apt.endTime > windowStart && apt.startTime < windowEnd)
      ).length;
    };

    // Generate slots (first every hour, then every 30min)
    const slots = [];
    const lastSlot = BOOKING_LAST_SLOT;
    const lastSlotHour = parseInt(lastSlot.split(':')[0]);

    // First pass: full hours
    for (let hour = startHour; hour < lastSlotHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const endTimeString = `${(hour + 1).toString().padStart(2, '0')}:00`;
      const booked = countInWindow(timeString);
      slots.push({ startTime: timeString, endTime: endTimeString, duration: BOOKING_SLOT_DURATION, available: booked < maxPerSlot, bookedCount: booked, maxPerSlot });
    }

    // If all full hours are at max, try half-hour slots
    const allFull = slots.every(s => !s.available);
    if (allFull) {
      for (let hour = startHour; hour < lastSlotHour; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:30`;
        const endHourTime = hour + 1;
        const endTimeString = `${endHourTime.toString().padStart(2, '0')}:30`;
        const booked = countInWindow(timeString);
        slots.push({ startTime: timeString, endTime: endTimeString, duration: BOOKING_SLOT_DURATION, available: booked < maxPerSlot, bookedCount: booked, maxPerSlot });
      }
    }

    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأوقات المتاحة' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body;
    console.log('[BOOKING-DEBUG] createAppointment body:', JSON.stringify(body));
    let customerName = body.customerName || 'مريض';
    let appointmentDate = body.appointmentDate || new Date().toISOString().split('T')[0];
    let startTime = body.startTime || '00:00';
    const { customerPhone, customerEmail, customerGender, branchId, doctorId, serviceId, serviceName, title, description, type, source, notes, paymentRequired } = body;
    if (!branchId) return res.status(400).json({ success: false, error: 'الفرع مطلوب' });

    // Verify branch and check gender day rules
    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });

    const tryParse = (v) => typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (e) { return v; } })() : v;
    branch.genderDays = tryParse(branch.genderDays);

    if (customerGender && branch.genderDays) {
      const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(appointmentDate).getDay()];
      const genderLower = customerGender.toLowerCase();
      const allowedDays = genderLower === 'male' ? branch.genderDays.male : branch.genderDays.female;
      if (allowedDays && !allowedDays.includes(dayName)) {
        return res.status(400).json({ success: false, error: 'اليوم غير متاح لهذا الجنس' });
      }
    }

    // Check slot availability (count-based, respect maxBookingsPerSlot)
    const maxPerSlot = branch.maxBookingsPerSlot ?? 1;
    const existingCount = await getSharedPrismaClient().appointment.count({
      where: {
        companyId, branchId,
        appointmentDate: new Date(appointmentDate),
        startTime, status: { notIn: ['cancelled', 'no_show'] }
      }
    });
    if (existingCount >= maxPerSlot) return res.status(400).json({ success: false, error: `هذا الوقت ممتلئ (الحد الأقصى: ${maxPerSlot})` });

    const duration = BOOKING_SLOT_DURATION;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endMin = startMinute + duration;
    const endH = startHour + Math.floor(endMin / 60);
    const endM = endMin % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const appointment = await getSharedPrismaClient().appointment.create({
      data: {
        id: uuidv4(), companyId,
        customerName: customerName.trim(),
        customerEmail, customerPhone, customerGender,
        branchId, doctorId, serviceId, serviceName,
        staffId: doctorId || branchId, staffName: serviceName || title || 'موعد',
        title: title || serviceName || 'موعد جديد',
        description, appointmentDate: new Date(appointmentDate),
        startTime, endTime, duration,
        status: 'pending', type: type || 'consultation',
        location: branch.name || null,
        source: source || 'dashboard',
        notes, paymentRequired: paymentRequired || false,
        paymentStatus: paymentRequired ? 'pending' : null
      },
      include: { branch: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } }
    });

    const formatted = {
      id: appointment.id, customerName: appointment.customerName,
      customerEmail: appointment.customerEmail, customerPhone: appointment.customerPhone,
      customerGender: appointment.customerGender,
      branchId: appointment.branchId, branchName: appointment.branch?.name || '',
      doctorId: appointment.doctorId, serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      title: appointment.title, description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
      startTime: appointment.startTime, endTime: appointment.endTime,
      duration: appointment.duration, status: appointment.status,
      source: appointment.source,
      paymentRequired: appointment.paymentRequired, paymentStatus: appointment.paymentStatus,
      createdAt: appointment.createdAt.toISOString()
    };

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حجز الموعد' });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });

    const existing = await getSharedPrismaClient().appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const updateData = { status, notes: notes !== undefined ? notes : existing.notes };
    if (status === 'confirmed') updateData.confirmedAt = new Date();

    const appointment = await getSharedPrismaClient().appointment.update({
      where: { id },
      data: updateData,
      include: { branch: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } }
    });

    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الموعد' });
  }
};

const confirmAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const appointment = await getSharedPrismaClient().appointment.findFirst({
      where: { id, companyId },
      include: { branch: { select: { id: true, name: true, phone: true } } }
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    await getSharedPrismaClient().appointment.update({
      where: { id },
      data: { status: 'confirmed', confirmedAt: new Date() }
    });

    // TODO: Send WhatsApp confirmation to customer + center notification
    res.json({ success: true, message: 'تم تأكيد الموعد' });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تأكيد الموعد' });
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'معرفات المواعيد مطلوبة' });
    }
    if (!status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });

    const updateData = { status, notes: req.body.notes !== undefined ? req.body.notes : undefined };
    if (status === 'confirmed') updateData.confirmedAt = new Date();

    const result = await getSharedPrismaClient().appointment.updateMany({
      where: { id: { in: ids }, companyId },
      data: updateData,
    });

    res.json({ success: true, data: result, message: `تم تحديث ${result.count} موعد` });
  } catch (error) {
    console.error('Error bulk updating appointments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحديث الجماعي' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'معرفات المواعيد مطلوبة' });
    }

    const result = await getSharedPrismaClient().appointment.deleteMany({
      where: { id: { in: ids }, companyId },
    });

    res.json({ success: true, data: result, message: `تم حذف ${result.count} موعد` });
  } catch (error) {
    console.error('Error bulk deleting appointments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الحذف الجماعي' });
  }
};

module.exports = { getAllAppointments, getAvailableSlots, createAppointment, updateAppointmentStatus, confirmAppointment, bulkUpdateStatus, bulkDelete };
