const { getSharedPrismaClient } = require('../services/sharedDatabase');

const BOOKING_CHAIN = ['UNCONFIRMED', 'CONFIRMED', 'CHECKED_IN', 'PROCEDURE_STARTED', 'PROCEDURE_COMPLETED', 'CHECKED_OUT'];

const BOOKING_TRANSITIONS = {};
for (let i = 0; i < BOOKING_CHAIN.length - 1; i += 1) {
  BOOKING_TRANSITIONS[BOOKING_CHAIN[i]] = [BOOKING_CHAIN[i + 1]];
}
BOOKING_TRANSITIONS.UNCONFIRMED.push('CANCELLED', 'MISSED');
BOOKING_TRANSITIONS.CONFIRMED.push('CANCELLED', 'MISSED');
BOOKING_TRANSITIONS.CHECKED_IN.push('CANCELLED', 'MISSED');
BOOKING_TRANSITIONS.PROCEDURE_STARTED.push('CANCELLED', 'MISSED');
BOOKING_TRANSITIONS.PROCEDURE_COMPLETED.push('CANCELLED', 'MISSED');

const REPORT_CHAIN = ['PENDING', 'NOTES_IN_PROGRESS', 'NOTES_COMPLETED', 'UNDER_REVIEW', 'APPROVED'];

const REPORT_TRANSITIONS = {};
for (let i = 0; i < REPORT_CHAIN.length - 1; i += 1) {
  REPORT_TRANSITIONS[REPORT_CHAIN[i]] = [REPORT_CHAIN[i + 1]];
}

const LEGACY_STATUS_MAP = {
  UNCONFIRMED: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'confirmed',
  PROCEDURE_STARTED: 'confirmed',
  PROCEDURE_COMPLETED: 'completed',
  CHECKED_OUT: 'completed',
  CANCELLED: 'cancelled',
  MISSED: 'no_show',
};

const LEGACY_TO_BOOKING = {
  pending: 'UNCONFIRMED',
  confirmed: 'CONFIRMED',
  completed: 'CHECKED_OUT',
  cancelled: 'CANCELLED',
  no_show: 'MISSED',
};

const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
  branch: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
  assignedDoctor: { select: { id: true, name: true, title: true, specialty: true } },
  doctor: { select: { id: true, name: true, title: true, specialty: true } },
};

const validateBookingTransition = (from, to) => {
  if (!from || !to) return { valid: false, error: 'الحالة المطلوبة غير صحيحة' };
  if (from === to) return { valid: false, error: `لا يمكن الانتقال إلى نفس الحالة "${from}"` };
  const allowed = BOOKING_TRANSITIONS[from];
  if (!Array.isArray(allowed) || !allowed.includes(to)) {
    return { valid: false, error: `لا يمكن الانتقال من حالة "${from}" إلى "${to}"` };
  }
  return { valid: true };
};

const validateReportTransition = (from, to) => {
  if (!from || !to) return { valid: false, error: 'الحالة المطلوبة غير صحيحة' };
  if (from === to) return { valid: false, error: `لا يمكن الانتقال إلى نفس الحالة "${from}"` };
  const allowed = REPORT_TRANSITIONS[from];
  if (!Array.isArray(allowed) || !allowed.includes(to)) {
    return { valid: false, error: `لا يمكن الانتقال في التقارير من "${from}" إلى "${to}"` };
  }
  return { valid: true };
};

const generateAccessionNumber = (id = '') => {
  const ts = Date.now().toString(36).toUpperCase();
  const suffix = typeof id === 'string' && id.length >= 4
    ? id.slice(-4).toUpperCase()
    : Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `ACC-${ts}-${suffix}`;
};

const generateTicketNumber = (count = 0) => String(count + 1).padStart(4, '0');

const writeLog = async (prisma, companyId, req, entry) => {
  try {
    await prisma.transactionLog.create({
      data: {
        companyId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        description: entry.description || null,
        amount: entry.amount !== undefined && entry.amount !== null ? Number(entry.amount) : null,
        payer: entry.payer || null,
        userId: req.user?.id || null,
        userName: [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || null,
      },
    });
  } catch (error) {
    console.error('Error writing transaction log:', error);
  }
};

const formatAppointment = (a) => ({
  id: a.id,
  customerName: a.customerName,
  customerPhone: a.customerPhone,
  customerEmail: a.customerEmail,
  customerGender: a.customerGender,
  patientId: a.patientId,
  patient: a.patient
    ? { id: a.patient.id, name: `${a.patient.firstName} ${a.patient.lastName || ''}`.trim(), phone: a.patient.phone }
    : null,
  branchId: a.branchId,
  branchName: a.branch?.name || '',
  doctorId: a.doctorId,
  doctorName: a.doctor ? `${a.doctor.title || ''} ${a.doctor.name || ''}`.trim() : '',
  assignedDoctorId: a.assignedDoctorId,
  assignedDoctorName: a.assignedDoctor ? `${a.assignedDoctor.title || ''} ${a.assignedDoctor.name || ''}`.trim() : '',
  serviceId: a.serviceId,
  serviceName: a.service?.name || a.serviceName || '',
  appointmentDate: a.appointmentDate ? a.appointmentDate.toISOString().split('T')[0] : '',
  startTime: a.startTime,
  endTime: a.endTime || '',
  duration: a.duration,
  status: a.status,
  bookingStatus: a.bookingStatus || null,
  reportStatus: a.reportStatus || null,
  accessionNumber: a.accessionNumber || '',
  ticketNumber: a.ticketNumber || '',
  room: a.room || '',
  preparationNote: a.preparationNote || '',
  deliveredWithoutReport: !!a.deliveredWithoutReport,
  resultDelivered: !!a.resultDelivered,
  labelPrinted: !!a.labelPrinted,
  diagnosis: a.diagnosis || '',
  treatmentPlan: a.treatmentPlan || '',
  prescription: a.prescription || '',
  notes: a.notes || '',
  paymentRequired: !!a.paymentRequired,
  paymentStatus: a.paymentStatus || '',
});

const updateBookingStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    if (!req.body.status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });
    const status = String(req.body.status).toUpperCase();

    const prisma = getSharedPrismaClient();
    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const from = existing.bookingStatus || LEGACY_TO_BOOKING[existing.status] || 'UNCONFIRMED';
    const bookingValidation = validateBookingTransition(from, status);
    if (!bookingValidation.valid) {
      return res.status(400).json({
        success: false,
        error: bookingValidation.error || `لا يمكن الانتقال من حالة "${from}" إلى "${status}"`,
      });
    }

    const data = { bookingStatus: status, status: LEGACY_STATUS_MAP[status] };
    if (status === 'CONFIRMED') data.confirmedAt = new Date();

    const arrived = ['CHECKED_IN', 'PROCEDURE_STARTED', 'PROCEDURE_COMPLETED', 'CHECKED_OUT'];
    if (arrived.includes(status)) {
      if (!existing.accessionNumber) data.accessionNumber = generateAccessionNumber(existing.id);
      if (!existing.ticketNumber) {
        const count = await prisma.appointment.count({
          where: {
            companyId,
            id: { not: id },
            ...(existing.branchId ? { branchId: existing.branchId } : {}),
            appointmentDate: existing.appointmentDate,
          },
        });
        data.ticketNumber = generateTicketNumber(count);
      }
    }

    const appointment = await prisma.appointment.update({ where: { id }, data, include: APPOINTMENT_INCLUDE });
    await writeLog(prisma, companyId, req, {
      entityType: 'APPOINTMENT',
      entityId: id,
      action: 'UPDATE',
      description: `تغيير حالة الحجز إلى ${status}`,
    });
    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الموعد' });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    if (!req.body.status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });
    const status = String(req.body.status).toUpperCase();

    const prisma = getSharedPrismaClient();
    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const from = existing.reportStatus || 'PENDING';
    const reportValidation = validateReportTransition(from, status);
    if (!reportValidation.valid) {
      return res.status(400).json({
        success: false,
        error: reportValidation.error || `لا يمكن الانتقال في التقارير من "${from}" إلى "${status}"`,
      });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { reportStatus: status },
      include: APPOINTMENT_INCLUDE,
    });
    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة التقرير' });
  }
};

const assignDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ success: false, error: 'معرف الطبيب مطلوب' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const doctor = await prisma.bookingDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب لا ينتمي لهذه الشركة' });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { assignedDoctorId: doctorId, doctorId },
      include: APPOINTMENT_INCLUDE,
    });
    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    console.error('Error assigning doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعيين الطبيب' });
  }
};

const markDeliveredWithoutReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { value } = req.body;
    if (typeof value !== 'boolean') {
      return res.status(400).json({ success: false, error: 'قيمة الحقل يجب أن تكون صحيحة أو خاطئة' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { deliveredWithoutReport: value },
      include: APPOINTMENT_INCLUDE,
    });
    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    console.error('Error marking delivered without report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التسليم بدون تقرير' });
  }
};

const markResultDelivered = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { value } = req.body;
    if (typeof value !== 'boolean') {
      return res.status(400).json({ success: false, error: 'قيمة الحقل يجب أن تكون صحيحة أو خاطئة' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.appointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الموعد غير موجود' });

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { resultDelivered: value },
      include: APPOINTMENT_INCLUDE,
    });
    res.json({ success: true, data: formatAppointment(appointment) });
  } catch (error) {
    console.error('Error marking result delivered:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث تسليم النتيجة' });
  }
};

const receptionQueue = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { date, branchId } = req.query;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const where = {
      companyId,
      appointmentDate: new Date(dateStr),
      OR: [
        { bookingStatus: { in: ['UNCONFIRMED', 'CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: null, status: { notIn: ['cancelled', 'no_show', 'completed'] } },
      ],
    };
    if (branchId) where.branchId = branchId;

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
    });

    const rank = { UNCONFIRMED: 0, CONFIRMED: 1, CHECKED_IN: 2 };
    const effective = (a) => a.bookingStatus || LEGACY_TO_BOOKING[a.status] || 'UNCONFIRMED';
    appointments.sort((x, y) => {
      const rankDiff = (rank[effective(x)] ?? 9) - (rank[effective(y)] ?? 9);
      if (rankDiff !== 0) return rankDiff;
      return (x.startTime || '').localeCompare(y.startTime || '');
    });

    res.json({ success: true, data: appointments.map(formatAppointment) });
  } catch (error) {
    console.error('Error fetching reception queue:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب طابور الاستقبال' });
  }
};

const doctorWorklist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { date, doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, error: 'معرف الطبيب مطلوب' });
    const dateStr = date || new Date().toISOString().split('T')[0];

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId,
        appointmentDate: new Date(dateStr),
        OR: [{ doctorId }, { assignedDoctorId: doctorId }],
        bookingStatus: { in: ['CHECKED_IN', 'PROCEDURE_STARTED', 'PROCEDURE_COMPLETED'] },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: appointments.map(formatAppointment) });
  } catch (error) {
    console.error('Error fetching doctor worklist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب قائمة الطبيب' });
  }
};

const reportWorklist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { date } = req.query;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId,
        appointmentDate: new Date(dateStr),
        AND: [
          {
            OR: [
              { bookingStatus: { notIn: ['CANCELLED', 'MISSED'] } },
              { bookingStatus: null, status: { notIn: ['cancelled', 'no_show'] } },
            ],
          },
          {
            OR: [
              { reportStatus: { notIn: ['APPROVED'] } },
              { reportStatus: null },
            ],
          },
        ],
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: appointments.map(formatAppointment) });
  } catch (error) {
    console.error('Error fetching report worklist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب قائمة التقارير' });
  }
};

module.exports = {
  validateBookingTransition,
  validateReportTransition,
  updateBookingStatus,
  updateReportStatus,
  assignDoctor,
  markDeliveredWithoutReport,
  markResultDelivered,
  receptionQueue,
  doctorWorklist,
  reportWorklist,
};
