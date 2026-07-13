const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Records a sent message statistic in the database.
 * This is used to track performance and conversion rates.
 */
async function recordSentMessageStat(data) {
    try {
        const {
            companyId,
            facebookPageId,
            recipientFacebookId,
            recipientCustomerId,
            messageId,
            messageContent,
            messageType,
            messageStatus, // 'saved' or 'ignored'
            ignoredReason,
            conversationId,
            conversationStatus, // 'created', 'existed', or 'ignored'
            sentAt = new Date(),
            savedAt,
            conversationCreatedAt
        } = data;



        if (!companyId || !messageId || !recipientFacebookId) {
            // console.warn('⚠️ [STATS-RECORDER] Missing required fields for SentMessageStat', { companyId, messageId, recipientFacebookId });
            // console.warn('⚠️ [STATS-RECORDER] Missing required fields for SentMessageStat', { companyId, messageId, recipientFacebookId });
            return null;
        }

        const prisma = getSharedPrismaClient();

        // Check if record already exists by messageId (unique constraint)
        const existing = await prisma.sentMessageStat.findUnique({
            where: { messageId }
        });

        if (existing) {
            // Update existing record
            return await prisma.sentMessageStat.update({
                where: { messageId },
                data: {
                    messageStatus,
                    ignoredReason,
                    conversationStatus,
                    savedAt: savedAt || existing.savedAt,
                    updatedAt: new Date()
                }
            });
        }

        // Create new record
        const stat = await prisma.sentMessageStat.create({
            data: {
                companyId,
                facebookPageId,
                recipientFacebookId,
                recipientCustomerId,
                messageId,
                messageContent: messageContent?.substring(0, 1000), // Safety truncation
                messageType,
                messageStatus,
                ignoredReason,
                conversationId,
                conversationStatus,
                sentAt,
                savedAt,
                conversationCreatedAt
            }
        });

        // console.log(`📊 [STATS-RECORDER] Recorded stat for message ${messageId.slice(-8)} (Status: ${messageStatus})`);

        return stat;
    } catch (error) {
        //console.error('❌ [STATS-RECORDER] Error recording sent message stat:', error.message);
        // console.error('❌ [STATS-RECORDER] Error recording sent message stat:', error.message);
        // Don't throw error to avoid breaking main flow
        return null;
    }
}

module.exports = {
    recordSentMessageStat
};
