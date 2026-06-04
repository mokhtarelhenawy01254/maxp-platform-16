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

  const note = cleanString(patch.note) || null;

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

module.exports = {
  FOLLOW_UP_STATUSES,
  DEFAULT_FOLLOW_UP_STATUS,
  normalizeCompanyFollowUp,
  getCompanyFollowUp,
  mergeCompanyFollowUpSettings,
};
