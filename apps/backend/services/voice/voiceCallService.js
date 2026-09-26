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
  resolveVoiceCredentials,
} = require('./voiceCallHelpers');

/**
 * Dispatch an outbound order confirmation phone call
 */
async function dispatchOrderConfirmationCall({
  companyId,
  orderId,
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
  if (!companyId || (!orderId && !orderNumber)) {
    throw new Error('companyId and orderId or orderNumber are required');
  }

  const prisma = getSharedPrismaClient();
  const order = await prisma.order.findFirst({
    where: {
      companyId,
      OR: [{ id: orderId || '' }, { orderNumber: orderNumber || orderId || '' }],
    },
    include: {
      orderItems: { include: { product: true } },
    },
  });

  if (!order) {
    throw new Error('الطلب غير موجود');
  }

  if (!force && !isCallingWindowPermitted()) {
    return {
      success: false,
      scheduled: true,
      reason: 'OUTSIDE_CALLING_HOURS',
      message: 'الاتصال خارج ساعات العمل المسموحة (10:00 صباحاً - 10:00 مساءً). سيتم الجدولة لاحقاً.',
    };
  }

  const destinationPhone = normalizeCallingPhone(customerPhone || order.customerPhone);
  if (!destinationPhone || destinationPhone.length < 9) {
    throw new Error('رقم هاتف العميل غير صالح للاتصال');
  }

  const settings = await orderConfirmationService.getSettings(companyId);
  const normalizedSettings = orderConfirmationService.normalizeSettings(settings);
  const maxCalls = normalizedSettings.maxCallsNoAnswer || DEFAULT_SETTINGS.maxCallsNoAnswer;
  if (!force && (order.callAttempts || 0) >= maxCalls) {
    throw new Error(`تم الوصول للحد الأقصى لمحاولات الاتصال (${maxCalls} محاولات)`);
  }

  const productsList = itemsSummary || order.orderItems.map((i) => `${i.product?.name || i.name} (عدد ${i.qty || 1})`).join('، ');
  const finalTotal = total || Number(order.total || 0);
  const destinationAddress = address || order.customerAddress || order.city || '';
  const destinationGov = governorate || order.governorate || '';

  const creds = await resolveVoiceCredentials(companyId, 'VAPI');
  const provider = creds ? 'VAPI' : 'SIMULATION';

  const callMetadata = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    companyId,
    customerName: customerName || order.customerName || 'عميل المتجر',
    destinationPhone,
    productsList,
    total: finalTotal,
    address: destinationAddress,
    governorate: destinationGov,
    userId,
  };

  let callResult = null;

  if (provider === 'VAPI' && creds?.apiKey) {
    try {
      const vapiPayload = {
        name: `Order Confirmation - ${order.orderNumber}`,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || undefined,
        customer: {
          number: destinationPhone,
          name: customerName || order.customerName,
        },
        assistant: {
          firstMessage: `أهلاً بحضرتك يا فندم! معاك منى من خدمة العملاء. بخصوص الأوردر رقم ${order.orderNumber} اللي سجلته على موقعنا، حابة أتأكد من بيانات التوصيل وأأكد الأوردر لحضرتك؟`,
          model: {
            provider: 'deepseek',
            model: 'deepseek-chat',
            systemPrompt: `أنتِ منى، منسقة تأكيد الطلبات. تحدثي باللهجة المصرية الودودة الموجزة. هدف المكالمة تأكيد الطلب رقم ${order.orderNumber} المحتوي على: ${productsList} بإجمالي ${finalTotal} جنيه والعنوان: ${destinationAddress} - ${destinationGov}. إذا وافق العميل استدعي order_confirm. إذا طلب تعديل استدعي order_update_details. إذا طلب إلغاء استدعي order_cancel. مدة المكالمة أقل من دقيقة.`,
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
    await tx.order.update({
      where: { id: order.id },
      data: {
        callAttempts: { increment: 1 },
        lastCallAttemptAt: now,
      },
    });

    let validUserId = null;
    if (userId) {
      const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
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
          orderId: order.id,
          userId: validUserId,
          result: 'pending',
          notes: `مكالمة ذكاء اصطناعي صوتية (${callResult.provider}) - معرف المكالمة: ${callResult.callId}`,
          createdAt: now,
        },
      });
    }
  });

  return {
    success: true,
    callId: callResult.callId,
    provider: callResult.provider,
    status: callResult.status,
    phone: destinationPhone,
    orderNumber: order.orderNumber,
  };
}

/**
 * Handle function calling requested by the Voice Agent during live conversation
 */
async function handleVoiceToolCall({ companyId, orderId, orderNumber, toolName, parameters = {} }) {
  if (!companyId || (!orderId && !orderNumber)) {
    throw new Error('companyId and order reference are required for tool execution');
  }

  const prisma = getSharedPrismaClient();
  const order = await prisma.order.findFirst({
    where: {
      companyId,
      OR: [{ id: orderId || '' }, { orderNumber: orderNumber || orderId || '' }],
    },
  });

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  switch (toolName) {
    case 'order_confirm': {
      const result = await orderConfirmationService.confirmOrder(
        companyId,
        order.id,
        parameters.notes || 'تأكيد تلقائي عبر المكالمة الصوتية للذكاء الاصطناعي'
      );
      return {
        success: true,
        orderStatus: 'CONFIRMED',
        message: 'تم تأكيد الطلب بنجاح وتمريره للشحن',
        details: result,
      };
    }

    case 'order_update_details': {
      const updateData = {};
      if (parameters.address) updateData.customerAddress = parameters.address;
      if (parameters.city) updateData.city = parameters.city;
      if (parameters.governorate) updateData.governorate = parameters.governorate;
      if (parameters.notes) updateData.notes = parameters.notes;

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      return {
        success: true,
        message: 'تم تحديث بيانات التوصيل بنجاح',
        updatedFields: Object.keys(updateData),
        order: { id: updated.id, orderNumber: updated.orderNumber },
      };
    }

    case 'order_cancel': {
      const result = await orderConfirmationService.cancelOrder(
        companyId,
        order.id,
        parameters.reason || 'إلغاء بناء على رغبة العميل أثناء المكالمة الهاتفية'
      );
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
  const { orderId, companyId } = metadata;
  if (!orderId || !companyId) {
    console.warn('[VOICE-CALL] Missing orderId/companyId in call completion metadata');
    return { success: false, reason: 'MISSING_METADATA' };
  }

  const prisma = getSharedPrismaClient();

  let outcome = 'unreached';
  const statusLower = String(status).toLowerCase();

  if (['completed', 'ended', 'answered'].includes(statusLower)) {
    outcome = 'reached';
  } else if (['busy', 'line-busy'].includes(statusLower)) {
    outcome = 'busy';
  } else if (['no-answer', 'timeout', 'unanswered'].includes(statusLower)) {
    outcome = 'unreached';
  } else if (['wrong-number', 'invalid-number'].includes(statusLower)) {
    outcome = 'wrong_number';
  }

  const notesText = [
    `نتيجة المكالمة الصوتية: ${outcome}`,
    durationSeconds ? `المدة: ${durationSeconds} ثانية` : '',
    summary ? `الملخص: ${summary}` : '',
    recordingUrl ? `التسجيل: ${recordingUrl}` : '',
    transcript ? `التفريغ: ${transcript.substring(0, 300)}...` : '',
  ].filter(Boolean).join(' | ');

  const pendingLog = await prisma.callAttemptLog.findFirst({
    where: {
      orderId,
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
      },
    });
  } else {
    const adminUser = await prisma.user.findFirst({
      where: { companyId },
      select: { id: true },
    });
    if (adminUser) {
      await prisma.callAttemptLog.create({
        data: {
          orderId,
          userId: adminUser.id,
          result: outcome,
          notes: notesText,
        },
      });
    }
  }

  return { success: true, outcome, orderId };
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeCallingPhone,
  isCallingWindowPermitted,
  resolveVoiceCredentials,
  dispatchOrderConfirmationCall,
  handleVoiceToolCall,
  handleVoiceCallCompleted,
};
