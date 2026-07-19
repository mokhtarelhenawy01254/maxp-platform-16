const {
  parseCompanySettings,
  serializeCompanySettings,
} = require("./companyOnboarding");

const FOLLOW_UP_STATUSES = [
  "unassigned",
  "pending",
  "contacted",
  "waiting",
  "resolved",
];

const DEFAULT_FOLLOW_UP_STATUS = "unassigned";
const MAX_HISTORY_ITEMS = 20;
const FOLLOW_UP_DEFAULT_HOURS = {
  pending: 24,
  contacted: 24,
  waiting: 72,
};
const FOLLOW_UP_ACTIONABLE_STATUSES = new Set([
  "pending",
  "contacted",
  "waiting",
]);

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeIsoString = (value) => {
  const normalized = cleanString(value);
  return normalized || null;
};

const buildActorLabel = (actor = {}) => {
  const firstName = cleanString(actor.firstName);
  const lastName = cleanString(actor.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || cleanString(actor.email) || "عضو الفريق";
};

const normalizeOwner = (input = {}) => ({
  id: cleanString(input.id) || null,
  name: cleanString(input.name) || null,
  email: cleanString(input.email) || null,
  role: cleanString(input.role) || null,
});

const addHours = (baseDate, hours) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(nextDate.getHours() + hours);
  return nextDate.toISOString();
};

const normalizeStatus = (value) =>
  FOLLOW_UP_STATUSES.includes(cleanString(value))
    ? cleanString(value)
    : DEFAULT_FOLLOW_UP_STATUS;

const normalizeHistoryEntry = (entry = {}) => {
  const occurredAt = normalizeIsoString(entry.occurredAt);
  if (!occurredAt) {
    return null;
  }

  const actor = normalizeOwner(entry.actor);
  const assignedOwner = normalizeOwner(entry.assignedOwner);

  return {
    id:
      cleanString(entry.id) ||
      `followup_${occurredAt}_${Math.random().toString(36).slice(2, 8)}`,
    occurredAt,
    status: normalizeStatus(entry.status),
    note: cleanString(entry.note) || null,
    action: cleanString(entry.action) || "updated",
    nextActionAt: normalizeIsoString(entry.nextActionAt),
    actor: {
      ...actor,
      label: buildActorLabel(actor),
    },
    assignedOwner: {
      ...assignedOwner,
      label: assignedOwner.name || assignedOwner.email || null,
    },
  };
};

const normalizeCompanyFollowUp = (input = {}) => {
  const source = input && typeof input === "object" ? input : {};
  const owner = normalizeOwner(source.assignedOwner);
  const status = normalizeStatus(source.status);
  const history = Array.isArray(source.history)
    ? source.history
        .map(normalizeHistoryEntry)
        .filter(Boolean)
        .slice(0, MAX_HISTORY_ITEMS)
    : [];

  return {
    status,
    callStatus: cleanString(source.callStatus) || null,
    callDuration: typeof source.callDuration === 'number' ? source.callDuration : null,
    lastCallAt: normalizeIsoString(source.lastCallAt),
    assignedOwner: {
      ...owner,
      label: owner.name || owner.email || null,
    },
    lastNote: cleanString(source.lastNote) || null,
    updatedAt: normalizeIsoString(source.updatedAt),
    contactedAt: normalizeIsoString(source.contactedAt),
    resolvedAt: normalizeIsoString(source.resolvedAt),
    nextActionAt: normalizeIsoString(source.nextActionAt),
    lastReminderSentAt: normalizeIsoString(source.lastReminderSentAt),
    lastEscalatedAt: normalizeIsoString(source.lastEscalatedAt),
    history,
  };
};

const getCompanyFollowUp = (company = {}) => {
  const settings = parseCompanySettings(company.settings);
  return normalizeCompanyFollowUp(settings.followUp);
};

const mergeCompanyFollowUpSettings = (
  rawSettings,
  patch = {},
  actorInput = {},
) => {
  const settings = parseCompanySettings(rawSettings);
  const current = normalizeCompanyFollowUp(settings.followUp);
  const actor = normalizeOwner({
    id: actorInput.id,
    name: buildActorLabel(actorInput),
    email: actorInput.email,
    role: actorInput.role,
  });
  const nowIso = new Date().toISOString();

  const patchIncludesOwner =
    patch.clearOwner === true ||
    patch.assignedOwnerId !== undefined ||
    patch.assignedOwnerName !== undefined ||
    patch.assignedOwnerEmail !== undefined ||
    patch.assignedOwnerRole !== undefined;
  const explicitNextActionAt =
    patch.nextActionAt !== undefined ? normalizeIsoString(patch.nextActionAt) : undefined;
  const clearNextAction = patch.clearNextAction === true;
  const markReminderSent = patch.markReminderSent === true;
  const markEscalated = patch.markEscalated === true;
  const clearReminderLog = patch.clearReminderLog === true;
  const clearEscalationLog = patch.clearEscalationLog === true;

  const nextOwner = patch.clearOwner
    ? { id: null, name: null, email: null, role: null }
    : {
        id:
          patch.assignedOwnerId !== undefined
            ? cleanString(patch.assignedOwnerId) || null
            : current.assignedOwner.id,
        name:
          patch.assignedOwnerName !== undefined
            ? cleanString(patch.assignedOwnerName) || null
            : current.assignedOwner.name,
        email:
          patch.assignedOwnerEmail !== undefined
            ? cleanString(patch.assignedOwnerEmail) || null
            : current.assignedOwner.email,
        role:
          patch.assignedOwnerRole !== undefined
            ? cleanString(patch.assignedOwnerRole) || null
            : current.assignedOwner.role,
      };

  const explicitStatus =
    patch.status !== undefined ? normalizeStatus(patch.status) : null;

  const nextStatus = explicitStatus
    ? explicitStatus
    : patch.clearOwner
      ? "unassigned"
      : patchIncludesOwner && nextOwner.id && current.status === "unassigned"
        ? "pending"
        : current.status;

  const callStatus = patch.callStatus !== undefined ? cleanString(patch.callStatus) || null : current.callStatus;
  const callDuration = patch.callDuration !== undefined ? (typeof patch.callDuration === 'number' ? patch.callDuration : parseInt(patch.callDuration) || null) : current.callDuration;
  const callStatusChanged = current.callStatus !== callStatus || current.callDuration !== callDuration;

  const ownerChanged =
    current.assignedOwner.id !== nextOwner.id ||
    current.assignedOwner.name !== nextOwner.name ||
    current.assignedOwner.email !== nextOwner.email ||
    current.assignedOwner.role !== nextOwner.role;

  const statusChanged = current.status !== nextStatus;
  const noteChanged = Boolean(note);
  const isActionableStatus =
    nextOwner.id && FOLLOW_UP_ACTIONABLE_STATUSES.has(nextStatus);
  const defaultNextActionAt = isActionableStatus
    ? addHours(
        new Date(nowIso),
        FOLLOW_UP_DEFAULT_HOURS[nextStatus] || FOLLOW_UP_DEFAULT_HOURS.pending,
      )
    : null;

  const nextActionAt = clearNextAction
    ? null
    : explicitNextActionAt !== undefined
      ? explicitNextActionAt
      : !isActionableStatus
        ? null
        : ownerChanged || statusChanged
          ? defaultNextActionAt
          : current.nextActionAt || defaultNextActionAt;
  const nextActionChanged = current.nextActionAt !== nextActionAt;
  const shouldResetAutomationLogs =
    !isActionableStatus || ownerChanged || statusChanged || nextActionChanged;
  const lastReminderSentAt = clearReminderLog
    ? null
    : markReminderSent
      ? nowIso
      : shouldResetAutomationLogs
        ? null
        : current.lastReminderSentAt;
  const lastEscalatedAt = clearEscalationLog
    ? null
    : markEscalated
      ? nowIso
      : shouldResetAutomationLogs
        ? null
        : current.lastEscalatedAt;
  const automationChanged =
    current.lastReminderSentAt !== lastReminderSentAt ||
    current.lastEscalatedAt !== lastEscalatedAt;

  const nextFollowUp = {
    status: nextStatus,
    callStatus,
    callDuration,
    lastCallAt: callStatusChanged ? nowIso : current.lastCallAt,
    assignedOwner: nextOwner,
    lastNote: noteChanged ? note : current.lastNote,
    updatedAt:
      ownerChanged ||
      statusChanged ||
      noteChanged ||
      nextActionChanged ||
      automationChanged
        ? nowIso
        : current.updatedAt,
    contactedAt:
      nextStatus === "contacted"
        ? nowIso
        : current.contactedAt,
    resolvedAt:
      nextStatus === "resolved"
        ? current.resolvedAt || nowIso
        : null,
    nextActionAt,
    lastReminderSentAt,
    lastEscalatedAt,
    history: current.history.slice(0, MAX_HISTORY_ITEMS),
  };

  if (
    ownerChanged ||
    statusChanged ||
    noteChanged ||
    nextActionChanged ||
    automationChanged
  ) {
    const action = markEscalated
      ? "escalated"
      : markReminderSent
        ? "reminder_sent"
        : noteChanged
      ? "note_added"
      : ownerChanged && statusChanged
        ? "assignment_and_status_updated"
        : ownerChanged
          ? "owner_assigned"
          : nextActionChanged
            ? "schedule_updated"
            : "status_updated";

    const nextHistoryEntry = normalizeHistoryEntry({
      id: `followup_${Date.now()}`,
      occurredAt: nowIso,
      action,
      status: nextStatus,
      note,
      nextActionAt,
      actor,
      assignedOwner: nextOwner,
    });

    nextFollowUp.history = [nextHistoryEntry, ...current.history].slice(
      0,
      MAX_HISTORY_ITEMS,
    );
  }

  settings.followUp = nextFollowUp;

  return {
    settings,
    serializedSettings: serializeCompanySettings(settings),
    followUp: normalizeCompanyFollowUp(nextFollowUp),
  };
};

const getCompanyFollowUpFromDb = async (prisma, company) => {
  const dbRecord = await prisma.followUp.findUnique({
    where: { company_id: company.id },
    include: { history: { orderBy: { occurred_at: "desc" } } },
  });
  if (!dbRecord) return getCompanyFollowUp(company);

  return normalizeCompanyFollowUp({
    status: dbRecord.status,
    callStatus: dbRecord.call_status,
    callDuration: dbRecord.call_duration,
    lastCallAt: dbRecord.last_call_at?.toISOString(),
    assignedOwner: {
      id: dbRecord.assigned_owner_id,
      name: dbRecord.assigned_owner_name,
      email: dbRecord.assigned_owner_email,
      role: dbRecord.assigned_owner_role,
    },
    lastNote: dbRecord.last_note,
    updatedAt: dbRecord.updated_at?.toISOString(),
    contactedAt: dbRecord.contacted_at?.toISOString(),
    resolvedAt: dbRecord.resolved_at?.toISOString(),
    nextActionAt: dbRecord.next_action_at?.toISOString(),
    lastReminderSentAt: dbRecord.last_reminder_sent_at?.toISOString(),
    lastEscalatedAt: dbRecord.last_escalated_at?.toISOString(),
    history: (dbRecord.history || []).map((h) => ({
      id: h.id,
      occurredAt: h.occurred_at.toISOString(),
      status: h.status,
      note: h.note,
      action: h.action,
      nextActionAt: h.next_action_at?.toISOString(),
      actor: {
        id: h.actor_id,
        name: h.actor_name,
        email: h.actor_email,
        role: h.actor_role,
      },
      assignedOwner: {
        id: h.assigned_owner_id,
        name: h.assigned_owner_name,
        email: h.assigned_owner_email,
        role: h.assigned_owner_role,
      },
    })),
  });
};

const saveFollowUpToDb = async (prisma, companyId, followUp) => {
  if (!followUp) return;

  const created = await prisma.followUp.upsert({
    where: { company_id: companyId },
    create: {
      company_id: companyId,
      status: followUp.status || "unassigned",
      call_status: followUp.callStatus || null,
      call_duration: followUp.callDuration || null,
      last_call_at: followUp.lastCallAt ? new Date(followUp.lastCallAt) : null,
      assigned_owner_id: followUp.assignedOwner?.id || null,
      assigned_owner_name: followUp.assignedOwner?.name || null,
      assigned_owner_email: followUp.assignedOwner?.email || null,
      assigned_owner_role: followUp.assignedOwner?.role || null,
      last_note: followUp.lastNote || null,
      updated_at: followUp.updatedAt ? new Date(followUp.updatedAt) : null,
      contacted_at: followUp.contactedAt ? new Date(followUp.contactedAt) : null,
      resolved_at: followUp.resolvedAt ? new Date(followUp.resolvedAt) : null,
      next_action_at: followUp.nextActionAt ? new Date(followUp.nextActionAt) : null,
      last_reminder_sent_at: followUp.lastReminderSentAt ? new Date(followUp.lastReminderSentAt) : null,
      last_escalated_at: followUp.lastEscalatedAt ? new Date(followUp.lastEscalatedAt) : null,
    },
    update: {
      status: followUp.status || "unassigned",
      call_status: followUp.callStatus || null,
      call_duration: followUp.callDuration || null,
      last_call_at: followUp.lastCallAt ? new Date(followUp.lastCallAt) : null,
      assigned_owner_id: followUp.assignedOwner?.id || null,
      assigned_owner_name: followUp.assignedOwner?.name || null,
      assigned_owner_email: followUp.assignedOwner?.email || null,
      assigned_owner_role: followUp.assignedOwner?.role || null,
      last_note: followUp.lastNote || null,
      updated_at: followUp.updatedAt ? new Date(followUp.updatedAt) : null,
      contacted_at: followUp.contactedAt ? new Date(followUp.contactedAt) : null,
      resolved_at: followUp.resolvedAt ? new Date(followUp.resolvedAt) : null,
      next_action_at: followUp.nextActionAt ? new Date(followUp.nextActionAt) : null,
      last_reminder_sent_at: followUp.lastReminderSentAt ? new Date(followUp.lastReminderSentAt) : null,
      last_escalated_at: followUp.lastEscalatedAt ? new Date(followUp.lastEscalatedAt) : null,
    },
  });

  if (followUp.history?.length) {
    await prisma.followUpHistory.deleteMany({ where: { follow_up_id: created.id } });
    await prisma.followUpHistory.createMany({
      data: followUp.history.map((entry) => ({
        follow_up_id: created.id,
        occurred_at: new Date(entry.occurredAt),
        status: entry.status || "updated",
        note: entry.note || null,
        action: entry.action || "updated",
        next_action_at: entry.nextActionAt ? new Date(entry.nextActionAt) : null,
        actor_id: entry.actor?.id || null,
        actor_name: entry.actor?.name || null,
        actor_email: entry.actor?.email || null,
        actor_role: entry.actor?.role || null,
        assigned_owner_id: entry.assignedOwner?.id || null,
        assigned_owner_name: entry.assignedOwner?.name || null,
        assigned_owner_email: entry.assignedOwner?.email || null,
        assigned_owner_role: entry.assignedOwner?.role || null,
      })),
    });
  }
};

module.exports = {
  FOLLOW_UP_STATUSES,
  DEFAULT_FOLLOW_UP_STATUS,
  normalizeCompanyFollowUp,
  getCompanyFollowUp,
  getCompanyFollowUpFromDb,
  saveFollowUpToDb,
  mergeCompanyFollowUpSettings,
};
