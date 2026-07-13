const { getSharedPrismaClient } = require('./sharedDatabase');

const EDUCATION_NOTIFICATION_EVENTS = {
  ENROLLMENT_CREATED: 'education_enrollment_created',
  SESSION_SCHEDULED: 'education_session_scheduled',
  SESSION_CONFIRMED: 'education_session_confirmed',
  SESSION_CANCELLED: 'education_session_cancelled',
  SESSION_REMINDER: 'education_session_reminder',
  ENROLLMENT_LOW_HOURS: 'education_enrollment_low_hours',
  ENROLLMENT_EXPIRING: 'education_enrollment_expiring',
};

const NOTIFICATION_TEMPLATES = {
  [EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED]: {
    parent: `أهلاً {parentName} 🎉

تم تسجيل {studentName} في باقة {packageName} ✅

📚 المادة: {subjectName}
⏰ عدد الساعات: {totalHours} ساعة
💰 المدفوع: {amountPaid} {currency}

سيتم إعلامك بموعد أول حصة قريباً.
نتمنى لكم التوفيق! 🌟`,
    staff: `تسجيل جديد ✅

الطالب: {studentName}
ولي الأمر: {parentName}
الهاتف: {parentPhone}
الباقة: {packageName} - {subjectName}
الساعات: {totalHours}
المدفوع: {amountPaid} {currency}`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED]: {
    parent: `أهلاً {parentName} 📅

تم جدولة حصة جديدة لـ {studentName}:

📚 المادة: {subjectName}
📆 التاريخ: {sessionDate}
⏰ الوقت: {sessionTime}
⏱ المدة: {duration} دقيقة
👨‍🏫 المدرس: {teacherName}

في حال وجود أي استفسار، تواصل معنا.`,
    teacher: `حصة جديدة 📅

الطالب: {studentName}
المادة: {subjectName}
التاريخ: {sessionDate}
الوقت: {sessionTime}
المدة: {duration} دقيقة`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED]: {
    parent: `تم تأكيد الحصة ✅

تم تأكيد حصة {studentName} في {subjectName}
التاريخ: {sessionDate}
المدة: {actualDuration} دقيقة

الساعات المتبقية: {remainingHours} ساعة`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED]: {
    parent: `تم إلغاء الحصة ❌

تم إلغاء حصة {studentName} في {subjectName} المقررة يوم {sessionDate}

سنقوم بجدولة حصة بديلة قريباً.`,
    teacher: `تم إلغاء الحصة ❌

تم إلغاء حصة الطالب {studentName} في {subjectName} المقررة يوم {sessionDate}`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER]: {
    parent: `تذكير بالحصة ⏰

غداً موعد حصة {studentName} في {subjectName} الساعة {sessionTime}

📌 لا تنسوا الحضور في الوقت المحدد!`,
    teacher: `تذكير بالحصة ⏰

غداً حصة {studentName} في {subjectName} الساعة {sessionTime}`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_LOW_HOURS]: {
    parent: `رصيد الساعات أوشك على الانتهاء ⚠️

باقة {studentName} في {subjectName} المتبقي: {remainingHours} ساعة فقط

يمكنك تجديد الباقة أو شراء باقة جديدة من خلالنا.`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_EXPIRING]: {
    parent: `الباقة على وشك الانتهاء ⏳

باقة {studentName} في {subjectName} ستنتهي في {expiryDate}

رصيدك المتبقي: {remainingHours} ساعة
تواصل معنا لتجديد الباقة.`,
  },
};

const STAFF_SUBSCRIBED_EVENTS = [
  EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
];

function replaceVariables(template, vars) {
  let text = template;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
  }
  return text;
}

async function sendEducationNotification({ companyId, eventType, templates, variables, recipientPhone, recipientName, recipientType = 'CUSTOMER' }) {
  try {
    const content = replaceVariables(templates, variables);
    if (!content) return { success: false, reason: 'no_template' };

    const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
    return await sendNotification({
      companyId,
      recipientPhone,
      recipientName: recipientName || variables.parentName || variables.studentName || 'عميلنا',
      recipientType,
      category: 'education',
      eventType,
      variables: { ...variables, contentOverride: content },
      priority: 4,
    });
  } catch (error) {
    console.error(`[EducationNotification] Error sending ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function notifyEnrollmentCreated(companyId, enrollment) {
  const prisma = getSharedPrismaClient();
  const student = await prisma.educationStudent.findUnique({ where: { id: enrollment.studentId }, include: { customer: true } });
  const pkg = await prisma.educationPackage.findUnique({ where: { id: enrollment.packageId }, include: { subject: true } });
  if (!student?.customer) return;

  const vars = {
    parentName: student.customer.firstName || student.customer.lastName || 'وليّ الأمر',
    studentName: `${student.firstName} ${student.lastName}`,
    packageName: pkg.name,
    subjectName: pkg.subject.name,
    totalHours: enrollment.totalHours,
    amountPaid: enrollment.amountPaid,
    currency: 'ج.م',
    parentPhone: student.customer.phone || '',
  };

  if (student.customer.phone) {
    await sendEducationNotification({
      companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED].parent,
      variables: vars, recipientPhone: student.customer.phone,
      recipientName: vars.parentName, recipientType: 'CUSTOMER',
    });
  }
}

async function notifySessionScheduled(companyId, session) {
  const full = await getSharedPrismaClient().educationSession.findUnique({
    where: { id: session.id },
    include: { student: { include: { customer: true } }, teacher: true, subject: true, enrollment: true },
  });
  if (!full) return;

  const d = new Date(full.scheduledAt);
  const vars = {
    parentName: full.student.customer?.firstName || 'وليّ الأمر',
    studentName: `${full.student.firstName} ${full.student.lastName}`,
    subjectName: full.subject.name,
    teacherName: full.teacher?.name || 'المدرس',
    sessionDate: d.toLocaleDateString('ar-EG'),
    sessionTime: d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    duration: full.plannedDuration,
  };

  if (full.student.customer?.phone) {
    await sendEducationNotification({
      companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED].parent,
      variables: vars, recipientPhone: full.student.customer.phone,
      recipientName: vars.parentName,
    });
  }
  if (full.teacher?.phone) {
    await sendEducationNotification({
      companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED].teacher,
      variables: vars, recipientPhone: full.teacher.phone,
      recipientName: full.teacher.name, recipientType: 'EMPLOYEE',
    });
  }
}

async function notifySessionConfirmed(companyId, sessionId) {
  const full = await getSharedPrismaClient().educationSession.findUnique({
    where: { id: sessionId },
    include: { student: { include: { customer: true } }, subject: true, enrollment: true },
  });
  if (!full?.student.customer?.phone) return;

  const d = new Date(full.scheduledAt);
  await sendEducationNotification({
    companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED,
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED].parent,
    variables: {
      parentName: full.student.customer?.firstName || 'وليّ الأمر',
      studentName: `${full.student.firstName} ${full.student.lastName}`,
      subjectName: full.subject.name,
      sessionDate: d.toLocaleDateString('ar-EG'),
      actualDuration: full.actualDuration || full.plannedDuration,
      remainingHours: full.enrollment.remainingHours,
    },
    recipientPhone: full.student.customer.phone,
    recipientName: full.student.customer.firstName || 'وليّ الأمر',
  });
}

async function notifySessionCancelled(companyId, session) {
  const full = await getSharedPrismaClient().educationSession.findUnique({
    where: { id: session.id },
    include: { student: { include: { customer: true } }, teacher: true, subject: true },
  });
  if (!full) return;

  const d = new Date(full.scheduledAt);
  const vars = {
    parentName: full.student.customer?.firstName || 'وليّ الأمر',
    studentName: `${full.student.firstName} ${full.student.lastName}`,
    subjectName: full.subject.name,
    sessionDate: d.toLocaleDateString('ar-EG'),
  };

  if (full.student.customer?.phone) {
    await sendEducationNotification({
      companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED].parent,
      variables: vars, recipientPhone: full.student.customer.phone,
      recipientName: vars.parentName,
    });
  }
  if (full.teacher?.phone) {
    await sendEducationNotification({
      companyId, eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED].teacher,
      variables: vars, recipientPhone: full.teacher.phone,
      recipientName: full.teacher.name, recipientType: 'EMPLOYEE',
    });
  }
}

async function getFunnelStats(companyId) {
  const prisma = getSharedPrismaClient();
  const totalCustomers = await prisma.customer.count({ where: { companyId, isArchived: false } });
  const totalStudents = await prisma.educationStudent.count({ where: { companyId, isActive: true } });
  const totalEnrollments = await prisma.educationEnrollment.count({ where: { companyId } });
  const totalSessions = await prisma.educationSession.count({ where: { companyId } });
  const confirmedSessions = await prisma.educationSession.count({ where: { companyId, status: 'CONFIRMED' } });
  const scheduledSessions = await prisma.educationSession.count({ where: { companyId, status: 'SCHEDULED' } });

  // Students with 2+ enrollments = repeat
  const repeatStudents = await prisma.educationStudent.count({
    where: { companyId, enrollments: { some: {} } },
  });
  const multipleEnrollments = await prisma.educationEnrollment.groupBy({
    by: ['studentId'],
    where: { companyId },
    _count: { id: true },
    having: { id: { _count: { gte: 2 } } },
  });

  return {
    funnel: {
      totalCustomers,
      totalStudents,
      totalEnrollments,
      scheduledSessions,
      confirmedSessions,
    },
    conversion: {
      customersToStudents: totalCustomers > 0 ? ((totalStudents / totalCustomers) * 100).toFixed(1) : '0.0',
      studentsToEnrollments: totalStudents > 0 ? ((totalEnrollments / totalStudents) * 100).toFixed(1) : '0.0',
      completionRate: totalSessions > 0 ? ((confirmedSessions / totalSessions) * 100).toFixed(1) : '0.0',
    },
    repeat: {
      studentsWithMultipleEnrollments: multipleEnrollments.length,
      totalEnrolledStudents: repeatStudents,
    },
    events: Object.values(EDUCATION_NOTIFICATION_EVENTS),
    templates: Object.entries(NOTIFICATION_TEMPLATES).map(([event, tpl]) => ({
      event,
      parent: tpl.parent?.substring(0, 100),
      hasTeacher: !!tpl.teacher,
    })),
  };
}

module.exports = {
  EDUCATION_NOTIFICATION_EVENTS,
  NOTIFICATION_TEMPLATES,
  notifyEnrollmentCreated,
  notifySessionScheduled,
  notifySessionConfirmed,
  notifySessionCancelled,
  getFunnelStats,
  sendEducationNotification,
};
