const { getSharedPrismaClient } = require('./sharedDatabase');
const { parseSettingValue } = require('../utils/dentalLabHelpers');

const DENTAL_NOTIFICATION_EVENTS = {
  CASE_RECEIVED: 'DENTAL_CASE_RECEIVED',
  CASE_READY: 'DENTAL_CASE_READY',
  CASE_DELIVERED: 'DENTAL_CASE_DELIVERED',
  CASE_OVERDUE: 'DENTAL_CASE_OVERDUE',
  MONTHLY_BILLING_REMINDER: 'DENTAL_MONTHLY_BILLING_REMINDER',
};

const DEFAULT_TEMPLATES = {
  [DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED]: `أهلاً {doctorName} 👋

تم استلام حالتكم الجديدة بنجاح ✅

📋 رقم الحالة: {caseNumber}
🦷 المريض: {patientName}
🔬 نوع الشغل: {workType}
🎨 اللون: {shade}
🦷 الأسنان: {teeth}
🧱 الخامة: {material}
📅 تاريخ الاستحقاق: {dueDate}

💰 الإجمالي: {totalAmount} ج.م
💵 المدفوع: {paidAmount} ج.م
🧾 المتبقي: {remainingAmount} ج.م

سنبدأ العمل على الحالة فوراً وسنخطركم فور تجهيزها 🌟`,

  [DENTAL_NOTIFICATION_EVENTS.CASE_READY]: `أهلاً {doctorName} 👋

حالتك جاهزة للتسليم ✅

📋 رقم الحالة: {caseNumber}
🦷 المريض: {patientName}
🔬 نوع الشغل: {workType}
🎨 اللون: {shade}
🦷 الأسنان: {teeth}
🧱 الخامة: {material}

📞 يرجى التفضل باستلام الحالة من المعمل في أقرب وقت.

💰 الإجمالي: {totalAmount} ج.م
💵 المدفوع: {paidAmount} ج.م
🧾 المتبقي: {remainingAmount} ج.م

نشكرك لثقتك في معملنا 🌟`,

  [DENTAL_NOTIFICATION_EVENTS.CASE_DELIVERED]: `تم تسليم الحالة ✅

أهلاً {doctorName}، تم تسليم الحالة رقم {caseNumber} للمريض {patientName}.

🔬 نوع الشغل: {workType}
🎨 اللون: {shade}
🦷 الأسنان: {teeth}
🧱 الخامة: {material}

💰 الإجمالي: {totalAmount} ج.م
💵 المدفوع: {paidAmount} ج.م
🧾 المتبقي: {remainingAmount} ج.م

نتشرف بخدمتكم دائماً 🌟`,

  [DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE]: `تأخير الحالة ⏰

أهلاً {doctorName}، نود إعلامكم بأن الحالة رقم {caseNumber} للمريض {patientName} قد تأخرت عن موعد الاستحقاق المحدد يوم {dueDate}.

🔬 نوع الشغل: {workType}
🦷 الأسنان: {teeth}

جاري العمل عليها بأقصى سرعة لإنجازها في أقرب وقت. نعتذر عن أي تأخير ونشكرك على تفهمك 🌟`,

  [DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER]: `📅 تنبيه دورة الفوترة الشهرية

أهلاً د. {doctorName} 👋

نود تذكيركم بإغلاق دورة الفوترة الشهرية لحالاتكم المكتملة في المعمل بإجمالي {totalAmount} ج.م.

شاكرين تعاونكم وثقتكم المستمرة 🌟`,
};

const SCHEDULE_KEY = 'notificationSchedule';

const DEFAULT_SCHEDULE = [
  { eventType: DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'استلام الحالة', trigger: 'case_received' },
  { eventType: DENTAL_NOTIFICATION_EVENTS.CASE_READY, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'الحالة جاهزة', trigger: 'case_ready' },
  { eventType: DENTAL_NOTIFICATION_EVENTS.CASE_DELIVERED, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'تم التسليم', trigger: 'case_delivered' },
  { eventType: DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'تأخير الحالة', trigger: 'case_overdue' },
  { eventType: DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS', label: 'تنبيه الفوترة الشهرية', trigger: 'billing_cycle' },
];

const TEMPLATE_NAMES = {
  [DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED]: 'استلام الحالة',
  [DENTAL_NOTIFICATION_EVENTS.CASE_READY]: 'الحالة جاهزة',
  [DENTAL_NOTIFICATION_EVENTS.CASE_DELIVERED]: 'تم تسليم الحالة',
  [DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE]: 'تأخير الحالة',
  [DENTAL_NOTIFICATION_EVENTS.MONTHLY_BILLING_REMINDER]: 'تنبيه الفوترة الشهرية',
};

function replaceVariables(template, vars) {
  let text = template || '';
  for (const [key, val] of Object.entries(vars || {})) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
  }
  return text;
}

function buildVars(caseRow) {
  const c = caseRow || {};
  const formatDate = (value) => {
    if (!value) return '';
    return value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0];
  };
  const money = (value) => String(Math.round(Number(value) || 0));
  return {
    doctorName: c.doctorName || (c.doctor && c.doctor.name) || '',
    caseNumber: c.caseNumber || '',
    patientName: c.patientName || '',
    workType: c.workTypeName || '',
    shade: c.shade || '',
    teeth: c.teeth || '',
    material: c.material || '',
    dueDate: formatDate(c.dueDate),
    totalAmount: money(c.total),
    paidAmount: money(c.paid),
    remainingAmount: money(c.remaining),
  };
}

function mergeSchedule(stored) {
  return DEFAULT_SCHEDULE.map((def) => {
    const existing = (Array.isArray(stored) ? stored : []).find((s) => s && s.eventType === def.eventType);
    return existing ? { ...def, ...existing } : { ...def };
  });
}

async function ensureDefaultTemplates(companyId) {
  try {
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const model = prisma && (prisma.whatsAppNotificationTemplate || prisma.notificationTemplate);
    if (!model || typeof model.findMany !== 'function') return;
    const existing = await model.findMany({
      where: { companyId, category: 'DENTAL_LAB' },
    });
    const byEvent = new Set((existing || []).map((t) => t.eventType));
    for (const eventType of Object.values(DENTAL_NOTIFICATION_EVENTS)) {
      if (byEvent.has(eventType)) continue;
      await model.create({
        data: {
          companyId,
          name: TEMPLATE_NAMES[eventType] || eventType,
          category: 'DENTAL_LAB',
          eventType,
          content: DEFAULT_TEMPLATES[eventType] || '',
          channel: 'AUTO',
          isActive: true,
          isDefault: false,
        },
      });
    }
  } catch (error) {
    console.error(`[DentalNotification] ensureDefaultTemplates error:`, error.message);
  }
}

async function getNotificationSchedule(companyId) {
  try {
    if (!companyId) return [];
    await ensureDefaultTemplates(companyId);
    const prisma = getSharedPrismaClient();
    if (!prisma || !prisma.dentalSetting || (typeof prisma.dentalSetting.findFirst !== 'function' && typeof prisma.dentalSetting.findMany !== 'function')) {
      return mergeSchedule([]);
    }
    const finder = typeof prisma.dentalSetting.findFirst === 'function'
      ? prisma.dentalSetting.findFirst.bind(prisma.dentalSetting)
      : async ({ where }) => {
          const rows = await prisma.dentalSetting.findMany({ where: { companyId: where.companyId } });
          return rows.find((r) => r.key === where.key) || null;
        };
    let row = await finder({ where: { companyId, key: SCHEDULE_KEY } });
    if (!row && typeof prisma.dentalSetting.upsert === 'function') {
      row = await prisma.dentalSetting.upsert({
        where: { companyId_key: { companyId, key: SCHEDULE_KEY } },
        update: { value: DEFAULT_SCHEDULE },
        create: { companyId, key: SCHEDULE_KEY, value: DEFAULT_SCHEDULE },
      });
    }
    const stored = parseSettingValue(row);
    return mergeSchedule(stored);
  } catch (error) {
    console.error(`[DentalNotification] getNotificationSchedule error:`, error.message);
    return mergeSchedule([]);
  }
}

async function saveNotificationSchedule(companyId, patch) {
  try {
    if (!companyId || !patch || !patch.eventType) return mergeSchedule([]);
    const prisma = getSharedPrismaClient();
    const row = await prisma.dentalSetting.findFirst({ where: { companyId, key: SCHEDULE_KEY } });
    const stored = row ? parseSettingValue(row) : null;
    let schedule = Array.isArray(stored) ? stored.map((s) => ({ ...s })) : DEFAULT_SCHEDULE.map((s) => ({ ...s }));

    const index = schedule.findIndex((s) => s && s.eventType === patch.eventType);
    const mergedPatch = {
      eventType: patch.eventType,
      enabled: patch.enabled !== undefined && patch.enabled !== null ? patch.enabled : true,
      activeChannel: patch.activeChannel || 'AUTO',
      delayValue: Number.isFinite(Number(patch.delayValue)) ? Number(patch.delayValue) : 0,
      delayUnit: patch.delayUnit || 'HOURS',
    };
    if (index === -1) {
      const def = DEFAULT_SCHEDULE.find((s) => s.eventType === patch.eventType) || {};
      schedule.push({ ...def, ...mergedPatch });
    } else {
      schedule[index] = { ...schedule[index], ...mergedPatch };
    }

    schedule = mergeSchedule(schedule);
    await prisma.dentalSetting.upsert({
      where: { companyId_key: { companyId, key: SCHEDULE_KEY } },
      update: { value: schedule },
      create: { companyId, key: SCHEDULE_KEY, value: schedule },
    });
    return schedule;
  } catch (error) {
    console.error(`[DentalNotification] saveNotificationSchedule error:`, error.message);
    return mergeSchedule([]);
  }
}

async function sendDentalNotification({ companyId, eventType, caseRow, doctor }) {
  try {
    const schedule = await getNotificationSchedule(companyId);
    const event = (Array.isArray(schedule) ? schedule : []).find((s) => s && s.eventType === eventType);
    if (!event || event.enabled === false) return { success: false, reason: 'disabled' };

    const phone = (doctor && doctor.phone) || (caseRow && caseRow.doctor && caseRow.doctor.phone);
    if (!phone) return { success: false, reason: 'no_phone' };

    const vars = buildVars(caseRow);
    const prisma = getSharedPrismaClient();
    let stored = null;
    if (prisma && prisma.whatsappNotificationTemplate && typeof prisma.whatsappNotificationTemplate.findFirst === 'function') {
      try {
        stored = await prisma.whatsappNotificationTemplate.findFirst({
          where: { companyId, eventType, category: 'DENTAL_LAB', isActive: true },
          select: { id: true, content: true },
        });
      } catch (error) {
        stored = null;
      }
    }

    const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
    const sendOptions = {
      companyId,
      recipientPhone: phone,
      recipientName: (doctor && doctor.name) || 'الدكتور العزيز',
      recipientType: 'CUSTOMER',
      category: 'CUSTOMER',
      eventType,
      orderId: (caseRow && caseRow.id) || null,
      priority: 4,
    };
    if (stored && stored.content) {
      // استخدم القالب المخزن الفعلي (قابل للتعديل من الإعدادات/TemplateCenter)
      sendOptions.variables = vars;
    } else {
      // لا يوجد قالب مخزن — احتياطي من القوالب الافتراضية
      sendOptions.variables = { ...vars, contentOverride: replaceVariables(DEFAULT_TEMPLATES[eventType] || '', vars) };
    }
    return await sendNotification(sendOptions);
  } catch (error) {
    console.error(`[DentalNotification] sendDentalNotification error (${eventType}):`, error.message);
    return { success: false, error: error.message };
  }
}

async function loadCaseForNotification(caseId) {
  const prisma = getSharedPrismaClient();
  if (!prisma || !prisma.dentalLabCase) return null;
  const finder = typeof prisma.dentalLabCase.findUnique === 'function'
    ? prisma.dentalLabCase.findUnique.bind(prisma.dentalLabCase)
    : prisma.dentalLabCase.findFirst.bind(prisma.dentalLabCase);
  const dentalCase = await finder({
    where: { id: caseId },
    include: { doctor: { select: { id: true, name: true, phone: true } } },
  }).catch(() => null);
  if (!dentalCase) return null;
  return { caseRow: dentalCase, doctor: dentalCase.doctor || null };
}

async function notifyCaseEvent(caseId, eventType) {
  try {
    const ctx = await loadCaseForNotification(caseId);
    if (!ctx) return { success: false, reason: 'not_found' };

    // P7: إذا كان إشعار المريض مفعل في السياسات مع وجود رقم صالح للمريض
    try {
      const { getLabPolicies } = require('./dentalAssignmentService');
      const policies = await getLabPolicies(getSharedPrismaClient(), ctx.caseRow.companyId);
      if (policies.notify?.patientEnabled && ctx.caseRow.patientPhone) {
        const patientPhone = String(ctx.caseRow.patientPhone).trim();
        const egRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
        if (egRegex.test(patientPhone)) {
          return await sendDentalNotification({
            companyId: ctx.caseRow.companyId,
            eventType,
            caseRow: ctx.caseRow,
            doctor: {
              name: ctx.caseRow.patientName || 'المريض العزيز',
              phone: patientPhone,
            },
          });
        }
      }
    } catch (polErr) {
      console.warn('[DentalNotification] Could not check patient notify policy:', polErr.message);
    }

    return sendDentalNotification({
      companyId: ctx.caseRow.companyId,
      eventType,
      caseRow: ctx.caseRow,
      doctor: ctx.doctor,
    });
  } catch (error) {
    console.error(`[DentalNotification] notifyCaseEvent error (${eventType}):`, error.message);
    return { success: false, error: error.message };
  }
}

async function notifyCaseReceived(caseId) {
  return notifyCaseEvent(caseId, DENTAL_NOTIFICATION_EVENTS.CASE_RECEIVED);
}

async function notifyCaseReady(caseId) {
  return notifyCaseEvent(caseId, DENTAL_NOTIFICATION_EVENTS.CASE_READY);
}

async function notifyCaseDelivered(caseId) {
  return notifyCaseEvent(caseId, DENTAL_NOTIFICATION_EVENTS.CASE_DELIVERED);
}

async function notifyCaseOverdue(caseId) {
  return notifyCaseEvent(caseId, DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE);
}

async function scanOverdueCases(companyId = null) {
  const prisma = getSharedPrismaClient();
  const where = {
    dueDate: { lt: new Date() },
    status: { notIn: ['DELIVERED', 'CLOSED'] },
    isDeleted: false,
  };
  if (companyId) where.companyId = companyId;

  let cases = [];
  try {
    cases = await prisma.dentalLabCase.findMany({
      where,
      include: { doctor: { select: { id: true, name: true, phone: true } } },
    });
  } catch (error) {
    console.error(`[DentalNotification] scanOverdueCases query error:`, error.message);
    return { scanned: 0, sent: 0, failed: 0, skipped: 0, error: error.message };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let internalNotifsCreated = 0;

  for (const dentalCase of cases || []) {
    try {
      // 1) إنشاء إشعار داخلي في المنصة (In-App Notification) لفريق المعمل والإدارة
      if (prisma && prisma.notification && typeof prisma.notification.create === 'function' && dentalCase.companyId) {
        try {
          const docName = dentalCase.doctorName || (dentalCase.doctor && dentalCase.doctor.name) || 'غير محدد';
          const patName = dentalCase.patientName || 'غير محدد';
          const cNum = dentalCase.caseNumber || dentalCase.id;
          const daysOverdue = dentalCase.dueDate
            ? Math.max(1, Math.floor((Date.now() - new Date(dentalCase.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 1;

          // التحقق من عدم تكرار الإشعار الداخلي لنفس الحالة
          const existingInternal = await prisma.notification.findFirst({
            where: {
              companyId: dentalCase.companyId,
              type: 'DENTAL_CASE_OVERDUE',
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // مرة كل 24 ساعة كحد أقصى
              message: { contains: cNum },
            },
          }).catch(() => null);

          if (!existingInternal) {
            await prisma.notification.create({
              data: {
                companyId: dentalCase.companyId,
                title: `⚠️ تأخير حالة معمل: ${cNum}`,
                message: `الحالة رقم ${cNum} للمريض (${patName}) - د. ${docName} متأخرة ${daysOverdue} يوم عن موعد التسليم.`,
                type: 'DENTAL_CASE_OVERDUE',
                data: {
                  caseId: dentalCase.id,
                  caseNumber: cNum,
                  patientName: patName,
                  doctorName: docName,
                  dueDate: dentalCase.dueDate,
                  daysOverdue,
                  url: `/dental-lab/cases/${dentalCase.id}`,
                },
              },
            });
            internalNotifsCreated++;
          }
        } catch (inAppErr) {
          console.error(`[DentalNotification] in-app notification error for case ${dentalCase.id}:`, inAppErr.message);
        }
      }

      // 2) إرسال إشعار الواتساب للطبيب (إن كان مفعلاً)
      const already = await prisma.dentalCaseStatusHistory.findFirst({
        where: {
          companyId: dentalCase.companyId,
          caseId: dentalCase.id,
          dimension: 'NOTIFICATION',
          status: 'OVERDUE_NOTIFIED',
        },
        select: { id: true },
      });
      if (already) {
        skipped++;
        continue;
      }
      const result = await notifyCaseOverdue(dentalCase.id);
      if (result && result.success) {
        await prisma.dentalCaseStatusHistory.create({
          data: {
            companyId: dentalCase.companyId,
            caseId: dentalCase.id,
            dimension: 'NOTIFICATION',
            status: 'OVERDUE_NOTIFIED',
            reason: 'تجاوز تاريخ الاستحقاق',
          },
        });
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.error(`[DentalNotification] scanOverdueCases case ${dentalCase.id}:`, error.message);
    }
  }

  return { scanned: (cases || []).length, sent, failed, skipped, internalNotifsCreated };
}

/**
 * تذكير تحصيل تلقائي (Dunning): يرسل للطبيب رسالة على الفواتير المتبقي عليها مستحقات
 * تجاوزت عدد الأيام المحدد. يعمل مرة واحدة لكل فاتورة (يتتبع المُرسَل في settings).
 */
async function runDunningCheck(companyId) {
  const prisma = getSharedPrismaClient();
  try {
    const settingRows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const merged = {};
    for (const row of settingRows || []) {
      if (row && row.key) merged[row.key] = parseSettingValue(row);
    }
    const cfg = (merged.notifications && typeof merged.notifications === 'object' ? merged.notifications : {});
    const enabled = cfg.dunningEnabled === true;
    if (!enabled) return { enabled: false, scanned: 0, sent: 0, skipped: 0 };
    const agingDays = Number(cfg.dunningAgingDays) || 15;

    const cutoff = new Date(Date.now() - agingDays * 86400000);
    const invoices = await prisma.dentalInvoice.findMany({
      where: {
        companyId,
        status: { in: ['OPEN', 'PARTIAL'] },
        doctorId: { not: null },
      },
      include: {
        doctor: { select: { id: true, name: true, phone: true } },
        case: { select: { id: true, caseNumber: true, patientName: true, workTypeName: true } },
      },
    });

    const sentState = (merged.dunningSent && typeof merged.dunningSent === 'object' ? merged.dunningSent : {});
    const sentMap = sentState.map && typeof sentState.map === 'object' ? { ...sentState.map } : {};
    // Backward compatibility with legacy array
    if (Array.isArray(sentState.ids)) {
      for (const id of sentState.ids) {
        if (!sentMap[id]) sentMap[id] = Date.now();
      }
    }

    const intervalMs = agingDays * 86400000;
    const now = Date.now();

    let sent = 0;
    let skipped = 0;
    for (const inv of invoices || []) {
      const remaining = Number(inv.remaining) || 0;
      const overdue = inv.dueDate && new Date(inv.dueDate) < cutoff;
      if (remaining <= 0 || !overdue) { skipped++; continue; }

      // إذا تم إرسال تذكير مؤخراً (خلال فترة agingDays)، تخطّ الإرسال
      const lastSentAt = sentMap[inv.id] ? Number(sentMap[inv.id]) : 0;
      if (lastSentAt > 0 && (now - lastSentAt) < intervalMs) { skipped++; continue; }

      const phone = inv.doctor && inv.doctor.phone;
      if (!phone) { skipped++; continue; }

      const vars = {
        doctorName: (inv.doctor && inv.doctor.name) || 'الدكتور العزيز',
        caseNumber: inv.caseNumber || (inv.case && inv.case.caseNumber) || '—',
        patientName: (inv.case && inv.case.patientName) || '—',
        workType: (inv.case && inv.case.workTypeName) || '—',
        totalAmount: inv.total,
        paidAmount: inv.paid,
        remainingAmount: remaining,
      };
      const { sendNotification } = require('./whatsapp/WhatsAppNotificationService');
      const result = await sendNotification({
        companyId,
        recipientPhone: phone,
        recipientName: vars.doctorName,
        recipientType: 'CUSTOMER',
        category: 'CUSTOMER',
        eventType: DENTAL_NOTIFICATION_EVENTS.CASE_OVERDUE,
        priority: 4,
        variables: vars,
      });
      if (result && result.success) {
        sent++;
        sentMap[inv.id] = now;
      }
    }

    if (sent > 0) {
      const next = { map: sentMap, lastRun: now };
      await prisma.dentalSetting.upsert({
        where: { companyId_key: { companyId, key: 'dunningSent' } },
        update: { value: next },
        create: { companyId, key: 'dunningSent', value: next },
      });
    }
    return { enabled: true, scanned: (invoices || []).length, sent, skipped };
  } catch (error) {
    console.error('[DentalNotification] runDunningCheck error:', error.message);
    return { enabled: true, error: error.message };
  }
}

async function scanUninvoicedBillingCycle(companyId = null, options = {}) {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const dayOfMonth = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const isBillingWindow = options.force || dayOfMonth >= Math.min(30, lastDayOfMonth) || dayOfMonth <= 5;
  if (!isBillingWindow) {
    return { enabled: true, isBillingWindow: false, message: 'خارج نافذة دورة الفوترة الشهرية' };
  }

  const dayOfGrace = dayOfMonth <= 5 ? dayOfMonth : 0;

  const where = {
    status: { in: ['READY', 'DELIVERED', 'COMPLETED'] },
    isDeleted: false,
    invoices: { none: {} },
  };
  if (companyId) where.companyId = companyId;

  try {
    const uninvoicedCases = await prisma.dentalLabCase.findMany({
      where,
      include: {
        doctor: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!uninvoicedCases || uninvoicedCases.length === 0) {
      return { enabled: true, isBillingWindow: true, uninvoicedCount: 0, uninvoicedTotal: 0, internalNotifsCreated: 0 };
    }

    const byCompany = {};
    for (const c of uninvoicedCases) {
      const cid = c.companyId;
      if (!cid) continue;
      if (!byCompany[cid]) byCompany[cid] = [];
      byCompany[cid].push(c);
    }

    let internalNotifsCreated = 0;

    for (const [cid, cases] of Object.entries(byCompany)) {
      const doctorsSet = new Set(cases.map((c) => c.doctorId).filter(Boolean));
      const doctorsCount = doctorsSet.size || 1;
      const totalAmount = Math.round(cases.reduce((sum, c) => sum + (Number(c.total) || 0), 0));
      const casesCount = cases.length;

      if (prisma && prisma.notification && typeof prisma.notification.create === 'function') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingNotif = await prisma.notification.findFirst({
          where: {
            companyId: cid,
            type: 'DENTAL_MONTHLY_BILLING_REMINDER',
            createdAt: { gte: startOfToday },
          },
        }).catch(() => null);

        if (!existingNotif) {
          const dayLabel = dayOfGrace === 0 ? 'يوم الفوترة (30 في الشهر)' : `اليوم ${dayOfGrace} من 5 في مهلة الفوترة`;
          await prisma.notification.create({
            data: {
              companyId: cid,
              title: `📅 دورة الفوترة الشهرية (${dayLabel})`,
              message: `تنبيه الفوترة: يوجد ${casesCount} حالة غير مفوترة لـ ${doctorsCount} طبيب بقيمة إجمالية ${totalAmount} ج.م بانتظار إصدار الفواتير.`,
              type: 'DENTAL_MONTHLY_BILLING_REMINDER',
              data: {
                uninvoicedCount: casesCount,
                uninvoicedTotal: totalAmount,
                doctorsCount,
                dayOfGrace,
                maxGraceDays: 5,
                url: '/dental-lab/invoices?tab=uninvoiced',
              },
            },
          }).catch((err) => console.error('[DentalNotification] billing notification create error:', err.message));
          internalNotifsCreated++;
        }
      }
    }

    return {
      enabled: true,
      isBillingWindow: true,
      dayOfGrace,
      uninvoicedCount: uninvoicedCases.length,
      internalNotifsCreated,
    };
  } catch (error) {
    console.error('[DentalNotification] scanUninvoicedBillingCycle error:', error.message);
    return { enabled: true, error: error.message };
  }
}

async function cancelPendingNotificationsForCase(companyId, caseIdOrIds) {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma || !prisma.whatsAppNotificationQueue) return;
    const ids = Array.isArray(caseIdOrIds) ? caseIdOrIds : [caseIdOrIds];
    if (ids.length === 0) return;
    await prisma.whatsAppNotificationQueue.updateMany({
      where: {
        companyId,
        orderId: { in: ids },
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  } catch (error) {
    console.error('[DentalNotification] cancelPendingNotificationsForCase error:', error.message);
  }
}

async function cancelPendingNotificationsForDoctor(companyId, doctorPhone) {
  try {
    if (!doctorPhone) return;
    const prisma = getSharedPrismaClient();
    if (!prisma || !prisma.whatsAppNotificationQueue) return;
    const { formatPhoneNumber } = require('./whatsapp/WhatsAppNotificationService');
    const formatted = formatPhoneNumber ? formatPhoneNumber(doctorPhone) : String(doctorPhone).trim();
    await prisma.whatsAppNotificationQueue.updateMany({
      where: {
        companyId,
        recipientPhone: formatted,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  } catch (error) {
    console.error('[DentalNotification] cancelPendingNotificationsForDoctor error:', error.message);
  }
}

module.exports = {
  DENTAL_NOTIFICATION_EVENTS,
  DEFAULT_TEMPLATES,
  buildVars,
  getNotificationSchedule,
  saveNotificationSchedule,
  ensureDefaultTemplates,
  sendDentalNotification,
  notifyCaseReceived,
  notifyCaseReady,
  notifyCaseDelivered,
  notifyCaseOverdue,
  scanOverdueCases,
  scanUninvoicedBillingCycle,
  runDunningCheck,
  cancelPendingNotificationsForCase,
  cancelPendingNotificationsForDoctor,
};