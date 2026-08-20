const { getSharedPrismaClient } = require('./sharedDatabase');

const BOOKING_NOTIFICATION_EVENTS = {
  APPOINTMENT_BOOKED: 'booking_appointment_booked',
  APPOINTMENT_CONFIRMED: 'booking_appointment_confirmed',
  APPOINTMENT_CANCELLED: 'booking_appointment_cancelled',
  APPOINTMENT_REMINDER: 'booking_appointment_reminder',
};

const NOTIFICATION_TEMPLATES = {
  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_BOOKED]: `أهلاً {patientName} 👋

تم استلام حجزك بنجاح ✅

🏥 الفرع: {branchName}
📋 الخدمة: {serviceName}
📅 التاريخ: {appointmentDate}
⏰ الوقت: {startTime}

سيتم تأكيد الحجز من قبلنا. نشكرك لثقتك! 🌟`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED]: `تم تأكيد موعدك ✅

أهلاً {patientName}، تم تأكيد حجزك:

🏥 {branchName}
📋 {serviceName}
👨‍⚕️ {doctorName}
📅 {appointmentDate}
⏰ {startTime}

في حال تأخرك يرجى إبلاغنا. نتشرف بزيارتك!`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED]: `تم إلغاء موعدك ❌

أهلاً {patientName}، تم إلغاء موعدك المقرر يوم {appointmentDate} الساعة {startTime}.

يمكنك حجز موعد جديد في أي وقت. مع الاعتذار عن أي إزعاج.`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_REMINDER]: `تذكير بموعدك ⏰

أهلاً {patientName}، غداً موعدك:

🏥 {branchName}
📋 {serviceName}
📅 {appointmentDate}
⏰ {startTime}

📌 لا تنسَ الحضور في الموعد المحدد!` ,
};

function replaceVariables(template, vars) {
  let text = template;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
  }
  return text;
}

function buildVars(appointment) {
  return {
    patientName: appointment.customerName || 'عميلنا العزيز',
    branchName: appointment.branch?.name || appointment.branchName || 'فرعنا',
    serviceName: appointment.serviceName || 'موعد',
    doctorName: appointment.doctor ? `${appointment.doctor.title || ''} ${appointment.doctor.name || ''}`.trim() : (appointment.doctorName || ''),
    appointmentDate: appointment.appointmentDate instanceof Date
      ? appointment.appointmentDate.toISOString().split('T')[0]
      : String(appointment.appointmentDate || '').split('T')[0],
    startTime: appointment.startTime || '',
  };
}

async function sendBookingNotification({ companyId, eventType, appointment, recipientPhone, recipientName }) {
  try {
    if (!recipientPhone) return { success: false, reason: 'no_phone' };

    const template = NOTIFICATION_TEMPLATES[eventType];
    if (!template) return { success: false, reason: 'no_template' };

    const vars = buildVars(appointment);
    const content = replaceVariables(template, vars);

    const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
    return await sendNotification({
      companyId,
      recipientPhone,
      recipientName: recipientName || appointment.customerName || 'عميلنا العزيز',
      recipientType: 'CUSTOMER',
      category: 'booking',
      eventType,
      variables: { ...vars, contentOverride: content },
      priority: 4,
    });
  } catch (error) {
    console.error(`[BookingNotification] Error sending ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function notifyAppointmentConfirmed(companyId, appointmentId) {
  const appointment = await getSharedPrismaClient().appointment.findUnique({
    where: { id: appointmentId },
    include: { branch: { select: { id: true, name: true } }, doctor: { select: { id: true, title: true, name: true } } },
  });
  if (!appointment) return { success: false, reason: 'not_found' };

  return sendBookingNotification({
    companyId,
    eventType: BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED,
    appointment,
    recipientPhone: appointment.customerPhone,
  });
}

async function notifyAppointmentCancelled(companyId, appointment) {
  return sendBookingNotification({
    companyId,
    eventType: BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED,
    appointment,
    recipientPhone: appointment.customerPhone,
  });
}

/**
 * Send reminders for tomorrow's confirmed appointments.
 * @param {string|null} companyId — optional filter; null = all companies
 */
async function sendAppointmentReminders(companyId = null) {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const tomorrowStart = new Date(now); tomorrowStart.setDate(now.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setDate(tomorrowStart.getDate() + 1);

  const where = {
    appointmentDate: { gte: tomorrowStart, lte: tomorrowEnd },
    status: 'confirmed',
    customerPhone: { not: null },
  };
  if (companyId) where.companyId = companyId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: { branch: { select: { id: true, name: true } }, doctor: { select: { id: true, title: true, name: true } } },
  });

  let sent = 0;
  let failed = 0;
  for (const appointment of appointments) {
    try {
      const result = await sendBookingNotification({
        companyId: appointment.companyId,
        eventType: BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_REMINDER,
        appointment,
        recipientPhone: appointment.customerPhone,
      });
      if (result.success) sent++; else failed++;
    } catch (e) {
      failed++;
      console.error(`[BookingReminder] ${appointment.id}:`, e.message);
    }
  }
  return { scanned: appointments.length, sent, failed };
}

module.exports = {
  BOOKING_NOTIFICATION_EVENTS,
  NOTIFICATION_TEMPLATES,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  sendAppointmentReminders,
  sendBookingNotification,
};
