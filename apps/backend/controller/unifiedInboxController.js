/**
 * unifiedInboxController.js
 * وحدة التحكم الموحدة لصندوق الوارد - تجمع المحادثات من جميع المنصات
 * (Facebook, Instagram, WhatsApp, Telegram) في واجهة واحدة
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const tryParseJSON = (val) => {
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 جلب جميع المحادثات الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get unified conversations from all platforms
 * GET /api/v1/unified-inbox/conversations
 */
const getUnifiedConversations = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const {
            page = 1,
            limit = 30,
            platform,      // 'all' | 'facebook' | 'instagram' | 'whatsapp' | 'telegram'
            search,
            status,        // 'active' | 'pending' | 'resolved' | 'closed'
            unreadOnly,
            tab,           // 'all' | 'unreplied' | 'done' | 'main' | 'general' | 'requests' | 'spam'
            sortBy = 'lastMessageAt',
            sortOrder = 'desc',
            isPinned         // 'true' | undefined
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // ──────────────────────────────────────────────────────────
        // 1. Fetch Facebook/Messenger conversations (from Conversation model)
        // ──────────────────────────────────────────────────────────
        const fbWhere = { companyId };
        const selectedPlatforms = platform ? platform.toUpperCase().split(',') : [];
        const hasAll = selectedPlatforms.length === 0 || selectedPlatforms.includes('ALL');

        if (hasAll) {
            fbWhere.channel = { in: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM', 'WEBSITE', 'TEST'] };
        } else {
            const nonWaSelected = selectedPlatforms.filter(p => p !== 'WHATSAPP');
            if (nonWaSelected.length > 0) {
                fbWhere.channel = { in: nonWaSelected };
            } else {
                fbWhere.id = 'none'; // Force no match
            }
        }

        if (status) {
            const statusMap = {
                'active': 'ACTIVE',
                'pending': 'PENDING',
                'resolved': 'RESOLVED',
                'closed': 'CLOSED'
            };
            fbWhere.status = statusMap[status.toLowerCase()] || status.toUpperCase();
        } else {
            fbWhere.status = { in: ['ACTIVE', 'PENDING'] };
        }

        // Handle tab-based filtering (mirrors what useInboxConversations does)
        if (tab && tab !== 'all') {
            const tabMap = {
                'done': { status: { in: ['RESOLVED', 'CLOSED'] } },
                'unreplied': { lastMessageIsFromCustomer: true },
                'main': {
                    status: { in: ['ACTIVE', 'OPEN', 'PENDING'] },
                    metadata: { contains: '"tab":"main"' }
                },
                'general': {
                    status: { in: ['ACTIVE', 'OPEN', 'PENDING'] },
                    metadata: { contains: '"tab":"general"' }
                },
                'requests': {
                    status: { in: ['ACTIVE', 'OPEN', 'PENDING'] },
                    metadata: { contains: '"tab":"requests"' }
                },
                'spam': {
                    status: { in: ['ACTIVE', 'OPEN', 'PENDING'] },
                    metadata: { contains: '"tab":"spam"' }
                }
            };
            const tabFilter = tabMap[tab];
            if (tabFilter) {
                Object.assign(fbWhere, tabFilter);
            }
        }

        if (unreadOnly === 'true') {
            fbWhere.lastMessageIsFromCustomer = true;
            fbWhere.unreadCount = { gt: 0 };
        }

        if (isPinned === 'true') {
            fbWhere.isPinned = true;
        }

        if (search) {
            fbWhere.OR = [
                { lastMessagePreview: { contains: search } },
                { customer: { firstName: { contains: search } } },
                { customer: { lastName: { contains: search } } },
                { customer: { email: { contains: search } } },
                { customer: { phone: { contains: search } } },
                // 🔍 Allow searching by order number
                { customer: { orders: { some: { orderNumber: { contains: search } } } } }
            ];
        }

        const prisma = getSharedPrismaClient();

        // When merging sources, fetch enough from each for a representative sort
        const mergeTakeMultiplier = 2;
        const fbTake = hasAll ? take * mergeTakeMultiplier : take;

        // Run conversations query and count in parallel
        const [conversations, totalCount] = await Promise.all([
            executeWithRetry(async () => {
                return await prisma.conversation.findMany({
                    where: fbWhere,
                    include: {
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                                avatar: true,
                                facebookId: true,
                                // 📦 Fetch last order number and total order count
                                orders: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                    select: {
                                        orderNumber: true,
                                        status: true
                                    }
                                },
                                _count: {
                                    select: { orders: true }
                                }
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        },
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                content: true,
                                type: true,
                                isFromCustomer: true,
                                isRead: true,
                                createdAt: true
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: fbTake
                });
            }, 3),
            executeWithRetry(async () => {
                return await prisma.conversation.count({ where: fbWhere });
            }, 3)
        ]);

        // ──────────────────────────────────────────────────────────
        // 2. Also fetch WhatsApp contacts if platform includes whatsapp
        // ──────────────────────────────────────────────────────────
        let whatsappContacts = [];
        const warnings = [];
        const shouldFetchWhatsApp = hasAll || selectedPlatforms.includes('WHATSAPP');
        const isWhatsAppOnly = !hasAll && selectedPlatforms.includes('WHATSAPP') && selectedPlatforms.length === 1;

        const waTake = isWhatsAppOnly ? take : (hasAll ? take * mergeTakeMultiplier : take);

        if (shouldFetchWhatsApp) {
            try {
                const sessionIds = (await prisma.whatsAppSession.findMany({
                    where: { companyId },
                    select: { id: true }
                })).map(s => s.id);

                if (sessionIds.length > 0) {
                    const waWhere = {
                        sessionId: { in: sessionIds },
                        isArchived: false,
                        totalMessages: { gt: 0 }
                    };

                    if (isPinned === 'true') {
                        waWhere.isPinned = true;
                    }

                    if (search) {
                        waWhere.OR = [
                            { name: { contains: search } },
                            { pushName: { contains: search } },
                            { phoneNumber: { contains: search } },
                            // 🔍 Allow searching by order number in WhatsApp
                            { customer: { orders: { some: { orderNumber: { contains: search } } } } }
                        ];
                    }

                    whatsappContacts = await prisma.whatsAppContact.findMany({
                        where: waWhere,
                        orderBy: [
                            { isPinned: 'desc' },
                            { lastMessageAt: 'desc' }
                        ],
                        skip: isWhatsAppOnly ? skip : 0,
                        take: waTake,
                        select: {
                            id: true,
                            sessionId: true,
                            jid: true,
                            phoneNumber: true,
                            name: true,
                            pushName: true,
                            profilePicUrl: true,
                            isGroup: true,
                            category: true,
                            unreadCount: true,
                            lastMessageAt: true,
                            lastMessagePreview: true,
                            isPinned: true,
                            isMuted: true,
                            whatsAppSession: {
                                select: { name: true, phoneNumber: true }
                            },
                            customer: {
                                select: { 
                                    id: true, 
                                    firstName: true, 
                                    lastName: true, 
                                    status: true,
                                    conversations: {
                                        where: {
                                            channel: 'WHATSAPP',
                                            status: { in: ['ACTIVE', 'PENDING'] }
                                        },
                                        select: {
                                            id: true,
                                            aiEnabled: true
                                        },
                                        take: 1
                                    },
                                    orders: {
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                        select: {
                                            orderNumber: true,
                                            status: true
                                        }
                                    },
                                    _count: {
                                        select: { orders: true }
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (waErr) {
                console.error('⚠️ [UNIFIED] Error fetching WhatsApp contacts:', waErr.message);
                warnings.push({ platform: 'whatsapp', message: 'تعذر تحميل محادثات واتساب، قد تكون بعض المحادثات غير مكتملة' });
            }
        }

        // ──────────────────────────────────────────────────────────
        // 3. Normalize all conversations into unified format
        // ──────────────────────────────────────────────────────────
        const normalizedConversations = conversations.map(conv => {
            const lastMsg = conv.messages?.[0];
            let metadata = {};
            try { metadata = conv.metadata ? JSON.parse(conv.metadata) : {}; } catch (e) { }

            return {
                id: conv.id,
                platform: conv.channel?.toLowerCase() || 'facebook',
                platformIcon: getPlatformIcon(conv.channel),
                contactName: conv.customer
                    ? `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim()
                    : 'Unknown',
                contactAvatar: conv.customer?.avatar || null,
                contactId: conv.customerId,
                contactEmail: conv.customer?.email || null,
                contactPhone: conv.customer?.phone || null,
                lastMessage: lastMsg?.content || conv.lastMessagePreview || '',
                lastMessageType: lastMsg?.type || 'TEXT',
                lastMessageTime: conv.lastMessageAt || conv.updatedAt,
                lastMessageIsFromCustomer: lastMsg?.isFromCustomer ?? conv.lastMessageIsFromCustomer,
                unreadCount: conv.unreadCount || 0,
                status: conv.status?.toLowerCase() || 'active',
                assignedTo: conv.user ? {
                    id: conv.user.id,
                    name: `${conv.user.firstName || ''} ${conv.user.lastName || ''}`.trim(),
                    avatar: conv.user.avatar
                } : null,
                isPinned: conv.isPinned || false,
                isMuted: false,
                tags: conv.tags ? conv.tags.split(',').map(t => t.trim()) : [],
                aiEnabled: conv.aiEnabled !== false,
                // 📦 Last order info for quick display in conversation list
                lastOrderNumber: conv.customer?.orders?.[0]?.orderNumber || null,
                lastOrderStatus: conv.customer?.orders?.[0]?.status || null,
                totalOrders: conv.customer?._count?.orders || 0,
                metadata: {
                    pageId: metadata.pageId,
                    pageName: metadata.pageName,
                    conversationId: conv.id,
                    channel: conv.channel
                }
            };
        });

        // Normalize WhatsApp contacts
        const normalizedWhatsApp = whatsappContacts.map(contact => ({
            id: `wa_${contact.id}`,
            platform: 'whatsapp',
            platformIcon: '📱',
            contactName: contact.name || contact.pushName || contact.phoneNumber,
            contactAvatar: contact.profilePicUrl || null,
            contactId: contact.customer?.id || contact.id,
            contactEmail: null,
            contactPhone: contact.phoneNumber,
            lastMessage: contact.lastMessagePreview || '',
            lastMessageType: 'TEXT',
            lastMessageTime: contact.lastMessageAt,
            lastMessageIsFromCustomer: contact.lastMessageIsFromMe !== undefined ? !contact.lastMessageIsFromMe : true,
            unreadCount: contact.unreadCount || 0,
            status: 'active',
            assignedTo: null,
            isPinned: contact.isPinned,
            isMuted: contact.isMuted,
            tags: [],
            aiEnabled: contact.customer?.conversations?.[0]?.aiEnabled !== false,
            // 📦 Last order info for quick display in WhatsApp conversation list
            lastOrderNumber: contact.customer?.orders?.[0]?.orderNumber || null,
            lastOrderStatus: contact.customer?.orders?.[0]?.status || null,
            totalOrders: contact.customer?._count?.orders || 0,
            metadata: {
                sessionId: contact.sessionId,
                jid: contact.jid,
                sessionName: contact.whatsAppSession?.name,
                isGroup: contact.isGroup,
                category: contact.category,
                channel: 'WHATSAPP'
            }
        }));

        // Merge and sort all conversations
        let allConversations;
        if (isWhatsAppOnly) {
            allConversations = normalizedWhatsApp;
        } else if (!hasAll && !selectedPlatforms.includes('WHATSAPP')) {
            allConversations = normalizedConversations;
        } else {
            // Merge all, sort by lastMessageTime
            allConversations = [...normalizedConversations, ...normalizedWhatsApp]
                .sort((a, b) => {
                    const dateA = new Date(a.lastMessageTime || 0);
                    const dateB = new Date(b.lastMessageTime || 0);
                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                })
                .slice(0, take);
        }

        // ──────────────────────────────────────────────────────────
        // 4. Get platform counts
        // WhatsApp count comes from WhatsAppContact (actual data source), not Conversation
        // ──────────────────────────────────────────────────────────
        const waSessionIds = whatsappContacts.length > 0
            ? [...new Set(whatsappContacts.map(c => c.sessionId))]
            : (await prisma.whatsAppSession.findMany({ where: { companyId }, select: { id: true } })).map(s => s.id);

        const [fbCount, igCount, waCountRaw, tgCount, unrepliedCount] = await Promise.all([
            prisma.conversation.count({ where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({ where: { companyId, channel: 'INSTAGRAM', status: { in: ['ACTIVE', 'PENDING'] } } }),
            waSessionIds.length > 0
                ? prisma.whatsAppContact.count({ where: { sessionId: { in: waSessionIds }, isArchived: false } })
                : Promise.resolve(0),
            prisma.conversation.count({ where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({
                where: {
                    companyId,
                    channel: { in: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM'] },
                    status: { in: ['ACTIVE', 'PENDING'] },
                    lastMessageIsFromCustomer: true
                }
            })
        ]);
        const waCount = waCountRaw;

        res.json({
            success: true,
            data: allConversations,
            warnings: warnings.length > 0 ? warnings : undefined,
            pagination: {
                total: totalCount + whatsappContacts.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((totalCount + whatsappContacts.length) / parseInt(limit))
            },
            counts: {
                all: fbCount + igCount + waCount + tgCount,
                facebook: fbCount,
                instagram: igCount,
                whatsapp: waCount,
                telegram: tgCount,
                unreplied: unrepliedCount
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting unified conversations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 جلب رسائل محادثة موحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shared helper: query standard Conversation+Message model
 */
async function getStandardConversationMessages(req, res, companyId, id, skip, take) {
    try {
        const prisma = getSharedPrismaClient();
        const { page = 1, limit = 50 } = req.query;

        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId },
            select: { id: true, channel: true, customerId: true }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: { conversationId: id },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                select: {
                    id: true,
                    content: true,
                    type: true,
                    isFromCustomer: true,
                    isRead: true,
                    readAt: true,
                    attachments: true,
                    metadata: true,
                    createdAt: true,
                    senderId: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    }
                }
            }),
            prisma.message.count({ where: { conversationId: id } })
        ]);

        const normalizedMessages = messages.map(msg => {
            let attachments = [];
            try { attachments = msg.attachments ? JSON.parse(msg.attachments) : []; } catch (e) { }
            let metadata = {};
            try { metadata = msg.metadata ? JSON.parse(msg.metadata) : {}; } catch (e) { }

            return {
                id: msg.id,
                platform: conversation.channel?.toLowerCase() || 'facebook',
                content: msg.content || '',
                type: msg.type?.toLowerCase() || 'text',
                isFromCustomer: msg.isFromCustomer,
                timestamp: msg.createdAt,
                status: msg.isRead ? 'read' : 'delivered',
                mediaUrl: attachments[0]?.url || metadata.attachmentUrl || null,
                mediaType: attachments[0]?.type || metadata.attachmentType || null,
                mediaFileName: attachments[0]?.name || null,
                quotedMessage: null,
                isAIResponse: metadata.isAIResponse || (!msg.isFromCustomer && !msg.senderId) || false,
                sender: msg.isFromCustomer ? 'customer' : (msg.senderId && msg.user ? `${msg.user.firstName} ${msg.user.lastName}`.trim() : (metadata.isAIResponse || !msg.senderId ? 'ai' : 'agent')),
                senderAvatar: msg.user?.avatar || null,
                interactiveData: null
            };
        }).reverse();

        return res.json({
            success: true,
            data: normalizedMessages,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (error) {
        console.error('❌ [UNIFIED] Error getting standard messages:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get messages for a unified conversation
 * GET /api/v1/unified-inbox/conversations/:id/messages
 */
const getConversationMessages = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { id } = req.params;
        const { page = 1, limit = 50, platform } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const prisma = getSharedPrismaClient();

        // Determine platform type from ID prefix or explicit parameter
        const isWhatsAppContact = id.startsWith('wa_') || platform === 'whatsapp';

        if (isWhatsAppContact) {
            // WhatsApp messages - use WhatsAppMessage model
            const contactId = id.replace('wa_', '');
            const { sessionId, jid } = req.query;

            if (!sessionId || !jid) {
                // Fall through to standard Conversation+Message model
                // instead of returning 400
                return getStandardConversationMessages(req, res, companyId, id, skip, take);
            }

            // Verify session ownership
            const session = await prisma.whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });

            if (!session) {
                return res.status(404).json({ success: false, message: 'Session not found' });
            }

            const [messages, total] = await Promise.all([
                prisma.whatsAppMessage.findMany({
                    where: { sessionId, remoteJid: jid },
                    orderBy: { timestamp: 'desc' },
                    skip,
                    take,
                    select: {
                        id: true,
                        messageId: true,
                        fromMe: true,
                        messageType: true,
                        content: true,
                        mediaUrl: true,
                        mediaType: true,
                        mediaFileName: true,
                        quotedMessageId: true,
                        quotedContent: true,
                        status: true,
                        timestamp: true,
                        isAIResponse: true,
                        interactiveData: true,
                        participant: true
                    }
                }),
                prisma.whatsAppMessage.count({ where: { sessionId, remoteJid: jid } })
            ]);

            // Normalize WhatsApp messages
            const normalizedMessages = messages.map(msg => ({
                id: msg.id,
                platform: 'whatsapp',
                messageId: msg.messageId,
                content: msg.content || '',
                type: msg.messageType?.toLowerCase() || 'text',
                isFromCustomer: !msg.fromMe,
                timestamp: msg.timestamp,
                status: msg.status?.toLowerCase() || 'sent',
                mediaUrl: msg.mediaUrl,
                mediaType: msg.mediaType,
                mediaFileName: msg.mediaFileName,
                quotedMessage: msg.quotedContent ? {
                    id: msg.quotedMessageId,
                    content: msg.quotedContent
                } : null,
                isAIResponse: msg.isAIResponse,
                sender: msg.fromMe ? (msg.isAIResponse ? 'ai' : 'agent') : (msg.participant || 'customer'),
                interactiveData: msg.interactiveData ? tryParseJSON(msg.interactiveData) : null
            })).reverse(); // Reverse to show oldest first

            return res.json({
                success: true,
                data: normalizedMessages,
                pagination: { total, page: parseInt(page), limit: parseInt(limit) }
            });
        }

        // Facebook/Telegram - use Conversation + Message models
        return getStandardConversationMessages(req, res, companyId, id, skip, take);

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 إرسال رسالة موحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a message through the unified inbox - routes to the correct platform
 * POST /api/v1/unified-inbox/conversations/:id/messages
 */
const sendUnifiedMessage = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.id;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { id } = req.params;
        const { content, type = 'text', platform, sessionId, jid, quotedMessageId, mediaUrl, mediaFileName } = req.body;

        const isMedia = type.toLowerCase() !== 'text';

        if (!isMedia && !content) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
        }
        if (isMedia && !mediaUrl) {
            return res.status(400).json({ success: false, message: 'Media URL is required for file attachments' });
        }

        const prisma = getSharedPrismaClient();

        // Route to appropriate platform handler
        if (platform === 'whatsapp' || id.startsWith('wa_')) {
            // WhatsApp send
            if (!sessionId || !jid) {
                return res.status(400).json({
                    success: false,
                    message: 'sessionId and jid are required for WhatsApp'
                });
            }

            // Verify session
            const session = await prisma.whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });

            if (!session) {
                return res.status(404).json({ success: false, message: 'WhatsApp session not found' });
            }

            // Use WhatsApp service to send
            const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
            let message;

            if (!isMedia) {
                message = await WhatsAppMessageHandler.sendText(sessionId, jid, content, {
                    quotedMessageId,
                    typingSimulation: true
                });
            } else if (type.toLowerCase() === 'image') {
                message = await WhatsAppMessageHandler.sendImage(sessionId, jid, mediaUrl, content || '');
            } else if (type.toLowerCase() === 'video') {
                message = await WhatsAppMessageHandler.sendVideo(sessionId, jid, mediaUrl, content || '');
            } else if (type.toLowerCase() === 'audio') {
                message = await WhatsAppMessageHandler.sendAudio(sessionId, jid, mediaUrl);
            } else {
                message = await WhatsAppMessageHandler.sendDocument(sessionId, jid, mediaUrl, { caption: content || '' });
            }

            return res.json({
                success: true,
                data: {
                    id: message?.id || Date.now().toString(),
                    platform: 'whatsapp',
                    content: !isMedia ? content : (content || mediaUrl),
                    type: type.toLowerCase(),
                    isFromCustomer: false,
                    timestamp: new Date(),
                    status: 'sent',
                    mediaUrl: isMedia ? mediaUrl : null,
                    mediaType: isMedia ? type.toLowerCase() : null,
                    mediaFileName: isMedia ? (mediaFileName || 'file') : null
                }
            });
        }

        // Facebook/Telegram/Instagram - send via Conversation model
        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId },
            include: { customer: true }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Create message in database
        const messageData = {
            conversationId: id,
            senderId: userId,
            type: type.toUpperCase(),
            content: !isMedia ? content : (content || mediaUrl),
            isFromCustomer: false,
            isRead: true
        };

        if (isMedia && mediaUrl) {
            messageData.attachments = JSON.stringify([{
                type: type.toLowerCase(),
                url: mediaUrl,
                name: mediaFileName || 'file'
            }]);
        }

        const message = await prisma.message.create({
            data: messageData
        });

        // Update conversation
        await prisma.conversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                lastMessagePreview: !isMedia ? content.substring(0, 100) : (type.toLowerCase() === 'image' ? '📷 صورة' : `📎 ${mediaFileName || 'ملف'}`),
                lastMessageIsFromCustomer: false,
                updatedAt: new Date()
            }
        });

        // Route to platform-specific API for actual delivery
        if (conversation.channel === 'FACEBOOK') {
            try {
                let metadata = {};
                try { metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {}; } catch (e) { }
                
                let actualPageId = metadata.pageId || conversation.facebookPageId || null;
                let pageAccessToken = metadata.pageAccessToken || null;

                if (!pageAccessToken && actualPageId) {
                    const { getPageToken } = require('./conversation/conversationShared');
                    const pageTokenData = await getPageToken(actualPageId);
                    pageAccessToken = pageTokenData?.pageAccessToken || null;
                }

                if (!pageAccessToken) {
                    const facebookPage = await prisma.facebookPage.findFirst({
                        where: { companyId, status: 'connected' }
                    });
                    if (facebookPage) {
                        actualPageId = facebookPage.pageId;
                        pageAccessToken = facebookPage.pageAccessToken;
                    }
                }

                if (pageAccessToken && conversation.customer?.facebookId) {
                    const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');
                    const payload = !isMedia ? content : mediaUrl;
                    await sendProductionFacebookMessage(
                        conversation.customer.facebookId,
                        payload,
                        type.toUpperCase(),
                        actualPageId,
                        pageAccessToken
                    );
                }
            } catch (fbErr) {
                console.error('⚠️ [UNIFIED] Facebook send error:', fbErr.message);
            }
        } else if (conversation.channel === 'TELEGRAM') {
            try {
                let meta = {};
                try { meta = conversation.metadata ? JSON.parse(conversation.metadata) : {}; } catch (e) {}
                // Route to userbot if conversation belongs to one
                if (meta.isUserbot && meta.userbotConfigId) {
                    const telegramUserbotService = require('../services/TelegramUserbotService');
                    await telegramUserbotService.sendUserbotReply(id, content || '');
                } else {
                    const telegramBotService = require('../services/TelegramBotService');
                    const options = {};
                    if (isMedia) {
                        options.type = type.toLowerCase() === 'image' ? 'photo' : type.toLowerCase();
                        options.fileUrl = mediaUrl;
                        if (type.toLowerCase() === 'image') {
                            options.imageUrls = [mediaUrl];
                        }
                    }
                    await telegramBotService.sendReply(id, content || '', options);
                }
            } catch (tgErr) {
                console.error('⚠️ [UNIFIED] Telegram send error:', tgErr.message);
            }
        } else if (conversation.channel === 'INSTAGRAM') {
            try {
                const igPage = await prisma.facebookPage.findFirst({
                    where: { companyId, instagramAccountId: { not: null } },
                    select: { pageAccessToken: true, instagramAccountId: true }
                });
                if (igPage?.pageAccessToken && igPage?.instagramAccountId && conversation.customer?.instagramId) {
                    const axios = require('axios');
                    const IG_GRAPH_API = `https://graph.facebook.com/v22.0/${igPage.instagramAccountId}/messages`;
                    
                    const messagePayload = !isMedia
                        ? { text: content }
                        : {
                            attachment: {
                                type: type.toLowerCase() === 'image' ? 'image' : 'file',
                                payload: { url: mediaUrl }
                            }
                        };

                    await axios.post(IG_GRAPH_API, {
                        recipient: { id: conversation.customer.instagramId },
                        message: messagePayload,
                        access_token: igPage.pageAccessToken
                    }, { timeout: 15000 });
                }
            } catch (igErr) {
                console.error('⚠️ [UNIFIED] Instagram send error:', igErr.message);
            }
        }

        res.json({
            success: true,
            data: {
                id: message.id,
                platform: conversation.channel?.toLowerCase(),
                content: message.content,
                type: message.type?.toLowerCase(),
                isFromCustomer: false,
                timestamp: message.createdAt,
                status: 'sent',
                mediaUrl: isMedia ? mediaUrl : null,
                mediaType: isMedia ? type.toLowerCase() : null,
                mediaFileName: isMedia ? (mediaFileName || 'file') : null
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 إحصائيات الصندوق الموحد
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get unified inbox stats
 * GET /api/v1/unified-inbox/stats
 */
const getUnifiedStats = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const prisma = getSharedPrismaClient();

        // Get WhatsApp session IDs for contact queries
        const waSessions = await prisma.whatsAppSession.findMany({
            where: { companyId },
            select: { id: true }
        });
        const waSessionIds = waSessions.map(s => s.id);

        const [
            fbActive,
            igActive,
            tgActive,
            fbUnreplied,
            igUnreplied,
            tgUnreplied,
            fbResolved,
            igResolved,
            tgResolved
        ] = await Promise.all([
            prisma.conversation.count({
                where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'INSTAGRAM', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] }, lastMessageIsFromCustomer: true }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'INSTAGRAM', status: { in: ['ACTIVE', 'PENDING'] }, lastMessageIsFromCustomer: true }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] }, lastMessageIsFromCustomer: true }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'FACEBOOK', status: { in: ['RESOLVED', 'CLOSED'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'INSTAGRAM', status: { in: ['RESOLVED', 'CLOSED'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'TELEGRAM', status: { in: ['RESOLVED', 'CLOSED'] } }
            })
        ]);

        // Get WhatsApp stats from WhatsAppContact model (the actual data source)
        let waActive = 0;
        let waUnreplied = 0;
        let waUnread = 0;
        if (waSessionIds.length > 0) {
            try {
                [waActive, waUnread] = await Promise.all([
                    prisma.whatsAppContact.count({
                        where: { sessionId: { in: waSessionIds }, isArchived: false }
                    }),
                    prisma.whatsAppContact.aggregate({
                        where: { sessionId: { in: waSessionIds }, isArchived: false, unreadCount: { gt: 0 } },
                        _sum: { unreadCount: true }
                    }).then(r => r._sum.unreadCount || 0)
                ]);
                // WA "unreplied" = last message is from customer (not from me)
                waUnreplied = await prisma.whatsAppContact.count({
                    where: { sessionId: { in: waSessionIds }, isArchived: false, lastMessageIsFromMe: false }
                });
            } catch (e) {
                console.error('⚠️ [UNIFIED] Error fetching WhatsApp stats:', e.message);
            }
        }

        const totalActive = fbActive + igActive + tgActive + waActive;
        const totalUnreplied = fbUnreplied + igUnreplied + tgUnreplied + waUnreplied;
        const totalResolved = fbResolved + igResolved + tgResolved;

        res.json({
            success: true,
            data: {
                totalActive,
                totalUnreplied,
                totalResolved,
                platforms: {
                    facebook: { active: fbActive, icon: '💬' },
                    instagram: { active: igActive, icon: '📷' },
                    whatsapp: { active: waActive, unread: waUnread, icon: '📱' },
                    telegram: { active: tgActive, icon: '✈️' }
                }
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جلب بيانات العميل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get customer profile for a conversation
 * GET /api/v1/unified-inbox/customer/:customerId
 */
const getCustomerProfile = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { customerId } = req.params;
        const prisma = getSharedPrismaClient();

        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                companyId
            },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        total: true,
                        createdAt: true,
                        _count: {
                            select: { orderItems: true }
                        }
                    }
                },
                conversations: {
                    where: { channel: { in: ['FACEBOOK', 'WHATSAPP', 'TELEGRAM'] } },
                    orderBy: { lastMessageAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        channel: true,
                        status: true,
                        lastMessageAt: true,
                        lastMessagePreview: true
                    }
                },
                _count: {
                    select: {
                        orders: true,
                        conversations: true
                    }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // 🧠 Smart Rating Calculation
        const totalOrders = customer._count.orders;
        let ltv = 0;
        
        // Calculate LTV from completed/delivered/paid orders (if fetched in full, or just approximate with recent orders if full isn't fetched)
        // Since we only fetched 5 recent orders, we'll fetch sum from DB for accuracy
        const ordersSum = await prisma.order.aggregate({
            where: {
                customerId,
                status: { in: ['DELIVERED'] }
            },
            _sum: { total: true }
        });
        ltv = ordersSum._sum.total || 0;

        let ratingStars = 1;
        let ratingLabel = 'عميل جديد';
        
        if (totalOrders === 0) {
            ratingStars = 1; ratingLabel = 'عميل جديد';
        } else if (totalOrders === 1 && ltv < 200) {
            ratingStars = 2; ratingLabel = 'عميل محتمل';
        } else if (totalOrders <= 3 || ltv < 500) {
            ratingStars = 3; ratingLabel = 'عميل متكرر';
        } else if (totalOrders <= 9 || ltv < 2000) {
            ratingStars = 4; ratingLabel = 'عميل مميز';
        } else {
            ratingStars = 5; ratingLabel = 'عميل VIP';
        }

        res.json({
            success: true,
            data: {
                id: customer.id,
                name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                avatar: customer.avatar,
                status: customer.status,
                createdAt: customer.createdAt,
                totalOrders: customer._count.orders,
                totalConversations: customer._count.conversations,
                recentOrders: customer.orders,
                recentConversations: customer.conversations.map(c => ({
                    ...c,
                    platform: c.channel?.toLowerCase()
                })),
                tags: customer.tags ? customer.tags.split(',').map(t => t.trim()) : [],
                notes: customer.notes || '',
                // 🌟 Smart Rating Fields
                ltv,
                ratingStars,
                ratingLabel
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting customer profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get quick replies across all platforms
 * GET /api/v1/unified-inbox/quick-replies
 */
const getQuickReplies = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const prisma = getSharedPrismaClient();

        // Get WhatsApp quick replies
        const waReplies = await prisma.whatsAppQuickReply.findMany({
            where: { companyId, isActive: true },
            orderBy: [
                { usageCount: 'desc' },
                { sortOrder: 'asc' }
            ],
            select: {
                id: true,
                title: true,
                shortcut: true,
                content: true,
                category: true,
                mediaUrl: true,
                mediaType: true
            }
        });

        // Normalize
        const quickReplies = waReplies.map(r => ({
            id: r.id,
            title: r.title,
            shortcut: r.shortcut,
            content: r.content,
            category: r.category,
            platforms: ['whatsapp', 'facebook', 'instagram', 'telegram'],
            mediaUrl: r.mediaUrl,
            mediaType: r.mediaType
        }));

        res.json({
            success: true,
            data: quickReplies
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting quick replies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الصندوق الموحد
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get/Save unified inbox settings
 * GET /api/v1/unified-inbox/settings
 */
const getSettings = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const prisma = getSharedPrismaClient();

        // Check connected platforms
        const [
            waSessions,
            tgConfigs,
            fbAllPages,
            igPages
        ] = await Promise.all([
            prisma.whatsAppSession.findMany({
                where: { companyId },
                select: { id: true, name: true, phoneNumber: true, status: true, createdAt: true, provider: true, metadata: true }
            }),
            prisma.telegramConfig.findMany({
                where: { companyId },
                select: { id: true, botName: true, botUsername: true, isActive: true, type: true, label: true, inboxEnabled: true, createdAt: true }
            }),
            prisma.facebookPage.findMany({
                where: { companyId },
                select: { id: true, pageId: true, pageName: true, status: true, connectedAt: true }
            }),
            prisma.facebookPage.findMany({
                where: { companyId, instagramAccountId: { not: null } },
                select: { id: true, pageName: true, instagramAccountId: true, instagramAccountName: true, status: true }
            })
        ]);

        const activeWaSessions = waSessions.filter(s => {
            if (!s.metadata) return true;
            try {
                const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                return !meta.isDeleted;
            } catch (e) {
                return true;
            }
        });

        res.json({
            success: true,
            data: {
                platforms: {
                    facebook: {
                        connected: fbAllPages.length > 0,
                        count: fbAllPages.length,
                        pages: fbAllPages
                    },
                    instagram: {
                        connected: igPages.length > 0,
                        count: igPages.length,
                        pages: igPages
                    },
                    whatsapp: {
                        connected: activeWaSessions.some(s => s.status === 'CONNECTED'),
                        count: activeWaSessions.length,
                        sessions: activeWaSessions
                    },
                    telegram: {
                        connected: tgConfigs.some(c => c.isActive),
                        count: tgConfigs.length,
                        configs: tgConfigs
                    },
                    telegramUserbot: {
                        connected: tgConfigs.some(c => c.type === 'USERBOT' && c.inboxEnabled && c.isActive),
                        count: tgConfigs.filter(c => c.type === 'USERBOT').length,
                        configs: tgConfigs.filter(c => c.type === 'USERBOT').map(c => ({
                            id: c.id,
                            label: c.label,
                            isActive: c.isActive,
                            inboxEnabled: c.inboxEnabled,
                            type: c.type
                        }))
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error getting settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ✏️ تحديث محادثة موحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update a unified conversation (status, assignment, etc.)
 * PUT /api/v1/unified-inbox/conversations/:id
 */
const updateUnifiedConversation = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { id } = req.params;
        const { status, assignedTo, isPinned, aiEnabled } = req.body;
        const prisma = getSharedPrismaClient();

        // Handle WhatsApp conversations
        if (id.startsWith('wa_')) {
            const contactId = id.replace('wa_', '');
            const contact = await prisma.whatsAppContact.findFirst({
                where: { id: contactId, isArchived: false }
            });
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Conversation not found' });
            }

            if (status === 'resolved' || status === 'closed') {
                await prisma.whatsAppContact.update({
                    where: { id: contactId },
                    data: {
                        isArchived: true,
                        lastMessageAt: new Date()
                    }
                });
            }

            if (aiEnabled !== undefined && contact.customerId) {
                await prisma.conversation.updateMany({
                    where: { customerId: contact.customerId, channel: 'WHATSAPP', companyId },
                    data: { aiEnabled: Boolean(aiEnabled) }
                });
            }

            return res.json({ success: true, data: { id, status: status || 'active', aiEnabled } });
        }

        // Handle Conversation model (Facebook/Instagram/Telegram)
        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const updateData = {};
        if (status) updateData.status = status.toUpperCase();
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (aiEnabled !== undefined) updateData.aiEnabled = Boolean(aiEnabled);
        updateData.updatedAt = new Date();

        const updated = await prisma.conversation.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status?.toLowerCase(),
                assignedTo: updated.assignedTo
            }
        });

    } catch (error) {
        console.error('❌ [UNIFIED] Error updating conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🗑️ حذف محادثة موحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delete a unified conversation
 * DELETE /api/v1/unified-inbox/conversations/:id
 */
const deleteUnifiedConversation = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { id } = req.params;
        const prisma = getSharedPrismaClient();

        // Handle WhatsApp conversations
        if (id.startsWith('wa_')) {
            const contactId = id.replace('wa_', '');
            const contact = await prisma.whatsAppContact.findFirst({
                where: { id: contactId, isArchived: false }
            });
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Conversation not found' });
            }

            // Delete all messages for this contact, then the contact
            await prisma.whatsAppMessage.deleteMany({
                where: { sessionId: contact.sessionId, remoteJid: contact.jid }
            });
            await prisma.whatsAppContact.delete({
                where: { id: contactId }
            });

            return res.json({ success: true, message: 'Conversation deleted' });
        }

        // Handle Conversation model (Facebook/Instagram/Telegram)
        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId }
        });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        await prisma.message.deleteMany({ where: { conversationId: id } });
        await prisma.conversation.delete({ where: { id } });

        res.json({ success: true, message: 'Conversation deleted' });

    } catch (error) {
        console.error('❌ [UNIFIED] Error deleting conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تحديث بيانات العميل (ملاحظات)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update customer (notes, etc.)
 * PUT /api/v1/unified-inbox/customer/:customerId
 */
const updateCustomer = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { customerId } = req.params;
        const { notes } = req.body;
        const prisma = getSharedPrismaClient();

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await prisma.customer.update({
            where: { id: customerId },
            data: { notes }
        });

        res.json({ success: true, message: 'Customer updated' });

    } catch (error) {
        console.error('❌ [UNIFIED] Error updating customer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 😴 غفوة محادثة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Snooze a conversation
 * POST /api/v1/unified-inbox/conversations/:id/snooze
 */
const snoozeConversation = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is required' });
        }

        const { id } = req.params;
        const { snoozeUntil } = req.body;
        const prisma = getSharedPrismaClient();

        if (!snoozeUntil) {
            return res.status(400).json({ success: false, message: 'snoozeUntil is required' });
        }

        // WhatsApp conversations
        if (id.startsWith('wa_')) {
            const contactId = id.replace('wa_', '');
            await prisma.whatsAppContact.update({
                where: { id: contactId },
                data: { isArchived: true, lastMessageAt: new Date() }
            });
            return res.json({ success: true, message: 'WhatsApp conversation snoozed' });
        }

        // FB/IG/TG conversations
        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId }
        });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Store snooze in metadata
        const metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
        metadata.snoozedUntil = snoozeUntil;

        await prisma.conversation.update({
            where: { id },
            data: {
                status: 'PENDING',
                metadata: JSON.stringify(metadata),
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Conversation snoozed' });

    } catch (error) {
        console.error('❌ [UNIFIED] Error snoozing conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 Helper functions
// ═══════════════════════════════════════════════════════════════════════════════

function getPlatformIcon(channel) {
    switch (channel?.toUpperCase()) {
        case 'FACEBOOK': return '💬';
        case 'WHATSAPP': return '📱';
        case 'INSTAGRAM': return '📷';
        case 'TELEGRAM': return '✈️';
        default: return '💬';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 Export
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    getUnifiedConversations,
    getConversationMessages,
    sendUnifiedMessage,
    updateUnifiedConversation,
    deleteUnifiedConversation,
    getUnifiedStats,
    getCustomerProfile,
    updateCustomer,
    snoozeConversation,
    getQuickReplies,
    getSettings
};
