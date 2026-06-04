const telegramUserbotService = require('../services/TelegramUserbotService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 Telegram Advanced Features Controller
// ═══════════════════════════════════════════════════════════════════════════════

// --- Rate Limiting (بسيط) ---
const requestCounts = new Map();
const RATE_LIMIT = 10; // عدد الطلبات
const RATE_WINDOW = 60000; // دقيقة واحدة

const checkRateLimit = (companyId) => {
    const now = Date.now();
    const record = requestCounts.get(companyId) || { count: 0, resetTime: now + RATE_WINDOW };
    
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_WINDOW;
        requestCounts.set(companyId, record);
        return true;
    }
    
    if (record.count >= RATE_LIMIT) {
        return false;
    }
    
    record.count++;
    requestCounts.set(companyId, record);
    return true;
};

// --- Input Validation ---
const validateBulkMessageInput = (data) => {
    const errors = [];
    
    if (!data.userbotConfigId || typeof data.userbotConfigId !== 'string') {
        errors.push('معرف Userbot غير صالح');
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.length < 3 || data.name.length > 100) {
        errors.push('اسم الحملة يجب أن يكون بين 3 و 100 حرف');
    }
    
    if (!data.message || typeof data.message !== 'string' || data.message.length < 1 || data.message.length > 4000) {
        errors.push('الرسالة يجب أن تكون بين 1 و 4000 حرف');
    }
    
    if (!Array.isArray(data.recipients) || data.recipients.length === 0) {
        errors.push('يرجى اختيار مستلم واحد على الأقل');
    }
    
    if (data.recipients && data.recipients.length > 1000) {
        errors.push('الحد الأقصى للمستلمين هو 1000');
    }
    
    const delay = parseInt(data.delayBetweenMessages) || 2000;
    if (delay < 2000 || delay > 60000) {
        errors.push('التأخير يجب أن يكون بين 2000 و 60000 ميلي ثانية');
    }
    
    return errors;
};

const sanitizeInput = (input, maxLength = 1000) => {
    if (typeof input !== 'string') return input;
    // إزالة الأحرف الخاصة الخطيرة
    return input
        .replace(/[<>"'&]/g, '')
        .substring(0, maxLength)
        .trim();
};

// --- 1️⃣ Auto-Reply Rules ---

exports.getAutoReplyRules = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId } = req.params;

        const rules = await getSharedPrismaClient().telegramAutoReplyRule.findMany({
            where: { companyId, userbotConfigId },
            orderBy: { priority: 'desc' }
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('Error getting auto-reply rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createAutoReplyRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId } = req.params;
        const { name, triggerType, triggerValue, response, workingHoursOnly, startTime, endTime, daysOfWeek, priority } = req.body;

        const rule = await getSharedPrismaClient().telegramAutoReplyRule.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name,
                triggerType,
                triggerValue,
                response,
                workingHoursOnly: workingHoursOnly || false,
                startTime,
                endTime,
                daysOfWeek: daysOfWeek || [],
                priority: priority || 0,
                isActive: true
            }
        });

        await telegramUserbotService.setupAutoReply(userbotConfigId, companyId);

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error creating auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateAutoReplyRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { ruleId } = req.params;
        const updates = req.body;

        const rule = await getSharedPrismaClient().telegramAutoReplyRule.update({
            where: { id: ruleId },
            data: updates
        });

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error updating auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAutoReplyRule = async (req, res) => {
    try {
        const { ruleId } = req.params;

        await getSharedPrismaClient().telegramAutoReplyRule.delete({
            where: { id: ruleId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 2️⃣ Bulk Messaging ---

exports.getBulkMessages = async (req, res) => {
    try {
        const { companyId } = req.user;

        const bulkMessages = await getSharedPrismaClient().telegramBulkMessage.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({ success: true, data: bulkMessages });
    } catch (error) {
        console.error('Error getting bulk messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createBulkMessage = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        
        // التحقق من Rate Limit
        if (!checkRateLimit(companyId)) {
            return res.status(429).json({ 
                success: false, 
                error: 'تجاوز حد الطلبات، يرجى المحاولة لاحقاً' 
            });
        }
        
        const { userbotConfigId, name, message, recipients, delayBetweenMessages } = req.body;
        
        // التحقق من صحة المدخلات
        const validationErrors = validateBulkMessageInput({
            userbotConfigId,
            name,
            message,
            recipients,
            delayBetweenMessages
        });
        
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join('; ') 
            });
        }
        
        // تعقيم المدخلات
        const sanitizedName = sanitizeInput(name, 100);
        const sanitizedMessage = sanitizeInput(message, 4000);
        
        const bulkMessage = await getSharedPrismaClient().telegramBulkMessage.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name: sanitizedName,
                message: sanitizedMessage,
                recipients: recipients.map(r => sanitizeInput(r)),
                totalRecipients: recipients.length,
                delayBetweenMessages: delayBetweenMessages || 2000,
                createdBy: userId,
                status: 'PENDING'
            }
        });

        telegramUserbotService.sendBulkMessages(userbotConfigId, companyId, bulkMessage.id)
            .catch(err => console.error('Bulk message error:', err));

        res.json({ success: true, data: bulkMessage });
    } catch (error) {
        console.error('Error creating bulk message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBulkMessageStatus = async (req, res) => {
    try {
        const { bulkMessageId } = req.params;

        const bulkMessage = await getSharedPrismaClient().telegramBulkMessage.findUnique({
            where: { id: bulkMessageId }
        });

        const logs = await getSharedPrismaClient().telegramBulkMessageLog.findMany({
            where: { bulkMessageId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: { bulkMessage, logs } });
    } catch (error) {
        console.error('Error getting bulk message status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelBulkMessage = async (req, res) => {
    try {
        const { bulkMessageId } = req.params;

        await getSharedPrismaClient().telegramBulkMessage.update({
            where: { id: bulkMessageId },
            data: { status: 'CANCELLED' }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling bulk message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 3️⃣ Scheduled Messages ---

exports.getScheduledMessages = async (req, res) => {
    try {
        const { companyId } = req.user;

        const messages = await getSharedPrismaClient().telegramScheduledMessage.findMany({
            where: { companyId },
            orderBy: { scheduledTime: 'asc' }
        });

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error getting scheduled messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createScheduledMessage = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { userbotConfigId, chatIds, chatId, message, scheduledTime, recurring, recurringPattern } = req.body;

        const targets = chatIds && Array.isArray(chatIds) && chatIds.length > 0 
            ? chatIds.filter(id => id && id !== 'unknown' && id !== 'error') 
            : (chatId && chatId !== 'unknown' && chatId !== 'error' ? [chatId] : []);
        
        console.log('🚀 [TELEGRAM-SCHEDULE] targets after filter:', targets);

        if (targets.length === 0) {
            return res.status(400).json({ success: false, error: "يجب اختيار محادثة واحدة على الأقل صالحة" });
        }

        const prisma = getSharedPrismaClient();
        
        // Loop over the chatIds to create multiple messages
        const scheduledMessages = await Promise.all(
            targets.map(targetChatId => {
                console.log('📝 [TELEGRAM-SCHEDULE] Creating record for chatId:', targetChatId);
                return prisma.telegramScheduledMessage.create({
                    data: {
                        id: crypto.randomUUID(),
                        userbotConfigId,
                        companyId,
                        chatId: targetChatId,
                        message,
                        scheduledTime: new Date(scheduledTime),
                        recurring: recurring || false,
                        recurringPattern,
                        createdBy: userId,
                        status: 'PENDING'
                    }
                });
            })
        );

        res.json({ success: true, data: scheduledMessages, count: scheduledMessages.length });
    } catch (error) {
        console.error('Error creating scheduled message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelScheduledMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        await getSharedPrismaClient().telegramScheduledMessage.update({
            where: { id: messageId },
            data: { status: 'CANCELLED' }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling scheduled message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 4️⃣ Group Management ---

exports.getGroups = async (req, res) => {
    try {
        const { companyId } = req.user;

        const groups = await getSharedPrismaClient().telegramGroup.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: groups });
    } catch (error) {
        console.error('Error getting groups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, title, about, isPublic } = req.body;

        const result = await telegramUserbotService.createChannel(
            userbotConfigId,
            companyId,
            title,
            about,
            isPublic
        );

        res.json(result);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, title, users } = req.body;

        const result = await telegramUserbotService.createGroup(
            userbotConfigId,
            companyId,
            title,
            users
        );

        res.json(result);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addMembersToGroup = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, groupId, userIds } = req.body;

        const result = await telegramUserbotService.addMembersToGroup(
            userbotConfigId,
            companyId,
            groupId,
            userIds
        );

        res.json(result);
    } catch (error) {
        console.error('Error adding members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getGroupMembers = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, groupId } = req.params;
        const { saveToDb } = req.query;

        const result = await telegramUserbotService.getGroupMembers(
            userbotConfigId,
            companyId,
            groupId,
            saveToDb === 'true'
        );

        res.json(result);
    } catch (error) {
        console.error('Error getting group members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 5️⃣ Contacts ---

exports.getContacts = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { search, source } = req.query;

        const where = { companyId };
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { username: { contains: search } }
            ];
        }
        if (source) {
            where.source = source;
        }

        const contacts = await getSharedPrismaClient().telegramContact.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Error getting contacts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateContact = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { tags, notes } = req.body;

        const contact = await getSharedPrismaClient().telegramContact.update({
            where: { id: contactId },
            data: { tags, notes }
        });

        res.json({ success: true, data: contact });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 6️⃣ Forward Rules ---

exports.getForwardRules = async (req, res) => {
    try {
        const { companyId } = req.user;

        const rules = await getSharedPrismaClient().telegramForwardRule.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('Error getting forward rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createForwardRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, name, sourceChats, targetChat, filterKeywords, filterMediaTypes } = req.body;

        const rule = await getSharedPrismaClient().telegramForwardRule.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name,
                sourceChats,
                targetChat,
                filterKeywords,
                filterMediaTypes,
                isActive: true
            }
        });

        await telegramUserbotService.setupAutoForward(userbotConfigId, companyId, rule.id);

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error creating forward rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleForwardRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { isActive } = req.body;

        const rule = await getSharedPrismaClient().telegramForwardRule.update({
            where: { id: ruleId },
            data: { isActive }
        });

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error toggling forward rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 7️⃣ Search ---

exports.searchMessages = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, chatId, query, limit } = req.query;

        const result = await telegramUserbotService.searchMessages(
            userbotConfigId,
            companyId,
            chatId,
            query,
            parseInt(limit) || 100
        );

        res.json(result);
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 8️⃣ Campaigns ---

exports.getCampaigns = async (req, res) => {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();
        const campaigns = await prisma.telegramCampaign.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { messages: true } },
            }
        });
        // Attach live stats
        const enriched = await Promise.all(campaigns.map(async (c) => {
            const stats = await prisma.telegramScheduledMessage.groupBy({
                by: ['status'],
                where: { campaignId: c.id },
                _count: { status: true },
            });
            const statusMap = {};
            stats.forEach(s => { statusMap[s.status] = s._count.status; });
            return {
                ...c,
                sentCount: statusMap['SENT'] || 0,
                failedCount: statusMap['FAILED'] || 0,
                pendingCount: statusMap['PENDING'] || 0,
                cancelledCount: statusMap['CANCELLED'] || 0,
            };
        }));
        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Error getting campaigns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { userbotConfigId, name, description, message, chatIds, scheduledTime, recurring, recurringPattern } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'اسم الحملة يجب أن يكون حرفين على الأقل' });
        }

        const targets = Array.isArray(chatIds) 
            ? chatIds.filter(id => id && id !== 'unknown' && id !== 'error') 
            : [];

        if (targets.length === 0) {
            return res.status(400).json({ success: false, error: 'يجب اختيار محادثة واحدة على الأقل' });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
        }

        const prisma = getSharedPrismaClient();
        const campaignId = crypto.randomUUID();

        // Create campaign record
        const campaign = await prisma.telegramCampaign.create({
            data: {
                id: campaignId,
                companyId,
                userbotConfigId,
                name: name.trim(),
                description: description?.trim() || null,
                message: message.trim(),
                scheduledTime: new Date(scheduledTime),
                status: 'PENDING',
                totalCount: targets.length,
                createdBy: userId,
            }
        });

        // Create individual scheduled-message records for each target
        const scheduledMessages = await Promise.all(
            targets.map(chatId => prisma.telegramScheduledMessage.create({
                data: {
                    id: crypto.randomUUID(),
                    userbotConfigId,
                    companyId,
                    chatId,
                    message: message.trim(),
                    scheduledTime: new Date(scheduledTime),
                    recurring: recurring || false,
                    recurringPattern: recurringPattern || null,
                    createdBy: userId,
                    status: 'PENDING',
                    campaignId,
                }
            }))
        );

        res.json({ success: true, data: { campaign, messages: scheduledMessages, count: scheduledMessages.length } });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCampaignDetails = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();

        const campaign = await prisma.telegramCampaign.findFirst({
            where: { id: campaignId, companyId },
        });

        if (!campaign) {
            return res.status(404).json({ success: false, error: 'الحملة غير موجودة' });
        }

        const messages = await prisma.telegramScheduledMessage.findMany({
            where: { campaignId },
            orderBy: { createdAt: 'asc' },
        });

        const stats = {
            total: messages.length,
            sent: messages.filter(m => m.status === 'SENT').length,
            failed: messages.filter(m => m.status === 'FAILED').length,
            pending: messages.filter(m => m.status === 'PENDING').length,
            cancelled: messages.filter(m => m.status === 'CANCELLED').length,
        };

        res.json({ success: true, data: { campaign, messages, stats } });
    } catch (error) {
        console.error('Error getting campaign details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();

        // Cancel all pending messages in the campaign
        await prisma.telegramScheduledMessage.updateMany({
            where: { campaignId, companyId, status: 'PENDING' },
            data: { status: 'CANCELLED' },
        });

        await prisma.telegramCampaign.update({
            where: { id: campaignId },
            data: { status: 'CANCELLED' },
        });

        res.json({ success: true, message: 'تم إلغاء الحملة بنجاح' });
    } catch (error) {
        console.error('Error cancelling campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();

        // Nullify campaignId FK on associated messages before deleting the campaign
        await prisma.telegramScheduledMessage.updateMany({
            where: { campaignId, companyId },
            data: { campaignId: null },
        });

        await prisma.telegramCampaign.delete({
            where: { id: campaignId },
        });

        res.json({ success: true, message: 'تم حذف الحملة بنجاح' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
