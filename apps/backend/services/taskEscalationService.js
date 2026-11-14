const { getSharedPrismaClient } = require('./sharedDatabase');
const taskNotificationService = require('./taskNotificationService');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_SNOOZE_DAYS = 30;
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

const DEFAULT_ESCALATION_SETTINGS = {
  enabled: true,
  level1Days: 0,
  level2Days: 1,
  level3Days: 3,
  channels: {
    inApp: true,
    push: true,
    whatsapp: true,
  },
  notifyManager: true,
  notifyOwner: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'Africa/Cairo',
  },
  updatedBy: null,
  updatedAt: null,
};

function parsePositiveOrZeroInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) return fallback;
  return num;
}

function normalizeChannels(rawChannels) {
  const src = rawChannels && typeof rawChannels === 'object' && !Array.isArray(rawChannels)
    ? rawChannels
    : {};
  return {
    inApp: src.inApp !== undefined ? Boolean(src.inApp) : true,
    push: src.push !== undefined ? Boolean(src.push) : true,
    whatsapp: src.whatsapp !== undefined ? Boolean(src.whatsapp) : true,
  };
}

function normalizeQuietHours(rawQuietHours) {
  const src = rawQuietHours && typeof rawQuietHours === 'object' && !Array.isArray(rawQuietHours)
    ? rawQuietHours
    : {};
  return {
    enabled: src.enabled !== undefined ? Boolean(src.enabled) : false,
    start: typeof src.start === 'string' && /^\d{2}:\d{2}$/.test(src.start) ? src.start : '22:00',
    end: typeof src.end === 'string' && /^\d{2}:\d{2}$/.test(src.end) ? src.end : '08:00',
    timezone: typeof src.timezone === 'string' && src.timezone.trim() ? src.timezone.trim() : 'Africa/Cairo',
  };
}

function normalizeEscalationSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: src.enabled !== undefined ? Boolean(src.enabled) : DEFAULT_ESCALATION_SETTINGS.enabled,
    level1Days: parsePositiveOrZeroInt(src.level1Days, DEFAULT_ESCALATION_SETTINGS.level1Days),
    level2Days: parsePositiveOrZeroInt(src.level2Days, DEFAULT_ESCALATION_SETTINGS.level2Days),
    level3Days: parsePositiveOrZeroInt(src.level3Days, DEFAULT_ESCALATION_SETTINGS.level3Days),
    channels: normalizeChannels(src.channels),
    notifyManager: src.notifyManager !== undefined ? Boolean(src.notifyManager) : DEFAULT_ESCALATION_SETTINGS.notifyManager,
    notifyOwner: src.notifyOwner !== undefined ? Boolean(src.notifyOwner) : DEFAULT_ESCALATION_SETTINGS.notifyOwner,
    quietHours: normalizeQuietHours(src.quietHours),
    updatedBy: src.updatedBy || null,
    updatedAt: src.updatedAt || null,
  };
}

function validateEscalationSettings(payload, baseSettings = DEFAULT_ESCALATION_SETTINGS) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, message: 'بيانات إعدادات التصعيد غير صالحة' };
  }

  if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') {
    return { isValid: false, message: 'قيمة التفعيل يجب أن تكون منطقية (true/false)' };
  }

  if (payload.notifyManager !== undefined && typeof payload.notifyManager !== 'boolean') {
    return { isValid: false, message: 'قيمة إشعار المدير يجب أن تكون منطقية (true/false)' };
  }

  if (payload.notifyOwner !== undefined && typeof payload.notifyOwner !== 'boolean') {
    return { isValid: false, message: 'قيمة إشعار المالك يجب أن تكون منطقية (true/false)' };
  }

  const base = baseSettings || DEFAULT_ESCALATION_SETTINGS;
  const l1 = payload.level1Days !== undefined ? Number(payload.level1Days) : base.level1Days;
  const l2 = payload.level2Days !== undefined ? Number(payload.level2Days) : base.level2Days;
  const l3 = payload.level3Days !== undefined ? Number(payload.level3Days) : base.level3Days;

  if (!Number.isInteger(l1) || l1 < 0 || l1 > 365) {
    return { isValid: false, message: 'أيام المستوى الأول يجب أن تكون عدداً صحيحاً بين 0 و 365' };
  }
  if (!Number.isInteger(l2) || l2 < 0 || l2 > 365) {
    return { isValid: false, message: 'أيام المستوى الثاني يجب أن تكون عدداً صحيحاً بين 0 و 365' };
  }
  if (!Number.isInteger(l3) || l3 < 0 || l3 > 365) {
    return { isValid: false, message: 'أيام المستوى الثالث يجب أن تكون عدداً صحيحاً بين 0 و 365' };
  }

  if (l2 <= l1) {
    return { isValid: false, message: 'أيام المستوى الثاني يجب أن تكون أكبر من المستوى الأول' };
  }
  if (l3 <= l2) {
    return { isValid: false, message: 'أيام المستوى الثالث يجب أن تكون أكبر من المستوى الثاني' };
  }

  if (payload.quietHours !== undefined && payload.quietHours !== null) {
    if (typeof payload.quietHours !== 'object' || Array.isArray(payload.quietHours)) {
      return { isValid: false, message: 'صيغة ساعات الهدوء غير صالحة' };
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (payload.quietHours.start !== undefined && !timeRegex.test(String(payload.quietHours.start))) {
      return { isValid: false, message: 'وقت بداية ساعات الهدوء غير صالح (HH:MM)' };
    }
    if (payload.quietHours.end !== undefined && !timeRegex.test(String(payload.quietHours.end))) {
      return { isValid: false, message: 'وقت نهاية ساعات الهدوء غير صالح (HH:MM)' };
    }
  }

  return { isValid: true };
}

async function getEscalationSettings(companyId, prisma = getSharedPrismaClient()) {
  if (!companyId) return normalizeEscalationSettings({});
  try {
    if (prisma?.taskEscalationSettings && typeof prisma.taskEscalationSettings.findUnique === 'function') {
      const row = await prisma.taskEscalationSettings.findUnique({
        where: { companyId },
      });
      if (row) {
        return normalizeEscalationSettings(row);
      }
    }
  } catch (error) {
    console.warn('[taskEscalationService] Failed to read TaskEscalationSettings, using defaults:', error?.message);
  }
  return normalizeEscalationSettings({});
}

async function updateEscalationSettings(companyId, payload, updatedBy, prisma = getSharedPrismaClient()) {
  const existing = await getEscalationSettings(companyId, prisma);
  const validation = validateEscalationSettings(payload, existing);
  if (!validation.isValid) {
    const err = new Error(validation.message);
    err.statusCode = 400;
    throw err;
  }

  const merged = normalizeEscalationSettings({
    ...existing,
    ...payload,
    channels: {
      ...existing.channels,
      ...(payload.channels && typeof payload.channels === 'object' ? payload.channels : {}),
    },
    quietHours: {
      ...existing.quietHours,
      ...(payload.quietHours && typeof payload.quietHours === 'object' ? payload.quietHours : {}),
    },
    updatedBy: updatedBy || existing.updatedBy || null,
  });

  const saved = await prisma.taskEscalationSettings.upsert({
    where: { companyId },
    create: {
      companyId,
      enabled: merged.enabled,
      level1Days: merged.level1Days,
      level2Days: merged.level2Days,
      level3Days: merged.level3Days,
      channels: merged.channels,
      notifyManager: merged.notifyManager,
      notifyOwner: merged.notifyOwner,
      quietHours: merged.quietHours,
      updatedBy: merged.updatedBy,
    },
    update: {
      enabled: merged.enabled,
      level1Days: merged.level1Days,
      level2Days: merged.level2Days,
      level3Days: merged.level3Days,
      channels: merged.channels,
      notifyManager: merged.notifyManager,
      notifyOwner: merged.notifyOwner,
      quietHours: merged.quietHours,
      updatedBy: merged.updatedBy,
    },
  });

  return normalizeEscalationSettings(saved);
}

function parseMinutesFromHHMM(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isWithinQuietHours(quietHours, now = new Date()) {
  if (!quietHours || !quietHours.enabled) return false;
  try {
    const tz = quietHours.timezone || 'Africa/Cairo';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const currentMin = (hour % 24) * 60 + minute;

    const startMin = parseMinutesFromHHMM(quietHours.start || '22:00');
    const endMin = parseMinutesFromHHMM(quietHours.end || '08:00');

    if (startMin === endMin) return false;
    if (startMin < endMin) {
      return currentMin >= startMin && currentMin < endMin;
    }
    return currentMin >= startMin || currentMin < endMin;
  } catch {
    return false;
  }
}

function computeTargetLevel(dueDate, now, settings) {
  if (!dueDate) return 0;
  const dueMs = new Date(dueDate).getTime();
  if (!Number.isFinite(dueMs)) return 0;
  const elapsedMs = now.getTime() - dueMs;
  if (elapsedMs <= 0) return 0;

  if (elapsedMs >= settings.level3Days * MS_PER_DAY) return 3;
  if (elapsedMs >= settings.level2Days * MS_PER_DAY) return 2;
  if (elapsedMs >= settings.level1Days * MS_PER_DAY) return 1;
  return 0;
}

function computeNextEscalationAt(dueDate, currentLevel, settings) {
  const dueMs = new Date(dueDate).getTime();
  if (!Number.isFinite(dueMs)) return null;
  if (currentLevel === 1) return new Date(dueMs + settings.level2Days * MS_PER_DAY);
  if (currentLevel === 2) return new Date(dueMs + settings.level3Days * MS_PER_DAY);
  return null;
}

async function findCompanyOwner(companyId, prisma, ownerCache) {
  if (ownerCache && ownerCache.has(companyId)) {
    return ownerCache.get(companyId);
  }

  let owner = null;
  try {
    if (prisma?.user && typeof prisma.user.findMany === 'function') {
      const candidates = await prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: ['OWNER', 'COMPANY_ADMIN'] },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, firstName: true, lastName: true, phone: true },
      });
      if (Array.isArray(candidates) && candidates.length > 0) {
        owner =
          candidates.find((u) => String(u.role || '').toUpperCase() === 'OWNER') ||
          candidates[0];
      }
    } else if (prisma?.user && typeof prisma.user.findFirst === 'function') {
      owner = await prisma.user.findFirst({
        where: {
          companyId,
          isActive: true,
          role: { in: ['OWNER', 'COMPANY_ADMIN'] },
        },
        select: { id: true, role: true, firstName: true, lastName: true, phone: true },
      });
    }
  } catch (error) {
    console.warn('[taskEscalationService] Owner lookup failed:', error?.message);
  }

  if (ownerCache) ownerCache.set(companyId, owner);
  return owner;
}

async function findFallbackManager(companyId, prisma) {
  try {
    if (prisma?.user && typeof prisma.user.findFirst === 'function') {
      return await prisma.user.findFirst({
        where: {
          companyId,
          isActive: true,
          role: 'MANAGER',
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, firstName: true, lastName: true, phone: true },
      });
    }
  } catch (error) {
    console.warn('[taskEscalationService] Fallback manager lookup failed:', error?.message);
  }
  return null;
}

/**
 * Resolve escalation recipient IDs for L1 (assignee), L2 (project manager), L3 (company owner).
 */
async function resolveRecipients(task, settings, prisma = getSharedPrismaClient(), ownerCache = null) {
  let managerId = task?.project?.managerId || null;
  if (!managerId && task?.projectId && prisma?.project && typeof prisma.project.findUnique === 'function') {
    const proj = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { managerId: true },
    });
    managerId = proj?.managerId || null;
  }
  if (!managerId && task?.companyId) {
    const fallbackMgr = await findFallbackManager(task.companyId, prisma);
    managerId = fallbackMgr?.id || null;
  }

  const owner = task?.companyId ? await findCompanyOwner(task.companyId, prisma, ownerCache) : null;

  return {
    l1UserId: task?.assignedTo || null,
    l2UserId: settings?.notifyManager === false ? null : (managerId || task?.createdBy || null),
    l3UserId: settings?.notifyOwner === false ? null : (owner?.id || null),
    ownerUser: owner,
  };
}

async function resolveWhatsAppData(task, level, elapsedMs, settings, prisma) {
  if (level < 2) {
    return { whatsappData: undefined, whatsappStatus: 'not_applicable_l1' };
  }
  if (settings?.channels?.whatsapp === false) {
    return { whatsappData: undefined, whatsappStatus: 'disabled_by_settings' };
  }

  const preferredTemplate = level === 2 ? 'TASK_ESCALATION_L2' : 'TASK_ESCALATION_L3';
  let resolvedTemplate = preferredTemplate;
  let whatsappStatus = 'preferred_template';

  try {
    const hasTemplateApi =
      prisma?.whatsAppNotificationTemplate &&
      typeof prisma.whatsAppNotificationTemplate.findFirst === 'function';

    if (hasTemplateApi) {
      const template = await prisma.whatsAppNotificationTemplate.findFirst({
        where: {
          companyId: task.companyId,
          eventType: preferredTemplate,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      });

      let hasMetaSession = false;
      if (prisma?.whatsAppSession && typeof prisma.whatsAppSession.findFirst === 'function') {
        const metaSession = await prisma.whatsAppSession.findFirst({
          where: {
            companyId: task.companyId,
            provider: 'META_CLOUD',
            status: 'CONNECTED',
          },
          select: { id: true },
        });
        hasMetaSession = Boolean(metaSession?.id);
      }

      const templateStatus = String(template?.metaTemplateStatus || '').toUpperCase();
      if (template && templateStatus && templateStatus !== 'APPROVED') {
        resolvedTemplate = 'TASK_OVERDUE';
        whatsappStatus = 'fallback_task_overdue';
      } else if (hasMetaSession && (!template || templateStatus !== 'APPROVED')) {
        resolvedTemplate = 'TASK_OVERDUE';
        whatsappStatus = 'fallback_task_overdue';
      } else if (template) {
        whatsappStatus = 'approved_template';
      }
    }
  } catch (error) {
    console.warn('[taskEscalationService] WhatsApp template resolution fallback:', error?.message);
  }

  const overdueDays = Math.max(0, Math.floor(elapsedMs / MS_PER_DAY));
  const overdueHours = Math.max(1, Math.floor(elapsedMs / (60 * 60 * 1000)));

  return {
    whatsappStatus,
    whatsappData: {
      templateName: resolvedTemplate,
      taskTitle: task.title,
      variables: {
        ...taskNotificationService.helpers.buildTaskVariables(task),
        escalationLevel: String(level),
        overdueDays: String(overdueDays),
        overdueHours: String(overdueHours),
      },
    },
  };
}

function buildEscalationMessage(task, level, elapsedMs) {
  const overdueHours = Math.max(1, Math.floor(elapsedMs / (60 * 60 * 1000)));
  const overdueDays = Math.floor(elapsedMs / MS_PER_DAY);
  const delayLabel = overdueDays >= 1 ? `${overdueDays} يوم` : `${overdueHours} ساعة`;

  if (level === 1) {
    return {
      type: 'task_escalation_l1',
      title: 'تذكير: مهمة متأخرة عن موعد التسليم',
      message: `المهمة "${task.title}" تجاوزت موعد استحقاقها منذ ${delayLabel}. يرجى المتابعة والتحديث.`,
      baseDesc: `تم تصعيد المهمة إلى المستوى 1 (تذكير للمكلَّف) بعد تأخر ${delayLabel}`,
    };
  }
  if (level === 2) {
    return {
      type: 'task_escalation_l2',
      title: 'تصعيد مستوى 2: مهمة متأخرة للمدير',
      message: `المهمة "${task.title}" متأخرة منذ ${delayLabel} وتحتاج متابعة مدير المشروع.`,
      baseDesc: `تم تصعيد المهمة إلى المستوى 2 (مدير المشروع) بعد تأخر ${delayLabel}`,
    };
  }
  return {
    type: 'task_escalation_l3',
    title: 'تصعيد مستوى 3: مهمة متأخرة للمالك',
    message: `المهمة "${task.title}" متأخرة منذ ${delayLabel} وتحتاج تدخل المالك.`,
    baseDesc: `تم تصعيد المهمة إلى المستوى 3 (المالك) بعد تأخر ${delayLabel}`,
  };
}

/**
 * Atomically claim escalationLevel and emit exactly ONE notification + TaskActivity.
 * Does NOT modify task.status, task.assignedTo, acceptanceCriteria, or hasEvidence.
 */
async function escalateTask(task, level, context = {}) {
  const prisma = context.prisma || getSharedPrismaClient();
  const now = context.now || new Date();
  const settings = context.settings || await getEscalationSettings(task.companyId, prisma);
  const previousLevel = Number(task.escalationLevel || 0);

  if (level <= previousLevel || level < 1 || level > 3) {
    return { escalated: false, reason: 'level_not_higher', taskId: task.id, level };
  }

  const recipients = await resolveRecipients(task, settings, prisma, context.ownerCache);
  const recipientId =
    level === 1 ? recipients.l1UserId :
    level === 2 ? recipients.l2UserId :
    recipients.l3UserId;

  if (!recipientId) {
    return { escalated: false, reason: 'no_recipient', taskId: task.id, level };
  }

  const elapsedMs = Math.max(0, now.getTime() - new Date(task.dueDate).getTime());
  const { whatsappData, whatsappStatus } = await resolveWhatsAppData(task, level, elapsedMs, settings, prisma);
  const channelsEnabled = settings?.channels?.inApp !== false || settings?.channels?.push !== false || Boolean(whatsappData);

  if (!channelsEnabled) {
    return { escalated: false, reason: 'channels_disabled', taskId: task.id, level };
  }

  const nextEscalationAt = computeNextEscalationAt(task.dueDate, level, settings);

  // Atomic dedupe guard: only one worker/run can advance escalationLevel to `level`.
  const claim = await prisma.task.updateMany({
    where: {
      id: task.id,
      companyId: task.companyId,
      escalationLevel: { lt: level },
    },
    data: {
      escalationLevel: level,
      lastEscalatedAt: now,
      nextEscalationAt,
    },
  });

  if (!claim || claim.count === 0) {
    return { escalated: false, reason: 'already_escalated', taskId: task.id, level };
  }

  const { type, title, message, baseDesc } = buildEscalationMessage(task, level, elapsedMs);
  const actorUserId = task.createdBy || recipients.ownerUser?.id || recipientId;

  const skippedParts = [];
  for (let l = previousLevel + 1; l < level; l++) {
    skippedParts.push(`level_${l}`);
  }
  const skippedSuffix = skippedParts.length > 0 ? ` (skipped=${skippedParts.join(',')})` : '';
  const waSuffix = ` [whatsappStatus=${whatsappStatus}]`;
  const description = `${baseDesc}${skippedSuffix}${waSuffix}`;

  await taskNotificationService.notify({
    companyId: task.companyId,
    taskId: task.id,
    userId: recipientId,
    type,
    title,
    message,
    link: `/tasks/${task.id}`,
    ...(whatsappData ? { whatsappData } : {}),
    actorUserId,
    logActivity: false,
  });

  if (prisma?.taskActivity && typeof prisma.taskActivity.create === 'function') {
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        companyId: task.companyId,
        userId: actorUserId,
        action: 'escalated',
        field: `level_${level}`,
        oldValue: String(previousLevel),
        newValue: String(level),
        description,
      },
    });
  }

  return {
    escalated: true,
    taskId: task.id,
    level,
    previousLevel,
    skippedLevels: skippedParts,
    recipientId,
    type,
    whatsappStatus,
    templateName: whatsappData?.templateName || null,
  };
}

/**
 * Sweep overdue non-terminal, non-snoozed tasks and escalate each to at most ONE highest due level.
 */
async function runEscalationSweep(options = {}) {
  const prisma = options.prisma || getSharedPrismaClient();
  const now = options.now ? new Date(options.now) : new Date();
  const companyId = options.companyId || null;

  const settingsCache = new Map();
  const ownerCache = new Map();

  if (companyId) {
    const companySettings = await getEscalationSettings(companyId, prisma);
    settingsCache.set(companyId, companySettings);
    if (!companySettings.enabled) {
      return { scanned: 0, escalated: 0, skippedDisabled: true, results: [] };
    }
    if (isWithinQuietHours(companySettings.quietHours, now)) {
      return { scanned: 0, escalated: 0, skippedQuietHours: true, results: [] };
    }
  }

  const tasks = await prisma.task.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      dueDate: { not: null, lt: now },
      status: { notIn: TERMINAL_STATUSES },
      escalationLevel: { lt: 3 },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, phone: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const results = [];
  let escalatedCount = 0;

  for (const task of tasks) {
    if (!task || !task.dueDate) continue;
    if (TERMINAL_STATUSES.includes(String(task.status || '').toUpperCase())) continue;
    if (task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime()) continue;

    let settings = settingsCache.get(task.companyId);
    if (!settings) {
      settings = await getEscalationSettings(task.companyId, prisma);
      settingsCache.set(task.companyId, settings);
    }

    if (!settings.enabled || isWithinQuietHours(settings.quietHours, now)) {
      continue;
    }

    const targetLevel = computeTargetLevel(task.dueDate, now, settings);
    if (targetLevel <= Number(task.escalationLevel || 0)) {
      continue;
    }

    const outcome = await escalateTask(task, targetLevel, {
      settings,
      now,
      prisma,
      ownerCache,
    });
    results.push(outcome);
    if (outcome.escalated) escalatedCount += 1;
  }

  return {
    scanned: tasks.length,
    escalated: escalatedCount,
    results,
  };
}

async function snoozeTask({ companyId, taskId, userId, days, snoozedUntil, reason }, prisma = getSharedPrismaClient()) {
  if (!companyId || !taskId) {
    const err = new Error('معرف الشركة والمهمة مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  let targetDate = null;

  if (days !== undefined && days !== null && days !== '') {
    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0 || parsedDays > MAX_SNOOZE_DAYS) {
      const err = new Error(`مدة التأجيل يجب أن تكون بين 1 و ${MAX_SNOOZE_DAYS} يوماً`);
      err.statusCode = 400;
      throw err;
    }
    targetDate = new Date(now.getTime() + parsedDays * MS_PER_DAY);
  } else if (snoozedUntil) {
    const parsedDate = new Date(snoozedUntil);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= now.getTime()) {
      const err = new Error('تاريخ التأجيل يجب أن يكون في المستقبل');
      err.statusCode = 400;
      throw err;
    }
    if (parsedDate.getTime() - now.getTime() > MAX_SNOOZE_DAYS * MS_PER_DAY) {
      const err = new Error(`الحد الأقصى لتأجيل التصعيد هو ${MAX_SNOOZE_DAYS} يوماً`);
      err.statusCode = 400;
      throw err;
    }
    targetDate = parsedDate;
  } else {
    const err = new Error('يرجى تحديد عدد أيام التأجيل أو تاريخ الانتهاء');
    err.statusCode = 400;
    throw err;
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, companyId },
    select: { id: true, companyId: true, title: true, snoozedUntil: true },
  });

  if (!task) {
    const err = new Error('المهمة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      snoozedUntil: targetDate,
      snoozeReason: reason ? String(reason).trim() : null,
      snoozedBy: userId || null,
      nextEscalationAt: targetDate,
    },
    select: {
      id: true,
      title: true,
      escalationLevel: true,
      snoozedUntil: true,
      snoozeReason: true,
      snoozedBy: true,
      nextEscalationAt: true,
    },
  });

  if (userId && prisma?.taskActivity && typeof prisma.taskActivity.create === 'function') {
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        companyId,
        userId,
        action: 'snoozed',
        field: 'snoozedUntil',
        oldValue: task.snoozedUntil ? new Date(task.snoozedUntil).toISOString() : null,
        newValue: targetDate.toISOString(),
        description: reason
          ? `تم تأجيل تصعيد المهمة حتى ${targetDate.toISOString()} — السبب: ${String(reason).trim()}`
          : `تم تأجيل تصعيد المهمة حتى ${targetDate.toISOString()}`,
      },
    });
  }

  return updated;
}

async function getAttentionSummary(companyId, options = {}, prisma = getSharedPrismaClient()) {
  if (!companyId) return { count: 0, top5: [] };
  const now = options.now ? new Date(options.now) : new Date();
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 20) : 5;

  const where = {
    companyId,
    dueDate: { not: null, lt: now },
    status: { notIn: TERMINAL_STATUSES },
    OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
  };

  const [count, topTasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        escalationLevel: true,
        lastEscalatedAt: true,
        assignedTo: true,
        projectId: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    count,
    top5: topTasks,
  };
}

/**
 * Build dead tasks report for a company (+7 days overdue, non-terminal).
 * Read-only: does not modify tasks, dueDate, status, or assignments.
 *
 * Recommendation rules (deterministic order, first match wins):
 * 1. cancel   — overdue > 30 days AND updatedAt > 14 days ago
 * 2. reassign — assignee has >= 3 dead tasks in this report
 * 3. extend   — fallback: 1-week extension proposed
 *
 * @param {string} companyId
 * @param {Object} [options]
 * @param {number} [options.windowDays=7]
 * @param {Date|string} [options.now]
 * @param {Object} [prisma]
 */
async function buildDeadTasksReport(companyId, options = {}, prisma = getSharedPrismaClient()) {
  const db = prisma || options.prisma || getSharedPrismaClient();
  const now = options.now ? new Date(options.now) : new Date();
  const rawWindow = options.windowDays !== undefined && options.windowDays !== null ? Number(options.windowDays) : 7;
  const windowDays = Number.isFinite(rawWindow) && rawWindow > 0 ? Math.floor(rawWindow) : 7;
  const cutoff = new Date(now.getTime() - windowDays * MS_PER_DAY);

  if (!companyId) {
    return {
      companyId: null,
      generatedAt: now,
      windowDays,
      total: 0,
      byRecommendation: { extend: 0, reassign: 0, cancel: 0 },
      tasks: [],
    };
  }

  const tasks = await db.task.findMany({
    where: {
      companyId,
      status: { notIn: TERMINAL_STATUSES },
      dueDate: { not: null, lt: cutoff },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const assigneeCounts = new Map();
  for (const t of tasks) {
    const aId = t.assignedTo || t.assignee?.id;
    if (aId) {
      assigneeCounts.set(aId, (assigneeCounts.get(aId) || 0) + 1);
    }
  }

  const byRecommendation = {
    extend: 0,
    reassign: 0,
    cancel: 0,
  };

  const reportTasks = [];

  for (const task of tasks) {
    const dueMs = new Date(task.dueDate).getTime();
    const elapsedMs = Math.max(0, now.getTime() - dueMs);
    const daysOverdue = Math.floor(elapsedMs / MS_PER_DAY);

    const updatedMs = task.updatedAt ? new Date(task.updatedAt).getTime() : dueMs;
    const daysSinceUpdate = Math.floor(Math.max(0, now.getTime() - updatedMs) / MS_PER_DAY);

    const aId = task.assignedTo || task.assignee?.id;
    const assigneeDeadCount = aId ? (assigneeCounts.get(aId) || 0) : 0;

    let recommendation = 'extend';
    let reason = 'تمديد أسبوع مقترح';

    if (daysOverdue > 30 && daysSinceUpdate > 14) {
      recommendation = 'cancel';
      reason = `متأخرة ${daysOverdue} يوم بدون تحديث ${daysSinceUpdate} يوم`;
    } else if (aId && assigneeDeadCount >= 3) {
      recommendation = 'reassign';
      reason = `المكلَّف عليه ${assigneeDeadCount} مهام ميتة`;
    } else {
      recommendation = 'extend';
      reason = 'تمديد أسبوع مقترح';
    }

    byRecommendation[recommendation] += 1;

    reportTasks.push({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      daysOverdue,
      escalationLevel: Number(task.escalationLevel || 0),
      assignee: task.assignee || (task.assignedTo ? { id: task.assignedTo } : null),
      project: task.project || (task.projectId ? { id: task.projectId } : null),
      snoozedUntil: task.snoozedUntil || null,
      recommendation,
      reason,
    });
  }

  return {
    companyId,
    generatedAt: now,
    windowDays,
    total: reportTasks.length,
    byRecommendation,
    tasks: reportTasks,
  };
}

/**
 * Sweep all companies with dead tasks and generate reports.
 * Logs one summary line per company and returns { companies, totals }.
 *
 * @param {Object} [options]
 * @param {string} [options.companyId]
 * @param {number} [options.windowDays]
 * @param {Date|string} [options.now]
 * @param {Object} [options.prisma]
 */
async function runWeeklyDeadTasksReport(options = {}) {
  const prisma = options.prisma || getSharedPrismaClient();
  const now = options.now ? new Date(options.now) : new Date();
  const rawWindow = options.windowDays !== undefined && options.windowDays !== null ? Number(options.windowDays) : 7;
  const windowDays = Number.isFinite(rawWindow) && rawWindow > 0 ? Math.floor(rawWindow) : 7;
  const cutoff = new Date(now.getTime() - windowDays * MS_PER_DAY);

  let companyIds = [];
  if (options.companyId) {
    companyIds = [options.companyId];
  } else {
    try {
      if (prisma?.task && typeof prisma.task.findMany === 'function') {
        const rows = await prisma.task.findMany({
          where: {
            dueDate: { not: null, lt: cutoff },
            status: { notIn: TERMINAL_STATUSES },
          },
          select: { companyId: true },
        });
        companyIds = Array.from(new Set(rows.map((r) => r.companyId).filter(Boolean)));
      }
    } catch (error) {
      console.error('[taskEscalationService.runWeeklyDeadTasksReport] Error finding companies with dead tasks:', error);
      throw error;
    }
  }

  const totals = {
    total: 0,
    extend: 0,
    reassign: 0,
    cancel: 0,
  };
  const companies = [];

  for (const cId of companyIds) {
    const report = await buildDeadTasksReport(cId, { ...options, now, windowDays }, prisma);
    console.log(
      `📋 [DEAD-TASKS-REPORT] Company ${cId}: total=${report.total}, extend=${report.byRecommendation.extend}, reassign=${report.byRecommendation.reassign}, cancel=${report.byRecommendation.cancel}`
    );
    companies.push(report);
    totals.total += report.total;
    totals.extend += report.byRecommendation.extend;
    totals.reassign += report.byRecommendation.reassign;
    totals.cancel += report.byRecommendation.cancel;
  }

  return {
    companies,
    totals,
  };
}

module.exports = {
  DEFAULT_ESCALATION_SETTINGS,
  MAX_SNOOZE_DAYS,
  TERMINAL_STATUSES,
  normalizeEscalationSettings,
  validateEscalationSettings,
  isWithinQuietHours,
  computeTargetLevel,
  computeNextEscalationAt,
  getEscalationSettings,
  updateEscalationSettings,
  resolveRecipients,
  escalateTask,
  runEscalationSweep,
  snoozeTask,
  getAttentionSummary,
  buildDeadTasksReport,
  runWeeklyDeadTasksReport,
};
