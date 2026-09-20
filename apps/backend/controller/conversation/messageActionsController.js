/**
 * messageActionsController.js
 * عمليات على الرسائل الفردية (جلب/تعديل/حذف/نجمة/ريأكشن)
 */

const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const socketService = require('../../services/socketService');
const telegramBotService = require('../../services/TelegramBotService');
const { proxyFacebookMediaDeep, proxyMessageMediaUrl } = require('../../utils/facebookMediaProxy');

const parseJsonSafely = (value, fallback = null) => {
    if (typeof value !== 'string') {
        return value ?? fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeMessageMediaForResponse = (message) => {
    const messageId = message?.id;
    const normalizedAttachments = parseJsonSafely(message?.attachments, message?.attachments);

    return {
        ...message,
        content: proxyMessageMediaUrl(messageId, message?.content),
        fileUrl: proxyMessageMediaUrl(messageId, message?.fileUrl),
        attachments: proxyFacebookMediaDeep(normalizedAttachments, { messageId }),
        metadata: proxyFacebookMediaDeep(message?.metadata, { messageId })
    };
};

const extractMessageImageUrl = (msg) => {
    if (!msg) return null;
    const attachments = parseJsonSafely(msg.attachments);
    if (Array.isArray(attachments)) {
        for (const att of attachments) {
            const url = att?.url || att?.file_url || att?.image_url || att?.image_data?.url || att?.payload?.url || att?.payload?.image_url;
            const type = (att?.type || att?.mime_type || '').toLowerCase();
            if (url && (type.includes('image') || /\.(jpe?g|png|webp|gif|bmp|avif)/i.test(url) || att?.image_data)) {
                return url;
            }
            if (url && (msg.type === 'IMAGE' || msg.type === 'image')) {
                return url;
            }
        }
    }
    if (msg.fileUrl && typeof msg.fileUrl === 'string') {
        const fileUrl = msg.fileUrl.trim();
        if (/\.(jpe?g|png|webp|gif|bmp|avif)/i.test(fileUrl) || msg.type === 'IMAGE' || msg.type === 'image') {
            return fileUrl;
        }
    }
    if (msg.content && typeof msg.content === 'string') {
        const tokenMatch = msg.content.match(/\|IMAGE_URL\|([^\s|]+)/i);
        if (tokenMatch?.[1]) return tokenMatch[1].trim();
        const trimmed = msg.content.trim();
        if (/^(https?:\/\/|\/uploads\/|assets\/|data:|blob:)/i.test(trimmed)) {
            if (/\.(jpe?g|png|webp|gif|bmp|avif)/i.test(trimmed) || msg.type === 'IMAGE' || msg.type === 'image') {
                return trimmed;
            }
        }
    }
    return null;
};

const extractMessageMediaUrl = (msg) => {
    if (!msg) return null;
    const imgUrl = extractMessageImageUrl(msg);
    if (imgUrl) return imgUrl;

    const attachments = parseJsonSafely(msg.attachments);
    if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
            const url = att?.url || att?.file_url || att?.image_url || att?.payload?.url;
            if (url && typeof url === 'string' && url.trim()) return url.trim();
        }
    }
    if (msg.fileUrl && typeof msg.fileUrl === 'string' && msg.fileUrl.trim()) {
        return msg.fileUrl.trim();
    }
    if (msg.content && typeof msg.content === 'string') {
        const tokenMatch = msg.content.match(/\|(?:IMAGE|FILE|VIDEO|AUDIO)_URL\|([^\s|]+)/i);
        if (tokenMatch?.[1]) return tokenMatch[1].trim();
        if (/^(https?:\/\/|\/uploads\/|assets\/)/i.test(msg.content.trim())) {
            return msg.content.trim();
        }
    }
    return null;
};

// 🆕 Get messages for a conversation
const getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID required' });
        }

        // Verify conversation access first
        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: { id, companyId }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch messages
        // 🔧 FIX: Use executeWithRetry to handle connection errors
        const prisma = getSharedPrismaClient();
        const [messages, total] = await Promise.all([
            executeWithRetry(async () => {
                return await prisma.message.findMany({
                    where: { conversationId: id },
                    orderBy: { createdAt: 'desc' }, // Get newest first
                    skip,
                    take: parseInt(limit),
                    include: {
                        user: { // Include sender info (Employee)
                            select: { id: true, firstName: true, lastName: true }
                        }
                    }
                });
            }, 3),
            executeWithRetry(async () => {
                return await prisma.message.count({ where: { conversationId: id } });
            }, 3)
        ]);

        // Build map of existing messages in this batch
        const messagesMap = new Map();
        messages.forEach(m => messagesMap.set(m.id, m));

        // Find missing parent messages needed for replyTo enrichment
        const neededParentIds = [];
        messages.forEach(msg => {
            const meta = parseJsonSafely(msg.metadata);
            const parentId = meta?.replyToResolvedMessageId || meta?.replyTo?.messageId;
            if (parentId && !messagesMap.has(parentId) && !neededParentIds.includes(parentId)) {
                neededParentIds.push(parentId);
            }
        });

        if (neededParentIds.length > 0) {
            try {
                const extraParents = await executeWithRetry(async () => {
                    return await prisma.message.findMany({
                        where: { id: { in: neededParentIds } },
                        include: {
                            user: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    });
                }, 2);
                extraParents.forEach(p => messagesMap.set(p.id, p));
            } catch (err) {
                console.warn('⚠️ [GET-MESSAGES] Error resolving extra parent messages:', err.message);
            }
        }

        res.json({
            success: true,
            data: messages.reverse().map(msg => {
                // Parse metadata nicely
                let metadata = {};
                let employeeName = null;

                if (msg.metadata) {
                    try {
                        metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                        employeeName = metadata.employeeName;
                    } catch (e) {
                        // Ignore parse errors
                        console.error('Error parsing message metadata:', e);
                    }
                }

                // Enrich replyTo if present or if replyToResolvedMessageId is present
                const parentId = metadata?.replyToResolvedMessageId || metadata?.replyTo?.messageId;
                if (parentId && messagesMap.has(parentId)) {
                    const parentMsg = messagesMap.get(parentId);
                    const parentImg = extractMessageImageUrl(parentMsg);
                    const parentMedia = parentImg || extractMessageMediaUrl(parentMsg);
                    const parentSender = parentMsg.isFromCustomer
                        ? 'العميل'
                        : (parentMsg.user ? `${parentMsg.user.firstName} ${parentMsg.user.lastName}`.trim() : (parseJsonSafely(parentMsg.metadata)?.employeeName || 'موظف'));

                    if (!metadata.replyTo || typeof metadata.replyTo !== 'object') {
                        metadata.replyTo = {};
                    }
                    metadata.replyTo.messageId = parentMsg.id;
                    if (!metadata.replyTo.senderName) {
                        metadata.replyTo.senderName = parentSender;
                    }
                    if (!metadata.replyTo.type) {
                        metadata.replyTo.type = (parentMsg.type || 'text').toLowerCase();
                    }
                    if (parentImg) {
                        metadata.replyTo.imageUrl = proxyMessageMediaUrl(parentMsg.id, parentImg);
                        metadata.replyTo.type = 'image';
                    }
                    if (parentMedia) {
                        metadata.replyTo.mediaUrl = proxyMessageMediaUrl(parentMsg.id, parentMedia);
                    }
                }

                return {
                    ...normalizeMessageMediaForResponse(msg),
                    type: msg.type === 'IMAGE' ? 'image' : msg.type.toLowerCase(),
                    metadata: proxyFacebookMediaDeep(metadata, { messageId: msg.id }),

                    // Ensure frontend compatibility fields
                    // Priority: metadata.employeeName > sender relation > fallback
                    senderName: employeeName ||
                        (msg.user ? `${msg.user.firstName} ${msg.user.lastName}` :
                            (msg.isFromCustomer ? 'Customer' : 'موظف'))
                };
            }),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: (skip + messages.length) < total
            }
        });

    } catch (error) {
        console.error('❌ Error getting messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Edit message
const editMessage = async (req, res) => {
    try {
        const { id, messageId } = req.params;
        const { content } = req.body;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'Company ID required'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message content is required'
            });
        }

        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: { id, companyId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        const message = await getSharedPrismaClient().message.findFirst({
            where: { id: messageId, conversationId: id }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // Update message in database
        const updatedMessage = await getSharedPrismaClient().message.update({
            where: { id: messageId },
            data: { content: content.trim() }
        });

        // Edit in Telegram if it's a Telegram conversation
        if (conversation.channel === 'TELEGRAM') {
            const result = await telegramBotService.editMessage(id, messageId, content.trim());
            if (!result.success) {
                console.error('Failed to edit message in Telegram:', result.error);
            }
        }

        // Emit socket event
        socketService.sendToConversationSecure(id, companyId, 'message_edited', {
            ...updatedMessage,
            companyId: companyId
        });

        res.json({
            success: true,
            data: updatedMessage
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete message
const deleteMessage = async (req, res) => {
    try {
        const { id, messageId } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'Company ID required'
            });
        }

        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: { id, companyId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        const message = await getSharedPrismaClient().message.findFirst({
            where: { id: messageId, conversationId: id }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // Delete from Telegram if it's a Telegram conversation
        if (conversation.channel === 'TELEGRAM') {
            const result = await telegramBotService.deleteMessage(id, messageId);
            if (!result.success) {
                console.error('Failed to delete message in Telegram:', result.error);
            }
        }

        // Delete message from database
        await getSharedPrismaClient().message.delete({
            where: { id: messageId }
        });

        // Emit socket event
        socketService.sendToConversationSecure(id, companyId, 'message_deleted', {
            messageId: messageId,
            companyId: companyId
        });

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * ⭐ Toggle message star status
 * PUT /conversations/:id/messages/:messageId/star
 */
const toggleMessageStar = async (req, res) => {
    try {
        const { id, messageId } = req.params;
        const companyId = req.user?.companyId;

        const message = await getSharedPrismaClient().message.findFirst({
            where: { id: messageId, conversationId: id }
        });

        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        let metadata = {};
        try {
            metadata = message.metadata ? JSON.parse(message.metadata) : {};
        } catch (e) {
            metadata = {};
        }

        // Toggle star status
        const isStarred = !metadata.isStarred;
        metadata.isStarred = isStarred;

        await getSharedPrismaClient().message.update({
            where: { id: messageId },
            data: {
                metadata: JSON.stringify(metadata)
            }
        });

        res.json({
            success: true,
            data: { isStarred },
            message: isStarred ? 'Message starred' : 'Message unstarred'
        });

    } catch (error) {
        console.error('Error toggling message star:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 😄 Toggle message reaction
 * PUT /conversations/:id/messages/:messageId/reaction
 */
const toggleMessageReaction = async (req, res) => {
    try {
        const { id, messageId } = req.params;
        const { reaction } = req.body; // e.g., '👍', '❤️', '😂'
        const companyId = req.user?.companyId;
        const userId = req.user?.userId || req.user?.id;

        if (!reaction) {
            return res.status(400).json({ success: false, error: 'Reaction is required' });
        }

        const message = await getSharedPrismaClient().message.findFirst({
            where: { id: messageId, conversationId: id }
        });

        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        let metadata = {};
        try {
            metadata = message.metadata ? JSON.parse(message.metadata) : {};
        } catch (e) {
            metadata = {};
        }

        // Initialize reactions object if not exists: { userId: reaction }
        if (!metadata.reactions) {
            metadata.reactions = {};
        }

        const currentReaction = metadata.reactions[userId];

        if (currentReaction === reaction) {
            // Remove reaction if same
            delete metadata.reactions[userId];
        } else {
            // Add/Update reaction
            metadata.reactions[userId] = reaction;
        }

        await getSharedPrismaClient().message.update({
            where: { id: messageId },
            data: {
                metadata: JSON.stringify(metadata)
            }
        });

        // Emit socket event for real-time synchronization across devices and agents
        try {
            socketService.sendToConversationSecure(id, companyId, 'message_reaction_updated', {
                conversationId: id,
                messageId,
                reactions: metadata.reactions,
                userId,
                reaction: currentReaction === reaction ? null : reaction
            });
        } catch (socketErr) {
            console.warn('⚠️ [SOCKET] Failed to emit reaction update:', socketErr.message);
        }

        res.json({
            success: true,
            data: { reactions: metadata.reactions },
            message: 'Reaction updated'
        });

    } catch (error) {
        console.error('Error toggling message reaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getMessages,
    editMessage,
    deleteMessage,
    toggleMessageStar,
    toggleMessageReaction
};
