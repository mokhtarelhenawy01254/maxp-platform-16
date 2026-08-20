const { getSharedPrismaClient } = require('./sharedDatabase');

const BOOKING_NOTIFICATION_EVENTS = {
  APPOINTMENT_BOOKED: 'booking_appointment_booked',
  APPOINTMENT_CONFIRMED: 'booking_appointment_confirmed',
  APPOINTMENT_CANCELLED: 'booking_appointment_cancelled',
  APPOINTMENT_REMINDER: 'booking_appointment_reminder',
};

const NOTIFICATION_TEMPLATES = {
  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_BOOKED]: `╪ú┘ç┘ä╪º┘ï {patientName} ≡ƒæï

╪¬┘à ╪º╪│╪¬┘ä╪º┘à ╪¡╪¼╪▓┘â ╪¿┘å╪¼╪º╪¡ Γ£à

≡ƒÅÑ ╪º┘ä┘ü╪▒╪╣: {branchName}
≡ƒôï ╪º┘ä╪«╪»┘à╪⌐: {serviceName}
≡ƒôà ╪º┘ä╪¬╪º╪▒┘è╪«: {appointmentDate}
ΓÅ░ ╪º┘ä┘ê┘é╪¬: {startTime}

╪│┘è╪¬┘à ╪¬╪ú┘â┘è╪» ╪º┘ä╪¡╪¼╪▓ ┘à┘å ┘é╪¿┘ä┘å╪º. ┘å╪┤┘â╪▒┘â ┘ä╪½┘é╪¬┘â! ≡ƒîƒ`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED]: `╪¬┘à ╪¬╪ú┘â┘è╪» ┘à┘ê╪╣╪»┘â Γ£à

╪ú┘ç┘ä╪º┘ï {patientName}╪î ╪¬┘à ╪¬╪ú┘â┘è╪» ╪¡╪¼╪▓┘â:

≡ƒÅÑ {branchName}
≡ƒôï {serviceName}
≡ƒæ¿ΓÇìΓÜò∩╕Å {doctorName}
≡ƒôà {appointmentDate}
ΓÅ░ {startTime}

┘ü┘è ╪¡╪º┘ä ╪¬╪ú╪«╪▒┘â ┘è╪▒╪¼┘ë ╪Ñ╪¿┘ä╪º╪║┘å╪º. ┘å╪¬╪┤╪▒┘ü ╪¿╪▓┘è╪º╪▒╪¬┘â!`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED]: `╪¬┘à ╪Ñ┘ä╪║╪º╪í ┘à┘ê╪╣╪»┘â Γ¥î

╪ú┘ç┘ä╪º┘ï {patientName}╪î ╪¬┘à ╪Ñ┘ä╪║╪º╪í ┘à┘ê╪╣╪»┘â ╪º┘ä┘à┘é╪▒╪▒ ┘è┘ê┘à {appointmentDate} ╪º┘ä╪│╪º╪╣╪⌐ {startTime}.

┘è┘à┘â┘å┘â ╪¡╪¼╪▓ ┘à┘ê╪╣╪» ╪¼╪»┘è╪» ┘ü┘è ╪ú┘è ┘ê┘é╪¬. ┘à╪╣ ╪º┘ä╪º╪╣╪¬╪░╪º╪▒ ╪╣┘å ╪ú┘è ╪Ñ╪▓╪╣╪º╪¼.`,

  [BOOKING_NOTIFICATION_EVENTS.APPOINTMENT_REMINDER]: `╪¬╪░┘â┘è╪▒ ╪¿┘à┘ê╪╣╪»┘â ΓÅ░

╪ú┘ç┘ä╪º┘ï {patientName}╪î ╪║╪»╪º┘ï ┘à┘ê╪╣╪»┘â:

≡ƒÅÑ {branchName}
≡ƒôï {serviceName}
≡ƒôà {appointmentDate}
ΓÅ░ {startTime}

≡ƒôî ┘ä╪º ╪¬┘å╪│┘Ä ╪º┘ä╪¡╪╢┘ê╪▒ ┘ü┘è ╪º┘ä┘à┘ê╪╣╪» ╪º┘ä┘à╪¡╪»╪»!` ,
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
    patientName: appointment.customerName || '╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓',
    branchName: appointment.branch?.name || appointment.branchName || '┘ü╪▒╪╣┘å╪º',
    serviceName: appointment.serviceName || '┘à┘ê╪╣╪»',
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
      recipientName: recipientName || appointment.customerName || '╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓',
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
 * @param {string|null} companyId ΓÇö optional filter; null = all companies
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
