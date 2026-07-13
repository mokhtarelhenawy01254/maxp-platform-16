/**
 * 🛠️ Webhook Service
 * 
 * Contains shared logic for processing webhooks, used by both
 * the Controller and the Worker.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const { handleFacebookMessage, handleFacebookComment } = require('../utils/allFunctions');
const socketService = require('./socketService');

function getPrisma() {
    return getSharedPrismaClient();
}

/**
 * Process a Facebook Message
 */
async function processFacebookMessage(data) {
    const { webhookEvent, pageId } = data;
    return await handleFacebookMessage(webhookEvent, pageId);
}

/**
 * Process a Facebook Comment
 */
async function processFacebookComment(data) {
    const { commentData, pageId } = data;
    return await handleFacebookComment(commentData, pageId);
}

/**
 * Process a Facebook Read Receipt
 */
async function processReadReceipt(data) {
    const { webhookEvent, pageId } = data;
    try {
        const senderId = webhookEvent.sender?.id;
        const watermark = webhookEvent.read?.watermark;

        if (!senderId || !watermark) return;

        // Get the Facebook page to find companyId
        const prisma = getPrisma();
        const page = await prisma.facebookPage.findUnique({
            where: { pageId: pageId }
        });

        if (!page || !page.companyId) return;

        // Find the conversation for this customer
        const conversation = await prisma.conversation.findFirst({
            where: {
                companyId: page.companyId,
                customer: { facebookId: senderId }
            }
        });

        if (!conversation) return;

        // Update all messages sent before watermark to 'read' status
        const result = await prisma.message.updateMany({
            where: {
                conversationId: conversation.id,
                isFromCustomer: false,
                isRead: false,
                createdAt: { lte: new Date(watermark) }
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        if (result.count > 0) {
            // Emit socket event
            const io = socketService.getIO();
            if (io) {
                io.to(`company_${page.companyId}`).emit('messages_read', {
                    conversationId: conversation.id,
                    customerId: senderId,
                    watermark: watermark,
                    readAt: new Date()
                });
            }
        }
    } catch (error) {
        console.error('❌ [WEBHOOK-SERVICE] Failed to process read receipt:', error.message);
    }
}

module.exports = {
    processFacebookMessage,
    processFacebookComment,
    processReadReceipt
};
