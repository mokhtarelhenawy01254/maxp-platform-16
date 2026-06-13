const { getSharedPrismaClient } = require('./sharedDatabase');
const { safeJsonParse } = require('./whatsappInboxMetadata');

const DEFAULT_ASSIGNMENT_CONFIG = {
  strategy: 'ROUND_ROBIN',
  roundRobin: {
    enabled: true,
    stickyReturningCustomers: true,
    respectOnlineStatus: true,
    respectWorkingHours: true
  },
  leastLoad: {
    activeWeight: 1,
    pendingWeight: 1.5,
    waitingWeight: 1.2,
    unreadWeight: 0.35
  },
  smartRouting: {
    priorityCustomersFirst: true,
    vipRouting: true,
    countryDetection: true,
    languageDetection: true,
    returningCustomerPreference: true,
    previousOwnerPreference: true
  }
};

const DEFAULT_OWNERSHIP_CONFIG = {
  lockDurationMin: 120,
  exclusiveVisibility: true,
  allowAdminOverride: true,
  allowTeamLeaderOverride: true,
  allowModeratorTransferRequest: true,
  transferRequiresNote: false
};

const DEFAULT_QUEUE_CONFIG = {
  maxChatsPerModerator: 25,
  queuePriorityOrder: ['VIP', 'RETURNING', 'NEW'],
  waitingQueueLimit: 500,
  pendingQueueLimit: 200,
  autoMoveAssignedToActiveOnReply: true
};

const DEFAULT_REASSIGNMENT_CONFIG = {
  enabled: true,
  timeoutMinutes: 5,
  reassignOnOffline: true,
  reassignOutsideWorkingHours: true,
  reassignOnCapacityReached: true,
  timeoutWarningMinutes: 3,
  fallbackStrategy: 'LEAST_LOAD'
};

const DEFAULT_SKILL_CONFIG = {
  languages: ['ar', 'en'],
  departments: ['sales', 'support', 'vip'],
  expertise: ['sales', 'support', 'technical', 'vip'],
  vipTeams: [],
  countryRules: [],
  languageRules: [],
  customerTypeRules: []
};

const DEFAULT_SLA_CONFIG = {
  firstResponseMinutes: 5,
  maxWaitingMinutes: 15,
  escalationMinutes: 20,
  missedChatMinutes: 30
};

const DEFAULT_NOTIFICATION_CONFIG = {
  realTimeNotifications: true,
  assignmentAlerts: true,
  queueAlerts: true,
  timeoutWarnings: true,
  soundNotifications: true
};

const DEFAULT_ASSIGNMENT_STATE = {
  roundRobinIndexByScope: {},
  lastAssignedUserByCustomer: {}
};

function mergeDefaults(value, defaults) {
  const parsed = safeJsonParse(value, defaults);
  return {
    ...defaults,
    ...parsed
  };
}

function normalizeSettingsRecord(record) {
  const base = {
    defaultChatStatus: record?.defaultChatStatus || 'NEW',
    autoCloseEnabled: Boolean(record?.autoCloseEnabled),
    autoCloseAfterMin: record?.autoCloseAfterMin ?? 1440,
    archiveAfterDays: record?.archiveAfterDays ?? 30,
    retentionDays: record?.retentionDays ?? 365,
    maxChatsPerModerator: record?.maxChatsPerModerator ?? 25,
    allowTransfer: record?.allowTransfer !== false,
    requireNoteOnClose: Boolean(record?.requireNoteOnClose),
    notifyOnNewChat: record?.notifyOnNewChat !== false,
    notifyOnTransfer: record?.notifyOnTransfer !== false,
    notifyOnClose: Boolean(record?.notifyOnClose),
    browserPushEnabled: record?.browserPushEnabled !== false,
    soundEnabled: record?.soundEnabled !== false,
    soundUrl: record?.soundUrl || '/notification.mp3',
    notificationSound: record?.soundUrl || '/notification.mp3',
    workingHoursEnabled: Boolean(record?.workingHoursEnabled),
    workingHoursStart: record?.workingHoursStart || '09:00',
    workingHoursEnd: record?.workingHoursEnd || '17:00',
    workingDays: record?.workingDays || 'SAT,SUN,MON,TUE,WED,THU'
  };

  return {
    ...base,
    assignmentConfig: mergeDefaults(record?.assignmentConfig, DEFAULT_ASSIGNMENT_CONFIG),
    ownershipConfig: mergeDefaults(record?.ownershipConfig, DEFAULT_OWNERSHIP_CONFIG),
    queueConfig: {
      ...DEFAULT_QUEUE_CONFIG,
      ...safeJsonParse(record?.queueConfig, {})
    },
    reassignmentConfig: mergeDefaults(record?.reassignmentConfig, DEFAULT_REASSIGNMENT_CONFIG),
    skillConfig: mergeDefaults(record?.skillConfig, DEFAULT_SKILL_CONFIG),
    slaConfig: mergeDefaults(record?.slaConfig, DEFAULT_SLA_CONFIG),
    notificationConfig: mergeDefaults(record?.notificationConfig, DEFAULT_NOTIFICATION_CONFIG),
    assignmentState: mergeDefaults(record?.assignmentState, DEFAULT_ASSIGNMENT_STATE)
  };
}

function serializeSettingsPayload(payload = {}) {
  const baseFields = [
    'defaultChatStatus',
    'autoCloseEnabled',
    'autoCloseAfterMin',
    'archiveAfterDays',
    'retentionDays',
    'maxChatsPerModerator',
    'allowTransfer',
    'requireNoteOnClose',
    'notifyOnNewChat',
    'notifyOnTransfer',
    'notifyOnClose',
    'browserPushEnabled',
    'soundEnabled',
    'workingHoursEnabled',
    'workingHoursStart',
    'workingHoursEnd',
    'workingDays'
  ];

  const serialized = {};

  for (const field of baseFields) {
    if (payload[field] !== undefined) {
      serialized[field] = payload[field];
    }
  }

  if (payload.soundUrl !== undefined) {
    serialized.soundUrl = payload.soundUrl;
  } else if (payload.notificationSound !== undefined) {
    serialized.soundUrl = payload.notificationSound;
  }

  if (payload.assignmentConfig !== undefined) {
    serialized.assignmentConfig = JSON.stringify({
      ...DEFAULT_ASSIGNMENT_CONFIG,
      ...payload.assignmentConfig
    });
  }

  if (payload.ownershipConfig !== undefined) {
    serialized.ownershipConfig = JSON.stringify({
      ...DEFAULT_OWNERSHIP_CONFIG,
      ...payload.ownershipConfig
    });
  }

  if (payload.queueConfig !== undefined) {
    serialized.queueConfig = JSON.stringify({
      ...DEFAULT_QUEUE_CONFIG,
      ...payload.queueConfig
    });
    if (serialized.maxChatsPerModerator === undefined && payload.queueConfig.maxChatsPerModerator !== undefined) {
      serialized.maxChatsPerModerator = payload.queueConfig.maxChatsPerModerator;
    }
  }

  if (payload.reassignmentConfig !== undefined) {
    serialized.reassignmentConfig = JSON.stringify({
      ...DEFAULT_REASSIGNMENT_CONFIG,
      ...payload.reassignmentConfig
    });
  }

  if (payload.skillConfig !== undefined) {
    serialized.skillConfig = JSON.stringify({
      ...DEFAULT_SKILL_CONFIG,
      ...payload.skillConfig
    });
  }

  if (payload.slaConfig !== undefined) {
    serialized.slaConfig = JSON.stringify({
      ...DEFAULT_SLA_CONFIG,
      ...payload.slaConfig
    });
  }

  if (payload.notificationConfig !== undefined) {
    serialized.notificationConfig = JSON.stringify({
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...payload.notificationConfig
    });
  }

  if (payload.assignmentState !== undefined) {
    serialized.assignmentState = JSON.stringify({
      ...DEFAULT_ASSIGNMENT_STATE,
      ...payload.assignmentState
    });
  }

  return serialized;
}

async function getOrCreateSettings(companyId, prisma = getSharedPrismaClient()) {
  let record = await prisma.inboxSettings.findUnique({
    where: { companyId }
  });

  if (!record) {
    record = await prisma.inboxSettings.create({
      data: { companyId }
    });
  }

  return record;
}

async function getNormalizedSettings(companyId, prisma = getSharedPrismaClient()) {
  const record = await getOrCreateSettings(companyId, prisma);
  return normalizeSettingsRecord(record);
}

module.exports = {
  DEFAULT_ASSIGNMENT_CONFIG,
  DEFAULT_ASSIGNMENT_STATE,
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_OWNERSHIP_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_REASSIGNMENT_CONFIG,
  DEFAULT_SKILL_CONFIG,
  DEFAULT_SLA_CONFIG,
  getOrCreateSettings,
  getNormalizedSettings,
  normalizeSettingsRecord,
  serializeSettingsPayload
};
