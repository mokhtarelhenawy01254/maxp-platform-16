/**
 * @module silentEscalationService
 * @description Handles silent escalation when AI agent fails to respond.
 * Instead of sending a fallback error message to the customer (which reveals
 * that they are talking to an AI), this service flags the conversation for
 * human moderator takeover and emits real-time notifications via Socket.IO.
 *
 * 2026 SOTA: Silent handoff — the customer never knows the AI failed.
 */

const socketService = require('./socketService');
const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Flag a conversation thread for human takeover after AI failure.
 *
 * This function:
 * 1. Logs the escalation event in ActivityLog for audit trail
 * 2. Emits a Socket.IO event to the company room for moderator notification
 *
 * @param {Object} params
 * @param {string} params.companyId - The company ID
 * @param {string} [params.conversationId] - The conversation/thread ID
 * @param {string} [params.customerPhone] - Customer phone/JID (for WhatsApp)
 * @param {string} [params.customerId] - Customer ID
 * @param {string} params.reason - Why the AI failed (e.g., 'guardrail_blocked', 'validation_exhausted')
 * @param {string} [params.customerMessage] - The customer's original message that couldn't be answered
 * @param {string} params.channel - Channel (WHATSAPP, TELEGRAM, FACEBOOK, INSTAGRAM)
 */
async function flagThreadForHumanTakeover({
  companyId,
  conversationId,
  customerPhone,
  customerId,
  reason,
  customerMessage,
  channel,
}) {
  try {
    const prisma = getSharedPrismaClient();
    const io = socketService.getIO();
    const timestamp = new Date();

    // 1. Log the escalation event in ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          companyId,
          category: 'AI',
          action: 'AI_SILENT_ESCALATION',
          description: `AI failed on ${channel}: ${reason}`,
          details: JSON.stringify({
            conversationId: conversationId || null,
            customerPhone: customerPhone || null,
            customerId: customerId || null,
            reason,
            customerMessage: customerMessage ? customerMessage.substring(0, 500) : null,
            channel,
            timestamp: timestamp.toISOString(),
          }),
          createdAt: timestamp,
        },
      });
    } catch (logErr) {
      // ActivityLog write must never crash the main flow
      console.error('[SILENT-ESCALATION] Failed to log activity:', logErr.message);
    }

    // 2. Emit Socket.IO event to company room for moderator notification
    if (io) {
      io.to(`company:${companyId}`).emit('ai:escalation', {
        type: 'SILENT_ESCALATION',
        conversationId: conversationId || null,
        customerPhone: customerPhone || null,
        customerId: customerId || null,
        reason,
        channel,
        customerMessage: customerMessage ? customerMessage.substring(0, 200) : null,
        timestamp: timestamp.toISOString(),
        message: '⚠️ الذكاء الاصطناعي لم يتمكن من الرد — المحادثة تحتاج تدخل بشري',
      });
    }

    console.log(
      `🔴 [SILENT-ESCALATION] Thread flagged for human takeover | company=${companyId} | channel=${channel} | reason=${reason}`
    );
  } catch (error) {
    // Escalation logging must never crash the main flow
    console.error('[SILENT-ESCALATION] Critical error in flagThreadForHumanTakeover:', error.message);
  }
}

module.exports = { flagThreadForHumanTakeover };
