const { getSharedPrismaClient } = require('./sharedDatabase');

const ROUTING_MODES = {
  NUMBER_OWNER: 'NUMBER_OWNER',
  ROUND_ROBIN: 'ROUND_ROBIN'
};

const DISTRIBUTION_STRATEGIES = {
  ROUND_ROBIN: 'ROUND_ROBIN'
};

const parseRoutingUserIds = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
      )
    );
  } catch (error) {
    return [];
  }
};

const serializeRoutingUserIds = (userIds = []) =>
  JSON.stringify(
    Array.from(
      new Set(
        userIds
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
      )
    )
  );

const normalizeRoutingMode = (value) =>
  value === ROUTING_MODES.ROUND_ROBIN
    ? ROUTING_MODES.ROUND_ROBIN
    : ROUTING_MODES.NUMBER_OWNER;

const normalizeDistributionStrategy = (value) =>
  value === DISTRIBUTION_STRATEGIES.ROUND_ROBIN
    ? DISTRIBUTION_STRATEGIES.ROUND_ROBIN
    : DISTRIBUTION_STRATEGIES.ROUND_ROBIN;

const mergeConversationMetadata = (rawMetadata, nextFields = {}) => {
  let metadata = {};

  if (rawMetadata) {
    try {
      metadata = JSON.parse(rawMetadata);
    } catch (error) {
      metadata = {};
    }
  }

  return JSON.stringify({
    ...metadata,
    ...nextFields
  });
};

const getAssignmentRoutingUserIds = (assignment) => {
  if (!assignment) return [];

  const mode = normalizeRoutingMode(assignment.routingMode);
  const configuredUserIds = parseRoutingUserIds(assignment.routingUserIds);

  if (mode === ROUTING_MODES.ROUND_ROBIN) {
    return configuredUserIds;
  }

  const directUserId = String(assignment.assignedUserId || '').trim();
  if (directUserId) {
    return [directUserId];
  }

  return configuredUserIds.slice(0, 1);
};

async function getSessionAssignment(sessionId, companyId, prisma = getSharedPrismaClient()) {
  return prisma.whatsAppNumberAssignment.findFirst({
    where: {
      sessionId,
      companyId,
      isActive: true
    }
  });
}

async function resolveConversationAssignee({
  prisma,
  companyId,
  sessionId,
  existingAssignedUserId = null
}) {
  if (existingAssignedUserId) {
    return {
      assignedUserId: existingAssignedUserId,
      routingMode: null,
      assignment: null,
      rotated: false
    };
  }

  const assignment = await prisma.whatsAppNumberAssignment.findFirst({
    where: {
      sessionId,
      companyId,
      isActive: true
    }
  });

  if (!assignment) {
    return {
      assignedUserId: null,
      routingMode: null,
      assignment: null,
      rotated: false
    };
  }

  const routingMode = normalizeRoutingMode(assignment.routingMode);
  const routingUserIds = getAssignmentRoutingUserIds(assignment);

  if (routingUserIds.length === 0) {
    return {
      assignedUserId: null,
      routingMode,
      assignment,
      rotated: false
    };
  }

  const availableUsers = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      id: { in: routingUserIds }
    },
    select: { id: true }
  });

  const availableUserIds = routingUserIds.filter((userId) =>
    availableUsers.some((user) => user.id === userId)
  );

  if (availableUserIds.length === 0) {
    return {
      assignedUserId: null,
      routingMode,
      assignment,
      rotated: false
    };
  }

  if (routingMode === ROUTING_MODES.NUMBER_OWNER) {
    return {
      assignedUserId: availableUserIds[0],
      routingMode,
      assignment,
      rotated: false
    };
  }

  const cursor = assignment.roundRobinCursor || 0;
  const index = cursor % availableUserIds.length;
  const assignedUserId = availableUserIds[index];
  const nextCursor = (index + 1) % availableUserIds.length;

  await prisma.whatsAppNumberAssignment.update({
    where: { sessionId: assignment.sessionId },
    data: {
      roundRobinCursor: nextCursor,
      lastDistributedUserId: assignedUserId,
      lastDistributedAt: new Date()
    }
  });

  return {
    assignedUserId,
    routingMode,
    assignment: {
      ...assignment,
      roundRobinCursor: nextCursor,
      lastDistributedUserId: assignedUserId,
      lastDistributedAt: new Date()
    },
    rotated: true
  };
}

module.exports = {
  ROUTING_MODES,
  DISTRIBUTION_STRATEGIES,
  parseRoutingUserIds,
  serializeRoutingUserIds,
  normalizeRoutingMode,
  normalizeDistributionStrategy,
  mergeConversationMetadata,
  getAssignmentRoutingUserIds,
  getSessionAssignment,
  resolveConversationAssignee
};
