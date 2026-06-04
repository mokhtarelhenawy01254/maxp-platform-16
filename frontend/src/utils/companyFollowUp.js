const FOLLOW_UP_STATUS_META = {
  unassigned: {
    label: "بدون مسؤول",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-300",
    description: "لم يتم تعيين مسؤول متابعة بعد.",
  },
  pending: {
    label: "بانتظار المتابعة",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    description: "تم تعيين الشركة وتنتظر أول تواصل.",
  },
  contacted: {
    label: "تم التواصل",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
    description: "تم التواصل مع العميل ويجري العمل على إعادة التفعيل.",
  },
  waiting: {
    label: "بانتظار رد العميل",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-300",
    description: "الفريق ينتظر ردًا من العميل أو خطوة لاحقة منه.",
  },
  resolved: {
    label: "تم الحل",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
    description: "تمت معالجة الحالة ولم تعد تحتاج متابعة.",
  },
};

export const FOLLOW_UP_STATUS_OPTIONS = Object.entries(FOLLOW_UP_STATUS_META).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

const FOLLOW_UP_ACTIONABLE_STATUSES = new Set(["pending", "contacted", "waiting"]);
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeHistoryEntry = (entry = {}) => ({
  id:
    cleanString(entry.id) ||
    `followup_${cleanString(entry.occurredAt) || Date.now()}`,
  occurredAt: cleanString(entry.occurredAt) || null,
  action: cleanString(entry.action) || "updated",
  status: cleanString(entry.status) || "unassigned",
  note: cleanString(entry.note) || null,
  nextActionAt: cleanString(entry.nextActionAt) || null,
  actor: entry.actor && typeof entry.actor === "object" ? entry.actor : null,
  assignedOwner:
    entry.assignedOwner && typeof entry.assignedOwner === "object"
      ? entry.assignedOwner
      : null,
});

export const getCompanyFollowUpState = (input = {}) => {
  const source =
    input?.followUp && typeof input.followUp === "object" ? input.followUp : input;
  const status = cleanString(source?.status) || "unassigned";
  const assignedOwner =
    source?.assignedOwner && typeof source.assignedOwner === "object"
      ? source.assignedOwner
      : {};

  return {
    status,
    statusMeta:
      FOLLOW_UP_STATUS_META[status] || FOLLOW_UP_STATUS_META.unassigned,
    assignedOwner: {
      id: cleanString(assignedOwner.id) || null,
      name: cleanString(assignedOwner.name) || null,
      email: cleanString(assignedOwner.email) || null,
      role: cleanString(assignedOwner.role) || null,
      label:
        cleanString(assignedOwner.label) ||
        cleanString(assignedOwner.name) ||
        cleanString(assignedOwner.email) ||
        null,
    },
    lastNote: cleanString(source?.lastNote) || null,
    updatedAt: cleanString(source?.updatedAt) || null,
    contactedAt: cleanString(source?.contactedAt) || null,
    resolvedAt: cleanString(source?.resolvedAt) || null,
    nextActionAt: cleanString(source?.nextActionAt) || null,
    lastReminderSentAt: cleanString(source?.lastReminderSentAt) || null,
    lastEscalatedAt: cleanString(source?.lastEscalatedAt) || null,
    history: Array.isArray(source?.history)
      ? source.history.map(normalizeHistoryEntry)
      : [],
  };
};

const isSameDay = (leftDate, rightDate) =>
  leftDate.getFullYear() === rightDate.getFullYear() &&
  leftDate.getMonth() === rightDate.getMonth() &&
  leftDate.getDate() === rightDate.getDate();

export const getCompanyFollowUpReminderState = (
  input = {},
  {
    currentAdminId = null,
    now = new Date(),
    staleStatus = null,
  } = {},
) => {
  const followUp = getCompanyFollowUpState(input);
  const nextActionDate = followUp.nextActionAt ? new Date(followUp.nextActionAt) : null;
  const hasValidNextActionDate =
    nextActionDate instanceof Date && !Number.isNaN(nextActionDate?.getTime?.());
  const isActionable =
    Boolean(followUp.assignedOwner.id) &&
    FOLLOW_UP_ACTIONABLE_STATUSES.has(followUp.status);
  const isOverdue =
    isActionable && hasValidNextActionDate && nextActionDate.getTime() <= now.getTime();
  const isDueToday =
    isActionable &&
    hasValidNextActionDate &&
    !isOverdue &&
    isSameDay(nextActionDate, now);
  const isUnscheduled = isActionable && !hasValidNextActionDate;
  const needsFollowUpToday =
    isOverdue ||
    isDueToday ||
    (isUnscheduled && staleStatus?.needsFollowUpNow);
  const isMine = Boolean(currentAdminId) && followUp.assignedOwner.id === currentAdminId;

  let label = "لا يوجد موعد";
  let className =
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-300";

  if (followUp.status === "resolved") {
    label = "مغلقة";
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300";
  } else if (!followUp.assignedOwner.id) {
    label = "بدون موعد";
  } else if (isOverdue) {
    label = "مستحقة الآن";
    className =
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300";
  } else if (isDueToday) {
    label = "اليوم";
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300";
  } else if (hasValidNextActionDate) {
    label = nextActionDate.toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
    });
    className =
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300";
  } else if (isUnscheduled) {
    label = "حدد موعدًا";
    className =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return {
    isActionable,
    isMine,
    isOverdue,
    isDueToday,
    isUnscheduled,
    needsFollowUpToday,
    nextActionAt: hasValidNextActionDate ? nextActionDate.toISOString() : null,
    nextActionLabel: label,
    badgeClassName: className,
  };
};

export const getCompaniesFollowUpReminderStats = (
  companies = [],
  currentAdminId = null,
) => {
  return companies.reduce(
    (accumulator, company) => {
      const reminderState = getCompanyFollowUpReminderState(company, {
        currentAdminId,
        staleStatus: company.funnelStaleStatus,
      });

      if (reminderState.needsFollowUpToday) {
        accumulator.dueToday += 1;
      }

      if (reminderState.isMine && reminderState.needsFollowUpToday) {
        accumulator.myDueToday += 1;
      }

      if (reminderState.isMine) {
        accumulator.assignedToMe += 1;
      }

      if (reminderState.isUnscheduled) {
        accumulator.unscheduled += 1;
      }

      return accumulator;
    },
    {
      dueToday: 0,
      myDueToday: 0,
      assignedToMe: 0,
      unscheduled: 0,
    },
  );
};

export const getCompanyFollowUpAutomationState = (
  input = {},
  {
    now = new Date(),
    staleStatus = null,
  } = {},
) => {
  const followUp = getCompanyFollowUpState(input);
  const reminderState = getCompanyFollowUpReminderState(input, {
    now,
    staleStatus,
  });
  const nextActionDate = followUp.nextActionAt ? new Date(followUp.nextActionAt) : null;
  const hasValidNextActionDate =
    nextActionDate instanceof Date && !Number.isNaN(nextActionDate?.getTime?.());
  const reminderLoggedAt = followUp.lastReminderSentAt
    ? new Date(followUp.lastReminderSentAt)
    : null;
  const escalationLoggedAt = followUp.lastEscalatedAt
    ? new Date(followUp.lastEscalatedAt)
    : null;
  const hasReminderLogged =
    reminderLoggedAt instanceof Date &&
    !Number.isNaN(reminderLoggedAt?.getTime?.()) &&
    (!hasValidNextActionDate ||
      reminderLoggedAt.getTime() >= nextActionDate.getTime());
  const hasEscalationLogged =
    escalationLoggedAt instanceof Date &&
    !Number.isNaN(escalationLoggedAt?.getTime?.()) &&
    (!hasValidNextActionDate ||
      escalationLoggedAt.getTime() >= nextActionDate.getTime());
  const overdueMs =
    hasValidNextActionDate && reminderState.isOverdue
      ? now.getTime() - nextActionDate.getTime()
      : 0;
  const overdueHours =
    overdueMs > 0 ? Math.floor(overdueMs / (60 * 60 * 1000)) : 0;

  const needsUrgentEscalation =
    reminderState.isActionable &&
    reminderState.isOverdue &&
    overdueMs >= SEVENTY_TWO_HOURS_MS &&
    !hasEscalationLogged;
  const needsEscalation =
    reminderState.isActionable &&
    reminderState.isOverdue &&
    overdueMs >= TWENTY_FOUR_HOURS_MS &&
    overdueMs < SEVENTY_TWO_HOURS_MS &&
    !hasEscalationLogged;
  const needsReminder =
    reminderState.isActionable &&
    (reminderState.isDueToday ||
      (reminderState.isOverdue && overdueMs < TWENTY_FOUR_HOURS_MS)) &&
    !hasReminderLogged &&
    !needsEscalation &&
    !needsUrgentEscalation;
  const requiresScheduling =
    reminderState.isActionable &&
    reminderState.isUnscheduled &&
    Boolean(staleStatus?.needsFollowUpNow);

  let level = "idle";
  let label = "لا توجد أتمتة مطلوبة";
  let description = "الحالة لا تحتاج تذكيرًا أو تصعيدًا الآن.";
  let badgeClassName =
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-300";

  if (needsUrgentEscalation) {
    level = "urgent_escalation";
    label = "تصعيد عاجل";
    description = "تجاوزت الحالة 72 ساعة من دون إغلاق وتحتاج تدخلًا فوريًا.";
    badgeClassName =
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300";
  } else if (needsEscalation) {
    level = "escalation_due";
    label = "تصعيد مطلوب";
    description = "مرت 24 ساعة أو أكثر على الموعد المحدد ويجب تصعيد الحالة.";
    badgeClassName =
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/70 dark:bg-orange-950/40 dark:text-orange-300";
  } else if (needsReminder) {
    level = "reminder_due";
    label = "تذكير مطلوب";
    description = "حان وقت تذكير المسؤول أو متابعة العميل على هذه الحالة.";
    badgeClassName =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300";
  } else if (requiresScheduling) {
    level = "schedule_required";
    label = "حدد موعدًا";
    description = "الحالة نشطة لكن بدون موعد متابعة محدد.";
    badgeClassName =
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300";
  } else if (hasEscalationLogged) {
    level = "escalated";
    label = "تم التصعيد";
    description = "تم تسجيل التصعيد للحالة الحالية.";
    badgeClassName =
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-300";
  } else if (hasReminderLogged) {
    level = "reminded";
    label = "تم التذكير";
    description = "تم تسجيل تذكير لهذه الحالة بالفعل.";
    badgeClassName =
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300";
  }

  return {
    level,
    label,
    description,
    badgeClassName,
    needsReminder,
    needsEscalation,
    needsUrgentEscalation,
    requiresScheduling,
    hasReminderLogged,
    hasEscalationLogged,
    lastReminderSentAt: followUp.lastReminderSentAt,
    lastEscalatedAt: followUp.lastEscalatedAt,
    overdueHours,
  };
};

export const getCompaniesFollowUpAutomationStats = (companies = []) =>
  companies.reduce(
    (accumulator, company) => {
      const automationState = getCompanyFollowUpAutomationState(company, {
        staleStatus: company.funnelStaleStatus,
      });

      if (automationState.needsReminder) {
        accumulator.reminderDue += 1;
      }

      if (automationState.needsEscalation) {
        accumulator.escalationDue += 1;
      }

      if (automationState.needsUrgentEscalation) {
        accumulator.urgentEscalationDue += 1;
      }

      if (automationState.requiresScheduling) {
        accumulator.scheduleRequired += 1;
      }

      return accumulator;
    },
    {
      reminderDue: 0,
      escalationDue: 0,
      urgentEscalationDue: 0,
      scheduleRequired: 0,
    },
  );
