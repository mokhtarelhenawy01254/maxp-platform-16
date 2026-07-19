const OPEN_CHAT_STATUSES = ['NEW', 'QUEUED', 'ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED'];
const CLOSED_CHAT_STATUSES = ['CLOSED', 'ARCHIVED'];
const WAITING_QUEUE_STATUSES = ['NEW', 'QUEUED'];
const ASSIGNED_QUEUE_STATUSES = ['ASSIGNED', 'ACTIVE', 'ESCALATED'];
const PENDING_QUEUE_STATUSES = ['PENDING', 'WAITING_CUSTOMER'];
const CLOSED_QUEUE_STATUSES = ['CLOSED', 'ARCHIVED'];

function safeJsonParse(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function buildQueueKeyFromStatus(status) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (WAITING_QUEUE_STATUSES.includes(normalizedStatus)) {
    return 'WAITING_QUEUE';
  }

  if (ASSIGNED_QUEUE_STATUSES.includes(normalizedStatus)) {
    return 'ASSIGNED_QUEUE';
  }

  if (PENDING_QUEUE_STATUSES.includes(normalizedStatus)) {
    return 'PENDING_QUEUE';
  }

  if (CLOSED_QUEUE_STATUSES.includes(normalizedStatus)) {
    return 'CLOSED_QUEUE';
  }

  return 'WAITING_QUEUE';
}

function getSessionIdFromMetadata(metadata) {
  const parsed = safeJsonParse(metadata, {});
  return (
    parsed?.whatsappSessionId ||
    parsed?.sessionId ||
    parsed?.inboxRouting?.sessionId ||
    parsed?.ownership?.sessionId ||
    null
  );
}

function buildConversationMetadata(rawMetadata, patch = {}) {
  const metadata = safeJsonParse(rawMetadata, {});

  const merged = {
    ...metadata,
    ...patch,
    inboxRouting: {
      ...(metadata.inboxRouting || {}),
      ...(patch.inboxRouting || {})
    },
    ownership: {
      ...(metadata.ownership || {}),
      ...(patch.ownership || {})
    },
    collaboration: {
      ...(metadata.collaboration || {}),
      ...(patch.collaboration || {})
    },
    sla: {
      ...(metadata.sla || {}),
      ...(patch.sla || {})
    }
  };

  return JSON.stringify(merged);
}

function getConversationFlags(conversation) {
  const metadata = safeJsonParse(conversation?.metadata, {});
  const routing = metadata.inboxRouting || {};
  const ownership = metadata.ownership || {};
  const collaboration = metadata.collaboration || {};
  const sla = metadata.sla || {};

  return {
    sessionId: getSessionIdFromMetadata(conversation?.metadata),
    queueKey: routing.queueKey || buildQueueKeyFromStatus(conversation?.status),
    detectedLanguage: routing.detectedLanguage || null,
    detectedCountry: routing.detectedCountry || null,
    detectedDepartment: routing.detectedDepartment || null,
    customerType: routing.customerType || null,
    assignmentStrategy: routing.assignmentStrategy || null,
    ownerLock: ownership || {},
    collaboration,
    sla
  };
}

module.exports = {
  ASSIGNED_QUEUE_STATUSES,
  CLOSED_CHAT_STATUSES,
  CLOSED_QUEUE_STATUSES,
  OPEN_CHAT_STATUSES,
  PENDING_QUEUE_STATUSES,
  WAITING_QUEUE_STATUSES,
  safeJsonParse,
  buildQueueKeyFromStatus,
  buildConversationMetadata,
  getConversationFlags,
  getSessionIdFromMetadata
};
