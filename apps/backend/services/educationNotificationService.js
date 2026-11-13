const { getSharedPrismaClient } = require('./sharedDatabase');

const EDUCATION_NOTIFICATION_EVENTS = {
  ENROLLMENT_CREATED: 'education_enrollment_created',
  SESSION_SCHEDULED: 'education_session_scheduled',
  SESSION_CONFIRMED: 'education_session_confirmed',
  SESSION_CANCELLED: 'education_session_cancelled',
  SESSION_REMINDER: 'education_session_reminder',
  ENROLLMENT_LOW_HOURS: 'education_enrollment_low_hours',
  ENROLLMENT_EXPIRING: 'education_enrollment_expiring',
  PARENT_ACTIVATED: 'education_parent_activated',
  DEMO_DAY_REGISTERED: 'education_demo_day_registered',
  DEMO_DAY_REMINDER_24H: 'education_demo_day_reminder_24h',
  DEMO_DAY_REMINDER_2H: 'education_demo_day_reminder_2h',
  DEMO_DAY_ATTENDED_FEEDBACK: 'education_demo_day_attended_feedback',
  DEMO_DAY_NO_SHOW: 'education_demo_day_no_show',
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
  [EDUCATION_NOTIFICATION_EVENTS.PARENT_ACTIVATED]: {
    parent: `أهلاً {parentName} 🎉

تم تفعيل حساب ولي الأمر بنجاح ✅

يمكنك الآن متابعة الحصص ورصيد الساعات مباشرة عبر بوابة ولي الأمر.`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REGISTERED]: {
    parent: `أهلاً {parentName} 🎉

تم تأكيد حجز مقعد لـ {studentName} في ورشة العمل التجريبية (Demo Day):
📌 {eventTitle} ✅

📅 الموعد: {eventDate}
⏰ التوقيت: {eventTime}
📍 المكان / الرابط: {eventLocation}

نتطلع لحضوركم وتجربة تعليمية مميزة! 🌟`,
    staff: `تسجيل جديد في الديمو داي 🎯

الفعالية: {eventTitle}
الطالب: {studentName} ({age})
ولي الأمر: {parentName}
الهاتف: {parentPhone}
المصدر: {leadSource}`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REMINDER_24H]: {
    parent: `تذكير بموعد الديمو داي ⏰

أهلاً {parentName}،
غداً موعد ورشة العمل لـ {studentName}:
📌 {eventTitle}

⏰ الموعد: {eventTime}
📍 المكان / الرابط: {eventLocation}

يسعدنا تأكيد حضوركم معنا! ✅`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REMINDER_2H]: {
    parent: `متبقي ساعتان فقط 🚀

أهلاً {parentName}،
ورشة {studentName} في {eventTitle} تبدأ في تمام {eventTime}.

📍 رابط الحضور أو العنوان:
{eventLocation}

نحن بانتظاركم!`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_ATTENDED_FEEDBACK]: {
    parent: `شكراً لحضوركم اليوم! 🌟

سعدنا جداً بمشاركة {studentName} في {eventTitle}.

🎁 كود خصم خاص 15% عند التسجيل في الكورس الأساسي: {discountCode}
(الكود سارٍ لمدة 48 ساعة فقط)

📌 رأيكم يهمنا، شاركونا تقييمكم في دقيقة: {surveyLink}`,
  },
  [EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_NO_SHOW]: {
    parent: `أهلاً {parentName} 🤍

افتقدنا حضوركم اليوم في ورشة {eventTitle} لـ {studentName}.

إذا كنتم ترغبون في إعادة الجدولة وحضور ديمو الأسبوع القادم، يمكنك الرد على هذه الرسالة وسنقوم بحجز مقعدكم فوراً! 🔄`,
  },
};

// Teacher & staff notification templates
NOTIFICATION_TEMPLATES['education_session_scheduled_teacher'] = NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED].teacher;
NOTIFICATION_TEMPLATES['education_session_cancelled_teacher'] = NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED].teacher;
NOTIFICATION_TEMPLATES['education_session_reminder_teacher'] = NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER].teacher;
NOTIFICATION_TEMPLATES['education_enrollment_created_staff'] = NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED].staff;
NOTIFICATION_TEMPLATES['education_demo_day_registered_staff'] = NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REGISTERED].staff;

const STAFF_SUBSCRIBED_EVENTS = [
  EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED,
  EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
  EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REGISTERED,
];

function replaceVariables(template, vars = {}) {
  if (!template) return '';
  const rawText = typeof template === 'string'
    ? template
    : (template.parent || template.content || (typeof template === 'object' ? Object.values(template)[0] : '') || '');

  let text = String(rawText || '');
  for (const [key, val] of Object.entries(vars || {})) {
    const value = String(val ?? '');
    text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return text;
}

function resolveBaseTemplate(eventType, explicitTemplate) {
  if (explicitTemplate) return explicitTemplate;
  const direct = NOTIFICATION_TEMPLATES[eventType];
  if (!direct) return '';
  if (typeof direct === 'string') return direct;
  return direct.parent || direct.content || (typeof direct === 'object' ? Object.values(direct)[0] : '') || '';
}

async function sendEducationNotification({
  companyId,
  eventType,
  templates,
  variables = {},
  recipientPhone,
  recipientName,
  recipientType = 'CUSTOMER',
  deliveryStrategy = 'platform-fallback',
}) {
  try {
    const prisma = getSharedPrismaClient();

    // 1. Check if notification event is disabled in schedule
    try {
      if (prisma && prisma.customerNotificationSchedule && typeof prisma.customerNotificationSchedule.findUnique === 'function') {
        const schedule = await prisma.customerNotificationSchedule.findUnique({
          where: { companyId_eventType: { companyId, eventType } }
        });
        if (schedule && schedule.enabled === false) {
          return { success: false, reason: 'event_type_disabled', message: 'تم إيقاف هذا الإشعار من جدول الإشعارات' };
        }
      }
    } catch (_) {}

    // 2. Check for customized template from database
    let customTemplate = null;
    try {
      if (prisma && prisma.whatsAppNotificationTemplate && typeof prisma.whatsAppNotificationTemplate.findFirst === 'function') {
        customTemplate = await prisma.whatsAppNotificationTemplate.findFirst({
          where: { companyId, eventType, isActive: true },
          orderBy: { updatedAt: 'desc' }
        });
      }
    } catch (_) {}

    const rawTemplate = customTemplate?.content || resolveBaseTemplate(eventType, templates);
    const content = replaceVariables(rawTemplate, variables);
    if (!content) return { success: false, reason: 'no_template', error: 'لم يتم العثور على نص القالب' };

    const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
    const sendResult = await sendNotification({
      companyId,
      recipientPhone,
      recipientName: recipientName || variables.parentName || variables.studentName || 'عميلنا',
      recipientType,
      category: 'education',
      eventType,
      rawEventType: eventType,
      contentOverride: content,
      template: customTemplate || undefined,
      variables: { ...variables, contentOverride: content },
      priority: 4,
      deliveryStrategy,
    });

    try {
      const { logEducationEvent } = require('./educationAuditService');
      logEducationEvent({
        companyId,
        action: 'SEND_NOTIFICATION',
        entityType: 'NOTIFICATION',
        entityName: recipientName || recipientPhone,
        description: `إرسال إشعار تعليمي (${eventType}) إلى ${recipientName || recipientPhone}`,
        details: {
          eventType,
          recipientPhone,
          recipientName,
          recipientType,
          isDelivered: sendResult?.success !== false,
        },
        actorType: 'SYSTEM',
      }).catch(e => console.error('[NotificationAudit]', e.message));
    } catch {}

    return sendResult;
  } catch (error) {
    console.error(`[EducationNotification] Error sending ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function isPushFirstEnabled(companyId) {
  if (!companyId) return true;
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.company || typeof prisma.company.findUnique !== 'function') {
      return true;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company?.settings) return true;

    const parsed =
      typeof company.settings === 'string'
        ? JSON.parse(company.settings)
        : company.settings;

    return parsed?.educationSettings?.pushFirstSaveWhatsApp !== false;
  } catch (_) {
    // Fail open to true so push optimization remains resilient on transient read errors
    return true;
  }
}

async function sendEducationalEventWithPushRouting({
  companyId,
  actorType,
  actorId,
  eventType,
  title,
  templates,
  variables = {},
  recipientPhone,
  recipientName,
  recipientType = 'CUSTOMER',
  url = '/',
  pushFirst = true,
  forceWhatsApp = false,
}) {
  const renderedText = replaceVariables(resolveBaseTemplate(eventType, templates), variables);
  let pushResult = { attempted: 0, sent: 0, deliveredCount: 0, failed: 0 };

  if (actorType && actorId) {
    try {
      const browserPushService = require('./browserPushService');
      if (typeof browserPushService.sendToPortalActor === 'function') {
        const rawResult = await browserPushService.sendToPortalActor({
          companyId,
          actorType,
          actorId,
          typeId: eventType,
          title: title || 'إشعار تعليمي',
          body: renderedText || title || 'لديك إشعار جديد',
          url: url || '/',
          data: {
            eventType,
            ...(variables || {}),
          },
        });
        const deliveredCount = Number(rawResult?.deliveredCount ?? rawResult?.sent ?? 0);
        pushResult = {
          attempted: Number(rawResult?.attempted || 0),
          sent: Number(rawResult?.sent ?? deliveredCount),
          deliveredCount,
          failed: Number(rawResult?.failed || 0),
          webSent: Number(rawResult?.webSent || 0),
          fcmSent: Number(rawResult?.fcmSent || 0),
        };
      }
    } catch (pushError) {
      console.error(`[EducationPush] Error dispatching ${eventType}:`, pushError.message);
    }
  }

  if (pushFirst && !forceWhatsApp) {
    const usePushFirst = await isPushFirstEnabled(companyId);
    if (usePushFirst && pushResult.deliveredCount > 0) {
      try {
        const { logEducationEvent } = require('./educationAuditService');
        logEducationEvent({
          companyId,
          action: 'SEND_NOTIFICATION',
          entityType: 'NOTIFICATION',
          entityName: recipientName || recipientPhone || `${actorType}:${actorId}`,
          description: `إرسال إشعار تعليمي عبر Push (${eventType}) وتوفير رسالة واتساب`,
          details: {
            eventType,
            actorType,
            actorId,
            channel: 'PUSH',
            savedWhatsApp: true,
            deliveredCount: pushResult.deliveredCount,
            recipientType,
          },
          actorType: 'SYSTEM',
        }).catch((e) => console.error('[NotificationAudit]', e.message));
      } catch (_) {}

      return {
        success: true,
        channel: 'PUSH',
        savedWhatsApp: true,
        pushResult,
      };
    }

    if (!recipientPhone) {
      return {
        success: false,
        channel: 'PUSH',
        savedWhatsApp: false,
        pushResult,
        reason: 'no_recipient_phone',
      };
    }

    return sendEducationNotification({
      companyId,
      eventType,
      templates,
      variables,
      recipientPhone,
      recipientName,
      recipientType,
    });
  }

  let whatsappResult = null;
  if (recipientPhone) {
    whatsappResult = await sendEducationNotification({
      companyId,
      eventType,
      templates,
      variables,
      recipientPhone,
      recipientName,
      recipientType,
    });
  }

  return {
    success: Boolean(
      (whatsappResult && whatsappResult.success !== false) || pushResult.deliveredCount > 0
    ),
    channel:
      pushResult.deliveredCount > 0 && whatsappResult
        ? 'DUAL'
        : whatsappResult
          ? 'WHATSAPP'
          : 'PUSH',
    savedWhatsApp: false,
    pushResult,
    whatsappResult,
  };
}

async function notifyEnrollmentCreated(companyId, enrollment) {
  const prisma = getSharedPrismaClient();
  const student = await prisma.educationStudent.findUnique({ where: { id: enrollment.studentId }, include: { customer: true } });
  const pkg = await prisma.educationPackage.findUnique({ where: { id: enrollment.packageId }, include: { subject: true } });
  if (!student?.customer || !pkg) return;

  const vars = {
    parentName: student.customer.firstName || student.customer.lastName || 'وليّ الأمر',
    studentName: `${student.firstName} ${student.lastName}`,
    packageName: pkg.name || '',
    subjectName: pkg.subject?.name || '',
    totalHours: enrollment.totalHours,
    amountPaid: enrollment.amountPaid,
    currency: 'ج.م',
    parentPhone: student.customer.phone || '',
  };

  if (student.customerId || student.customer.id || student.customer.phone) {
    return sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'PARENT',
      actorId: student.customerId || student.customer.id,
      eventType: EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED,
      title: 'تم تأكيد الاشتراك بنجاح',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_CREATED].parent,
      variables: vars,
      recipientPhone: student.customer.phone,
      recipientName: vars.parentName,
      recipientType: 'CUSTOMER',
      url: '/parent/enrollments',
      pushFirst: false,
      forceWhatsApp: true,
    });
  }
}

async function hydrateEnrollment(prisma, companyId, enrollmentOrId) {
  if (
    enrollmentOrId &&
    typeof enrollmentOrId === 'object' &&
    enrollmentOrId.student &&
    (enrollmentOrId.student.customer || enrollmentOrId.student.customerId) &&
    enrollmentOrId.package
  ) {
    return enrollmentOrId;
  }

  const enrollmentId =
    typeof enrollmentOrId === 'string' ? enrollmentOrId : enrollmentOrId?.id;
  if (enrollmentId && prisma?.educationEnrollment?.findUnique) {
    const full = await prisma.educationEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { include: { customer: true } },
        package: { include: { subject: true } },
      },
    });
    if (full) return full;
  }

  if (enrollmentOrId && typeof enrollmentOrId === 'object' && enrollmentOrId.studentId && enrollmentOrId.packageId) {
    const [student, pkg] = await Promise.all([
      prisma?.educationStudent?.findUnique
        ? prisma.educationStudent.findUnique({ where: { id: enrollmentOrId.studentId }, include: { customer: true } })
        : null,
      prisma?.educationPackage?.findUnique
        ? prisma.educationPackage.findUnique({ where: { id: enrollmentOrId.packageId }, include: { subject: true } })
        : null,
    ]);
    return { ...enrollmentOrId, companyId, student, package: pkg };
  }

  return null;
}

async function notifyEnrollmentLowHours(companyId, enrollment) {
  const prisma = getSharedPrismaClient();
  const full = await hydrateEnrollment(prisma, companyId, enrollment);
  if (!full?.student) return;

  const customerId = full.student.customerId || full.student.customer?.id || null;
  const parentPhone = full.student.customer?.phone || null;
  if (!customerId && !parentPhone) return;

  const parentName =
    full.student.customer?.firstName || full.student.customer?.lastName || 'وليّ الأمر';
  const vars = {
    parentName,
    studentName: `${full.student.firstName || ''} ${full.student.lastName || ''}`.trim(),
    packageName: full.package?.name || '',
    subjectName: full.package?.subject?.name || full.package?.name || '',
    remainingHours: full.remainingHours ?? 0,
  };

  return sendEducationalEventWithPushRouting({
    companyId,
    actorType: 'PARENT',
    actorId: customerId,
    eventType: EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_LOW_HOURS,
    title: 'تنبيه: رصيد الساعات منخفض',
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_LOW_HOURS].parent,
    variables: vars,
    recipientPhone: parentPhone,
    recipientName: parentName,
    recipientType: 'CUSTOMER',
    url: '/parent/enrollments',
    pushFirst: false,
    forceWhatsApp: true,
  });
}

async function notifyEnrollmentExpiring(companyId, enrollment) {
  const prisma = getSharedPrismaClient();
  const full = await hydrateEnrollment(prisma, companyId, enrollment);
  if (!full?.student) return;

  const customerId = full.student.customerId || full.student.customer?.id || null;
  const parentPhone = full.student.customer?.phone || null;
  if (!customerId && !parentPhone) return;

  const parentName =
    full.student.customer?.firstName || full.student.customer?.lastName || 'وليّ الأمر';
  const vars = {
    parentName,
    studentName: `${full.student.firstName || ''} ${full.student.lastName || ''}`.trim(),
    packageName: full.package?.name || '',
    subjectName: full.package?.subject?.name || full.package?.name || '',
    remainingHours: full.remainingHours ?? 0,
    expiryDate: full.expiresAt
      ? new Date(full.expiresAt).toLocaleDateString('ar-EG')
      : '',
  };

  return sendEducationalEventWithPushRouting({
    companyId,
    actorType: 'PARENT',
    actorId: customerId,
    eventType: EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_EXPIRING,
    title: 'تنبيه: الباقة على وشك الانتهاء',
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.ENROLLMENT_EXPIRING].parent,
    variables: vars,
    recipientPhone: parentPhone,
    recipientName: parentName,
    recipientType: 'CUSTOMER',
    url: '/parent/enrollments',
    pushFirst: false,
    forceWhatsApp: true,
  });
}

async function notifyParentActivated({ companyId, customerId, parentPhone, parentName }) {
  if (!companyId || (!customerId && !parentPhone)) return null;

  const resolvedName = parentName || 'وليّ الأمر';
  return sendEducationalEventWithPushRouting({
    companyId,
    actorType: 'PARENT',
    actorId: customerId || null,
    eventType: EDUCATION_NOTIFICATION_EVENTS.PARENT_ACTIVATED,
    title: 'تم تفعيل حساب ولي الأمر',
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.PARENT_ACTIVATED].parent,
    variables: {
      parentName: resolvedName,
      parentPhone: parentPhone || '',
    },
    recipientPhone: parentPhone || null,
    recipientName: resolvedName,
    recipientType: 'CUSTOMER',
    url: '/parent',
    pushFirst: false,
    forceWhatsApp: true,
  });
}

async function notifySessionScheduled(companyId, session) {
  const full = await getSharedPrismaClient().educationSession.findUnique({
    where: { id: session.id },
    include: { student: { include: { customer: true } }, teacher: true, subject: true, enrollment: true },
  });
  if (!full) return;

  const d = new Date(full.scheduledAt);
  const vars = {
    parentName: full.student?.customer?.firstName || 'وليّ الأمر',
    studentName: `${full.student?.firstName || ''} ${full.student?.lastName || ''}`.trim(),
    subjectName: full.subject?.name || '',
    teacherName: full.teacher?.name || 'المدرس',
    sessionDate: d.toLocaleDateString('ar-EG'),
    sessionTime: d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    duration: full.plannedDuration,
  };

  const parentActorId = full.student?.customerId || full.student?.customer?.id || null;
  if (parentActorId || full.student?.customer?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'PARENT',
      actorId: parentActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      title: 'موعد حصة جديدة',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED].parent,
      variables: vars,
      recipientPhone: full.student?.customer?.phone,
      recipientName: vars.parentName,
      recipientType: 'CUSTOMER',
      url: '/parent/sessions',
      pushFirst: true,
    });
  }

  const teacherActorId = full.teacherId || full.teacher?.id || null;
  if (teacherActorId || full.teacher?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'TEACHER',
      actorId: teacherActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED,
      title: 'حصة جديدة في جدولك',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_SCHEDULED].teacher,
      variables: vars,
      recipientPhone: full.teacher?.phone,
      recipientName: full.teacher?.name || vars.teacherName,
      recipientType: 'EMPLOYEE',
      url: '/teacher/schedule',
      pushFirst: true,
    });
  }
}

async function notifySessionConfirmed(companyId, sessionId) {
  const full = await getSharedPrismaClient().educationSession.findUnique({
    where: { id: sessionId },
    include: { student: { include: { customer: true } }, subject: true, enrollment: true },
  });
  if (!full?.student) return;

  const parentActorId = full.student.customerId || full.student.customer?.id || null;
  const parentPhone = full.student.customer?.phone || null;
  if (!parentActorId && !parentPhone) return;

  const d = new Date(full.scheduledAt);
  const parentName = full.student?.customer?.firstName || 'وليّ الأمر';
  return sendEducationalEventWithPushRouting({
    companyId,
    actorType: 'PARENT',
    actorId: parentActorId,
    eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED,
    title: 'تم تأكيد الحصة',
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CONFIRMED].parent,
    variables: {
      parentName,
      studentName: `${full.student?.firstName || ''} ${full.student?.lastName || ''}`.trim(),
      subjectName: full.subject?.name || '',
      sessionDate: d.toLocaleDateString('ar-EG'),
      actualDuration: full.actualDuration || full.plannedDuration,
      remainingHours: full.enrollment?.remainingHours ?? 0,
    },
    recipientPhone: parentPhone,
    recipientName: parentName,
    recipientType: 'CUSTOMER',
    url: '/parent/sessions',
    pushFirst: true,
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
    parentName: full.student?.customer?.firstName || 'وليّ الأمر',
    studentName: `${full.student?.firstName || ''} ${full.student?.lastName || ''}`.trim(),
    subjectName: full.subject?.name || '',
    sessionDate: d.toLocaleDateString('ar-EG'),
  };

  const parentActorId = full.student?.customerId || full.student?.customer?.id || null;
  if (parentActorId || full.student?.customer?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'PARENT',
      actorId: parentActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
      title: 'تم إلغاء الحصة',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED].parent,
      variables: vars,
      recipientPhone: full.student?.customer?.phone,
      recipientName: vars.parentName,
      recipientType: 'CUSTOMER',
      url: '/parent/sessions',
      pushFirst: true,
    });
  }

  const teacherActorId = full.teacherId || full.teacher?.id || null;
  if (teacherActorId || full.teacher?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'TEACHER',
      actorId: teacherActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED,
      title: 'تم إلغاء الحصة',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_CANCELLED].teacher,
      variables: vars,
      recipientPhone: full.teacher?.phone,
      recipientName: full.teacher?.name,
      recipientType: 'EMPLOYEE',
      url: '/teacher/schedule',
      pushFirst: true,
    });
  }
}

async function notifySessionReminder(companyId, sessionOrId) {
  const prisma = getSharedPrismaClient();
  let full = null;

  if (sessionOrId && typeof sessionOrId === 'object' && sessionOrId.student && sessionOrId.subject) {
    full = sessionOrId;
  } else {
    const targetId = typeof sessionOrId === 'string' ? sessionOrId : sessionOrId?.id;
    if (!targetId) return;
    full = await prisma.educationSession.findUnique({
      where: { id: targetId },
      include: { student: { include: { customer: true } }, teacher: true, subject: true },
    });
  }

  if (!full) return;

  const d = new Date(full.scheduledAt);
  const vars = {
    parentName: full.student?.customer?.firstName || 'وليّ الأمر',
    studentName: `${full.student?.firstName || ''} ${full.student?.lastName || ''}`.trim(),
    subjectName: full.subject?.name || '',
    teacherName: full.teacher?.name || 'المدرس',
    sessionDate: d.toLocaleDateString('ar-EG'),
    sessionTime: d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
  };

  const parentActorId = full.student?.customerId || full.student?.customer?.id || null;
  if (parentActorId || full.student?.customer?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'PARENT',
      actorId: parentActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER,
      title: 'تذكير بموعد الحصة',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER].parent,
      variables: vars,
      recipientPhone: full.student?.customer?.phone,
      recipientName: vars.parentName,
      recipientType: 'CUSTOMER',
      url: '/parent/sessions',
      pushFirst: true,
    });
  }

  const teacherActorId = full.teacherId || full.teacher?.id || null;
  if (teacherActorId || full.teacher?.phone) {
    await sendEducationalEventWithPushRouting({
      companyId,
      actorType: 'TEACHER',
      actorId: teacherActorId,
      eventType: EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER,
      title: 'تذكير بموعد الحصة',
      templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.SESSION_REMINDER].teacher,
      variables: vars,
      recipientPhone: full.teacher?.phone,
      recipientName: full.teacher?.name || vars.teacherName,
      recipientType: 'EMPLOYEE',
      url: '/teacher/schedule',
      pushFirst: true,
    });
  }
}

async function notifyDemoDayRegistered({ companyId, demoDay, attendee, leadSource = 'WHATSAPP' }) {
  if (!demoDay || !attendee || !attendee.phone) return null;

  const dateObj = new Date(demoDay.scheduledAt);
  const eventDate = dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const eventTime = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const location = demoDay.locationType === 'ONLINE'
    ? (demoDay.meetingLink || 'رابط الحضور أونلاين (يُرسل قبل الموعد)')
    : (demoDay.room ? `فرع المركز — قاعة ${demoDay.room}` : 'مقر المركز الرئيسي');

  const vars = {
    parentName: attendee.guardianName || attendee.studentName || 'ولي الأمر',
    studentName: attendee.studentName || 'الطالب',
    eventTitle: demoDay.title || 'ديمو داي وورشة العمل',
    eventDate,
    eventTime,
    eventLocation: location,
    meetLink: demoDay.meetingLink || location,
    parentPhone: attendee.phone,
    age: attendee.age ? `${attendee.age} سنة` : 'غير محدد',
    leadSource: leadSource || 'محادثة',
  };

  // 1. Send to parent via WhatsApp
  const parentResult = await sendEducationNotification({
    companyId,
    eventType: EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REGISTERED,
    templates: NOTIFICATION_TEMPLATES[EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REGISTERED].parent,
    variables: vars,
    recipientPhone: attendee.phone,
    recipientName: vars.parentName,
    recipientType: 'CUSTOMER',
  }).catch((e) => console.warn('[DemoDayNotify] Parent error:', e.message));

  return parentResult;
}

async function notifyDemoDayReminder({ companyId, demoDay, attendee, type = '24h' }) {
  if (!demoDay || !attendee || !attendee.phone) return null;

  const eventType = type === '2h'
    ? EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REMINDER_2H
    : EDUCATION_NOTIFICATION_EVENTS.DEMO_DAY_REMINDER_24H;

  const dateObj = new Date(demoDay.scheduledAt);
  const eventDate = dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const eventTime = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const location = demoDay.locationType === 'ONLINE'
    ? (demoDay.meetingLink || 'رابط الاجتماع')
    : (demoDay.room ? `فرع المركز — قاعة ${demoDay.room}` : 'مقر المركز الرئيسي');

  const vars = {
    parentName: attendee.guardianName || attendee.studentName || 'ولي الأمر',
    studentName: attendee.studentName || 'الطالب',
    eventTitle: demoDay.title || 'ورشة العمل',
    eventDate,
    eventTime,
    eventLocation: location,
    meetLink: demoDay.meetingLink || location,
    parentPhone: attendee.phone,
  };

  return sendEducationNotification({
    companyId,
    eventType,
    templates: NOTIFICATION_TEMPLATES[eventType].parent,
    variables: vars,
    recipientPhone: attendee.phone,
    recipientName: vars.parentName,
    recipientType: 'CUSTOMER',
  });
}

async function getFunnelStats(companyId, options = {}) {
  const { period = 'all' } = options;
  const prisma = getSharedPrismaClient();

  let dateFilter = undefined;
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateFilter = { gte: start };
  } else if (period === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFilter = { gte: start };
  } else if (period === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFilter = { gte: start };
  }

  const customerWhere = { companyId, status: { not: 'BLOCKED' } };
  const studentWhere = { companyId, isActive: true };
  const enrollmentWhere = { companyId };
  const sessionWhere = { companyId };
  const confirmedWhere = { companyId, status: 'CONFIRMED' };
  const scheduledWhere = { companyId, status: 'SCHEDULED' };

  if (dateFilter) {
    customerWhere.createdAt = dateFilter;
    studentWhere.createdAt = dateFilter;
    enrollmentWhere.createdAt = dateFilter;
    sessionWhere.scheduledAt = dateFilter;
    confirmedWhere.scheduledAt = dateFilter;
    scheduledWhere.scheduledAt = dateFilter;
  }

  const totalCustomers = await prisma.customer.count({ where: customerWhere });
  const totalStudents = await prisma.educationStudent.count({ where: studentWhere });
  const totalEnrollments = await prisma.educationEnrollment.count({ where: enrollmentWhere });
  const totalSessions = await prisma.educationSession.count({ where: sessionWhere });
  const confirmedSessions = await prisma.educationSession.count({ where: confirmedWhere });
  const scheduledSessions = await prisma.educationSession.count({ where: scheduledWhere });

  // Demo Day funnel stats
  let totalDemoAttendees = 0;
  let attendedDemoAttendees = 0;
  let convertedDemoAttendees = 0;
  try {
    const demoAttWhere = { companyId };
    if (dateFilter) demoAttWhere.createdAt = dateFilter;
    totalDemoAttendees = await prisma.educationDemoAttendee.count({ where: demoAttWhere });
    attendedDemoAttendees = await prisma.educationDemoAttendee.count({
      where: { ...demoAttWhere, attendanceStatus: 'ATTENDED' },
    });
    convertedDemoAttendees = await prisma.educationDemoAttendee.count({
      where: { ...demoAttWhere, conversionStatus: 'CONVERTED' },
    });
  } catch (_) {}

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
    period,
    funnel: {
      totalCustomers,
      totalStudents,
      totalEnrollments,
      scheduledSessions,
      confirmedSessions,
      totalDemoAttendees,
      attendedDemoAttendees,
      convertedDemoAttendees,
    },
    conversion: {
      customersToStudents: totalCustomers > 0 ? ((totalStudents / totalCustomers) * 100).toFixed(1) : '0.0',
      studentsToEnrollments: totalStudents > 0 ? ((totalEnrollments / totalStudents) * 100).toFixed(1) : '0.0',
      completionRate: totalSessions > 0 ? ((confirmedSessions / totalSessions) * 100).toFixed(1) : '0.0',
      demoAttendanceRate: totalDemoAttendees > 0 ? ((attendedDemoAttendees / totalDemoAttendees) * 100).toFixed(1) : '0.0',
      demoConversionRate: attendedDemoAttendees > 0 ? ((convertedDemoAttendees / attendedDemoAttendees) * 100).toFixed(1) : (totalDemoAttendees > 0 ? ((convertedDemoAttendees / totalDemoAttendees) * 100).toFixed(1) : '0.0'),
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
  isPushFirstEnabled,
  sendEducationalEventWithPushRouting,
  notifyEnrollmentCreated,
  notifyEnrollmentLowHours,
  notifyEnrollmentExpiring,
  notifySessionScheduled,
  notifySessionConfirmed,
  notifySessionCancelled,
  notifySessionReminder,
  notifyParentActivated,
  notifyDemoDayRegistered,
  notifyDemoDayReminder,
  getFunnelStats,
  sendEducationNotification,
};
