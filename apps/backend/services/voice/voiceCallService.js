/**
 * Voice Call Service (MaxP Platform)
 * Provider-agnostic engine for automated and manual outbound voice order confirmations.
 * Integrates with Vapi, Retell, and telephony gateways with low-latency tool execution.
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../sharedDatabase');
const orderConfirmationService = require('../orderConfirmationService');
const {
  DEFAULT_SETTINGS,
  normalizeCallingPhone,
  isCallingWindowPermitted,
  nextWindowStart,
  resolveVoiceCredentials,
} = require('./voiceCallHelpers');

/**
 * Helper to load either a regular Order or a GuestOrder seamlessly
 */
async function loadCallTarget(prisma, { companyId, orderId, guestOrderId, orderNumber }) {
  let order = null;
  let guestOrder = null;

  // 1. Try regular Order if orderId or orderNumber provided
  if (orderId || orderNumber) {
    order = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [
          orderId ? { id: orderId } : undefined,
          orderNumber ? { orderNumber } : undefined,
        ].filter(Boolean),
      },
      include: {
        orderItems: { include: { product: true } },
      },
    });
  }

  // 2. Try GuestOrder if guestOrderId provided or if regular order wasn't found
  if (!order && (guestOrderId || orderId || orderNumber)) {
    guestOrder = await prisma.guestOrder.findFirst({
      where: {
        companyId,
        OR: [
          guestOrderId ? { id: guestOrderId } : undefined,
          orderId ? { id: orderId } : undefined,
          orderNumber ? { orderNumber } : undefined,
        ].filter(Boolean),
      },
    });
  }

  if (!order && !guestOrder) {
    throw new Error('الطلب غير موجود');
  }

  if (order) {
    return {
      isGuest: false,
      raw: order,
      orderId: order.id,
      guestOrderId: null,
      orderNumber: order.orderNumber,
      phone: order.customerPhone,
      customerName: order.customerName || 'عميل المتجر',
      total: Number(order.total || 0),
      address: order.customerAddress || order.city || '',
      governorate: order.governorate || '',
      callAttempts: order.callAttempts || 0,
      itemsSummary: order.orderItems?.map((i) => `${i.product?.name || i.name} (عدد ${i.qty || 1})`).join('، ') || '',
    };
  }

  // Guest order parsing
  let guestItemsSummary = '';
  try {
    const parsed = typeof guestOrder.items === 'string' ? JSON.parse(guestOrder.items) : guestOrder.items;
    if (Array.isArray(parsed)) {
      guestItemsSummary = parsed.map((i) => `${i.name || i.title || 'منتج'} (عدد ${i.qty || i.quantity || 1})`).join('، ');
    }
  } catch (_) {}

  return {
    isGuest: true,
    raw: guestOrder,
    orderId: null,
    guestOrderId: guestOrder.id,
    orderNumber: guestOrder.orderNumber,
    phone: guestOrder.guestPhone,
    customerName: guestOrder.guestName || 'عميل المتجر',
    total: Number(guestOrder.finalTotal || guestOrder.total || 0),
    address: guestOrder.guestAddress || guestOrder.guestCity || '',
    governorate: guestOrder.guestGovernorate || '',
    callAttempts: guestOrder.callAttempts || 0,
    itemsSummary: guestItemsSummary,
  };
}

/**
 * Dispatch an outbound order confirmation phone call
 */
async function dispatchOrderConfirmationCall({
  companyId,
  orderId,
  guestOrderId,
  orderNumber,
  customerPhone,
  customerName = '',
  itemsSummary = '',
  total = 0,
  address = '',
  governorate = '',
  force = false,
  userId = null,
}) {
  if (!companyId || (!orderId && !guestOrderId && !orderNumber)) {
    throw new Error('companyId and orderId or orderNumber are required');
  }

  const prisma = getSharedPrismaClient();
  const targetInfo = await loadCallTarget(prisma, { companyId, orderId, guestOrderId, orderNumber });

  // Read company voiceSettings and fallback to OrderConfirmationSettings
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true },
  });
  const parsedCompanySettings = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
  const voiceSettings = parsedCompanySettings.voiceSettings || {};

  let orderConfNormalized = {};
  try {
    const orderConf = await orderConfirmationService.getSettings(companyId);
    if (orderConf) {
      orderConfNormalized = orderConfirmationService.normalizeSettings(orderConf);
    }
  } catch (_) {}

  const normalizedSettings = {
    ...DEFAULT_SETTINGS,
    ...voiceSettings,
    maxCallsNoAnswer: voiceSettings.maxCallsNoAnswer ?? (orderConfNormalized.maxCallsNoAnswer ?? DEFAULT_SETTINGS.maxCallsNoAnswer),
    intervalMinutes: voiceSettings.intervalMinutes ?? (orderConfNormalized.intervalMinutes ?? DEFAULT_SETTINGS.intervalMinutes),
  };

  // Calling window check: must receive normalizedSettings
  if (!force && !isCallingWindowPermitted(normalizedSettings)) {
    const scheduledFor = nextWindowStart(normalizedSettings);
    return {
      success: true,
      queued: true,
      scheduled: true,
      scheduledFor: scheduledFor.toISOString(),
      reason: 'OUTSIDE_CALLING_HOURS',
      message: 'الاتصال خارج ساعات العمل المسموحة. سيتم الجدولة لاحقاً.',
    };
  }

  const destinationPhone = normalizeCallingPhone(customerPhone || targetInfo.phone);
  if (!destinationPhone || destinationPhone.length < 9) {
    throw new Error('رقم هاتف العميل غير صالح للاتصال');
  }

  const maxCalls = normalizedSettings.maxCallsNoAnswer;
  if (!force && maxCalls > 0 && (targetInfo.callAttempts || 0) >= maxCalls) {
    throw new Error(`تم الوصول للحد الأقصى لمحاولات الاتصال (${maxCalls} محاولات)`);
  }

  // Idempotency gate via ai_runtime_ledger: prevent double dialing for the same attempt
  const attemptNo = (targetInfo.callAttempts || 0) + 1;
  const queueKey = `call:${companyId}:${targetInfo.orderNumber}`;

  try {
    await prisma.aiRuntimeLedger.create({
      data: {
        companyId,
        channel: 'VOICE_CALL',
        status: 'RUNNING',
        idempotencyKey: `calldial:${companyId}:${targetInfo.orderNumber}:${attemptNo}`,
        metadata: JSON.stringify({
          queueKey,
          companyId,
          orderId: targetInfo.orderId,
          guestOrderId: targetInfo.guestOrderId,
          orderNumber: targetInfo.orderNumber,
          attemptNo,
        }),
      },
    });
  } catch (ledgerErr) {
    if (ledgerErr.code === 'P2002' || ledgerErr.message?.includes('Unique constraint')) {
      return {
        skipped: 'ALREADY_DIALING',
        orderNumber: targetInfo.orderNumber,
        attemptNo,
      };
    }
    throw ledgerErr;
  }

  const productsList = itemsSummary || targetInfo.itemsSummary;
  const finalTotal = total || targetInfo.total;
  const destinationAddress = address || targetInfo.address;
  const destinationGov = governorate || targetInfo.governorate;

  // Determine provider: SIMULATION vs VAPI
  let provider = normalizedSettings.provider || 'SIMULATION';
  let creds = null;
  if (provider !== 'SIMULATION') {
    creds = await resolveVoiceCredentials(companyId, 'VAPI');
    if (!creds?.apiKey) {
      provider = 'SIMULATION';
    }
  }

  const callMetadata = {
    orderId: targetInfo.orderId,
    guestOrderId: targetInfo.guestOrderId,
    orderNumber: targetInfo.orderNumber,
    companyId,
    queueKey,
    customerName: customerName || targetInfo.customerName,
    destinationPhone,
    productsList,
    total: finalTotal,
    address: destinationAddress,
    governorate: destinationGov,
    userId,
    attemptNo,
  };

  let callResult = null;

  if (provider === 'VAPI' && creds?.apiKey) {
    try {
      const vapiPayload = {
        name: `Order Confirmation - ${targetInfo.orderNumber}`,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || undefined,
        customer: {
          number: destinationPhone,
          name: customerName || targetInfo.customerName,
        },
        assistant: {
          firstMessage: `أهلاً بحضرتك يا فندم! معاك منى من خدمة العملاء. بخصوص الأوردر رقم ${targetInfo.orderNumber} اللي سجلته على موقعنا، حابة أتأكد من بيانات التوصيل وأأكد الأوردر لحضرتك؟`,
          model: {
            provider: 'deepseek',
            model: 'deepseek-chat',
            systemPrompt: `أنتِ منى، منسقة تأكيد الطلبات. تحدثي باللهجة المصرية الودودة الموجزة. هدف المكالمة تأكيد الطلب رقم ${targetInfo.orderNumber} المحتوي على: ${productsList} بإجمالي ${finalTotal} جنيه والعنوان: ${destinationAddress} - ${destinationGov}. إذا وافق العميل استدعي order_confirm. إذا طلب تعديل استدعي order_update_details. إذا طلب إلغاء استدعي order_cancel. مدة المكالمة أقل من دقيقة.`,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'order_confirm',
                  description: 'تأكيد الطلب وتمريره لشركة الشحن',
                  parameters: {
                    type: 'object',
                    properties: {
                      notes: { type: 'string', description: 'ملاحظات العميل' },
                    },
                  },
                },
              },
              {
                type: 'function',
                function: {
                  name: 'order_update_details',
                  description: 'تعديل العنوان أو رقم الهاتف أو بيانات التوصيل',
                  parameters: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      city: { type: 'string' },
                      governorate: { type: 'string' },
                      notes: { type: 'string' },
                    },
                  },
                },
              },
              {
                type: 'function',
                function: {
                  name: 'order_cancel',
                  description: 'إلغاء الطلب بناء على رغبة العميل',
                  parameters: {
                    type: 'object',
                    properties: {
                      reason: { type: 'string', description: 'سبب الإلغاء' },
                    },
                    required: ['reason'],
                  },
                },
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: 'eleven_multilingual_v2',
          },
        },
        metadata: callMetadata,
      };

      const response = await axios.post('https://api.vapi.ai/call/phone', vapiPayload, {
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      callResult = {
        callId: response.data?.id,
        status: response.data?.status || 'queued',
        provider: 'VAPI',
      };
    } catch (apiErr) {
      console.error('[VOICE-CALL] Vapi dispatch error:', apiErr.response?.data || apiErr.message);
      throw new Error(`فشل إطلاق المكالمة عبر مزود الصوت: ${apiErr.response?.data?.message || apiErr.message}`);
    }
  } else {
    callResult = {
      callId: `sim_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'simulated_queued',
      provider: 'SIMULATION',
    };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (targetInfo.orderId) {
      await tx.order.update({
        where: { id: targetInfo.orderId },
        data: {
          callAttempts: { increment: 1 },
          lastCallAttemptAt: now,
        },
      });
    } else if (targetInfo.guestOrderId) {
      await tx.guestOrder.update({
        where: { id: targetInfo.guestOrderId },
        data: {
          callAttempts: { increment: 1 },
          lastCallAt: now,
        },
      });
    }

    let validUserId = null;
    if (userId) {
      const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    if (!validUserId) {
      try {
        const { ensureBridgeUser } = require('../aiBridgeIdentity');
        const bridgeUser = await ensureBridgeUser(companyId);
        if (bridgeUser) validUserId = bridgeUser.id;
      } catch (_) {}
    }

    if (!validUserId) {
      const adminUser = await tx.user.findFirst({
        where: { companyId },
        select: { id: true },
      });
      validUserId = adminUser?.id || null;
    }

    if (validUserId) {
      await tx.callAttemptLog.create({
        data: {
          companyId,
          orderId: targetInfo.orderId,
          guestOrderId: targetInfo.guestOrderId,
          userId: validUserId,
          customerPhone: destinationPhone,
          result: 'pending',
          notes: `مكالمة ذكاء اصطناعي صوتية (${callResult.provider}) - معرف المكالمة: ${callResult.callId}`,
          createdAt: now,
        },
      });
    }
  });

  // Map providerCallId in ledger for secure webhook lookup
  try {
    await prisma.aiRuntimeLedger.create({
      data: {
        companyId,
        channel: 'VOICE_CALL',
        status: 'COMPLETED',
        idempotencyKey: `callid:${callResult.callId}`,
        metadata: JSON.stringify({
          queueKey,
          companyId,
          orderId: targetInfo.orderId,
          guestOrderId: targetInfo.guestOrderId,
          orderNumber: targetInfo.orderNumber,
          attemptNo,
          provider: callResult.provider,
        }),
      },
    });
  } catch (_) {}

  // If SIMULATION, complete call outcome deterministically (default: reached)
  if (callResult.provider === 'SIMULATION') {
    const simOutcome = normalizedSettings.simulatedOutcome || 'reached';
    await handleVoiceCallCompleted({
      callId: callResult.callId,
      provider: 'SIMULATION',
      status: simOutcome === 'reached' ? 'completed' : (simOutcome === 'busy' ? 'busy' : 'no-answer'),
      durationSeconds: simOutcome === 'reached' ? 45 : 0,
      recordingUrl: 'https://cdn.maxp.local/recordings/simulated_call.opus',
      transcript: 'محاكاة: تم تأكيد الأوردر بنجاح مع العميل في بيئة الاختبار.',
      summary: `محاكاة مكالمة (${simOutcome})`,
      metadata: {
        orderId: targetInfo.orderId,
        guestOrderId: targetInfo.guestOrderId,
        companyId,
        queueKey,
        orderNumber: targetInfo.orderNumber,
        outcome: simOutcome,
      },
    });
  }

  return {
    success: true,
    callId: callResult.callId,
    provider: callResult.provider,
    status: callResult.status,
    phone: destinationPhone,
    orderNumber: targetInfo.orderNumber,
    orderId: targetInfo.orderId,
    guestOrderId: targetInfo.guestOrderId,
  };
}

/**
 * Handle function calling requested by the Voice Agent during live conversation
 */
async function handleVoiceToolCall({ companyId, orderId, guestOrderId, orderNumber, toolName, parameters = {} }) {
  if (!companyId || (!orderId && !guestOrderId && !orderNumber)) {
    throw new Error('companyId and order reference are required for tool execution');
  }

  const prisma = getSharedPrismaClient();
  const targetInfo = await loadCallTarget(prisma, { companyId, orderId, guestOrderId, orderNumber });

  const voiceCallQueue = require('./voiceCallQueue');

  switch (toolName) {
    case 'order_confirm': {
      let result = null;
      if (targetInfo.orderId) {
        result = await orderConfirmationService.confirmOrder(
          companyId,
          targetInfo.orderId,
          parameters.notes || 'تأكيد تلقائي عبر المكالمة الصوتية للذكاء الاصطناعي'
        );
      } else if (targetInfo.guestOrderId) {
        result = await prisma.guestOrder.update({
          where: { id: targetInfo.guestOrderId },
          data: { status: 'CONFIRMED' },
        });
      }

      await voiceCallQueue.suppressForOrder(companyId, targetInfo.orderNumber);

      return {
        success: true,
        orderStatus: 'CONFIRMED',
        message: 'تم تأكيد الطلب بنجاح وتمريره للشحن',
        details: result,
      };
    }

    case 'order_update_details': {
      const updateData = {};
      if (targetInfo.orderId) {
        if (parameters.address) updateData.customerAddress = parameters.address;
        if (parameters.city) updateData.city = parameters.city;
        if (parameters.governorate) updateData.governorate = parameters.governorate;
        if (parameters.notes) updateData.notes = parameters.notes;

        const updated = await prisma.order.update({
          where: { id: targetInfo.orderId },
          data: updateData,
        });

        return {
          success: true,
          message: 'تم تحديث بيانات التوصيل بنجاح',
          updatedFields: Object.keys(updateData),
          order: { id: updated.id, orderNumber: updated.orderNumber },
        };
      } else if (targetInfo.guestOrderId) {
        if (parameters.address) updateData.guestAddress = parameters.address;
        if (parameters.city) updateData.guestCity = parameters.city;
        if (parameters.governorate) updateData.guestGovernorate = parameters.governorate;

        const updated = await prisma.guestOrder.update({
          where: { id: targetInfo.guestOrderId },
          data: updateData,
        });

        return {
          success: true,
          message: 'تم تحديث بيانات توصيل طلب الضيف بنجاح',
          updatedFields: Object.keys(updateData),
          order: { id: updated.id, orderNumber: updated.orderNumber },
        };
      }
      return { success: false, error: 'Target not found' };
    }

    case 'order_cancel': {
      let result = null;
      if (targetInfo.orderId) {
        result = await orderConfirmationService.cancelOrder(
          companyId,
          targetInfo.orderId,
          parameters.reason || 'إلغاء بناء على رغبة العميل أثناء المكالمة الهاتفية'
        );
      } else if (targetInfo.guestOrderId) {
        result = await prisma.guestOrder.update({
          where: { id: targetInfo.guestOrderId },
          data: { status: 'CANCELLED' },
        });
      }

      await voiceCallQueue.suppressForOrder(companyId, targetInfo.orderNumber);

      return {
        success: true,
        orderStatus: 'CANCELLED',
        message: 'تم إلغاء الطلب بناء على رغبة العميل',
        details: result,
      };
    }

    default:
      return { success: false, error: `Unknown tool name: ${toolName}` };
  }
}

/**
 * Handle call completion webhook (recording, transcript, final status)
 */
async function handleVoiceCallCompleted({
  callId,
  provider = 'VAPI',
  status = 'completed',
  durationSeconds = 0,
  recordingUrl = null,
  transcript = null,
  summary = null,
  metadata = {},
}) {
  const { orderId, guestOrderId, companyId, queueKey, orderNumber } = metadata;
  if ((!orderId && !guestOrderId && !orderNumber) || !companyId) {
    console.warn('[VOICE-CALL] Missing order/company reference in call completion metadata');
    return { success: false, reason: 'MISSING_METADATA' };
  }

  const prisma = getSharedPrismaClient();

  let outcome = 'unreached';
  const statusLower = String(status || '').toLowerCase();

  if (['completed', 'ended', 'answered', 'reached'].includes(statusLower)) {
    outcome = 'reached';
  } else if (['busy', 'line-busy'].includes(statusLower)) {
    outcome = 'busy';
  } else if (['no-answer', 'timeout', 'unanswered', 'no_answer', 'unreached'].includes(statusLower)) {
    outcome = 'no_answer';
  } else if (['wrong-number', 'invalid-number', 'wrong_number'].includes(statusLower)) {
    outcome = 'wrong_number';
  } else if (['failed'].includes(statusLower)) {
    outcome = 'failed';
  }

  const notesText = [
    `نتيجة المكالمة الصوتية: ${outcome}`,
    durationSeconds ? `المدة: ${durationSeconds} ثانية` : '',
    summary ? `الملخص: ${summary}` : '',
    recordingUrl ? `التسجيل: ${recordingUrl}` : '',
    transcript ? `التفريغ: ${transcript.substring(0, 300)}...` : '',
  ].filter(Boolean).join(' | ');

  // Update pending CallAttemptLog
  const pendingLog = await prisma.callAttemptLog.findFirst({
    where: {
      companyId,
      OR: [
        orderId ? { orderId } : undefined,
        guestOrderId ? { guestOrderId } : undefined,
      ].filter(Boolean),
      result: 'pending',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (pendingLog) {
    await prisma.callAttemptLog.update({
      where: { id: pendingLog.id },
      data: {
        result: outcome,
        notes: notesText,
        durationSeconds: Number(durationSeconds || 0),
        recordingUrl: recordingUrl || pendingLog.recordingUrl,
      },
    });
  } else {
    let validUserId = null;
    try {
      const { ensureBridgeUser } = require('../aiBridgeIdentity');
      const bridgeUser = await ensureBridgeUser(companyId);
      if (bridgeUser) validUserId = bridgeUser.id;
    } catch (_) {}

    if (!validUserId) {
      const adminUser = await prisma.user.findFirst({
        where: { companyId },
        select: { id: true },
      });
      validUserId = adminUser?.id || null;
    }

    if (validUserId) {
      await prisma.callAttemptLog.create({
        data: {
          companyId,
          orderId: orderId || null,
          guestOrderId: guestOrderId || null,
          userId: validUserId,
          result: outcome,
          notes: notesText,
          durationSeconds: Number(durationSeconds || 0),
          recordingUrl: recordingUrl || null,
        },
      });
    }
  }

  // Update corresponding queue job if exists
  try {
    const voiceCallQueue = require('./voiceCallQueue');
    const computedQueueKey = queueKey || (orderNumber ? `call:${companyId}:${orderNumber}` : null);

    let activeJob = null;
    if (computedQueueKey) {
      activeJob = await prisma.aiRuntimeQueueJob.findUnique({
        where: { queueKey: computedQueueKey },
      });
    }

    if (activeJob) {
      await voiceCallQueue.completeJob(activeJob.id, {
        outcome,
        providerCallId: callId,
        durationSeconds,
        recordingUrl,
        notes: notesText,
      });
    }
  } catch (err) {
    console.warn('[VOICE-CALL] Could not complete queue job:', err.message);
  }

  return { success: true, outcome, orderId, guestOrderId };
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeCallingPhone,
  isCallingWindowPermitted,
  nextWindowStart,
  resolveVoiceCredentials,
  dispatchOrderConfirmationCall,
  handleVoiceToolCall,
  handleVoiceCallCompleted,
  loadCallTarget,
};
