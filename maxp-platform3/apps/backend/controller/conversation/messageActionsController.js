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
