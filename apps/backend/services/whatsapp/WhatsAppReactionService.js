/**
 * WhatsApp Reaction Service
 * Handles persisting, resolving, and emitting emoji reaction updates for WhatsApp messages.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const socketService = require('../socketService');
const {
  emitToAudience,
  getConversationAudience
} = require('../whatsappRealtimeAudienceService');

const getIO = () => socketService.getIO();

/**
 * Apply a reaction (add, update, or remove) to a target WhatsApp message.
 * Updates target message metadata in DB and emits real-time socket event.
 */
async function applyReactionToMessage({
  sessionId,
  companyId,
  remoteJid,
  targetMessageId,
  reactorKey,
  emoji,
  fromMe = false
}) {
  if (!targetMessageId) return null;
  const prisma = getSharedPrismaClient();

  const targetMsg = await prisma.whatsAppMessage.findFirst({
    where: { messageId: targetMessageId }
  });

  if (!targetMsg) {
    return null;
  }

  let metadata = {};
  try {
    metadata = typeof targetMsg.metadata === 'string'
      ? JSON.parse(targetMsg.metadata)
      : (targetMsg.metadata || {});
  } catch {
    metadata = {};
  }

  if (!metadata.reactions || typeof metadata.reactions !== 'object' || Array.isArray(metadata.reactions)) {
    metadata.reactions = {};
  }

  const effectiveReactor = reactorKey || (fromMe ? 'me' : 'customer');
  const cleanEmoji = typeof emoji === 'string' ? emoji.trim() : '';

  if (cleanEmoji) {
    metadata.reactions[effectiveReactor] = cleanEmoji;
  } else {
    delete metadata.reactions[effectiveReactor];
  }

  await prisma.whatsAppMessage.update({
    where: { id: targetMsg.id },
    data: {
      metadata: JSON.stringify(metadata),
      updatedAt: new Date()
    }
  });

  try {
    const io = getIO();
    let effectiveCompanyId = companyId;
    if (!effectiveCompanyId && targetMsg.sessionId) {
      const sess = await prisma.whatsAppSession.findUnique({
        where: { id: targetMsg.sessionId },
        select: { companyId: true }
      });
      effectiveCompanyId = sess?.companyId;
    }

    if (effectiveCompanyId && io) {
      const audience = await getConversationAudience({
        companyId: effectiveCompanyId,
        sessionId: targetMsg.sessionId,
        remoteJid: targetMsg.remoteJid
      });

      emitToAudience(io, {
        companyId: effectiveCompanyId,
        userIds: audience.userIds,
        eventName: 'whatsapp:message:reaction',
        payload: {
          sessionId: targetMsg.sessionId,
          remoteJid: targetMsg.remoteJid,
          messageId: targetMessageId,
          reactions: metadata.reactions,
          emoji: cleanEmoji || null,
          reactorKey: effectiveReactor,
          fromMe
        }
      });
    }
  } catch (socketErr) {
    console.warn('⚠️ [WhatsApp Reaction] Failed to emit reaction update:', socketErr.message);
  }

  return {
    messageId: targetMessageId,
    reactions: metadata.reactions
  };
}

/**
 * Attaches reactions to a list of messages.
 * Resolves both metadata.reactions and any standalone REACTION messages.
 */
function attachReactionsToMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const reactionsMap = new Map();
  for (const m of messages) {
    if (m.messageType === 'REACTION' && m.quotedMessageId && m.content) {
      const targetId = m.quotedMessageId;
      const reactorKey = m.fromMe ? 'me' : (m.participant || m.remoteJid || 'customer');
      const existing = reactionsMap.get(targetId) || {};
      existing[reactorKey] = m.content;
      reactionsMap.set(targetId, existing);
    }
  }

  return messages.map(m => {
    let metaReactions = {};
    if (m.metadata) {
      try {
        const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
        if (meta?.reactions && typeof meta.reactions === 'object' && !Array.isArray(meta.reactions)) {
          metaReactions = { ...meta.reactions };
        }
      } catch {}
    }

    const extra = reactionsMap.get(m.messageId);
    const merged = extra ? { ...metaReactions, ...extra } : metaReactions;
    const hasReactions = Object.keys(merged).length > 0;

    const res = { ...m };
    if (hasReactions) {
      res.reactions = merged;
    } else if (m.reactions) {
      res.reactions = m.reactions;
    }
    return res;
  });
}

module.exports = {
  applyReactionToMessage,
  attachReactionsToMessages
};
