const { getSharedPrismaClient } = require('./sharedDatabase');
const { normalizeBotText } = require('./botRuleEngine');

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function parseChannels(value) {
  const parsed = parseJsonArray(value);
  return parsed.length > 0 ? parsed : ['WHATSAPP', 'FACEBOOK'];
}

function flowSupportsChannel(flow, channel) {
  return parseChannels(flow.channels).includes(channel);
}

function matchReply(text, keywords) {
  const normalized = normalizeBotText(text);
  if (!normalized) return false;
  return keywords.some((k) => {
    const kw = normalizeBotText(String(k || ''));
    return kw && normalized.includes(kw);
  });
}

async function getFlowWithSteps(prisma, flowId) {
  return prisma.whatsAppFollowUpFlow.findUnique({
    where: { id: flowId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
}

function buildInteractiveState(waitingForStepId, channel) {
  return JSON.stringify({ waitingForStepId, channel, startedAt: new Date().toISOString() });
}

function parseState(value) {
  if (!value) return {};
  try {
    return JSON.parse(value) || {};
  } catch (e) {
    return {};
  }
}

/**
 * ابدأ فلو تفاعلي لعميل: يرسل أول خطوة وينتظر رده.
 */
async function startInteractiveFlow({ companyId, customerId, channel, flowId, sendStep }) {
  const prisma = getSharedPrismaClient();
  const flow = await getFlowWithSteps(prisma, flowId);
  if (!flow || flow.companyId !== companyId || flow.isEnabled !== true) {
    return { success: false, reason: 'NO_FLOW' };
  }
  if (!flowSupportsChannel(flow, channel)) {
    return { success: false, reason: 'CHANNEL_NOT_SUPPORTED' };
  }
  if (!flow.steps || flow.steps.length === 0) {
    return { success: false, reason: 'NO_STEPS' };
  }

  const existing = await prisma.customerJourney.findFirst({
    where: { companyId, customerId, flowId, status: 'ACTIVE' },
  });
  if (existing) {
    return { success: false, reason: 'ALREADY_ACTIVE' };
  }

  const firstStep = flow.steps[0];
  const journey = await prisma.customerJourney.create({
    data: {
      companyId,
      customerId,
      flowId,
      currentStep: 0,
      status: 'ACTIVE',
      nextSendAt: new Date(),
      interactiveState: buildInteractiveState(firstStep.id, channel),
      logs: `Started interactive flow "${flow.name}" at ${new Date().toISOString()}`,
    },
  });

  if (sendStep && typeof sendStep === 'function') {
    try {
      await sendStep(firstStep);
    } catch (e) {
      console.error('[BOT-FLOW] Failed to send first step:', e.message);
    }
  }

  return { success: true, journeyId: journey.id, firstStepId: firstStep.id };
}

/**
 * عند رسالة من العميل: لو فيه فلو تفاعلي مستني رده وطابق كلمة → يقدّم للخطوة الجاية.
 * بترجع { handled: true } لو استهلكت الرسالة (يتقفز الـ AI والقواعد) وإلا { handled: false }.
 */
async function onCustomerReply({ companyId, customerId, channel, text, sendStep }) {
  const prisma = getSharedPrismaClient();
  const journey = await prisma.customerJourney.findFirst({
    where: { companyId, customerId, status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!journey) return { handled: false };

  const state = parseState(journey.interactiveState);
  if (!state.waitingForStepId) return { handled: false };
  if (state.channel && state.channel !== channel) return { handled: false };

  const flow = await getFlowWithSteps(prisma, journey.flowId);
  if (!flow) return { handled: false };

  const waitingStep = flow.steps.find((s) => s.id === state.waitingForStepId);
  if (!waitingStep || waitingStep.expectReply !== true) return { handled: false };

  const keywords = parseJsonArray(waitingStep.replyKeywords);
  if (keywords.length === 0) return { handled: false };
  if (!matchReply(text, keywords)) return { handled: false };

  const targetStep =
    flow.steps.find((s) => s.id === waitingStep.nextStepId) ||
    flow.steps.find((s) => s.stepOrder === (waitingStep.stepOrder || 0) + 1);

  if (!targetStep) {
    await prisma.customerJourney.update({
      where: { id: journey.id },
      data: {
        status: 'COMPLETED',
        interactiveState: null,
        logs: `${journey.logs || ''}\nCompleted after reply at ${new Date().toISOString()}`,
        updatedAt: new Date(),
      },
    });
    return { handled: true, completed: true };
  }

  if (targetStep.expectReply === true) {
    await prisma.customerJourney.update({
      where: { id: journey.id },
      data: {
        currentStep: Math.max(0, targetStep.stepOrder - 1),
        interactiveState: buildInteractiveState(targetStep.id, channel),
        logs: `${journey.logs || ''}\nAdvanced to step ${targetStep.stepOrder} at ${new Date().toISOString()}`,
        updatedAt: new Date(),
      },
    });
    if (sendStep && typeof sendStep === 'function') {
      try {
        await sendStep(targetStep);
      } catch (e) {
        console.error('[BOT-FLOW] Failed to send next interactive step:', e.message);
      }
    }
    return { handled: true, nextStepId: targetStep.id };
  }

  const nextSendAt = new Date();
  if (targetStep.delayUnit === 'HOURS' && targetStep.delayHours != null) {
    nextSendAt.setHours(nextSendAt.getHours() + Number(targetStep.delayHours));
  } else {
    nextSendAt.setDate(nextSendAt.getDate() + (Number(targetStep.delayDays) || 0));
  }

  await prisma.customerJourney.update({
    where: { id: journey.id },
    data: {
      currentStep: Math.max(0, targetStep.stepOrder - 1),
      interactiveState: null,
      nextSendAt,
      logs: `${journey.logs || ''}\nScheduled step ${targetStep.stepOrder} at ${nextSendAt.toISOString()}`,
      updatedAt: new Date(),
    },
  });
  return { handled: true, nextStepId: targetStep.id, scheduled: true };
}

/**
 * معالجة الخطوات المتفاعلة اللي فات موعدها (timeout).
 * بيقدّم للحالة الجاية المحددة أو يكمل اللي بعدها — بتحويلها لجدولة عادية.
 */
async function processInteractiveTimeouts(now = new Date()) {
  const prisma = getSharedPrismaClient();
  const journeys = await prisma.customerJourney.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, flowId: true, interactiveState: true, logs: true },
  });

  for (const journey of journeys) {
    const state = parseState(journey.interactiveState);
    if (!state.waitingForStepId || !state.startedAt) continue;

    const flow = await getFlowWithSteps(prisma, journey.flowId);
    if (!flow) continue;
    const waitingStep = flow.steps.find((s) => s.id === state.waitingForStepId);
    if (!waitingStep || waitingStep.expectReply !== true || !waitingStep.timeoutHours) continue;

    const startedAt = new Date(state.startedAt);
    const deadline = new Date(startedAt.getTime() + Number(waitingStep.timeoutHours) * 3600000);
    if (now < deadline) continue;

    const timeoutTarget =
      flow.steps.find((s) => s.id === waitingStep.timeoutNextStepId) ||
      flow.steps.find((s) => s.stepOrder === (waitingStep.stepOrder || 0) + 1);

    if (!timeoutTarget) {
      await prisma.customerJourney.update({
        where: { id: journey.id },
        data: { status: 'COMPLETED', interactiveState: null, updatedAt: now },
      });
      continue;
    }

    const nextSendAt = new Date();
    if (timeoutTarget.delayUnit === 'HOURS' && timeoutTarget.delayHours != null) {
      nextSendAt.setHours(nextSendAt.getHours() + Number(timeoutTarget.delayHours));
    } else {
      nextSendAt.setDate(nextSendAt.getDate() + (Number(timeoutTarget.delayDays) || 0));
    }

    await prisma.customerJourney.update({
      where: { id: journey.id },
      data: {
        currentStep: Math.max(0, timeoutTarget.stepOrder - 1),
        interactiveState: null,
        nextSendAt,
        logs: `${journey.logs || ''}\nTimeout → scheduled step ${timeoutTarget.stepOrder} at ${nextSendAt.toISOString()}`,
        updatedAt: now,
      },
    });
  }
}

module.exports = {
  parseJsonArray,
  parseChannels,
  flowSupportsChannel,
  matchReply,
  startInteractiveFlow,
  onCustomerReply,
  processInteractiveTimeouts,
};
