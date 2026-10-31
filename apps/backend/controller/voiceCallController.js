/**
 * Voice Call Controller
 * Handles HTTP endpoints for manual trigger, webhook ingress, and call log queries.
 */

const crypto = require('crypto');
const voiceCallService = require('../services/voice/voiceCallService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderConfirmationService = require('../services/orderConfirmationService');

const getCompanyId = (req) =>
  req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

/**
 * Manually trigger an AI confirmation call for an order
 */
async function triggerOrderCall(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { orderId, guestOrderId, orderNumber, force } = req.body || {};
    if (!orderId && !guestOrderId && !orderNumber) {
      return res.status(400).json({ success: false, message: 'رقم أو معرف الطلب مطلوب' });
    }

    const result = await voiceCallService.dispatchOrderConfirmationCall({
      companyId,
      orderId: orderId || null,
      guestOrderId: guestOrderId || null,
      orderNumber: orderNumber || null,
      force: Boolean(force),
      userId: req.user?.id || null,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] triggerOrderCall error:', error.message);
    const status = error.message.includes('غير موجود') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

/**
 * Get call attempt logs and audio records for an order (Order or GuestOrder)
 */
async function getOrderCallLogs(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { orderId } = req.params;

    if (!companyId || !orderId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة والطلب مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    const logs = await prisma.callAttemptLog.findMany({
      where: {
        companyId,
        OR: [
          { orderId },
          { guestOrderId: orderId },
          { order: { orderNumber: orderId } },
          { guestOrder: { orderNumber: orderId } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, firstName: true, lastName: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        guestOrder: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] getOrderCallLogs error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Handle Vapi webhooks (real-time tool calls & end-of-call reports)
 * Secured against impersonation using ledger call mapping & HMAC / shared secret verification.
 */
async function handleVapiWebhook(req, res) {
  try {
    const message = req.body?.message || req.body || {};
    const call = message.call || req.body?.call || {};
    const callId = call.id || message.callId || req.body?.callId;
    const type = message.type || req.body?.type;

    if (!callId) {
      return res.status(400).json({ error: 'MISSING_CALL_ID' });
    }

    // 1. Identify job/call securely from ai_runtime_ledger mapping (do NOT trust body metadata)
    const prisma = getSharedPrismaClient();
    const callLedger = await prisma.aiRuntimeLedger.findUnique({
      where: { idempotencyKey: `callid:${callId}` },
    });

    if (!callLedger) {
      return res.status(404).json({ error: 'UNKNOWN_CALL' });
    }

    let ledgerMeta = {};
    try {
      ledgerMeta = JSON.parse(callLedger.metadata || '{}');
    } catch (_) {}

    const companyId = ledgerMeta.companyId || callLedger.companyId;
    if (!companyId) {
      return res.status(404).json({ error: 'UNKNOWN_CALL' });
    }

    // 2. Verify shared secret header (x-vapi-secret)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const parsedSettings = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    const expectedSecret = parsedSettings.voiceSettings?.webhookSecret || process.env.VAPI_WEBHOOK_SECRET;

    if (expectedSecret) {
      const receivedSecret = req.headers['x-vapi-secret'];
      if (!receivedSecret) {
        return res.status(401).json({ error: 'INVALID_SIGNATURE' });
      }
      const bufA = Buffer.from(receivedSecret);
      const bufB = Buffer.from(expectedSecret);
      if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
        return res.status(401).json({ error: 'INVALID_SIGNATURE' });
      }
    }

    // 3. Deduplication: ensure each event is processed exactly once
    const providerEventId = message.id || `${callId}:${type}:${message.endedReason || ''}`;
    try {
      await prisma.aiRuntimeLedger.create({
        data: {
          companyId,
          channel: 'VOICE_CALL',
          status: 'COMPLETED',
          idempotencyKey: `callevent:${callId}:${providerEventId}`,
          metadata: JSON.stringify({ type, callId, providerEventId, receivedAt: new Date().toISOString() }),
        },
      });
    } catch (e) {
      if (e.code === 'P2002' || e.message?.includes('Unique constraint')) {
        return res.status(200).json({ success: true, duplicate: true });
      }
      throw e;
    }

    // 4. Live Tool Calling during the call
    if (type === 'tool-calls' || type === 'function-call') {
      const toolCalls = message.toolCalls || (message.functionCall ? [message.functionCall] : []);
      const results = [];

      for (const tCall of toolCalls) {
        const toolName = tCall.function?.name || tCall.name;
        let params = tCall.function?.arguments || tCall.arguments || {};
        if (typeof params === 'string') {
          try {
            params = JSON.parse(params);
          } catch (_) {
            params = {};
          }
        }

        const toolResult = await voiceCallService.handleVoiceToolCall({
          companyId,
          orderId: ledgerMeta.orderId,
          guestOrderId: ledgerMeta.guestOrderId,
          orderNumber: ledgerMeta.orderNumber,
          toolName,
          parameters: params,
        });

        results.push({
          toolCallId: tCall.id,
          result: JSON.stringify(toolResult),
        });
      }

      return res.json({ results });
    }

    // 5. End-of-call report (recording, transcript, analytics)
    if (type === 'end-of-call-report' || type === 'status-update') {
      const recordingUrl = message.recordingUrl || call.recordingUrl || null;
      const transcript = message.transcript || call.transcript || null;
      const summary = message.summary || call.summary || null;
      const duration = message.durationSeconds || call.duration || 0;
      const status = message.endedReason || call.status || 'completed';

      await voiceCallService.handleVoiceCallCompleted({
        callId,
        provider: ledgerMeta.provider || 'VAPI',
        status,
        durationSeconds: duration,
        recordingUrl,
        transcript,
        summary,
        metadata: ledgerMeta,
      });

      return res.json({ success: true, processed: true });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] handleVapiWebhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Local simulation runner for integration testing without external networks
 */
async function simulateCallResult(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { jobId, outcome = 'reached' } = req.body || {};

    if (!companyId || !jobId) {
      return res.status(400).json({ success: false, message: 'companyId and jobId are required' });
    }

    const prisma = getSharedPrismaClient();
    const job = await prisma.aiRuntimeQueueJob.findUnique({ where: { id: jobId } });

    if (!job || job.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    let input = {};
    try {
      input = typeof job.inputSnapshot === 'string' ? JSON.parse(job.inputSnapshot) : job.inputSnapshot;
    } catch (_) {}

    const simulatedCallId = `sim_result_${Date.now()}`;
    await voiceCallService.handleVoiceCallCompleted({
      callId: simulatedCallId,
      provider: 'SIMULATION',
      status: outcome === 'reached' ? 'completed' : (outcome === 'busy' ? 'busy' : 'no-answer'),
      durationSeconds: outcome === 'reached' ? 45 : 0,
      recordingUrl: 'https://cdn.maxp.local/recordings/simulated_call.opus',
      transcript: `محاكاة: نتيجة المكالمة ${outcome}`,
      summary: `محاكاة محلية: ${outcome}`,
      metadata: {
        orderId: input.orderId || null,
        guestOrderId: input.guestOrderId || null,
        companyId,
        queueKey: job.queueKey,
        orderNumber: input.orderNumber,
        outcome,
      },
    });

    const updatedJob = await prisma.aiRuntimeQueueJob.findUnique({ where: { id: jobId } });
    return res.json({ success: true, data: updatedJob, outcome });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] simulateCallResult error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get merchant voice confirmation settings
 */
async function getVoiceSettings(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const parsed = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    let orderConfSettings = null;
    try {
      orderConfSettings = await orderConfirmationService.getSettings(companyId);
    } catch (_) {}

    const orderConfNormalized = orderConfirmationService.normalizeSettings(orderConfSettings || {});

    const voiceSettings = {
      ...voiceCallService.DEFAULT_SETTINGS,
      ...(parsed.voiceSettings || {}),
      maxCallsNoAnswer: parsed.voiceSettings?.maxCallsNoAnswer ?? (orderConfNormalized.maxCallsNoAnswer ?? voiceCallService.DEFAULT_SETTINGS.maxCallsNoAnswer),
      intervalMinutes: parsed.voiceSettings?.intervalMinutes ?? (orderConfNormalized.intervalMinutes ?? voiceCallService.DEFAULT_SETTINGS.intervalMinutes),
    };

    return res.json({ success: true, data: voiceSettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update merchant voice confirmation settings
 */
async function updateVoiceSettings(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const allowedFields = [
      'enabled',
      'autoCallEnabled',
      'startHour',
      'endHour',
      'maxCallsNoAnswer',
      'intervalMinutes',
      'provider',
      'simulatedOutcome',
      'webhookSecret',
    ];

    const payload = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        payload[key] = req.body[key];
      }
    }

    if (payload.startHour !== undefined) {
      payload.startHour = Math.max(0, Math.min(23, Number(payload.startHour)));
    }
    if (payload.endHour !== undefined) {
      payload.endHour = Math.max(0, Math.min(23, Number(payload.endHour)));
    }
    if (payload.maxCallsNoAnswer !== undefined) {
      payload.maxCallsNoAnswer = Math.max(0, Math.min(10, Number(payload.maxCallsNoAnswer)));
    }
    if (payload.intervalMinutes !== undefined) {
      payload.intervalMinutes = Math.max(1, Math.min(1440, Number(payload.intervalMinutes)));
    }
    if (payload.provider !== undefined) {
      payload.provider = String(payload.provider).toUpperCase() === 'VAPI' ? 'VAPI' : 'SIMULATION';
    }

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const parsed = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    parsed.voiceSettings = {
      ...(parsed.voiceSettings || voiceCallService.DEFAULT_SETTINGS),
      ...payload,
    };

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(parsed) },
    });

    return res.json({ success: true, data: parsed.voiceSettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  triggerOrderCall,
  getOrderCallLogs,
  handleVapiWebhook,
  simulateCallResult,
  getVoiceSettings,
  updateVoiceSettings,
};
