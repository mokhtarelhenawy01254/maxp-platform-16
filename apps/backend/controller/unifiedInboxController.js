/**
 * unifiedInboxController.js
 * وحدة التحكم الموحدة لصندوق الوارد - تجمع المحادثات من جميع المنصات
 * (Facebook, Telegram) في واجهة واحدة
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
            platform,      // 'all' | 'facebook' | 'telegram'
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
        const platformFilter = platform?.toUpperCase();

        if (platformFilter && platformFilter !== 'ALL') {
            fbWhere.channel = platformFilter;
        }
        // If no platform specified, include all channels except TEST
        if (!platform || platform === 'all') {
            fbWhere.channel = { in: ['FACEBOOK', 'TELEGRAM'] };
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
        // ──────────────────────────────────────────────────────────
        // 2. Normalize all conversations into unified format
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

        // Merge and sort all conversations
        let allConversations = normalizedConversations
            .sort((a, b) => {
                const dateA = new Date(a.lastMessageTime || 0);
                const dateB = new Date(b.lastMessageTime || 0);
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            })
            .slice(0, take);

        // ──────────────────────────────────────────────────────────
        // 3. Get platform counts
        // ──────────────────────────────────────────────────────────
        const [fbCount, tgCount, unrepliedCount] = await Promise.all([
            prisma.conversation.count({ where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({ where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] } } }),
            prisma.conversation.count({
                where: {
                    companyId,
                    channel: { in: ['FACEBOOK', 'TELEGRAM'] },
                    status: { in: ['ACTIVE', 'PENDING'] },
                    lastMessageIsFromCustomer: true
                }
            })
        ]);

        res.json({
            success: true,
            data: allConversations,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            },
            counts: {
                all: fbCount + tgCount,
                facebook: fbCount,
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

        // Use Conversation + Message models
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

        // Send via Conversation model
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
            tgActive,
            totalResolved
        ] = await Promise.all([
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'TELEGRAM'] }, status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'TELEGRAM'] }, status: { in: ['ACTIVE', 'PENDING'] }, lastMessageIsFromCustomer: true }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'FACEBOOK', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: 'TELEGRAM', status: { in: ['ACTIVE', 'PENDING'] } }
            }),
            prisma.conversation.count({
                where: { companyId, channel: { in: ['FACEBOOK', 'TELEGRAM'] }, status: { in: ['RESOLVED', 'CLOSED'] } }
            })
        ]);

        res.json({
            success: true,
            data: {
                totalActive,
                totalUnreplied,
                totalResolved,
                platforms: {
                    facebook: { active: fbActive, icon: '💬' },
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
                    where: { channel: { in: ['FACEBOOK', 'TELEGRAM'] } },
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

        // Get quick replies
        const quickReplies = [];

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
        const [fbPages, tgConfigs] = await Promise.all([
            prisma.conversation.groupBy({
                by: ['channel'],
                where: { companyId, channel: 'FACEBOOK' },
                _count: { id: true }
            }),
            prisma.telegramConfig.findMany({
                where: { companyId },
                select: { id: true, botName: true, botUsername: true, isActive: true, type: true }
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
