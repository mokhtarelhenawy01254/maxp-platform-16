/**
 * conversationCrudController.js
 * عمليات CRUD وإدارة المحادثات
 */

const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const socketService = require('../../services/socketService');
const MessageHealthChecker = require('../../utils/messageHealthChecker');
const { getMetaGraphApiVersion } = require('../../config/metaApi');
const { conversationCache } = require('../../utils/cachingUtils');
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const { proxyCustomerAvatarUrl } = require('../../utils/facebookMediaProxy');
const { normalizeConversationStatus } = require('../../utils/validator');

const parseJsonSafely = (value, fallback = {}) => {
    if (!value || typeof value !== 'string') {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const getCustomerAvatar = (customer) => {
    if (!customer) {
        return null;
    }

    const metadata = parseJsonSafely(customer.metadata, {});
    return (
        customer.avatar ||
        metadata.profilePicture ||
        metadata.facebookProfile?.profile_pic ||
        null
    );
};

const getProxiedCustomerAvatar = (customer) =>
    proxyCustomerAvatarUrl(customer?.id, getCustomerAvatar(customer));

const formatPreviewText = (preview) => {
    if (!preview || typeof preview !== 'string' || preview.trim() === '' || preview.trim().toLowerCase() === 'no messages') {
        return 'لا توجد رسائل';
    }
    const text = preview.trim();
    if (
        /audioclip|\.mp4|\.m4a|\.mp3|\.opus/i.test(text) &&
        (/fbsbx\.com|uploads\/chat-media/i.test(text) || text.endsWith('.mp4'))
    ) {
        return '🎤 رسالة صوتية';
    }
    if (/scontent.*fbcdn|proxy-image|\/uploads\/chat-media.*?\.(jpg|jpeg|png|webp)/i.test(text)) {
        return '📷 صورة';
    }
    if (/^(?:Template:\s*)?[a-z0-9_]{10,}(?:\r?\n)+/i.test(text)) {
        return text.replace(/^(?:Template:\s*)?[a-z0-9_]{10,}(?:\r?\n)+/i, '').trim();
    }
    return text;
};

const deleteConverstation = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const prisma = getSharedPrismaClient();

        // Check if conversation exists
        const conversation = await executeWithRetry(async () => {
            return await prisma.conversation.findFirst({
                where: { id, companyId },
                include: {
                    customer: true,
                    _count: {
                        select: { messages: true }
                    }
                }
            });
        }, 3);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة أو غير مصرح بالوصول'
            });
        }

        const { deletedMessages } = await executeWithRetry(async () => {
            return await prisma.$transaction(async (tx) => {
                // Preserve orders but remove their pointer to the deleted inbox thread.
                await tx.order.updateMany({
                    where: { conversationId: id, companyId },
                    data: { conversationId: null }
                });

                await tx.mediaFile.deleteMany({
                    where: { conversationId: id }
                });

                await tx.conversationOutcome.deleteMany({
                    where: { conversationId: id, companyId }
                });

                await tx.conversationMemory.deleteMany({
                    where: { conversationId: id, companyId }
                });

                const deletedMessages = await tx.message.deleteMany({
                    where: { conversationId: id }
                });

                await tx.conversation.delete({
                    where: { id }
                });

                return { deletedMessages };
            });
        }, 3);

        await conversationCache.invalidateConversation(id, companyId);

        res.json({
            success: true,
            message: 'تم حذف المحادثة بنجاح',
            data: {
                deletedConversation: {
                    id: conversation.id,
                    customerName: conversation.customer?.firstName || 'عميل غير معروف'
                },
                deletedMessagesCount: deletedMessages.count
            }
        });

    } catch (error) {
        console.error('❌ Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

// 🆕 Get all conversations with pagination and filtering
const getConversations = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, platform, unread, tab, channel: channelParam, priority } = req.query;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build filter criteria
        const where = {
            companyId: companyId,
        };

        console.log('🔍 [GET-CONV] Request received:', { companyId, platform, channelParam, page, limit });
        console.log('🔍 [GET-CONV] Initial where clause:', JSON.stringify(where));

        if (status) {
            where.status = status;
        }

        // 🆕 If explicit `channel` param is provided (e.g. INSTAGRAM), use it directly
        const validChannels = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'SMS', 'PHONE', 'WEBSITE', 'TEST'];
        if (channelParam) {
            const normalizedChannel = String(channelParam).toUpperCase();
            if (validChannels.includes(normalizedChannel)) {
                where.channel = normalizedChannel;
                console.log('✅ [GET-CONV] Explicit channel filter applied:', normalizedChannel);
            }
        } else if (platform) {
            // ✅ FIX: فلترة المنصة - إذا لم يتم تحديد platform، نفلتر تلقائياً على FACEBOOK فقط
            const validWebPlatforms = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'SMS', 'PHONE', 'WEBSITE', 'TEST'];
            const pStr = Array.isArray(platform) ? platform[0] : platform;
            const normalizedPlatform = String(pStr).toUpperCase();
            console.log(`🔍 [GET-CONV] Platform check: input=${platform}, normalized=${normalizedPlatform}`);

            if (validWebPlatforms.includes(normalizedPlatform)) {
                where.channel = normalizedPlatform;
                console.log('✅ [GET-CONV] Filter applied: channel=' + normalizedPlatform);
            } else {
                console.log('⚠️ [GET-CONV] Invalid platform ignored:', normalizedPlatform);
                // ✅ FIX: إذا كان platform غير صحيح، نفلتر على FACEBOOK كـ default
                where.channel = 'FACEBOOK';
                console.log('✅ [GET-CONV] Default filter applied: channel=FACEBOOK');
            }
        } else {
            // ✅ FIX: إذا لم يتم تحديد platform أو channel، نفلتر تلقائياً على FACEBOOK فقط لمنع تسرب محادثات الواتساب
            where.channel = 'FACEBOOK';
            console.log('✅ [GET-CONV] No platform/channel specified, default filter applied: channel=FACEBOOK');
        }

        console.log('🔍 [GET-CONV] Final WHERE clause:', JSON.stringify(where, null, 2));

        // 🔧 FIX: Get Prisma client early and use executeWithRetry
        const prisma = getSharedPrismaClient();
        if (!prisma) {
            throw new Error('Prisma client is not initialized');
        }

        // Execute query
        console.log('🚀 [GET-CONV] Executing DB query (findMany + count)...');

        // Split promise for better error isolation
        let conversations, total;

        // 🆕 For unreplied tab, we now use the database column directly!
        // Extended logic for ALL tabs to ensure server-side filtering works
        let tabWhere = { ...where };

        if (tab === 'unreplied') {
            tabWhere = {
                ...where,
                status: { in: ['ACTIVE', 'PENDING'] },
                lastMessageIsFromCustomer: true
            };
        } else if (tab === 'done' || tab === 'resolved') {
            // 🆕 FIX: Use valid enum values - RESOLVED and CLOSED
            tabWhere = {
                ...where,
                status: { in: ['RESOLVED', 'CLOSED'] }
            };
        } else if (tab === 'spam') {
            // SPAM is not a valid status enum, so we filter by metadata or skip
            // For now, just use CLOSED as fallback
            tabWhere = {
                ...where,
                status: 'CLOSED'
            };
        } else if (['main', 'general', 'requests'].includes(tab)) {
            tabWhere = {
                ...where,
                status: { in: ['ACTIVE', 'PENDING'] }
            };
        } else {
            // 'all' or undefined - usually excludes RESOLVED/CLOSED
            tabWhere = {
                ...where,
                status: { in: ['ACTIVE', 'PENDING'] }
            };
        }

        // 🆕 Priority filter support (priority > 1 means high priority / starred)
        if (priority === 'true' || priority === true || tab === 'priority') {
            tabWhere.priority = { gt: 1 };
            // When priority is explicitly filtered, include all priority chats regardless of status or reply state
            delete tabWhere.status;
            delete tabWhere.lastMessageIsFromCustomer;
        }

        // For unreplied, filter directly from database using the new column
        const queryWhere = tabWhere;

        // 🆕 Add server-side search filter (search in customer name, last message, and phone)
        if (search && search.trim()) {
            const searchTerm = search.trim();
            queryWhere.AND = [
                {
                    OR: [
                        { lastMessagePreview: { contains: searchTerm } },
                        { customer: { firstName: { contains: searchTerm } } },
                        { customer: { lastName: { contains: searchTerm } } },
                        { customer: { phone: { contains: searchTerm } } },
                    ]
                }
            ];
        }

        try {
            // 🔧 FIX: Use executeWithRetry to handle connection errors
            conversations = await executeWithRetry(async () => {
                return await prisma.conversation.findMany({
                    where: queryWhere,
                    include: {
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                facebookId: true,
                                phone: true,
                                avatar: true,
                                metadata: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                avatar: true
                            }
                        },
                        // 🆕 Include last message to check if from customer
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                isFromCustomer: true,
                                isRead: true,
                                content: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        lastMessageAt: 'desc'
                    },
                    skip: skip,
                    take: take
                });
            }, 3);
            console.log(`✅ [GET-CONV] findMany success. Got ${conversations.length} records.`);
        } catch (dbErr) {
            console.error('❌ [GET-CONV] findMany FAILED:', dbErr);
            throw dbErr;
        }

        // 🆕 Count for unreplied & priority should use the same filter
        let unrepliedCount = 0;
        let priorityCount = 0;
        try {
            // 🔧 FIX: Use executeWithRetry to handle connection errors
            total = await executeWithRetry(async () => {
                return await prisma.conversation.count({ where: queryWhere });
            }, 3);

            // Also get total unreplied count for stats
            // ✅ FIX: استخدام نفس where clause مع channel filter
            const unrepliedWhere = {
                ...where,
                status: { in: ['ACTIVE', 'PENDING'] },
                lastMessageIsFromCustomer: true
            };

            unrepliedCount = await executeWithRetry(async () => {
                return await prisma.conversation.count({
                    where: unrepliedWhere
                });
            }, 3);

            // Also get total priority count for stats badge across whole channel
            const priorityWhere = {
                ...where,
                priority: { gt: 1 }
            };

            priorityCount = await executeWithRetry(async () => {
                return await prisma.conversation.count({
                    where: priorityWhere
                });
            }, 3);

            console.log(`✅ [GET-CONV] count success. Total: ${total}, Unreplied: ${unrepliedCount}, Priority: ${priorityCount}`);
        } catch (cntErr) {
            console.error('❌ [GET-CONV] count FAILED:', cntErr);
            throw cntErr;
        }

        // Format response
        console.log('🔄 [GET-CONV] Formatting response...');
        const formattedConversations = await Promise.all(conversations.map(async (conv, index) => {
            // Extract pageName and pageId
            let pageName = null;
            let pageId = null;
            let snoozedUntil = null;
            let aiPausedUntil = null;

            if (conv.metadata) {
                try {
                    const metadata = JSON.parse(conv.metadata);
                    pageName = metadata.pageName || null;
                    pageId = metadata.pageId || null;
                    snoozedUntil = metadata.snoozedUntil || null;
                    aiPausedUntil = metadata.aiPausedUntil || null;
                } catch (e) {
                    // ignore parse errors
                }
            }

            // ⚡ PERFORMANCE FIX: Skip expensive queries - just use default for FACEBOOK
            if (!pageName && conv.channel === 'FACEBOOK') {
                pageName = 'Facebook';
            }

            // 🔧 FIX: Use included messages instead of fetching separately (much faster!)
            let lastMessageIsFromCustomer = false;
            let lastCustomerMessageIsUnread = false;

            // Use the included messages array (already fetched with the conversation)
            if (conv.messages && conv.messages.length > 0) {
                const lastMsg = conv.messages[0]; // Already ordered by createdAt desc
                lastMessageIsFromCustomer = Boolean(lastMsg.isFromCustomer);
                lastCustomerMessageIsUnread = lastMsg.isFromCustomer === true && lastMsg.isRead === false;
            } else {
                // 🔧 FIX: Fallback to database column if messages not included
                lastMessageIsFromCustomer = Boolean(conv.lastMessageIsFromCustomer);
            }

            // Safety check for enum mapping
            const platformStr = conv.channel ? String(conv.channel).toLowerCase() : 'unknown';

            // Map status from database enum to frontend format
            const statusMap = {
                'ACTIVE': 'open',
                'PENDING': 'pending',
                'RESOLVED': 'resolved',
                'DONE': 'done'
            };
            const frontendStatus = statusMap[conv.status] || conv.status?.toLowerCase() || 'open';

            return {
                id: conv.id,
                customerId: conv.customerId,
                customerName: conv.customer ? `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim() : 'Unknown',
                customerAvatar: getProxiedCustomerAvatar(conv.customer),
                lastMessage: formatPreviewText(conv.lastMessagePreview),
                lastMessageTime: conv.lastMessageAt || conv.updatedAt,
                unreadCount: conv.unreadCount || 0,
                platform: platformStr,
                isOnline: false, // Socket will update
                lastMessageIsFromCustomer: lastMessageIsFromCustomer,
                lastCustomerMessageIsUnread: lastCustomerMessageIsUnread,
                status: frontendStatus,
                assignedTo: conv.assignedUserId || null,
                assignedToName: conv.user ? `${conv.user.firstName || ''} ${conv.user.lastName || ''}`.trim() : null,
                priority: conv.priority > 1,
                aiEnabled: conv.aiEnabled !== false,
                aiPausedUntil: aiPausedUntil,
                metadata: conv.metadata,
                snoozedUntil: snoozedUntil,
                pageName: pageName,
                pageId: pageId
            };
        }));

        // 🆕 Now filtering is done directly in database query - no need for local filtering!
        res.json({
            success: true,
            data: formattedConversations,
            pagination: {
                total: total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                hasNextPage: (skip + take) < total
            },
            counts: {
                total: total,
                unreplied: unrepliedCount, // 🆕 From database count
                priority: priorityCount
            }
        });

    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 🆕 Get single conversation details
const getConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID required' });
        }

        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: { id, companyId }, // Ensure company isolation
            include: {
                customer: true
            }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Helper to parse metadata
        let metadata = {};
        try {
            metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
        } catch (e) { }

        res.json({
            success: true,
            data: {
                ...conversation,
                customer: conversation.customer
                    ? {
                        ...conversation.customer,
                        avatar: getProxiedCustomerAvatar(conversation.customer)
                    }
                    : conversation.customer,
                // Add derived fields for frontend compatibility
                platform: conversation.channel?.toLowerCase(),
                lastMessage: formatPreviewText(conversation.lastMessagePreview),
                lastMessageTime: conversation.lastMessageAt,
                customerId: conversation.customerId,
                customerName: conversation.customer ? `${conversation.customer.firstName || ''} ${conversation.customer.lastName || ''}`.trim() : 'Unknown',
                customerAvatar: getProxiedCustomerAvatar(conversation.customer),
                snoozedUntil: metadata.snoozedUntil || null,
                pageId: metadata.pageId,
                postId: metadata.postId
            }
        });

    } catch (error) {
        console.error('❌ Error getting conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 🆕 Update conversation (status, assignment, etc.)
const updateConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTo, priority, tab, aiEnabled } = req.body;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID required' });
        }

        const prisma = getSharedPrismaClient();

        // Verify conversation exists and belongs to company
        const conversation = await prisma.conversation.findFirst({
            where: { id, companyId }
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Build update data
        const updateData = {};

        // Update status
        if (status !== undefined) {
            updateData.status = normalizeConversationStatus(status);
        }

        // Update assignment
        if (assignedTo !== undefined) {
            updateData.assignedUserId = assignedTo || null;
        }

        // Update priority
        if (priority !== undefined) {
            updateData.priority = priority ? 2 : 1; // 2 = high, 1 = normal
        }

        // Update AI enabled status
        if (aiEnabled !== undefined) {
            updateData.aiEnabled = Boolean(aiEnabled);
        }

        // Update metadata if tab is provided or aiEnabled is toggled
        if (tab !== undefined || aiEnabled !== undefined) {
            let metadata = {};
            try {
                metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
            } catch (e) { }

            if (tab !== undefined) {
                metadata.tab = tab;
            }
            if (aiEnabled !== undefined) {
                // When explicitly setting aiEnabled (manual stop or start), clear temporary handover pause
                delete metadata.aiPausedUntil;
            }
            updateData.metadata = JSON.stringify(metadata);
        }

        // Update conversation
        const updated = await prisma.conversation.update({
            where: { id },
            data: updateData,
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        metadata: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        });

        if (aiEnabled !== undefined) {
            try {
                const io = socketService.getIO();
                if (io) {
                    io.to(`company_${companyId}`).emit('conversation:ai_status_changed', {
                        conversationId: updated.id,
                        channel: updated.channel,
                        aiEnabled: Boolean(aiEnabled),
                        aiPausedUntil: null
                    });
                }
            } catch (e) {}
        }

        // Helper to parse metadata
        let meta = {};
        try {
            meta = updated.metadata ? JSON.parse(updated.metadata) : {};
        } catch (e) { }

        res.json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status?.toLowerCase(),
                assignedTo: updated.assignedUserId,
                assignedToName: updated.user ? `${updated.user.firstName} ${updated.user.lastName}`.trim() : null,
                priority: updated.priority > 1,
                aiEnabled: updated.aiEnabled !== false,
                aiPausedUntil: meta.aiPausedUntil || null,
                tab: meta.tab || null,
                customerId: updated.customerId,
                customerName: updated.customer ? `${updated.customer.firstName || ''} ${updated.customer.lastName || ''}`.trim() : 'Unknown',
                customerAvatar: getProxiedCustomerAvatar(updated.customer)
            }
        });

    } catch (error) {
        console.error('❌ Error updating conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 🔧 FIX: Mark all messages in a conversation as read
const markConversationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        // التحقق من المصادقة والشركة
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        // 🔧 FIX: Get Prisma client early
        const prisma = getSharedPrismaClient();
        if (!prisma) {
            throw new Error('Prisma client is not initialized');
        }

        // Verify conversation belongs to this company
        const conversation = await executeWithRetry(async () => {
            return await prisma.conversation.findFirst({
                where: {
                    id,
                    companyId
                }
            });
        }, 3);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة أو غير مصرح بالوصول'
            });
        }

        // 🔧 FIX: First check how many unread messages exist before updating
        const unreadMessagesBefore = await executeWithRetry(async () => {
            return await prisma.message.findMany({
                where: {
                    conversationId: id,
                    isFromCustomer: true,
                    isRead: false
                },
                select: { id: true, content: true, createdAt: true }
            });
        }, 3);

        // Update all unread messages from customer to read
        let result = { count: 0 };
        try {
            result = await executeWithRetry(async () => {
                return await prisma.message.updateMany({
                    where: {
                        conversationId: id,
                        isFromCustomer: true,
                        isRead: false
                    },
                    data: {
                        isRead: true,
                        readAt: new Date()
                    }
                });
            }, 3);
        } catch (updateError) {
            if (isPermissionError(updateError)) {
                // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ [DB-PERMISSION] Cannot mark messages as read: ${getPermissionErrorMessage(updateError)}`);
                }
                // Continue with result.count = 0 to allow the function to complete
                result = { count: 0 };
            } else {
                throw updateError;
            }
        }

        // 🔧 FIX: Always update unreadCount based on actual unread messages count
        const unreadCount = await executeWithRetry(async () => {
            return await prisma.message.count({
                where: {
                    conversationId: id,
                    isFromCustomer: true,
                    isRead: false
                }
            });
        }, 3);

        const actualUnreadCount = unreadCount;

        // Also update lastMessageIsFromCustomer if all messages are read
        let lastMessage = null;
        try {
            lastMessage = await executeWithRetry(async () => {
                return await prisma.message.findFirst({
                    where: { conversationId: id },
                    orderBy: { createdAt: 'desc' },
                    select: { isFromCustomer: true }
                });
            }, 3);
        } catch (msgError) {
            console.error('⚠️ [MARK-READ] Error fetching last message:', msgError.message);
            // Continue without lastMessage - it's optional
        }

        // 🔧 FIX: Always update unreadCount and lastMessageIsFromCustomer to match actual state
        const updateData = {
            unreadCount: actualUnreadCount
        };

        // Always update lastMessageIsFromCustomer based on the last message
        if (lastMessage) {
            updateData.lastMessageIsFromCustomer = lastMessage.isFromCustomer;
        }

        await executeWithRetry(async () => {
            return await prisma.conversation.update({
                where: { id },
                data: updateData
            });
        }, 3);

        // 📸 Send read receipt to Instagram if this is an Instagram conversation
        if (conversation.channel === 'INSTAGRAM' && unreadMessagesBefore.length > 0) {
          setImmediate(async () => {
            try {
              const prismaClient = getSharedPrismaClient();
              const igPage = await prismaClient.facebookPage.findFirst({
                where: {
                  companyId,
                  status: 'connected',
                  instagramAccountId: { not: null }
                },
                orderBy: { connectedAt: 'desc' }
              });

              if (igPage?.pageAccessToken && igPage?.instagramAccountId) {
                const customer = await prismaClient.customer.findUnique({
                  where: { id: conversation.customerId },
                  select: { instagramId: true }
                });

                if (customer?.instagramId) {
                  const axios = require('axios');
                  await axios.post(
                    `https://graph.facebook.com/${getMetaGraphApiVersion()}/${igPage.instagramAccountId}/messages`,
                    {
                      recipient: { id: customer.instagramId },
                      sender_action: 'mark_seen',
                      access_token: igPage.pageAccessToken
                    },
                    { timeout: 10000 }
                  );
                  console.log(`📸 [IG-READ-RECEIPT] Read receipt sent to Instagram user ${customer.instagramId}`);
                }
              }
            } catch (igErr) {
              console.error('⚠️ [IG-READ-RECEIPT] Failed:', igErr.message);
            }
          });
        }

        // 💬 Send read receipt to WhatsApp if this is a WhatsApp conversation
        if (conversation.channel === 'WHATSAPP' && unreadMessagesBefore.length > 0) {
          setImmediate(async () => {
            try {
              const { getSessionIdFromMetadata, safeJsonParse } = require('../../services/whatsappInboxMetadata');
              const sessionId = getSessionIdFromMetadata(conversation.metadata);
              const metadataObj = safeJsonParse(conversation.metadata, {});
              let remoteJid = metadataObj.remoteJid;
              if (!remoteJid && conversation.customerId) {
                const prismaClient = getSharedPrismaClient();
                const cust = await prismaClient.customer.findUnique({
                  where: { id: conversation.customerId },
                  select: { phone: true, whatsappId: true }
                });
                const cleanPhone = (cust?.whatsappId || cust?.phone || '').replace(/\D/g, '');
                if (cleanPhone) remoteJid = `${cleanPhone}@s.whatsapp.net`;
              }
              if (sessionId && remoteJid) {
                const WhatsAppMessageHandler = require('../../services/whatsapp/WhatsAppMessageHandler');
                await WhatsAppMessageHandler.markAsRead(sessionId, remoteJid);
                console.log(`💬 [WA-READ-RECEIPT] Read receipt sent for WhatsApp conversation ${id}`);
              }
            } catch (waErr) {
              console.warn('⚠️ [WA-READ-RECEIPT] Failed to send read receipt:', waErr.message);
            }
          });
        }

        res.json({
            success: true,
            message: `تم تحديد ${result.count} رسالة كمقروءة`,
            markedCount: result.count,
            unreadCount: actualUnreadCount,
            // 🔧 FIX: Also return conversation data for frontend sync
            conversation: {
                id,
                unreadCount: actualUnreadCount,
                lastMessageIsFromCustomer: lastMessage ? lastMessage.isFromCustomer : null
            }
        });

    } catch (error) {
        console.error('❌ [MARK-READ] Error marking conversation as read:', error);

        res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

// 🔧 NEW: Mark conversation as unread/read (toggle)
const markConversationAsUnread = async (req, res) => {
    try {
        const { id } = req.params;
        const { unreadCount } = req.body;

        // التحقق من المصادقة والشركة
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        console.log(`📧 [MARK-UNREAD] Setting conversation ${id} to ${unreadCount > 0 ? 'unread' : 'read'} for company ${companyId}`);

        // Verify conversation belongs to this company
        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: {
                id,
                companyId
            },
            include: {
                messages: {
                    where: {
                        isFromCustomer: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة أو غير مصرح بالوصول'
            });
        }

        const isMarkAsUnread = unreadCount > 0;

        // Update conversation isRead field
        try {
            await getSharedPrismaClient().conversation.update({
                where: { id },
                data: {
                    isRead: !isMarkAsUnread, // عكس unreadCount
                    updatedAt: new Date()
                }
            });
        } catch (updateError) {
            if (isPermissionError(updateError)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ [DB-PERMISSION] Cannot update conversation: ${getPermissionErrorMessage(updateError)}`);
                }
            } else {
                throw updateError;
            }
        }

        // Update last customer message if exists
        if (conversation.messages && conversation.messages.length > 0) {
            const lastMessage = conversation.messages[0];
            try {
                await getSharedPrismaClient().message.update({
                    where: { id: lastMessage.id },
                    data: {
                        isRead: !isMarkAsUnread,
                        readAt: isMarkAsUnread ? null : new Date()
                    }
                });
                console.log(`✅ [MARK-UNREAD] Updated last message ${lastMessage.id}`);
            } catch (updateError) {
                if (isPermissionError(updateError)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`⚠️ [DB-PERMISSION] Cannot update message: ${getPermissionErrorMessage(updateError)}`);
                    }
                } else {
                    throw updateError;
                }
            }
        }

        console.log(`✅ [MARK-UNREAD] Updated conversation ${id} to ${isMarkAsUnread ? 'unread' : 'read'}`);

        // Invalidate cache for this conversation
        if (conversation && conversation.companyId) {
            conversationCache.invalidateConversation(id, conversation.companyId);
            console.log(`🧹 [CACHE] Invalidated cache for conversation ${id} in company ${conversation.companyId}`);
        }

        res.json({
            success: true,
            message: isMarkAsUnread ? 'تم وضع علامة غير مقروءة' : 'تم وضع علامة مقروءة',
            data: {
                id: conversation.id,
                isRead: !isMarkAsUnread,
                unreadCount: isMarkAsUnread ? 1 : 0 // للتوافق مع الفرونت
            }
        });

    } catch (error) {
        console.error('❌ [MARK-UNREAD] Error marking conversation:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

const checkHealth = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ إضافة companyId للعزل الأمني
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const checker = new MessageHealthChecker();

        // ✅ تمرير companyId لل_checker
        const results = await checker.checkConversation(id, companyId);
        await checker.disconnect();

        const summary = {
            conversationId: id,
            totalChecked: results.length,
            healthy: results.filter(r => r.status === 'healthy').length,
            fixed: results.filter(r => r.status === 'fixed').length,
            unfixable: results.filter(r => r.status === 'unfixable').length,
            details: results
        };

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('❌ [HEALTH-CHECK] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 📦 تحديث محادثات متعددة دفعة واحدة
const bulkUpdateConversations = async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const { conversationIds, updates } = req.body;

        if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'معرفات المحادثات مطلوبة'
            });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'بيانات التحديث مطلوبة'
            });
        }

        // التحقق من أن جميع المحادثات تنتمي للشركة
        const conversations = await getSharedPrismaClient().conversation.findMany({
            where: {
                id: { in: conversationIds },
                companyId: companyId
            },
            select: { id: true }
        });

        if (conversations.length !== conversationIds.length) {
            return res.status(403).json({
                success: false,
                message: 'بعض المحادثات غير موجودة أو لا تنتمي لشركتك'
            });
        }

        // 🔧 FIX: Map frontend fields to backend fields
        const prismaUpdates = { ...updates };

        console.log(`🔧 [BULK-UPDATE] Original updates:`, JSON.stringify(updates));

        // Handle mark_done action (maps to status: RESOLVED)
        if (prismaUpdates.hasOwnProperty('mark_done')) {
            console.log(`🔧 [BULK-UPDATE] Converting mark_done to status: RESOLVED`);
            prismaUpdates.status = 'RESOLVED';
            delete prismaUpdates.mark_done;
        }

        // Map frontend status values to backend enum values
        if (prismaUpdates.status) {
            const statusMap = {
                'open': 'ACTIVE',
                'pending': 'PENDING',
                'resolved': 'RESOLVED',
                'done': 'RESOLVED'
            };
            if (statusMap[prismaUpdates.status]) {
                const originalStatus = prismaUpdates.status;
                prismaUpdates.status = statusMap[prismaUpdates.status];
                console.log(`🔧 [BULK-UPDATE] Mapped status ${originalStatus} to ${prismaUpdates.status}`);
            } else {
                // If it's already in uppercase format, keep it, otherwise try to uppercase
                prismaUpdates.status = prismaUpdates.status.toUpperCase();
            }
        }

        // Map frontend field names to backend field names
        if ('assignedTo' in prismaUpdates) {
            prismaUpdates.assignedUserId = prismaUpdates.assignedTo;
            delete prismaUpdates.assignedTo;
        }

        // Map priority boolean to integer (2 = high, 1 = normal)
        if ('priority' in prismaUpdates && typeof prismaUpdates.priority === 'boolean') {
            prismaUpdates.priority = prismaUpdates.priority ? 2 : 1;
        }

        console.log(`🔧 [BULK-UPDATE] Final Prisma updates:`, JSON.stringify(prismaUpdates));

        // تحديث المحادثات
        const result = await getSharedPrismaClient().conversation.updateMany({
            where: {
                id: { in: conversationIds },
                companyId: companyId
            },
            data: prismaUpdates
        });

        // Invalidate cache for updated conversations
        conversationIds.forEach(id => {
            conversationCache.invalidate(id);
        });

        console.log(`📦 [BULK-UPDATE] Updated ${result.count} conversations for company ${companyId}`);

        res.json({
            success: true,
            data: {
                updatedCount: result.count
            },
            message: `تم تحديث ${result.count} محادثة بنجاح`
        });
    } catch (error) {
        console.error('❌ Error bulk updating conversations:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث المحادثات',
            error: error.message
        });
    }
};

// Snooze conversation
const snoozeConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const { snoozeUntil } = req.body;
        const companyId = req.user?.companyId || req.user?.effectiveCompanyId || req.body?.companyId;

        if (!snoozeUntil) {
            return res.status(400).json({ error: 'Snooze date is required' });
        }

        const conversation = await executeWithRetry(async () => {
            const prismaClient = getSharedPrismaClient();
            return await prismaClient.conversation.findFirst({
                where: {
                    id: id,
                    ...(req.user?.role === 'SUPER_ADMIN' ? {} : (companyId ? { companyId } : {}))
                },
                select: { id: true, metadata: true, companyId: true, status: true }
            });
        }, 3);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (companyId && conversation.companyId !== companyId && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let metadata = {};
        if (typeof conversation.metadata === 'object' && conversation.metadata !== null) {
            metadata = { ...conversation.metadata };
        } else if (typeof conversation.metadata === 'string') {
            try {
                metadata = JSON.parse(conversation.metadata);
            } catch (e) {
                metadata = {};
            }
        }

        metadata.snoozedUntil = snoozeUntil;

        const updated = await executeWithRetry(async () => {
            const prismaClient = getSharedPrismaClient();
            return await prismaClient.conversation.update({
                where: { id: id },
                data: {
                    metadata: JSON.stringify(metadata),
                    updatedAt: new Date()
                }
            });
        }, 3);

        // Invalidate cache for updated conversation
        try {
            conversationCache.invalidate(id);
        } catch (e) {
            // Ignore cache errors
        }

        res.json({
            success: true,
            message: 'Conversation snoozed',
            snoozeUntil,
            snoozedUntil: snoozeUntil
        });
    } catch (error) {
        console.error('Error snoozing conversation:', error);
        res.status(500).json({ error: 'Failed to snooze conversation', details: error.message });
    }
};

// 📸 Instagram typing indicator
const sendInstagramTypingIndicator = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'typing_on' | 'typing_off'
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'COMPANY_ID_REQUIRED' });
        }

        if (!['typing_on', 'typing_off'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action must be typing_on or typing_off' });
        }

        const prisma = getSharedPrismaClient();
        const conversation = await executeWithRetry(async () => {
            return await prisma.conversation.findFirst({
                where: { id, companyId },
                select: { channel: true, customerId: true }
            });
        }, 3);

        if (!conversation || conversation.channel !== 'INSTAGRAM') {
            return res.status(404).json({ success: false, error: 'INSTAGRAM_CONVERSATION_NOT_FOUND' });
        }

        const igPage = await executeWithRetry(async () => {
            return await prisma.facebookPage.findFirst({
                where: { companyId, status: 'connected', instagramAccountId: { not: null } },
                orderBy: { connectedAt: 'desc' }
            });
        }, 3);

        if (!igPage?.pageAccessToken || !igPage?.instagramAccountId) {
            return res.status(400).json({ success: false, error: 'INSTAGRAM_ACCOUNT_NOT_CONNECTED' });
        }

        const customer = await executeWithRetry(async () => {
            return await prisma.customer.findUnique({
                where: { id: conversation.customerId },
                select: { instagramId: true }
            });
        }, 3);

        if (!customer?.instagramId) {
            return res.status(400).json({ success: false, error: 'CUSTOMER_INSTAGRAM_ID_MISSING' });
        }

        const axios = require('axios');
        await axios.post(
            `https://graph.facebook.com/${getMetaGraphApiVersion()}/${igPage.instagramAccountId}/messages`,
            {
                recipient: { id: customer.instagramId },
                sender_action: action,
                access_token: igPage.pageAccessToken
            },
            { timeout: 10000 }
        );

        console.log(`📸 [IG-TYPING] Sent ${action} to Instagram user ${customer.instagramId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ [IG-TYPING] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    deleteConverstation,
    getConversations,
    getConversation,
    updateConversation,
    markConversationAsRead,
    markConversationAsUnread,
    checkHealth,
    bulkUpdateConversations,
    snoozeConversation,
    sendInstagramTypingIndicator
};
