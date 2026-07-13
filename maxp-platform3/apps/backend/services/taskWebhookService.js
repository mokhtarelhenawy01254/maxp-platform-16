const crypto = require('crypto');
const fetch = require('node-fetch');
const { getSharedPrismaClient } = require('./sharedDatabase');
const {
  normalizeWebhookProviderConfig,
  normalizeWebhookProviderType,
  normalizeWebhookEvents,
  parseStoredArray,
  parseStoredObject,
  serializeJson
} = require('./taskIntegrationService');

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RESPONSE_LOG_LENGTH = 4000;

const parseStoredTaskArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const truncate = (value, maxLength = MAX_RESPONSE_LOG_LENGTH) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value);
  return stringValue.length > maxLength
    ? `${stringValue.slice(0, maxLength)}...[truncated]`
    : stringValue;
};

const formatTask = (task) => {
  if (!task) return null;

  return {
    id: task.id,
    companyId: task.companyId,
    projectId: task.projectId || null,
    projectName: task.project?.name || null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    assignedTo: task.assignedTo,
    assignedToName: task.assignee
      ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim()
      : null,
    createdBy: task.createdBy,
    createdByName: task.creator
      ? `${task.creator.firstName} ${task.creator.lastName}`.trim()
      : null,
    dueDate: task.dueDate || null,
    startDate: task.startDate || null,
    completedDate: task.completedDate || null,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    progress: task.progress,
    tags: parseStoredTaskArray(task.tags),
    dependencies: parseStoredTaskArray(task.dependencies),
    categoryId: task.categoryId || null,
    isRecurring: Boolean(task.isRecurring),
    recurringRule: task.recurringRule || null,
    createdAt: task.createdAt || null,
    updatedAt: task.updatedAt || null
  };
};

const buildGenericPayload = ({ event, task, previousTask, actorUserId, requestId }) => ({
  event,
  sentAt: new Date().toISOString(),
  source: 'tasks-module',
  requestId: requestId || null,
  actorUserId: actorUserId || null,
  task: formatTask(task),
  previousTask: formatTask(previousTask)
});

const buildOpenClawMessage = ({ event, task, previousTask, actorUserId, requestId }) => {
  const formattedTask = formatTask(task);
  const formattedPreviousTask = formatTask(previousTask);
  const lines = [
    'You are receiving a task event from the MaxP tasks system.',
    'Treat the payload below as authoritative and do not invent missing fields.',
    '',
    `Task Event: ${event}`,
    `Task ID: ${formattedTask?.id || 'unknown'}`,
    `Task Title: ${formattedTask?.title || 'untitled'}`,
    `Task Status: ${formattedTask?.status || 'unknown'}`,
    `Task Priority: ${formattedTask?.priority || 'unknown'}`,
    `Task Type: ${formattedTask?.type || 'unknown'}`,
    `Project: ${formattedTask?.projectName || formattedTask?.projectId || 'none'}`,
    `Assigned To: ${formattedTask?.assignedToName || formattedTask?.assignedTo || 'unassigned'}`,
    `Created By: ${formattedTask?.createdByName || formattedTask?.createdBy || 'unknown'}`,
    `Progress: ${formattedTask?.progress ?? 0}%`,
    `Due Date: ${formattedTask?.dueDate || 'none'}`,
    `Start Date: ${formattedTask?.startDate || 'none'}`,
    `Estimated Hours: ${formattedTask?.estimatedHours ?? 0}`,
    `Actual Hours: ${formattedTask?.actualHours ?? 0}`,
    `Category ID: ${formattedTask?.categoryId || 'none'}`,
    `Recurring: ${formattedTask?.isRecurring ? 'yes' : 'no'}`,
    `Tags: ${formattedTask?.tags?.length ? formattedTask.tags.join(', ') : 'none'}`,
    `Dependencies: ${formattedTask?.dependencies?.length ? formattedTask.dependencies.join(', ') : 'none'}`,
    `Actor User ID: ${actorUserId || 'unknown'}`,
    `Request ID: ${requestId || 'none'}`,
    '',
    'Task Description:',
    formattedTask?.description || '(empty)'
  ];

  if (formattedPreviousTask) {
    lines.push(
      '',
      'Previous Task Snapshot:',
      JSON.stringify(formattedPreviousTask, null, 2)
    );
  }

  lines.push(
    '',
    'Current Task Snapshot:',
    JSON.stringify(formattedTask, null, 2),
    '',
    'Summarize the change, explain the most important state transition, and propose the next action only if it is justified by the payload.'
  );

  return lines.join('\n');
};

const buildOpenClawPayload = ({ endpoint, event, task, previousTask, actorUserId, requestId }) => {
  const providerConfig = normalizeWebhookProviderConfig(endpoint.providerType, endpoint.providerConfig);
  const payload = {
    message: buildOpenClawMessage({ event, task, previousTask, actorUserId, requestId }),
    name: providerConfig.name || 'Tasks',
    wakeMode: providerConfig.wakeMode || 'now',
    deliver: Boolean(providerConfig.deliver)
  };

  if (providerConfig.agentId) {
    payload.agentId = providerConfig.agentId;
  }

  if (providerConfig.deliver && providerConfig.channel) {
    payload.channel = providerConfig.channel;
  }

  if (providerConfig.deliver && providerConfig.to) {
    payload.to = providerConfig.to;
  }

  if (providerConfig.model) {
    payload.model = providerConfig.model;
  }

  if (providerConfig.thinking) {
    payload.thinking = providerConfig.thinking;
  }

  if (providerConfig.timeoutSeconds) {
    payload.timeoutSeconds = providerConfig.timeoutSeconds;
  }

  if (providerConfig.sessionMode === 'task-scoped') {
    payload.sessionKey = `${providerConfig.sessionKeyPrefix || 'hook:task:'}${task.id}`;
  }

  return payload;
};

const buildOutboundPayload = ({ endpoint, event, task, previousTask, actorUserId, requestId }) => {
  const providerType = normalizeWebhookProviderType(endpoint.providerType);
  if (providerType === 'OPENCLAW') {
    return buildOpenClawPayload({
      endpoint,
      event,
      task,
      previousTask,
      actorUserId,
      requestId
    });
  }

  return buildGenericPayload({
    event,
    task,
    previousTask,
    actorUserId,
    requestId
  });
};

const signPayload = (secret, timestamp, body) => crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

const sendWebhookRequest = async (endpoint, event, payload) => {
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const customHeaders = parseStoredObject(endpoint.customHeaders);
  const headers = {
    'Content-Type': 'application/json',
    'X-Task-Event': event,
    'X-Task-Company-Id': endpoint.companyId || payload.task?.companyId || '',
    'X-Webhook-Timestamp': timestamp,
    ...Object.fromEntries(
      Object.entries(customHeaders).map(([key, value]) => [key, String(value)])
    )
  };

  if (endpoint.signingSecret) {
    headers['X-Task-Signature'] = signPayload(endpoint.signingSecret, timestamp, body);
  }

  const startedAt = Date.now();
  const response = await fetch(endpoint.targetUrl, {
    method: 'POST',
    headers,
    body,
    timeout: DEFAULT_TIMEOUT_MS
  });

  const responseText = await response.text().catch(() => '');

  return {
    durationMs: Date.now() - startedAt,
    requestBody: body,
    responseStatus: response.status,
    responseBody: truncate(responseText),
    success: response.ok
  };
};

const recordDelivery = async (prisma, endpoint, event, attempt) => {
  return prisma.taskWebhookDelivery.create({
    data: {
      webhookId: endpoint.id,
      companyId: endpoint.companyId,
      event,
      requestBody: attempt.requestBody,
      responseStatus: attempt.responseStatus || null,
      responseBody: attempt.responseBody || null,
      success: attempt.success,
      errorMessage: attempt.errorMessage || null,
      durationMs: attempt.durationMs || null
    }
  });
};

const updateEndpointStats = async (prisma, endpointId, attempt) => {
  await prisma.taskWebhookEndpoint.update({
    where: { id: endpointId },
    data: {
      lastTriggeredAt: new Date(),
      ...(attempt.success
        ? { lastSuccessAt: new Date(), failureCount: 0 }
        : { failureCount: { increment: 1 } })
    }
  }).catch((updateError) => {
    console.error('⚠️ [TASK-WEBHOOK] Failed to update endpoint stats:', updateError.message);
  });
};

const deliverToEndpoint = async (prisma, endpoint, event, payload) => {
  try {
    const attempt = await sendWebhookRequest(endpoint, event, payload);

    if (!attempt.success) {
      attempt.errorMessage = `Webhook failed with status ${attempt.responseStatus}`;
    }

    const recordedDelivery = await recordDelivery(prisma, endpoint, event, attempt);
    await updateEndpointStats(prisma, endpoint.id, attempt);

    return {
      success: attempt.success,
      endpointId: endpoint.id,
      deliveryId: recordedDelivery.id,
      responseStatus: attempt.responseStatus || null,
      errorMessage: attempt.errorMessage || null
    };
  } catch (error) {
    const failedAttempt = {
      requestBody: serializeJson(payload, '{}'),
      responseStatus: null,
      responseBody: null,
      success: false,
      errorMessage: truncate(error.message),
      durationMs: null
    };

    const recordedDelivery = await recordDelivery(prisma, endpoint, event, failedAttempt);
    await updateEndpointStats(prisma, endpoint.id, failedAttempt);

    return {
      success: false,
      endpointId: endpoint.id,
      deliveryId: recordedDelivery.id,
      responseStatus: null,
      errorMessage: failedAttempt.errorMessage
    };
  }
};

const dispatchTaskWebhooks = async ({ event, task, previousTask = null, companyId, actorUserId, requestId }) => {
  if (!event || !companyId || !task) {
    return { skipped: true, reason: 'missing_context' };
  }

  const prisma = getSharedPrismaClient();
  const endpoints = await prisma.taskWebhookEndpoint.findMany({
    where: {
      companyId,
      isActive: true
    },
    orderBy: { createdAt: 'asc' }
  });

  const matchingEndpoints = endpoints.filter((endpoint) =>
    normalizeWebhookEvents(parseStoredArray(endpoint.subscribedEvents)).includes(event)
  );

  if (matchingEndpoints.length === 0) {
    return { skipped: true, reason: 'disabled_or_unconfigured' };
  }

  const results = await Promise.all(
    matchingEndpoints.map((endpoint) => {
      const payload = buildOutboundPayload({
        endpoint,
        event,
        task,
        previousTask,
        actorUserId,
        requestId
      });

      return deliverToEndpoint(prisma, endpoint, event, payload);
    })
  );

  const failures = results.filter((result) => !result.success);
  failures.forEach((result) => {
    console.error('❌ [TASK-WEBHOOK] Delivery failed:', result.errorMessage || `endpoint ${result.endpointId}`);
  });

  return {
    success: failures.length === 0,
    attempted: matchingEndpoints.length,
    delivered: matchingEndpoints.length - failures.length,
    failed: failures.length
  };
};

const testTaskWebhook = async ({
  webhookId,
  companyId,
  event,
  task,
  previousTask = null,
  actorUserId,
  requestId
}) => {
  if (!webhookId || !companyId || !event || !task) {
    return { skipped: true, reason: 'missing_context' };
  }

  const prisma = getSharedPrismaClient();
  const endpoint = await prisma.taskWebhookEndpoint.findFirst({
    where: {
      id: webhookId,
      companyId
    }
  });

  if (!endpoint) {
    const error = new Error('Webhook غير موجود');
    error.statusCode = 404;
    throw error;
  }

  const payload = buildOutboundPayload({
    endpoint,
    event,
    task,
    previousTask,
    actorUserId,
    requestId
  });

  const result = await deliverToEndpoint(prisma, endpoint, event, payload);

  return {
    success: result.success,
    attempted: 1,
    delivered: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    endpointId: endpoint.id,
    deliveryId: result.deliveryId,
    responseStatus: result.responseStatus,
    errorMessage: result.errorMessage || null
  };
};

const retryTaskWebhookDelivery = async ({
  webhookId,
  deliveryId,
  companyId
}) => {
  if (!webhookId || !deliveryId || !companyId) {
    return { skipped: true, reason: 'missing_context' };
  }

  const prisma = getSharedPrismaClient();

  const [endpoint, previousDelivery] = await Promise.all([
    prisma.taskWebhookEndpoint.findFirst({
      where: {
        id: webhookId,
        companyId
      }
    }),
    prisma.taskWebhookDelivery.findFirst({
      where: {
        id: deliveryId,
        webhookId,
        companyId
      }
    })
  ]);

  if (!endpoint) {
    const error = new Error('Webhook غير موجود');
    error.statusCode = 404;
    throw error;
  }

  if (!previousDelivery) {
    const error = new Error('سجل التسليم غير موجود');
    error.statusCode = 404;
    throw error;
  }

  let parsedPayload = {};
  try {
    parsedPayload = previousDelivery.requestBody
      ? JSON.parse(previousDelivery.requestBody)
      : {};
  } catch (_error) {
    const error = new Error('لا يمكن إعادة إرسال delivery محفوظة بصيغة غير صالحة');
    error.statusCode = 400;
    throw error;
  }

  const result = await deliverToEndpoint(
    prisma,
    endpoint,
    previousDelivery.event,
    parsedPayload
  );

  return {
    success: result.success,
    attempted: 1,
    delivered: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    endpointId: endpoint.id,
    deliveryId: result.deliveryId,
    retriedFromDeliveryId: previousDelivery.id,
    responseStatus: result.responseStatus,
    errorMessage: result.errorMessage || null
  };
};

const queueTaskWebhook = (event, options) => {
  if (!event || !options?.companyId || !options?.task) {
    return;
  }

  setTimeout(() => {
    dispatchTaskWebhooks({ event, ...options }).catch((error) => {
      console.error('❌ [TASK-WEBHOOK] Unexpected dispatch error:', error.message);
    });
  }, 0);
};

module.exports = {
  dispatchTaskWebhooks,
  queueTaskWebhook,
  retryTaskWebhookDelivery,
  testTaskWebhook
};
