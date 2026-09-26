/**
 * Voice Call Controller
 * Handles HTTP endpoints for manual trigger, webhook ingress, and call log queries.
 */

const voiceCallService = require('../services/voice/voiceCallService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

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

    const { orderId, orderNumber, force } = req.body || {};
    if (!orderId && !orderNumber) {
      return res.status(400).json({ success: false, message: 'رقم أو معرف الطلب مطلوب' });
    }

    const result = await voiceCallService.dispatchOrderConfirmationCall({
      companyId,
      orderId,
      orderNumber,
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
 * Get call attempt logs and audio records for an order
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
        order: {
          companyId,
          OR: [{ id: orderId }, { orderNumber: orderId }],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] getOrderCallLogs error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Handle Vapi webhooks (real-time tool calls & end-of-call reports)
 */
async function handleVapiWebhook(req, res) {
  try {
    const message = req.body?.message || req.body;
    const type = message?.type || req.body?.type;

    // 1. Live Function Calling during the call
    if (type === 'tool-calls' || type === 'function-call') {
      const toolCalls = message.toolCalls || (message.functionCall ? [message.functionCall] : []);
      const metadata = message.call?.metadata || {};
      const results = [];

      for (const call of toolCalls) {
        const toolName = call.function?.name || call.name;
        let params = call.function?.arguments || call.arguments || {};
        if (typeof params === 'string') {
          try {
            params = JSON.parse(params);
          } catch (e) {
            params = {};
          }
        }

        const toolResult = await voiceCallService.handleVoiceToolCall({
          companyId: metadata.companyId,
          orderId: metadata.orderId,
          orderNumber: metadata.orderNumber,
          toolName,
          parameters: params,
        });

        results.push({
          toolCallId: call.id,
          result: JSON.stringify(toolResult),
        });
      }

      return res.json({ results });
    }

    // 2. End-of-call report (recording, transcript, analytics)
    if (type === 'end-of-call-report' || type === 'status-update') {
      const call = message.call || req.body.call || {};
      const metadata = call.metadata || {};
      const recordingUrl = message.recordingUrl || call.recordingUrl || null;
      const transcript = message.transcript || call.transcript || null;
      const summary = message.summary || call.summary || null;
      const duration = message.durationSeconds || call.duration || 0;
      const status = message.endedReason || call.status || 'completed';

      await voiceCallService.handleVoiceCallCompleted({
        callId: call.id || message.callId,
        provider: 'VAPI',
        status,
        durationSeconds: duration,
        recordingUrl,
        transcript,
        summary,
        metadata,
      });

      return res.json({ success: true, processed: true });
    }

    // Generic acknowledgment for other events (assistant-request, speech-update, etc.)
    return res.json({ success: true });
  } catch (error) {
    console.error('[VOICE-CONTROLLER] handleVapiWebhook error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
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
    const voiceSettings = parsed.voiceSettings || voiceCallService.DEFAULT_SETTINGS;

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

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const parsed = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    parsed.voiceSettings = {
      ...(parsed.voiceSettings || voiceCallService.DEFAULT_SETTINGS),
      ...(req.body || {}),
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
  getVoiceSettings,
  updateVoiceSettings,
};
