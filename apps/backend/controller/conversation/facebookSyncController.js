/**
 * facebookSyncController.js
 * مزامنة رسائل فيسبوك
 */

const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const axios = require('axios');
const { getPageToken } = require('./conversationShared');
const { getMetaGraphApiVersion } = require('../../config/metaApi');

const parseFacebookSyncMetadata = (metadata) => {
    if (!metadata) {
        return {};
    }

    if (typeof metadata === 'object') {
        return metadata;
    }

    try {
        return JSON.parse(metadata);
    } catch (error) {
        return {};
    }
};

const normalizeFacebookMessageText = (value = '') => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeFacebookMessageTimestamp = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const buildFacebookMessageSignature = ({ content, type, isFromCustomer, createdAt }) => {
    const normalizedContent = normalizeFacebookMessageText(content);
    const normalizedType = String(type || 'TEXT').trim().toUpperCase();
    const timestamp = normalizeFacebookMessageTimestamp(createdAt);
    if (!normalizedContent || !timestamp) {
        return null;
    }

    return [
        isFromCustomer ? 'customer' : 'page',
        normalizedType,
        timestamp,
        normalizedContent
    ].join('|');
};

// Sync Facebook messages from Facebook Graph API
const syncFacebookMessages = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        const prisma = getSharedPrismaClient();

        // Get conversation with customer info
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                companyId: companyId,
                channel: 'FACEBOOK'
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        facebookId: true
                    }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة أو ليست محادثة Facebook'
            });
        }

        if (!conversation.customer?.facebookId) {
            return res.status(400).json({
                success: false,
                message: 'العميل لا يملك معرف Facebook'
            });
        }

        // Get pageId from conversation metadata or pageId field
        let pageId = null;
        if (conversation.metadata) {
            try {
                const metadata = JSON.parse(conversation.metadata);
                pageId = metadata.pageId;
            } catch (e) {
                // ignore parse error
            }
        }

        if (!pageId) {
            // Try to find first connected Facebook page for the company
            const defaultPage = await prisma.facebookPage.findFirst({
                where: {
                    companyId: companyId,
                    status: 'connected'
                },
                orderBy: { connectedAt: 'desc' }
            });
            if (defaultPage) {
                pageId = defaultPage.pageId;
            }
        }

        if (!pageId) {
            return res.status(400).json({
                success: false,
                message: 'لا توجد صفحة Facebook متصلة'
            });
        }

        // Get page access token
        const pageData = await getPageToken(pageId);
        if (!pageData || !pageData.pageAccessToken) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن الوصول إلى صفحة Facebook'
            });
        }

        const psid = conversation.customer.facebookId;
        const accessToken = pageData.pageAccessToken;

        // Fetch messages from Facebook Graph API
        let allMessages = [];

        try {
            const apiVer = getMetaGraphApiVersion();
            // Step 1: Get conversation ID using page conversations endpoint with user_id filter
            const conversationsUrl = `https://graph.facebook.com/${apiVer}/${pageId}/conversations?user_id=${psid}&fields=id&access_token=${accessToken}`;

            const conversationsResponse = await axios.get(conversationsUrl);

            if (!conversationsResponse.data?.data || conversationsResponse.data.data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'لم يتم العثور على محادثة في Facebook لهذا العميل',
                    info: 'تأكد من أن المحادثة موجودة في صفحة Facebook'
                });
            }

            const fbConversationId = conversationsResponse.data.data[0].id;

            // Step 2: Fetch messages from the conversation
            let messagesUrl = `https://graph.facebook.com/${apiVer}/${fbConversationId}/messages?fields=id,message,from,to,created_time,attachments{id,type,file_url,url,mime_type,name,image_data{url},payload{template_type,text,buttons{type,title,url,payload}}},sticker,shares&limit=50&access_token=${accessToken}`;

            let pageCount = 0;
            const maxPages = 3; // Limit to 3 pages (150 messages max) to prevent timeout

            while (messagesUrl && pageCount < maxPages) {
                const messagesResponse = await axios.get(messagesUrl, {
                    timeout: 30000 // 30 seconds timeout per request
                });
                const messagesData = messagesResponse.data;

                if (messagesData.data && Array.isArray(messagesData.data)) {
                    console.log(`📥 [SYNC-FB-MESSAGES] Fetched ${messagesData.data.length} messages from page ${pageCount + 1}`);

                    // Count messages with attachments in this batch
                    const messagesWithAttachments = messagesData.data.filter(m => m.attachments?.data?.length > 0);
                    const messagesWithButtons = messagesData.data.filter(m =>
                        m.attachments?.data?.[0]?.payload?.buttons?.length > 0
                    );
                    console.log(`   📎 Messages with attachments: ${messagesWithAttachments.length}`);
                    console.log(`   🔘 Messages with buttons: ${messagesWithButtons.length}`);

                    // Log first message with attachments for debugging
                    if (messagesWithAttachments.length > 0 && pageCount === 0) {
                        const sampleMsg = messagesWithAttachments[0];
                        console.log(`   🔍 [SAMPLE-ATTACHMENT] First message with attachment:`, {
                            messageId: sampleMsg.id,
                            attachmentType: sampleMsg.attachments.data[0].type,
                            hasFileUrl: !!sampleMsg.attachments.data[0].file_url,
                            hasUrl: !!sampleMsg.attachments.data[0].url,
                            hasPayload: !!sampleMsg.attachments.data[0].payload,
                            payloadKeys: sampleMsg.attachments.data[0].payload ? Object.keys(sampleMsg.attachments.data[0].payload) : [],
                            fullAttachment: JSON.stringify(sampleMsg.attachments.data[0], null, 2).substring(0, 500)
                        });
                    }

                    allMessages = allMessages.concat(messagesData.data);
                }

                // Check for next page
                if (messagesData.paging && messagesData.paging.next) {
                    messagesUrl = messagesData.paging.next;
                    pageCount++;
                } else {
                    messagesUrl = null;
                }
            }

            if (allMessages.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'لا توجد رسائل في هذه المحادثة',
                    info: 'المحادثة موجودة ولكن لا تحتوي على رسائل'
                });
            }

        } catch (facebookError) {
            console.error('❌ [SYNC-FB-MESSAGES] Error fetching messages from Facebook:', facebookError.response?.data || facebookError.message);
            console.error('❌ [SYNC-FB-MESSAGES] Error details:', {
                status: facebookError.response?.status,
                statusText: facebookError.response?.statusText,
                data: facebookError.response?.data,
                message: facebookError.message
            });

            // Provide helpful error message based on error type
            const errorData = facebookError.response?.data?.error;

            if (errorData) {
                // Permission errors
                if (errorData.code === 100 || errorData.type === 'OAuthException') {
                    return res.status(403).json({
                        success: false,
                        message: 'لا توجد صلاحيات كافية لجلب الرسائل من Facebook',
                        error: errorData.message || 'Facebook API permissions required',
                        info: 'تأكد من أن الصفحة لديها صلاحيات pages_messaging'
                    });
                }

                // Not found errors
                if (errorData.code === 803 || facebookError.response.status === 404) {
                    return res.status(404).json({
                        success: false,
                        message: 'لم يتم العثور على المحادثة أو الرسائل',
                        error: errorData.message
                    });
                }
            }

            // Return error with details
            const errorMessage = errorData?.message || facebookError.message || 'فشل في جلب الرسائل من Facebook';
            return res.status(500).json({
                success: false,
                message: errorMessage,
                error: errorMessage,
                code: errorData?.code || facebookError.response?.status || 500,
                type: errorData?.type || 'UNKNOWN_ERROR'
            });
        }

        // Process and save messages to database
        // First, get existing messages to avoid duplicate checks in loop
        const existingMessages = await getSharedPrismaClient().message.findMany({
            where: {
                conversationId: conversationId
            },
            select: {
                id: true,
                metadata: true,
                content: true,
                type: true,
                isFromCustomer: true,
                createdAt: true
            }
        });

        const existingFacebookIds = new Set();
        const existingMessageSignatures = new Set();
        existingMessages.forEach(msg => {
            const metadata = parseFacebookSyncMetadata(msg.metadata);
            if (metadata.facebookMessageId) {
                existingFacebookIds.add(String(metadata.facebookMessageId));
            }

            const signature = buildFacebookMessageSignature({
                content: msg.content,
                type: msg.type,
                isFromCustomer: msg.isFromCustomer,
                createdAt: msg.createdAt
            });
            if (signature) {
                existingMessageSignatures.add(signature);
            }
        });

        let skippedCount = 0;
        let errorCount = 0;
        const messagesToSave = [];
        const batchFacebookIds = new Set();
        const batchMessageSignatures = new Set();

        for (const fbMessage of allMessages) {
            try {
                const facebookMessageId = String(fbMessage.id || '').trim();

                // Check if message already exists using the Set (much faster)
                if (facebookMessageId && (existingFacebookIds.has(facebookMessageId) || batchFacebookIds.has(facebookMessageId))) {
                    skippedCount++;
                    continue;
                }

                // Determine message type and content
                let messageType = 'TEXT';
                let content = fbMessage.message || '';

                const syncedAttachmentsData = (fbMessage.attachments?.data && Array.isArray(fbMessage.attachments.data))
                    ? fbMessage.attachments.data.map((att, idx) => {
                        const attType = (att.type || (att.image_data ? 'image' : (att.mime_type?.startsWith('image/') ? 'image' : 'file'))).toLowerCase();
                        const url = att.image_data?.url || att.file_url || att.url || att.payload?.url || att.image?.url || '';
                        return {
                            id: att.id || null,
                            type: attType,
                            url: url,
                            name: att.name || null,
                            attachmentIndex: idx
                        };
                    }).filter(a => a.url)
                    : [];

                // Check for attachments first (includes images, files, and template messages with buttons)
                if (fbMessage.attachments && fbMessage.attachments.data && fbMessage.attachments.data.length > 0) {
                    const attachment = fbMessage.attachments.data[0];

                    // Determine attachment type
                    let attachmentType = attachment.type;
                    if (!attachmentType) {
                        // Infer from mime_type
                        if (attachment.mime_type) {
                            if (attachment.mime_type.startsWith('image/')) {
                                attachmentType = 'image';
                            } else if (attachment.mime_type.startsWith('video/')) {
                                attachmentType = 'video';
                            } else if (attachment.mime_type.startsWith('audio/')) {
                                attachmentType = 'audio';
                            } else {
                                attachmentType = 'file';
                            }
                        } else if (attachment.image_data) {
                            attachmentType = 'image';
                        } else if (attachment.payload) {
                            attachmentType = attachment.payload.template_type ? 'template' : 'file';
                        } else {
                            attachmentType = 'file'; // Default
                        }
                    }

                    // CRITICAL: If image_data.url exists, treat as image regardless of attachmentType
                    if (attachment.image_data?.url && attachmentType !== 'template') {
                        attachmentType = 'image';
                    }

                    // Handle template messages (e.g., messages with buttons)
                    if (attachmentType === 'template' && attachment.payload) {
                        messageType = 'TEXT'; // Keep as TEXT to show the message content
                        const templatePayload = attachment.payload;

                        // Extract template text
                        let templateText = templatePayload.text || fbMessage.message || '';

                        // Extract buttons if they exist
                        if (templatePayload.buttons && Array.isArray(templatePayload.buttons) && templatePayload.buttons.length > 0) {
                            const buttonsText = templatePayload.buttons.map((btn, idx) => {
                                return `${idx + 1}. ${btn.title || btn.text || 'زر'}`;
                            }).join('\n');
                            templateText += '\n\n' + '🔘 الأزرار:\n' + buttonsText;
                        }

                        content = templateText || 'رسالة تفاعلية';

                    } else if (attachmentType === 'image' || attachmentType === 'animated_image') {
                        messageType = 'IMAGE';
                        const imageUrl = attachment.image_data?.url ||
                            attachment.file_url ||
                            attachment.url ||
                            attachment.payload?.url ||
                            attachment.image?.url ||
                            '';
                        content = imageUrl;
                        // Keep message text if exists (for captions)
                        if (fbMessage.message && fbMessage.message.trim()) {
                            content = fbMessage.message + ' |IMAGE_URL|' + imageUrl;
                        }

                        // If URL is missing, try to fetch attachment separately
                        if (!imageUrl) {
                            if (attachment.id) {
                                try {
                                    const attachmentUrl = `https://graph.facebook.com/${apiVer}/${attachment.id}?fields=url,image_data{url}&access_token=${accessToken}`;
                                    const attachmentResponse = await axios.get(attachmentUrl, { timeout: 5000 });
                                    const fetchedUrl = attachmentResponse.data?.image_data?.url || attachmentResponse.data?.url;
                                    if (fetchedUrl) {
                                        content = fetchedUrl;
                                        if (fbMessage.message && fbMessage.message.trim()) {
                                            content = fbMessage.message + ' |IMAGE_URL|' + fetchedUrl;
                                        }
                                    }
                                } catch (fetchError) {
                                    try {
                                        const messageDetailsUrl = `https://graph.facebook.com/${apiVer}/${fbMessage.id}?fields=attachments{id,image_data{url},file_url,url}&access_token=${accessToken}`;
                                        const messageDetailsResponse = await axios.get(messageDetailsUrl, { timeout: 5000 });
                                        if (messageDetailsResponse.data?.attachments?.data?.[0]) {
                                            const detailedAttachment = messageDetailsResponse.data.attachments.data[0];
                                            const detailedImageUrl = detailedAttachment.image_data?.url || detailedAttachment.file_url || detailedAttachment.url;
                                            if (detailedImageUrl) {
                                                content = detailedImageUrl;
                                                if (fbMessage.message && fbMessage.message.trim()) {
                                                    content = fbMessage.message + ' |IMAGE_URL|' + detailedImageUrl;
                                                }
                                            }
                                        }
                                    } catch (messageFetchError) {
                                    }
                                }
                            } else {
                                try {
                                    const messageDetailsUrl = `https://graph.facebook.com/${apiVer}/${fbMessage.id}?fields=attachments{id,image_data{url},file_url,url}&access_token=${accessToken}`;
                                    const messageDetailsResponse = await axios.get(messageDetailsUrl, { timeout: 5000 });
                                    if (messageDetailsResponse.data?.attachments?.data?.[0]) {
                                        const detailedAttachment = messageDetailsResponse.data.attachments.data[0];
                                        const detailedImageUrl = detailedAttachment.image_data?.url || detailedAttachment.file_url || detailedAttachment.url;
                                        if (detailedImageUrl) {
                                            content = detailedImageUrl;
                                            if (fbMessage.message && fbMessage.message.trim()) {
                                                content = fbMessage.message + ' |IMAGE_URL|' + detailedImageUrl;
                                            }
                                        }
                                    }
                                } catch (messageFetchError) {
                                    // Failed to fetch message details, continue
                                }
                            }
                        }
                    } else if (attachmentType === 'file') {
                        messageType = 'FILE';
                        const fileUrl = attachment.file_url || attachment.url || attachment.payload?.url || attachment.name || '';
                        content = fileUrl;
                        if (fbMessage.message && fbMessage.message.trim()) {
                            content = fbMessage.message + ' |FILE_URL|' + fileUrl;
                        }
                    } else if (attachmentType === 'video') {
                        messageType = 'FILE'; // Treat video as file
                        const videoUrl = attachment.file_url || attachment.url || attachment.payload?.url || '';
                        content = videoUrl;
                        if (fbMessage.message && fbMessage.message.trim()) {
                            content = fbMessage.message + ' |VIDEO_URL|' + videoUrl;
                        }
                    } else if (attachmentType === 'audio') {
                        messageType = 'FILE'; // Treat audio as file
                        const audioUrl = attachment.file_url || attachment.url || attachment.payload?.url || '';
                        content = audioUrl;
                        if (fbMessage.message && fbMessage.message.trim()) {
                            content = fbMessage.message + ' |AUDIO_URL|' + audioUrl;
                        }
                    } else if (attachmentType === 'sticker') {
                        messageType = 'IMAGE';
                        content = attachment.url || attachment.file_url || attachment.payload?.url || '';
                    } else {
                        // Unknown attachment type - check if it has image_data, treat as image
                        if (attachment.image_data?.url) {
                            messageType = 'IMAGE';
                            const imageUrl = attachment.image_data.url;
                            content = imageUrl;
                            if (fbMessage.message && fbMessage.message.trim()) {
                                content = fbMessage.message + ' |IMAGE_URL|' + imageUrl;
                            }
                        } else {
                            // Unknown attachment type - try to extract URL or use message text
                            const url = attachment.file_url || attachment.url || attachment.payload?.url || '';
                            content = url || fbMessage.message || 'مرفق';
                        }
                    }
                } else if (fbMessage.sticker) {
                    messageType = 'IMAGE';
                    content = fbMessage.sticker.url || fbMessage.sticker.file_url || '';
                } else if (fbMessage.shares) {
                    // Handle shared content (links, posts, etc.)
                    messageType = 'TEXT';
                    if (fbMessage.message && fbMessage.message.trim()) {
                        content = fbMessage.message;
                    } else {
                        content = 'محتوى مشترك';
                    }
                }

                // If no content and no attachments
                if (!content || content.trim() === '') {
                    if (fbMessage.message && fbMessage.message.trim()) {
                        content = fbMessage.message.trim();
                    } else if (messageType === 'TEXT') {
                        content = 'رسالة بدون نص';
                    }
                }

                // Determine if message is from customer
                let finalIsFromCustomer = false;
                let decisionReason = '';

                if (fbMessage.from && fbMessage.from.id) {
                    const fromId = fbMessage.from.id;

                    if (fromId === psid) {
                        finalIsFromCustomer = true;
                        decisionReason = 'fromId === psid';
                    } else if (fromId === pageId) {
                        finalIsFromCustomer = false;
                        decisionReason = 'fromId === pageId';
                    } else {
                        // Fallback: check 'to' field
                        if (fbMessage.to && fbMessage.to.data && fbMessage.to.data.length > 0) {
                            const toIds = fbMessage.to.data.map(t => t.id);
                            const isSentToPsid = toIds.includes(psid);
                            const isSentToPageId = toIds.includes(pageId);

                            if (isSentToPsid && !isSentToPageId) {
                                finalIsFromCustomer = false;
                                decisionReason = 'to.includes(psid) only';
                            } else if (isSentToPageId && !isSentToPsid) {
                                finalIsFromCustomer = true;
                                decisionReason = 'to.includes(pageId) only';
                            } else {
                                finalIsFromCustomer = false;
                                decisionReason = 'ambiguous - default false';
                            }
                        } else {
                            decisionReason = 'no to field - default false';
                        }
                    }
                } else {
                    decisionReason = 'no from field - default false';
                }

                // Parse created_time
                const createdAt = fbMessage.created_time ? new Date(fbMessage.created_time) : new Date();

                // Prepare content for saving
                let finalContent = content;
                if (messageType === 'IMAGE' && !finalContent) {
                    finalContent = '📷 صورة';
                } else if (messageType === 'FILE' && !finalContent) {
                    finalContent = '📎 ملف';
                } else if (messageType === 'TEXT' && (!finalContent || finalContent.trim() === '')) {
                    finalContent = 'رسالة';
                }

                const messageSignature = buildFacebookMessageSignature({
                    content: finalContent,
                    type: messageType,
                    isFromCustomer: finalIsFromCustomer,
                    createdAt
                });
                if (messageSignature && (existingMessageSignatures.has(messageSignature) || batchMessageSignatures.has(messageSignature))) {
                    skippedCount++;
                    continue;
                }

                if (facebookMessageId) {
                    batchFacebookIds.add(facebookMessageId);
                }
                if (messageSignature) {
                    batchMessageSignatures.add(messageSignature);
                }

                // Add to batch for bulk insert
                messagesToSave.push({
                    id: uuidv4(),
                    content: finalContent,
                    type: messageType,
                    conversationId: conversationId,
                    isFromCustomer: finalIsFromCustomer,
                    isRead: false, // Mark as unread for old messages
                    attachments: syncedAttachmentsData.length > 0 ? JSON.stringify(syncedAttachmentsData) : null,
                    metadata: JSON.stringify({
                        platform: 'facebook',
                        source: 'graph_api_sync',
                        facebookMessageId,
                        syncedAt: new Date().toISOString(),
                        fromId: fbMessage.from?.id || null,
                        toIds: fbMessage.to?.data?.map(t => t.id) || [],
                        originalMessage: fbMessage.message || null,
                        hasAttachments: !!(fbMessage.attachments || fbMessage.sticker),
                        hasButtons: !!(fbMessage.attachments?.data?.[0]?.type === 'template' && fbMessage.attachments.data[0].payload?.buttons),
                        shares: fbMessage.shares || null,
                        attachmentDetails: fbMessage.attachments?.data || null
                    }),
                    createdAt: createdAt,
                    updatedAt: new Date()
                });

            } catch (parseError) {
                console.error(`Error parsing message ${fbMessage.id}:`, parseError);
                errorCount++;
                // Continue with next message
            }
        }

        // Bulk save messages to database (much faster than individual creates)
        let savedCount = 0;

        // Console summary for debugging
        const customerMessages = messagesToSave.filter(m => m.isFromCustomer);
        const pageMessages = messagesToSave.filter(m => !m.isFromCustomer);
        const messagesWithAttachments = messagesToSave.filter(m => {
            try {
                const meta = JSON.parse(m.metadata);
                return meta.hasAttachments || meta.hasButtons;
            } catch { return false; }
        });

        console.log(`📊 [SYNC-SUMMARY] Messages to save:`, {
            total: messagesToSave.length,
            fromCustomer: customerMessages.length,
            fromPage: pageMessages.length,
            withAttachments: messagesWithAttachments.length,
            messageTypes: messagesToSave.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + 1;
                return acc;
            }, {})
        });

        if (messagesToSave.length > 0) {
            try {
                // Use createMany for bulk insert (faster)
                const result = await getSharedPrismaClient().message.createMany({
                    data: messagesToSave,
                    skipDuplicates: true // Skip duplicates if any
                });
                savedCount = result.count;

                console.log(`✅ [SYNC-FB-MESSAGES] Saved ${savedCount} messages in bulk`);
            } catch (bulkSaveError) {
                console.error('❌ [SYNC-FB-MESSAGES] Error in bulk save, trying individual saves:', bulkSaveError);
                // Fallback to individual saves if bulk fails
                for (const msgData of messagesToSave) {
                    try {
                        await getSharedPrismaClient().message.create({ data: msgData });
                        savedCount++;
                    } catch (indError) {
                        console.error('❌ [SYNC-FB-MESSAGES] Error saving individual message:', indError);
                        errorCount++;
                    }
                }
            }
        }

        // Update conversation last message time
        if (savedCount > 0) {
            try {
                await getSharedPrismaClient().conversation.update({
                    where: { id: conversationId },
                    data: {
                        updatedAt: new Date()
                    }
                });
            } catch (updateError) {
                console.error('Error updating conversation:', updateError);
            }
        }

        // Always return success if we fetched messages, even if some failed to save
        const successMessage = savedCount > 0
            ? `تم جلب ${savedCount} رسالة جديدة وتم تخطي ${skippedCount} رسالة موجودة${errorCount > 0 ? ` وفشل حفظ ${errorCount} رسالة` : ''}`
            : `تم جلب ${allMessages.length} رسالة ولكنها موجودة مسبقاً (تم تخطي ${skippedCount} رسالة)${errorCount > 0 ? ` وفشل حفظ ${errorCount} رسالة` : ''}`;

        res.json({
            success: true,
            message: successMessage,
            data: {
                totalFetched: allMessages.length,
                saved: savedCount,
                skipped: skippedCount,
                errors: errorCount
            }
        });

    } catch (error) {
        console.error('❌ [SYNC-FB-MESSAGES] Error syncing Facebook messages:', error);
        console.error('❌ [SYNC-FB-MESSAGES] Error stack:', error.stack);

        // Provide more detailed error message
        let errorMessage = 'حدث خطأ أثناء جلب الرسائل';
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message || 'Unknown error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    syncFacebookMessages,
    __testables: {
        normalizeFacebookMessageText,
        buildFacebookMessageSignature
    }
};
