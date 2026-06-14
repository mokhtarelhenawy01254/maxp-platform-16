/**
 * unifiedInboxController.js
 * وحدة التحكم الموحدة لصندوق الوارد - تجمع المحادثات من جميع المنصات
 * (Facebook, Instagram, WhatsApp, Telegram) في واجهة واحدة
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

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
            sortBy = 'lastMessageAt',
            sortOrder = 'desc'
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

        if (unreadOnly === 'true') {
            fbWhere.lastMessageIsFromCustomer = true;
            fbWhere.unreadCount = { gt: 0 };
        }

        if (search) {
            fbWhere.OR = [
                { lastMessagePreview: { contains: search } },
                { customer: { firstName: { contains: search } } },
                { customer: { lastName: { contains: search } } },
                { customer: { email: { contains: search } } },
                { customer: { phone: { contains: search } } }
            ];
        }

        const prisma = getSharedPrismaClient();

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
                                facebookId: true
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
                    take
                });
            }, 3),
            executeWithRetry(async () => {
                return await prisma.conversation.count({ where: fbWhere });
            }, 3)
        ]);

        // ──────────────────────────────────────────────────────────
        // 2. Also fetch WhatsApp contacts if platform includes whatsapp
        // ──────────────────────────────────────────────────────────
        const shouldFetchWhatsApp = hasAll || selectedPlatforms.includes('WHATSAPP');
        const isWhatsAppOnly = !hasAll && selectedPlatforms.includes('WHATSAPP') && selectedPlatforms.length === 1;

        if (shouldFetchWhatsApp) {
            try {
                const sessionIds = (await prisma.whatsAppSession.findMany({
                    where: { companyId },
                    select: { id: true }
                })).map(s => s.id);

                if (sessionIds.length > 0) {
                    const waWhere = {
                        sessionId: { in: sessionIds },
                        isArchived: false
                    };

                    if (search) {
                        waWhere.OR = [
                            { name: { contains: search } },
                            { pushName: { contains: search } },
                            { phoneNumber: { contains: search } }
                        ];
                    }

                    whatsappContacts = await prisma.whatsAppContact.findMany({
                        where: waWhere,
                        orderBy: [
                            { isPinned: 'desc' },
                            { lastMessageAt: 'desc' }
                        ],
                        skip: isWhatsAppOnly ? skip : 0,
                        take: isWhatsAppOnly ? take : 20,
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
                            isPinned: true,
                            isMuted: true,
                            whatsAppSession: {
                                select: { name: true, phoneNumber: true }
                            },
                            customer: {
                                select: { firstName: true, lastName: true, status: true }
                            }
                        }
                    });
                }
            } catch (waErr) {
                console.error('⚠️ [UNIFIED] Error fetching WhatsApp contacts:', waErr.message);
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
                isPinned: false,
                isMuted: false,
                tags: conv.tags ? conv.tags.split(',').map(t => t.trim()) : [],
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
            contactId: contact.id,
            contactEmail: null,
            contactPhone: contact.phoneNumber,
            lastMessage: '',
            lastMessageType: 'TEXT',
            lastMessageTime: contact.lastMessageAt,
            lastMessageIsFromCustomer: false,
            unreadCount: contact.unreadCount || 0,
            status: 'active',
            assignedTo: null,
            isPinned: contact.isPinned,
            isMuted: contact.isMuted,
            tags: [],
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
        // ──────────────────────────────────────────────────────────
        const [fbCount, igCount, waCount, tgCount, unrepliedCount] = await Promise.all([
            prisma.conversation.count({ where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({ where: { companyId, channel: 'INSTAGRAM', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({ where: { companyId, channel: 'WHATSAPP', status: { in: ['ACTIVE', 'PENDING'] } } }),
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

        res.json({
            success: true,
            data: allConversations,
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
                return res.status(400).json({
                    success: false,
                    message: 'sessionId and jid are required for WhatsApp conversations'
                });
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
                sender: msg.fromMe ? 'agent' : (msg.participant || 'customer'),
                interactiveData: msg.interactiveData ? JSON.parse(msg.interactiveData) : null
            })).reverse(); // Reverse to show oldest first

            return res.json({
                success: true,
                data: normalizedMessages,
                pagination: { total, page: parseInt(page), limit: parseInt(limit) }
            });
        }

        // Facebook/Telegram - use Conversation + Message models
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
                isAIResponse: metadata.isAIResponse || false,
                sender: msg.isFromCustomer ? 'customer' : (msg.user ? `${msg.user.firstName} ${msg.user.lastName}`.trim() : 'agent'),
                senderAvatar: msg.user?.avatar || null,
                interactiveData: null
            };
        }).reverse();

        res.json({
            success: true,
            data: normalizedMessages,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) }
        });

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
        const { content, type = 'text', platform, sessionId, jid, quotedMessageId } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
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
            const message = await WhatsAppMessageHandler.sendText(sessionId, jid, content, {
                quotedMessageId
            });

            return res.json({
                success: true,
                data: {
                    id: message?.id || Date.now().toString(),
                    platform: 'whatsapp',
                    content,
                    type: 'text',
                    isFromCustomer: false,
                    timestamp: new Date(),
                    status: 'sent'
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
        const message = await prisma.message.create({
            data: {
                conversationId: id,
                senderId: userId,
                type: type.toUpperCase(),
                content,
                isFromCustomer: false,
                isRead: true
            }
        });

        // Update conversation
        await prisma.conversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                lastMessagePreview: content.substring(0, 100),
                lastMessageIsFromCustomer: false,
                updatedAt: new Date()
            }
        });

        // Route to platform-specific API for actual delivery
        if (conversation.channel === 'FACEBOOK') {
            try {
                let metadata = {};
                try { metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {}; } catch (e) { }
                const facebookApi = require('../services/facebookApi');
                if (facebookApi && facebookApi.sendMessage && conversation.customer?.facebookId) {
                    await facebookApi.sendMessage(
                        conversation.customer.facebookId,
                        content,
                        metadata.pageAccessToken || null
                    );
                }
            } catch (fbErr) {
                console.error('⚠️ [UNIFIED] Facebook send error:', fbErr.message);
                // Message saved in DB, but FB delivery may have failed
            }
        } else if (conversation.channel === 'TELEGRAM') {
            try {
                let metadata = {};
                try { metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {}; } catch (e) { }
                const telegramBotService = require('../services/TelegramBotService');
                if (telegramBotService && metadata.chatId) {
                    await telegramBotService.sendMessage(companyId, metadata.chatId, content);
                }
            } catch (tgErr) {
                console.error('⚠️ [UNIFIED] Telegram send error:', tgErr.message);
            }
        } else if (conversation.channel === 'INSTAGRAM') {
            try {
                let metadata = {};
                try { metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {}; } catch (e) { }
                const igPage = await prisma.facebookPage.findFirst({
                    where: { companyId, instagramAccountId: { not: null } },
                    select: { pageAccessToken: true, instagramAccountId: true }
                });
                if (igPage?.pageAccessToken && igPage?.instagramAccountId && conversation.customer?.instagramId) {
                    const axios = require('axios');
                    const IG_GRAPH_API = `https://graph.facebook.com/v22.0/${igPage.instagramAccountId}/messages`;
                    await axios.post(IG_GRAPH_API, {
                        recipient: { id: conversation.customer.instagramId },
                        message: { text: content },
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
                status: 'sent'
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

        const [
            totalActive,
            totalUnreplied,
            fbActive,
            igActive,
            waActive,
            tgActive,
            totalResolved
        ] = await Promise.all([
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM'] }, status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM'] }, status: { in: ['ACTIVE', 'PENDING'] }, lastMessageIsFromCustomer: true }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'INSTAGRAM', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'WHATSAPP', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM'] }, status: { in: ['RESOLVED', 'CLOSED'] } }
            })
        ]);

        // Get WhatsApp total unread from contacts
        let waUnread = 0;
        try {
            const sessions = await prisma.whatsAppSession.findMany({
                where: { companyId },
                select: { id: true }
            });
            if (sessions.length > 0) {
                const result = await prisma.whatsAppContact.aggregate({
                    where: {
                        sessionId: { in: sessions.map(s => s.id) },
                        unreadCount: { gt: 0 }
                    },
                    _sum: { unreadCount: true }
                });
                waUnread = result._sum.unreadCount || 0;
            }
        } catch (e) { }

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
                    take: 5,
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        total: true,
                        createdAt: true
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
                notes: customer.notes || ''
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
        const [fbPages, waSessions, tgConfigs, igPages] = await Promise.all([
            prisma.conversation.groupBy({
                by: ['channel'],
                where: { companyId, channel: 'FACEBOOK' },
                _count: { id: true }
            }),
            prisma.whatsAppSession.findMany({
                where: { companyId },
                select: { id: true, name: true, phoneNumber: true, status: true }
            }),
            prisma.telegramConfig.findMany({
                where: { companyId },
                select: { id: true, botName: true, botUsername: true, isActive: true, type: true }
            }),
            prisma.facebookPage.findMany({
                where: { companyId, instagramAccountId: { not: null } },
                select: { id: true, name: true, instagramAccountId: true, instagramAccountName: true }
            })
        ]);

        res.json({
            success: true,
            data: {
                platforms: {
                    facebook: {
                        connected: fbPages.length > 0,
                        count: fbPages[0]?._count?.id || 0
                    },
                    instagram: {
                        connected: igPages.length > 0,
                        pages: igPages
                    },
                    whatsapp: {
                        connected: waSessions.length > 0,
                        sessions: waSessions
                    },
                    telegram: {
                        connected: tgConfigs.some(c => c.isActive),
                        configs: tgConfigs
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
    getUnifiedStats,
    getCustomerProfile,
    getQuickReplies,
    getSettings
};
