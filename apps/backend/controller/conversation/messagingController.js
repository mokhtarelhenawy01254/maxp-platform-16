/**
 * messagingController.js
 * Messaging and file sending functions
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const { processImage, isProcessableImage } = require('../../utils/imageProcessor');
const { getMetaGraphApiVersion } = require('../../config/metaApi');
const socketService = require('../../services/socketService');
const path = require('path');
const telegramBotService = require('../../services/TelegramBotService');
const { sendProductionFacebookMessage } = require('../../utils/production-facebook-fix');
const { conversationCache } = require('../../utils/cachingUtils');
const {
  normalizeStoredAssetUrl,
  sanitizeStoredAssetUrl,
} = require('../../utils/productMediaUtils');
const { normalizeEnum, MESSAGE_TYPE } = require('../../utils/validator');
const { recordSentMessageStat } = require('../../utils/statsRecorder');
const { proxySocketMessageData } = require('../../utils/facebookMediaProxy');
const { isValidMessageContent, getPageToken, processedMessages, getLastWebhookPageId } = require('./conversationShared');
const aiServiceRouter = { isAiServiceEnabled: () => true, routeToAiService: async (p) => ({ status: 'ok', reply: '' }) };


const postMessageConverstation = async (req, res) => {
  const startTime = Date.now(); // ⚡ Track performance
  try {
    //console.log(`🔥 POST /api/v1/conversations/${req.params.id}/messages received`);
    //console.log(`📦 Request body:`, req.body);

    const { id } = req.params;
    const { message, replyTo } = req.body;

    if (!message) {
      //console.log(`❌ No message content provided`);
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // التحقق من صحة محتوى الرسالة
    if (!isValidMessageContent(message)) {
      //console.log(`⚠️ [VALIDATION] رسالة فارغة أو غير صالحة تم رفضها: "${message}"`);
      return res.status(400).json({
        success: false,
        error: 'رسالة فارغة أو غير صالحة',
        message: 'لا يمكن إرسال رسائل فارغة أو تحتوي فقط على علامات'
      });
    }

    // Prevent duplicate processing of the same message
    const messageKey = `${id}_${message}_${Date.now()}`;
    if (processedMessages.has(messageKey)) {
      //console.log(`⚠️ Message already processed, skipping duplicate: ${messageKey}`);
      return res.status(200).json({
        success: true,
        message: 'Message already processed'
      });
    }

    // Add to processed messages set and clean up after 1 minute
    processedMessages.add(messageKey);
    setTimeout(() => {
      processedMessages.delete(messageKey);
    }, 60000);

    //console.log(`📤 Sending message to conversation ${id}: ${message}`);

    // ⚡ OPTIMIZATION: Parallel DB queries to reduce latency
    const senderId = req.user?.userId || req.user?.id;

    // 🔧 FIX: Get Prisma client early
    const prisma = getSharedPrismaClient();
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }

    const [conversation, user] = await Promise.all([
      executeWithRetry(async () => {
        const prismaClient = getSharedPrismaClient();
        return await prismaClient.conversation.findUnique({
          where: { id },
          include: {
            customer: true
          }
        });
      }, 3),
      // جلب معلومات المستخدم فقط إذا كان موجود
      senderId ? executeWithRetry(async () => {
        const prismaClient = getSharedPrismaClient();
        return await prismaClient.user.findUnique({
          where: { id: senderId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
      }, 3) : Promise.resolve(null)
    ]);

    // ⚡ Parse metadata once and reuse
    let conversationMetadata = {};
    if (conversation.metadata) {
      try {
        conversationMetadata = JSON.parse(conversation.metadata);
      } catch (e) {
        console.warn('⚠️ Error parsing conversation metadata');
      }
    }

    // 🔧 FIX: استخدام userId من JWT token
    let senderName = 'موظف';

    if (req.user && senderId && user) {
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف';

      conversationMetadata.lastSenderId = senderId; // معرف الموظف اللي بعت الرسالة
      conversationMetadata.lastSenderName = senderName; // اسم الموظف
    } else {
      console.warn(`⚠️ [SENDER-INFO] req.user or senderId is missing!`, req.user);
    }

    // ⚡ OPTIMIZATION: Combine all conversation updates into one query
    const conversationUpdateData = {
      metadata: JSON.stringify(conversationMetadata),
      updatedAt: new Date(),
      // 🆕 FIX: Mark as replied (not from customer) so it disappears from "unreplied" tab
      lastMessageIsFromCustomer: false,
      // 🆕 Auto-assign to employee if currently unassigned
      ...(senderId && !conversation.assignedUserId ? { assignedUserId: senderId } : {})
    };

    // 🔧 FIX: Calculate actual unread count instead of resetting to 0
    const actualUnreadCount = await executeWithRetry(async () => {
      return await prisma.message.count({
        where: {
          conversationId: id,
          isFromCustomer: true,
          isRead: false
        }
      });
    }, 3);
    conversationUpdateData.unreadCount = actualUnreadCount;

    // Add lastMessage fields if message is not empty
    if (message && message.trim() !== '') {
      conversationUpdateData.lastMessageAt = new Date();
      conversationUpdateData.lastMessagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
    }

    // Single update query instead of 2-3 separate ones
    // 🔧 FIX: Use executeWithRetry to handle connection errors
    const updatedConversation = await executeWithRetry(async () => {
      return await prisma.conversation.update({
        where: { id },
        data: conversationUpdateData
      });
    }, 3);

    // ⚡ OPTIMIZATION: Cache invalidation moved after update
    if (conversation && conversation.companyId) {
      // Non-blocking cache invalidation
      conversationCache.invalidateConversation(id, conversation.companyId);
    }

    // 💾 حفظ الرسالة فوراً في قاعدة البيانات (INSTANT SAVE)
    let savedMessage = null;
    try {
      // 🔧 FIX: Use executeWithRetry to handle connection errors
      savedMessage = await executeWithRetry(async () => {
        return await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            content: message,
            type: 'TEXT',
            conversationId: id,
            isFromCustomer: false,
            senderId: senderId, // معرف الموظف
            metadata: JSON.stringify({
              platform: conversation.channel ? conversation.channel.toLowerCase() : 'facebook',
              source: 'manual_reply',
              employeeId: senderId,
              employeeName: senderName,
              isFacebookReply: conversation.channel === 'FACEBOOK',
              isInstagramReply: conversation.channel === 'INSTAGRAM',
              isTelegramReply: conversation.channel === 'TELEGRAM',
              timestamp: new Date(),
              instantSave: true,
              ...(replyTo ? { replyTo } : {})
            }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }, 3);

      console.log(`💾 [INSTANT-SAVE] Message saved immediately: ${savedMessage.id}`);

      // إرسال الرسالة فوراً للـ socket
      const io = socketService.getIO();
      if (io) {
        const socketData = proxySocketMessageData({
          id: savedMessage.id,
          conversationId: savedMessage.conversationId,
          content: savedMessage.content,
          type: savedMessage.type.toLowerCase(),
          isFromCustomer: savedMessage.isFromCustomer,
          timestamp: savedMessage.createdAt,
          metadata: JSON.parse(savedMessage.metadata),
          senderId: senderId,
          senderName: senderName,
          lastMessageIsFromCustomer: false,
          lastCustomerMessageIsUnread: false,
          // 🏢 Company Isolation
          companyId: conversation.companyId,
          // 📱 Platform identification for filtering
          platform: conversation.channel === 'TELEGRAM' ? 'telegram' : (conversation.channel ? conversation.channel.toLowerCase() : 'facebook'),
          channel: conversation.channel || 'FACEBOOK'
        }, {
          messageId: savedMessage.id
        });

        // ✅ إرسال للشركة فقط - Company Isolation
        io.to(`company_${conversation.companyId}`).emit('new_message', socketData);
        console.log(`⚡ [SOCKET] Message emitted to company ${conversation.companyId}`, {
          messageId: socketData.id,
          conversationId: socketData.conversationId,
          platform: socketData.platform,
          channel: socketData.channel,
          content: socketData.content?.substring(0, 50)
        });
      }

      // 🛡️ Auto-pause AI on human staff manual reply
      try {
        let convMeta = {};
        try {
          convMeta = typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : (conversation.metadata || {});
        } catch (e) { convMeta = {}; }

        const pauseHours = 2;
        convMeta.aiPausedUntil = new Date(Date.now() + pauseHours * 60 * 60 * 1000).toISOString();
        convMeta.lastHumanReplyAt = new Date().toISOString();
        convMeta.lastHumanSenderId = senderId;
        convMeta.lastHumanSenderName = senderName;

        await getSharedPrismaClient().conversation.update({
          where: { id },
          data: {
            aiEnabled: false,
            metadata: JSON.stringify(convMeta),
            lastMessageAt: new Date(),
            lastMessagePreview: (message || '').substring(0, 100),
            lastMessageIsFromCustomer: false,
            updatedAt: new Date()
          }
        });

        if (io) {
          io.to(`company_${conversation.companyId}`).emit('conversation:ai_status_changed', {
            conversationId: id,
            channel: conversation.channel,
            aiEnabled: false,
            aiPausedUntil: convMeta.aiPausedUntil
          });
        }
      } catch (pauseErr) {
        console.warn('⚠️ [HANDOVER] Error auto-pausing AI on staff reply:', pauseErr.message);
      }
    } catch (saveError) {
      console.error('❌ [INSTANT-SAVE] Error saving message:', saveError.message);
      // استمر في المحاولة للإرسال لفيسبوك حتى لو فشل الحفظ
    }

    // 📤 إرسال الرسالة إلى Facebook فعلياً
    let facebookSent = false;
    let facebookMessageId = null; // Store Facebook message ID
    let facebookErrorDetails = null; // Store error details for frontend
    try {
      if (conversation && conversation.customer) {
        const recipientId = conversation.customer.facebookId;

        //console.log(`🔍 [FACEBOOK-SEND] Attempting to send to recipient: ${recipientId}`);

        if (!recipientId) {
          //console.log('⚠️ No Facebook ID found for customer');
          facebookSent = false;
        } else {
          // ⚡ OPTIMIZATION: Use cached metadata (already parsed above)
          let pageData = null;
          let actualPageId = null;

          // NEW: First try to get the page ID from the conversation metadata (already parsed)
          // This ensures we reply using the same page that received the original message
          if (conversationMetadata.pageId) {
            //console.log(`🎯 [FACEBOOK-SEND] Using page ID from conversation metadata: ${conversationMetadata.pageId}`);
            const pageTokenData = await getPageToken(conversationMetadata.pageId);
            if (pageTokenData) {
              pageData = pageTokenData;
              actualPageId = conversationMetadata.pageId;
            } else {
              //console.log('⚠️ [FACEBOOK-SEND] Page token not found for metadata page ID');
            }
          }

          // أولاً: البحث عن صفحة Facebook متصلة
          if (!pageData) {
            const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
              where: {
                status: 'connected',
                companyId: conversation.companyId // 🔐 عزل الشركات
              },
              orderBy: { connectedAt: 'desc' }
            });

            if (facebookPage) {
              pageData = {
                pageAccessToken: facebookPage.pageAccessToken,
                pageName: facebookPage.pageName,
                companyId: facebookPage.companyId
              };
              actualPageId = facebookPage.pageId;
              //console.log(`✅ [FACEBOOK-SEND] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
            } else {
              //console.log('⚠️ No connected Facebook page found for company');
            }
          }

          // ثانياً: استخدام getLastWebhookPageId() كبديل
          if (!pageData && getLastWebhookPageId()) {
            const pageTokenData = await getPageToken(getLastWebhookPageId());
            if (pageTokenData) {
              pageData = pageTokenData;
              actualPageId = getLastWebhookPageId();
              //console.log(`🔄 [FACEBOOK-SEND] Using last webhook page: ${getLastWebhookPageId()}`);
            }
          }

          if (pageData && pageData.pageAccessToken && actualPageId) {
            // GUARD: PSID/Page mismatch — if conversation metadata contains pageId and it's different from selected page
            if (conversationMetadata.pageId && conversationMetadata.pageId !== actualPageId) {
              console.warn(`⚠️ [GUARD] PSID/Page mismatch: metadata.pageId=${conversationMetadata.pageId} actualPageId=${actualPageId}`);
              facebookSent = false;
              facebookErrorDetails = {
                success: false,
                error: 'PSID_PAGE_MISMATCH',
                message: 'PSID لا يخص هذه الصفحة. استخدم نفس الصفحة التي استقبلت رسالة العميل.'
              };
            } else {
              console.log(`📤 [FACEBOOK-SEND] إرسال رسالة من الموقع إلى Facebook...`);
              console.log(`📤 [FACEBOOK-SEND] المحادثة: ${id} | العميل: ${recipientId} | الصفحة: ${actualPageId}`);
              console.log(`📤 [FACEBOOK-SEND] محتوى الرسالة: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

              // استخدام دالة الإرسال المحسنة
              // 🔧 FIX: استخدم نفس الطريقة التي تستخدمها الصور للإرسال
              const { sendProductionFacebookMessage } = require('../../utils/production-facebook-fix');
              const response = await sendProductionFacebookMessage(
                recipientId,
                message,
                'TEXT',
                actualPageId,
                pageData.pageAccessToken
              );

              facebookSent = response.success;
              facebookMessageId = response.messageId; // Store Facebook message ID
              facebookErrorDetails = response; // Store full error details

              if (facebookSent) {
                console.log(`✅ [FACEBOOK-SEND] تم إرسال الرسالة بنجاح إلى Facebook | Message ID: ${facebookMessageId?.slice(-8) || 'N/A'}`);
              } else {
                console.error(`❌ [FACEBOOK-SEND] فشل إرسال الرسالة إلى Facebook: ${response.message || response.error}`);
              }

              // 🔄 تحديث الرسالة المحفوظة بـ Facebook Message ID
              if (facebookSent && facebookMessageId && savedMessage) {
                try {
                  await getSharedPrismaClient().message.update({
                    where: { id: savedMessage.id },
                    data: {
                      metadata: JSON.stringify({
                        ...JSON.parse(savedMessage.metadata),
                        facebookMessageId: facebookMessageId,
                        sentToFacebook: true
                      })
                    }
                  });
                  console.log(`✅ [FACEBOOK-SEND] تم تحديث الرسالة ${savedMessage.id.slice(-8)} بـ Facebook ID: ${facebookMessageId.slice(-8)}`);
                } catch (updateError) {
                  console.error('⚠️ [FACEBOOK-SEND] فشل تحديث الرسالة بـ Facebook ID:', updateError.message);
                }

                // 📊 تسجيل الإحصائيات
                await recordSentMessageStat({
                  companyId: conversation.companyId,
                  facebookPageId: actualPageId,
                  recipientFacebookId: recipientId,
                  recipientCustomerId: conversation.customerId,
                  messageId: facebookMessageId,
                  messageContent: message,
                  messageType: 'TEXT',
                  messageStatus: 'saved',
                  conversationId: id,
                  conversationStatus: 'existed',
                  sentAt: new Date(),
                  savedAt: new Date(),
                  conversationCreatedAt: conversation.createdAt
                });
              }

              // NEW: Handle Facebook errors more gracefully
              if (!facebookSent && response.error === 'RECIPIENT_NOT_AVAILABLE') {
                await getSharedPrismaClient().conversation.update({
                  where: { id },
                  data: {
                    metadata: JSON.stringify({
                      ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                      facebookSendError: 'RECIPIENT_NOT_AVAILABLE',
                      facebookErrorMessage: 'هذا الشخص غير متاح حاليًا. اطلب من العميل إرسال رسالة جديدة أو تأكد أنه لم يحظر الصفحة.',
                      lastFacebookErrorAt: new Date().toISOString(),
                      notMessageable: true,
                      unmessageableReason: 'fb_551_1545041'
                    })
                  }
                });
              }
              // NEW: Handle the specific Facebook error 2018001 more gracefully
              if (!facebookSent && response.error === 'NO_MATCHING_USER') {
                //console.log(`⚠️ [FACEBOOK-SEND] User hasn't started conversation with page`);

                // Update the conversation to indicate this issue
                await getSharedPrismaClient().conversation.update({
                  where: { id },
                  data: {
                    metadata: JSON.stringify({
                      ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                      facebookSendError: 'USER_NOT_STARTED_CONVERSATION',
                      facebookErrorMessage: 'العميل لم يبدأ محادثة مع الصفحة',
                      lastFacebookErrorAt: new Date().toISOString()
                    })
                  }
                });
              } else if (!facebookSent) {
                console.error(`❌ [FACEBOOK-SEND] Failed to send: ${response.message}`);
                if (response.solutions) {
                  //console.log('🔧 [FACEBOOK-SEND] Solutions:');
                  response.solutions.forEach(solution => {
                    //console.log(`   - ${solution}`);
                  });
                }
              } else {
                //console.log(`✅ [FACEBOOK-SEND] Message sent successfully - will be saved via echo`);
              }
            }
          } else {
            //console.log('⚠️ [FACEBOOK-SEND] No valid page access token or page ID available');
            //console.log(`   - Page Data: ${!!pageData}`);
            //console.log(`   - Page Access Token: ${!!pageData?.pageAccessToken}`);
            //console.log(`   - Actual Page ID: ${actualPageId}`);
            //console.log(`   - Last Webhook Page ID: ${getLastWebhookPageId()}`);
          }
        }
      } else {
        //console.log('⚠️ [FACEBOOK-SEND] Conversation or customer not found');
      }
    } catch (fbError) {
      console.error('❌ [FACEBOOK-SEND] Error sending Facebook message:', fbError);
      facebookErrorDetails = {
        success: false,
        error: 'FACEBOOK_SEND_ERROR',
        message: fbError.message,
        details: 'حدث خطأ أثناء إرسال الرسالة إلى فيسبوك'
      };
      // Don't fail the whole operation if Facebook sending fails
    }

    // 🚀 TELEGRAM SENDING LOGIC
    let telegramSent = false;
    if (conversation && conversation.channel === 'TELEGRAM') {
      const telegramResult = await telegramBotService.sendReply(id, message);
      telegramSent = telegramResult.success;
      if (!telegramSent) {
        console.error('❌ [TELEGRAM-SEND] Failed:', telegramResult.error);
      } else {
        // Update message metadata with sent=true?
        // Not strictly needed as current impl assumes sent if no error
        console.log(`✅ [TELEGRAM-SEND] Message sent via Telegram`);
      }
    }

    // 📸 INSTAGRAM SENDING LOGIC
    let instagramSent = false;
    if (conversation && conversation.channel === 'INSTAGRAM') {
      try {
        const recipientInstagramId = conversation.customer?.instagramId;
        if (!recipientInstagramId) {
          console.error('❌ [INSTAGRAM-SEND] No Instagram ID found for customer');
        } else {
          // Get the Facebook page associated with this conversation
          const igPage = await executeWithRetry(async () => {
            const prismaClient = getSharedPrismaClient();
            return await prismaClient.facebookPage.findFirst({
              where: {
                companyId: conversation.companyId,
                status: 'connected',
                instagramAccountId: { not: null }
              },
              orderBy: { connectedAt: 'desc' }
            });
          }, 3);

          if (igPage?.pageAccessToken && igPage?.instagramAccountId) {
            const axios = require('axios');
            const IG_GRAPH_API = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${igPage.instagramAccountId}/messages`;
            const igResponse = await axios.post(IG_GRAPH_API, {
              recipient: { id: recipientInstagramId },
              message: { text: message },
              access_token: igPage.pageAccessToken
            }, {
              timeout: 15000,
              headers: { 'Content-Type': 'application/json' }
            });

            instagramSent = true;
            console.log(`✅ [INSTAGRAM-SEND] Message sent to Instagram user ${recipientInstagramId}`);

            if (savedMessage) {
              try {
                await executeWithRetry(async () => {
                  const prismaClient = getSharedPrismaClient();
                  return await prismaClient.message.update({
                    where: { id: savedMessage.id },
                    data: {
                      metadata: JSON.stringify({
                        ...JSON.parse(savedMessage.metadata || '{}'),
                        instagramMessageId: igResponse.data?.message_id,
                        sentToInstagram: true
                      })
                    }
                  });
                }, 2);
              } catch (updateError) {
                console.error('⚠️ [INSTAGRAM-SEND] Failed updating message metadata:', updateError.message);
              }
            }
          } else {
            console.error('❌ [INSTAGRAM-SEND] No connected Instagram Business account found for company');
          }
        }
      } catch (igError) {
        console.error('❌ [INSTAGRAM-SEND] Error sending Instagram message:', igError.response?.data || igError.message);
      }
    }

    // 🎵 TIKTOK SENDING LOGIC
    let tiktokSent = false;
    if (conversation && conversation.channel === 'TIKTOK') {
      try {
        const recipientTikTokId = conversation.customer?.tiktokId;
        if (!recipientTikTokId) {
          console.error('❌ [TIKTOK-SEND] No TikTok ID found for customer');
        } else {
          const tiktokMessagingService = require('../../services/tiktok/tiktokMessagingService');
          const ttResult = await tiktokMessagingService.sendTextMessage({
            companyId: conversation.companyId,
            toOpenId: recipientTikTokId,
            text: message
          });

          if (ttResult?.success) {
            tiktokSent = true;
            console.log(`✅ [TIKTOK-SEND] Message sent to TikTok user ${recipientTikTokId}`);
            if (savedMessage) {
              try {
                await executeWithRetry(async () => {
                  const prismaClient = getSharedPrismaClient();
                  return await prismaClient.message.update({
                    where: { id: savedMessage.id },
                    data: {
                      metadata: JSON.stringify({
                        ...JSON.parse(savedMessage.metadata || '{}'),
                        tiktokMessageId: ttResult.data?.message_id || null,
                        sentToTikTok: true
                      })
                    }
                  });
                }, 2);
              } catch (updateError) {
                console.error('⚠️ [TIKTOK-SEND] Failed updating message metadata:', updateError.message);
              }
            }
          } else {
            console.error('❌ [TIKTOK-SEND] TikTok delivery failed:', ttResult?.message || ttResult?.error);
          }
        }
      } catch (ttError) {
        console.error('❌ [TIKTOK-SEND] Error sending TikTok message:', ttError.response?.data || ttError.message);
      }
    }

    // ⚡ Track total execution time
    const totalTime = Date.now() - startTime;
    if (totalTime > 500) {
      console.log(`⚠️ [PERF-WARN] Message send took ${totalTime}ms (target: <500ms)`);
    } else {
      console.log(`⚡ [PERF] Message send completed in ${totalTime}ms`);
    }

    res.json({
      success: true,
      data: {
        conversationId: id,
        content: message,
        type: 'TEXT',
        isFromCustomer: false,
        isFacebookReply: conversation.channel === 'FACEBOOK',
        isInstagramReply: conversation.channel === 'INSTAGRAM',
        isTikTokReply: conversation.channel === 'TIKTOK',
        facebookMessageId: facebookMessageId,
        sentAt: new Date()
      },
      message: facebookSent ? 'Reply sent successfully' : (instagramSent ? 'Reply sent to Instagram' : (tiktokSent ? 'Reply sent to TikTok' : 'Failed to send')),
      facebookSent: facebookSent,
      facebookError: facebookErrorDetails,
      instagramSent: instagramSent,
      tiktokSent: tiktokSent,
      debug: {
        hasCustomer: !!conversation?.customer,
        hasFacebookId: !!conversation?.customer?.facebookId,
        hasInstagramId: !!conversation?.customer?.instagramId,
        hasTikTokId: !!conversation?.customer?.tiktokId,
        facebookSent: facebookSent,
        instagramSent: instagramSent,
        tiktokSent: tiktokSent,
        channel: conversation.channel,
        executionTime: `${totalTime}ms`
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [ERROR] Message send failed after ${totalTime}ms:`, error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const uploadFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    //console.log(`📎 ${files.length} file(s) uploaded for conversation ${id}`);

    const prisma = getSharedPrismaClient();
    const conversation = await executeWithRetry(async () => {
      return await prisma.conversation.findUnique({
        where: { id },
        select: { id: true, companyId: true, channel: true, customer: { select: { facebookId: true } }, metadata: true, customerId: true, createdAt: true }
      });
    }, 3);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }

    const uploadedFiles = [];

    const { processImage, isProcessableImage } = require('../../utils/imageProcessor');
    // ... existing imports ...
    // Process each file
    for (let file of files) {
      let currentFilename = file.filename;
      let currentSize = file.size;
      let currentMimetype = file.mimetype;

      // 🖼️ Process image if applicable
      if (isProcessableImage(file.mimetype)) {
        try {
          const processed = await processImage(file.path, path.dirname(file.path));
          currentFilename = processed.filename;
          currentSize = processed.size;
          currentMimetype = 'image/webp';
          console.log(`🖼️ [IMAGE-PROC] Processed image saved to: ${processed.path}`);
        } catch (procError) {
          console.error(`❌ [IMAGE-PROC] Error processing ${file.filename}:`, procError.message);
          // Fallback to original file if processing fails
        }
      }

      const fileUrl = `/uploads/conversations/${currentFilename}`;
      console.log(`📎 [UPLOAD-FILE] File URL logic: ${fileUrl} (Internal path: ${path.join(path.dirname(file.path), currentFilename)})`);

      // 🔧 FIX: Use environment config to determine correct URL
      // In production, use production domain. In development, Facebook can't access localhost,
      // so we need to use production domain even in dev (files must be synced to production)
      const envConfig = require('../../config/environment');
      let fullUrl;

      if (envConfig.isProduction) {
        // Production: Use production domain
        fullUrl = `${envConfig.backendUrl}${fileUrl}`;
      } else {
        // Development: Use production domain for Facebook API access
        // Note: Files must be accessible from production domain for Facebook to access them
        // In development, you may need to sync files or use a tunnel (ngrok) for testing
        const productionDomain = process.env.APP_URL || 'https://maxp.online';
        fullUrl = `${productionDomain}${fileUrl}`;

        // ⚠️ WARNING: In development, files uploaded locally won't be accessible from production domain
        // For testing images in development, you need to either:
        // 1. Sync files to production server
        // 2. Use ngrok or similar tunnel to expose local files
        // 3. Upload files directly to production storage (S3, etc.)
        console.warn('⚠️ [DEV-UPLOAD] File uploaded in development mode. Facebook API will try to access:', fullUrl);
        console.warn('⚠️ [DEV-UPLOAD] Make sure this file is accessible from production domain for Facebook to access it.');
      }

      console.log(`📤 [UPLOAD-FILE] File URL prepared: ${fullUrl}`);

      // Determine message type
      let messageType = 'FILE';
      if (currentMimetype.startsWith('image/')) {
        messageType = 'IMAGE';
      } else if (currentMimetype.startsWith('video/')) {
        messageType = 'VIDEO';
      } else if (currentMimetype.startsWith('audio/')) {
        messageType = 'AUDIO';
      }

      // Create attachment object
      const attachment = {
        url: fullUrl,
        name: file.originalname,
        size: currentSize,
        type: messageType.toLowerCase(),
        mimeType: currentMimetype
      };

      // Get main domain from env or default to maxp.online
      const MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'maxp.online';
      // Get user info for sender
      const senderId = req.user?.userId || req.user?.id;
      let senderName = 'موظف';

      if (senderId) {
        const user = await executeWithRetry(async () => {
          return await prisma.user.findUnique({
            where: { id: senderId },
            select: { firstName: true, lastName: true, email: true }
          });
        }, 3);
        if (user) {
          senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف';
        }
      }

      // 💾 حفظ الملف فوراً في قاعدة البيانات (INSTANT SAVE)
      let savedFileMessage = null;
      try {
        // 🔧 FIX: Use executeWithRetry to handle connection errors
        savedFileMessage = await executeWithRetry(async () => {
          return await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              content: fullUrl,
              type: messageType,
              conversationId: id,
              isFromCustomer: false,
              senderId: senderId,
              attachments: JSON.stringify([attachment]),
              metadata: JSON.stringify({
                platform: 'facebook',
                source: 'file_upload',
                employeeId: senderId,
                employeeName: senderName,
                isFacebookReply: true,
                timestamp: new Date(),
                instantSave: true,
                fileName: file.originalname,
                fileSize: currentSize,
                mimeType: currentMimetype
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }, 3);

        console.log(`💾 [INSTANT-SAVE-FILE] ${messageType} saved immediately: ${savedFileMessage.id}`);

        // إرسال الملف فوراً للـ socket
        const io = socketService.getIO();
        if (io) {
          const socketData = proxySocketMessageData({
            id: savedFileMessage.id,
            conversationId: savedFileMessage.conversationId,
            content: savedFileMessage.content,
            type: savedFileMessage.type === 'IMAGE' ? 'image' : savedFileMessage.type.toLowerCase(),
            isFromCustomer: savedFileMessage.isFromCustomer,
            timestamp: savedFileMessage.createdAt,
            metadata: JSON.parse(savedFileMessage.metadata),
            attachments: savedFileMessage.attachments,
            isFacebookReply: true,
            senderId: senderId,
            senderName: senderName,
            lastMessageIsFromCustomer: false,
            lastCustomerMessageIsUnread: false,
            // 🏢 Company Isolation
            companyId: conversation.companyId,
            // 📱 Platform identification for filtering
            platform: conversation.channel ? conversation.channel.toLowerCase() : 'facebook',
            channel: conversation.channel || 'FACEBOOK'
          }, {
            messageId: savedFileMessage.id
          });

          // ✅ إرسال للشركة فقط - Company Isolation
          io.to(`company_${conversation.companyId}`).emit('new_message', socketData);
          console.log(`⚡ [SOCKET-FILE] ${messageType} emitted to company ${conversation.companyId}`);
        }
      } catch (saveError) {
        console.error(`❌ [INSTANT-SAVE-FILE] Error saving ${messageType}:`, saveError.message);
      }

      // Update conversation last message
      // 🔧 FIX: Use executeWithRetry to handle connection errors
      await executeWithRetry(async () => {
        return await prisma.conversation.update({
          where: { id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: messageType === 'IMAGE' ? '📷 صورة' : `📎 ${file.originalname}`,
            updatedAt: new Date(),
            // 🆕 FIX: Mark as replied
            lastMessageIsFromCustomer: false,
            unreadCount: 0
          }
        });
      }, 3);

      // Add to uploaded files array with message ID
      uploadedFiles.push({
        messageId: savedFileMessage?.id,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        url: fileUrl,
        fullUrl: fullUrl,
        type: messageType
      });

      // Send file to customer via Facebook if conversation is from Facebook
      let facebookSent = false;
      let facebookMessageId = null; // Store Facebook message ID
      try {
        // التحقق من وجود Facebook ID للعميل
        const facebookUserId = conversation?.customer?.facebookId;

        if (conversation && conversation.customer && facebookUserId) {
          //console.log(`📤 [FACEBOOK-FILE] Sending ${messageType} to customer:`, facebookUserId);

          // Get Facebook page info - NEW: First try to get from conversation metadata
          let facebookPage = null;
          let actualPageId = null;

          // NEW: First try to get the page ID from the conversation metadata
          // This ensures we reply using the same page that received the original message
          if (conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              if (metadata.pageId) {
                //console.log(`🎯 [FACEBOOK-FILE] Using page ID from conversation metadata: ${metadata.pageId}`);
                const pageTokenData = await getPageToken(metadata.pageId);
                if (pageTokenData) {
                  facebookPage = {
                    pageId: metadata.pageId,
                    pageAccessToken: pageTokenData.pageAccessToken,
                    pageName: pageTokenData.pageName,
                    companyId: pageTokenData.companyId
                  };
                  actualPageId = metadata.pageId;
                } else {
                  //console.log('⚠️ [FACEBOOK-FILE] Page token not found for metadata page ID');
                }
              }
            } catch (parseError) {
              //console.log('⚠️ [FACEBOOK-FILE] Error parsing conversation metadata:', parseError.message);
            }
          }

          // If we still don't have a page, find the default connected page
          if (!facebookPage) {
            facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
              where: {
                companyId: conversation.companyId,
                status: 'connected'
              }
            });

            if (facebookPage) {
              actualPageId = facebookPage.pageId;
              //console.log(`✅ [FACEBOOK-FILE] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
            }
          }

          if (facebookPage && facebookPage.pageAccessToken) {
            try {
              //console.log(`📤 [FACEBOOK-FILE] Using production Facebook sending for ${messageType}`);

              // 🔧 PRODUCTION: Use strict validation for file sending
              const result = await sendProductionFacebookMessage(
                facebookUserId,
                fullUrl,
                messageType,
                actualPageId || facebookPage.pageId,
                facebookPage.pageAccessToken
              );

              if (result.success) {
                //console.log(`✅ [FACEBOOK-FILE] ${messageType} sent successfully`);
                facebookSent = true;
                facebookMessageId = result.messageId;

                // 🔄 تحديث الملف المحفوظ بـ Facebook Message ID
                if (facebookMessageId && savedFileMessage) {
                  try {
                    // 🔧 FIX: Use executeWithRetry to handle connection errors
                    await executeWithRetry(async () => {
                      return await prisma.message.update({
                        where: { id: savedFileMessage.id },
                        data: {
                          metadata: JSON.stringify({
                            ...JSON.parse(savedFileMessage.metadata),
                            facebookMessageId: facebookMessageId,
                            sentToFacebook: true
                          })
                        }
                      });
                    }, 3);
                    console.log(`✅ [UPDATE-FILE] ${messageType} ${savedFileMessage.id} updated with Facebook ID: ${facebookMessageId}`);
                  } catch (updateError) {
                    console.error(`⚠️ [UPDATE-FILE] Failed to update ${messageType} with Facebook ID:`, updateError.message);
                  }

                  // 📊 تسجيل الإحصائيات
                  await recordSentMessageStat({
                    companyId: conversation.companyId,
                    facebookPageId: actualPageId,
                    recipientFacebookId: facebookUserId,
                    recipientCustomerId: conversation.customerId,
                    messageId: facebookMessageId,
                    messageContent: fullUrl,
                    messageType: messageType.toUpperCase(),
                    messageStatus: 'sent',
                    conversationId: id,
                    conversationStatus: 'existed',
                    sentAt: new Date(),
                    savedAt: new Date(),
                    conversationCreatedAt: conversation.createdAt
                  });
                }
              } else if (result.blocked) {
                console.warn(`🚫 [FACEBOOK-FILE] ${messageType} blocked: ${result.message}`);
                if (result.solutions) {
                  //console.log('🔧 [FACEBOOK-FILE] Suggested solutions:');
                  result.solutions.forEach(solution => {
                    //console.log(`   - ${solution}`);
                  });
                }
              } else {
                console.error(`❌ [FACEBOOK-FILE] Failed to send ${messageType}: ${result.message}`);
                if (result.solutions) {
                  //console.log('🔧 [FACEBOOK-FILE] Suggested solutions:');
                  result.solutions.forEach(solution => {
                    //console.log(`   - ${solution}`);
                  });
                }

                // Update conversation with error info for user experience
                if (result.error === 'NO_MATCHING_USER') {
                  await executeWithRetry(async () => {
                    return await prisma.conversation.update({
                      where: { id: conversation.id },
                      data: {
                        metadata: JSON.stringify({
                          facebookSendError: 'FACEBOOK_INTEGRATION_ERROR',
                          facebookErrorMessage: 'حدث خطأ في التكامل مع فيسبوك',
                          lastFacebookErrorAt: new Date().toISOString()
                        })
                      }
                    });
                  }, 3);
                }


              }
            } catch (error) {
              console.error('Error uploading file to Facebook:', error);
              // Don't fail the request if Facebook upload fails, just log it
            }
          }
        }
      } catch (facebookCheckError) {
        console.error('Error checking Facebook integration:', facebookCheckError);
      }

      // Return success response with all uploaded files
      // This is now outside the Facebook logic ensuring it always runs
      if (!res.headersSent) {
        res.json({
          success: true,
          message: `${files.length} file(s) uploaded successfully`,
          data: uploadedFiles
        });
      }
    }
  } catch (error) {
    console.error('Error processing uploadFile:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to populate file upload'
      });
    }
  }
};

const postReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, quickReplyId, imageUrls } = req.body; // ✅ إضافة دعم الصور

    if (!message && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Message content or images are required'
      });
    }

    // Prevent duplicate processing of the same message
    const messageKey = `${id}_${message}_${Date.now()}`;
    if (processedMessages.has(messageKey)) {
      //console.log(`⚠️ Message already processed, skipping duplicate: ${messageKey}`);
      return res.status(200).json({
        success: true,
        message: 'Message already processed'
      });
    }

    // Add to processed messages set and clean up after 1 minute
    processedMessages.add(messageKey);
    setTimeout(() => {
      processedMessages.delete(messageKey);
    }, 60000);

    //console.log(`📤 Sending reply to conversation ${id}: ${message}`);

    // Get conversation and user info
    const senderId = req.user?.userId || req.user?.id;

    const [conversation, user] = await Promise.all([
      executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.findUnique({
          where: { id },
          include: { customer: true }
        });
      }, 3),
      senderId ? executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.user.findUnique({
          where: { id: senderId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
      }, 3) : Promise.resolve(null)
    ]);

    let senderName = 'موظف';
    if (req.user && senderId && user) {
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف';
    }

    // ✅ FIX: دعم إرسال الصور مع النص
    const hasImages = imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0;
    const messageType = normalizeEnum(hasImages ? 'IMAGE' : 'TEXT', MESSAGE_TYPE, MESSAGE_TYPE.TEXT);
    const attachmentsData = hasImages ? imageUrls.map(url => ({
      type: 'image',
      payload: { url: url },
      url: url
    })) : null;

    // 💾 حفظ الرسالة فوراً في قاعدة البيانات (INSTANT SAVE)
    let savedMessage = null;
    try {
      savedMessage = await getSharedPrismaClient().message.create({
        data: {
          id: uuidv4(),
          content: message || (hasImages ? `${imageUrls.length} صورة` : ''),
          type: messageType,
          conversationId: id,
          isFromCustomer: false,
          senderId: senderId,
          attachments: attachmentsData ? JSON.stringify(attachmentsData) : null,
          metadata: JSON.stringify({
            platform: conversation?.channel?.toLowerCase() || 'facebook',
            source: 'quick_reply',
            employeeId: senderId,
            employeeName: senderName,
            isFacebookReply: conversation?.channel !== 'TELEGRAM',
            isTelegramReply: conversation?.channel === 'TELEGRAM',
            timestamp: new Date(),
            instantSave: true,
            quickReplyId: quickReplyId,
            hasImages: hasImages,
            imageCount: hasImages ? imageUrls.length : 0
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`💾 [INSTANT-SAVE-REPLY] Message saved immediately: ${savedMessage.id}`);

      // إرسال الرسالة فوراً للـ socket
      const io = socketService.getIO();
      if (io) {
        const socketData = proxySocketMessageData({
          id: savedMessage.id,
          conversationId: savedMessage.conversationId,
          content: savedMessage.content,
          type: savedMessage.type.toLowerCase(),
          isFromCustomer: savedMessage.isFromCustomer,
          timestamp: savedMessage.createdAt,
          metadata: JSON.parse(savedMessage.metadata),
          isFacebookReply: conversation?.channel !== 'TELEGRAM',
          senderId: senderId,
          senderName: senderName,
          lastMessageIsFromCustomer: false,
          lastCustomerMessageIsUnread: false,
          // 🏢 Company Isolation
          companyId: conversation.companyId,
          // 📱 Platform identification for filtering
          platform: conversation.channel ? conversation.channel.toLowerCase() : 'facebook',
          channel: conversation.channel || 'FACEBOOK'
        }, {
          messageId: savedMessage.id
        });

        // ✅ إرسال للشركة فقط - Company Isolation
        io.to(`company_${conversation.companyId}`).emit('new_message', socketData);
        console.log(`⚡ [SOCKET-REPLY] Message emitted to company ${conversation.companyId}`);
      }

      // Update conversation last message
      await getSharedPrismaClient().conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message.length > 100 ? message.substring(0, 100) + '...' : message,
          updatedAt: new Date(),
          // 🆕 FIX: Mark as replied
          lastMessageIsFromCustomer: false,
          unreadCount: 0
        }
      });
    } catch (saveError) {
      console.error('❌ [INSTANT-SAVE-REPLY] Error saving message:', saveError.message);
    }

    // TELEGRAM SENDING LOGIC
    if (conversation && conversation.channel === 'TELEGRAM') {
      //console.log(`📤 [TELEGRAM-REPLY] Sending reply to conversation ${id}`);
      const result = await telegramBotService.sendReply(id, message, imageUrls);

      if (result.success) {
        if (savedMessage) {
          await getSharedPrismaClient().message.update({
            where: { id: savedMessage.id },
            data: {
              metadata: JSON.stringify({
                ...JSON.parse(savedMessage.metadata),
                sentToTelegram: true
              })
            }
          });
        }

        return res.json({
          success: true,
          message: 'Reply sent to Telegram',
          debug: { sentToTelegram: true }
        });
      } else {
        // Even if failed to send, it is saved in DB.
        // We return success: false to notify user.
        return res.status(500).json({
          success: false,
          message: 'Failed to send to Telegram: ' + result.error,
          debug: { error: result.error }
        });
      }
    }



    // NEW: Send message to Facebook Messenger if conversation is from Facebook
    if (conversation && conversation.channel !== 'TELEGRAM') {
      let facebookSent = false;
      let facebookMessageId = null; // Store Facebook message ID
      let facebookErrorDetails = null; // Store error details for frontend
      try {
        //console.log(`🔍 [FACEBOOK-REPLY] Checking conversation ${id} for Facebook integration...`);

        // التحقق من وجود Facebook ID للعميل
        const facebookUserId = conversation?.customer?.facebookId;

        if (conversation && conversation.customer && facebookUserId) {
          //console.log(`📤 [FACEBOOK-REPLY] Sending reply to customer:`, facebookUserId);

          // Get Facebook page info - NEW: First try to get from conversation metadata
          let facebookPage = null;
          let actualPageId = null;

          // NEW: First try to get the page ID from the conversation metadata
          // This ensures we reply using the same page that received the original message
          if (conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              if (metadata.pageId) {
                //console.log(`🎯 [FACEBOOK-REPLY] Using page ID from conversation metadata: ${metadata.pageId}`);
                const pageTokenData = await getPageToken(metadata.pageId);
                if (pageTokenData) {
                  facebookPage = {
                    pageId: metadata.pageId,
                    pageAccessToken: pageTokenData.pageAccessToken,
                    pageName: pageTokenData.pageName,
                    companyId: pageTokenData.companyId
                  };
                  actualPageId = metadata.pageId;
                } else {
                  //console.log('⚠️ [FACEBOOK-REPLY] Page token not found for metadata page ID');
                }
              }
            } catch (parseError) {
              //console.log('⚠️ [FACEBOOK-REPLY] Error parsing conversation metadata:', parseError.message);
            }
          }

          // If we still don't have a page, find the default connected page
          if (!facebookPage) {
            facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
              where: {
                companyId: conversation.companyId,
                status: 'connected'
              }
            });

            if (facebookPage) {
              actualPageId = facebookPage.pageId;
              //console.log(`✅ [FACEBOOK-REPLY] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
            }
          }

          if (facebookPage && facebookPage.pageAccessToken) {
            try {
              // ✅ FIX: إرسال النص أولاً إذا كان موجوداً
              if (message && message.trim().length > 0) {
                console.log(`📤 [FACEBOOK-REPLY] إرسال رسالة من صفحة conversations-improved إلى Facebook...`);
                console.log(`📤 [FACEBOOK-REPLY] المحادثة: ${id} | العميل: ${facebookUserId} | الصفحة: ${actualPageId || facebookPage.pageId}`);
                console.log(`📤 [FACEBOOK-REPLY] محتوى الرسالة: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

                // 🔧 PRODUCTION: Use strict validation for sending
                // GUARD: PSID/Page mismatch — if conversation metadata contains pageId and it's different from selected page
                if (conversation.metadata) {
                  try {
                    const metadata = JSON.parse(conversation.metadata);
                    if (metadata.pageId && (metadata.pageId !== (actualPageId || facebookPage.pageId))) {
                      console.warn(`⚠️ [GUARD] PSID/Page mismatch (reply): metadata.pageId=${metadata.pageId} actualPageId=${actualPageId || facebookPage.pageId}`);
                      facebookSent = false;
                      facebookErrorDetails = {
                        success: false,
                        error: 'PSID_PAGE_MISMATCH',
                        message: 'PSID لا يخص هذه الصفحة. استخدم نفس الصفحة التي استقبلت رسالة العميل.'
                      };
                      throw new Error('PSID_PAGE_MISMATCH');
                    }
                  } catch (_) { }
                }
                const textResponse = await sendProductionFacebookMessage(
                  facebookUserId,
                  message,
                  'TEXT',
                  actualPageId || facebookPage.pageId,
                  facebookPage.pageAccessToken
                );

                facebookSent = textResponse.success;
                facebookMessageId = textResponse.messageId;
                facebookErrorDetails = textResponse;

                if (facebookSent) {
                  console.log(`✅ [FACEBOOK-REPLY] تم إرسال الرسالة بنجاح إلى Facebook | Message ID: ${facebookMessageId?.slice(-8) || 'N/A'}`);
                } else {
                  console.error(`❌ [FACEBOOK-REPLY] فشل إرسال الرسالة إلى Facebook: ${textResponse.message || textResponse.error}`);
                }
              }

              // ✅ FIX: إرسال الصور بعد النص
              if (hasImages && facebookSent) {
                console.log(`📤 [FACEBOOK-REPLY] إرسال ${imageUrls.length} صورة إلى Facebook...`);
                for (let i = 0; i < imageUrls.length; i++) {
                  const imageUrl = imageUrls[i];
                  const imageResponse = await sendProductionFacebookMessage(
                    facebookUserId,
                    imageUrl,
                    'IMAGE',
                    actualPageId || facebookPage.pageId,
                    facebookPage.pageAccessToken
                  );

                  if (!imageResponse.success) {
                    facebookSent = false;
                    facebookErrorDetails = imageResponse;
                    console.error(`❌ [FACEBOOK-REPLY] فشل إرسال الصورة ${i + 1}/${imageUrls.length}: ${imageResponse.message || imageResponse.error}`);
                    break;
                  }
                  // استخدام آخر messageId كـ Facebook message ID
                  facebookMessageId = imageResponse.messageId;
                  console.log(`✅ [FACEBOOK-REPLY] تم إرسال الصورة ${i + 1}/${imageUrls.length} بنجاح`);
                }
              }
              //console.log(`📤 [FACEBOOK-REPLY] Facebook message sent: ${facebookSent}`);

              // 🔄 تحديث الرسالة المحفوظة بـ Facebook Message ID
              if (facebookSent && facebookMessageId && savedMessage) {
                try {
                  await getSharedPrismaClient().message.update({
                    where: { id: savedMessage.id },
                    data: {
                      metadata: JSON.stringify({
                        ...JSON.parse(savedMessage.metadata),
                        facebookMessageId: facebookMessageId,
                        sentToFacebook: true
                      })
                    }
                  });
                  console.log(`✅ [FACEBOOK-REPLY] تم تحديث الرسالة ${savedMessage.id.slice(-8)} بـ Facebook ID: ${facebookMessageId.slice(-8)}`);
                } catch (updateError) {
                  console.error('⚠️ [FACEBOOK-REPLY] فشل تحديث الرسالة بـ Facebook ID:', updateError.message);
                }

                // 📊 تسجيل الإحصائيات
                await recordSentMessageStat({
                  companyId: conversation.companyId,
                  facebookPageId: actualPageId,
                  recipientFacebookId: recipientId,
                  recipientCustomerId: conversation.customerId,
                  messageId: facebookMessageId,
                  messageContent: message,
                  messageType: 'TEXT',
                  messageStatus: 'saved',
                  conversationId: id,
                  conversationStatus: 'existed',
                  sentAt: new Date(),
                  savedAt: new Date(),
                  conversationCreatedAt: conversation.createdAt
                });
              }

              // NEW: Handle Facebook errors more gracefully
              if (!facebookSent && facebookErrorDetails && facebookErrorDetails.error === 'RECIPIENT_NOT_AVAILABLE') {
                await getSharedPrismaClient().conversation.update({
                  where: { id },
                  data: {
                    metadata: JSON.stringify({
                      ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                      facebookSendError: 'RECIPIENT_NOT_AVAILABLE',
                      facebookErrorMessage: 'هذا الشخص غير متاح حاليًا. اطلب من العميل إرسال رسالة جديدة أو تأكد أنه لم يحظر الصفحة.',
                      lastFacebookErrorAt: new Date().toISOString(),
                      notMessageable: true,
                      unmessageableReason: 'fb_551_1545041'
                    })
                  }
                });
              }
              // NEW: Handle the specific Facebook error 2018001 more gracefully
              if (!facebookSent && response.error === 'NO_MATCHING_USER') {
                //console.log(`⚠️ [FACEBOOK-REPLY] User hasn't started conversation with page`);

                // Update the conversation to indicate this issue
                await getSharedPrismaClient().conversation.update({
                  where: { id },
                  data: {
                    metadata: JSON.stringify({
                      ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                      facebookSendError: 'USER_NOT_STARTED_CONVERSATION',
                      facebookErrorMessage: 'العميل لم يبدأ محادثة مع الصفحة',
                      lastFacebookErrorAt: new Date().toISOString()
                    })
                  }
                });
              } else if (!facebookSent && facebookErrorDetails) {
                console.error(`❌ [FACEBOOK-REPLY] فشل إرسال الرسالة: ${facebookErrorDetails.message || facebookErrorDetails.error}`);
                if (facebookErrorDetails.solutions) {
                  facebookErrorDetails.solutions.forEach(solution => {
                    console.log(`   - ${solution}`);
                  });
                }
              } else if (facebookSent) {
                console.log(`✅ [FACEBOOK-REPLY] تم إرسال الرسالة بنجاح - سيتم حفظها عند وصول echo`);
              }
            } catch (sendError) {
              console.error(`❌ [FACEBOOK-REPLY] خطأ في إرسال الرسالة:`, sendError);
              facebookSent = false;
              facebookErrorDetails = {
                success: false,
                error: 'FACEBOOK_SEND_ERROR',
                message: sendError.message,
                details: 'حدث خطأ أثناء إرسال الرسالة إلى فيسبوك'
              };
            }
          } else {
            //console.log('⚠️ [FACEBOOK-REPLY] No valid Facebook page or access token found');
            facebookErrorDetails = {
              success: false,
              error: 'NO_FACEBOOK_PAGE',
              message: 'لم يتم العثور على صفحة فيسبوك متصلة',
              details: 'تأكد من ربط الصفحة بشكل صحيح في إعدادات النظام'
            };
          }
        } else {
          //console.log(`🔍 [FACEBOOK-REPLY] Conversation is not from Facebook or customer has no Facebook ID`);
          if (facebookUserId) {
            facebookErrorDetails = {
              success: false,
              error: 'NO_FACEBOOK_ID',
              message: 'العميل ليس لديه معرف فيسبوك',
              details: 'هذا العميل لم يبدأ محادثة عبر فيسبوك'
            };
          }
        }
      } catch (facebookError) {
        console.error('❌ [FACEBOOK-REPLY] Error processing Facebook reply:', facebookError);
        facebookErrorDetails = {
          success: false,
          error: 'FACEBOOK_PROCESSING_ERROR',
          message: facebookError.message,
          details: 'حدث خطأ أثناء معالجة إرسال الرسالة إلى فيسبوك'
        };
        // Don't fail the whole operation if Facebook sending fails
      }

      // ⚡ OPTIMIZATION: لا نرسل Socket event هنا - سيتم إرساله تلقائياً عند استقبال echo من Facebook
      // هذا يمنع ظهور الرسالة مرتين في الفرونت إند
      //console.log(`⏳ [REPLY] Message will appear in frontend when echo is received`);

      // 🔧 FIX: Update conversation (only if message is not empty)
      if (message && message.trim() !== '') {
        await getSharedPrismaClient().conversation.update({
          where: { id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: message.length > 100 ?
              message.substring(0, 100) + '...' : message
          }
        });
      }

      //console.log(`✅ Manual reply sent to Facebook - waiting for echo`);

      res.json({
        success: true,
        data: {
          conversationId: id,
          content: message,
          type: 'TEXT',
          isFromCustomer: false,
          isFacebookReply: true,
          facebookMessageId: facebookMessageId,
          sentAt: new Date()
        },
        message: facebookSent ? 'Reply sent successfully - message will appear when echo is received' : 'Failed to send to Facebook',
        facebookSent: facebookSent,
        facebookError: facebookErrorDetails
      });

    } // End of Facebook specific logic check

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 🖼️ إرسال صورة موجودة من الحافظة مباشرة (بدون upload جديد)
 * POST /conversations/:id/send-existing-image
 */
const sendExistingImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, filename } = req.body;

    if (!imageUrl || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Image URL and filename are required'
      });
    }

    console.log(`🖼️ [SEND-EXISTING-IMAGE] Sending image from gallery: ${filename}`);

    const normalizedImageUrl = normalizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL'
      });
    }

    const availableLocalImageUrl = sanitizeStoredAssetUrl(normalizedImageUrl);
    if (normalizedImageUrl.startsWith('/uploads/') && !availableLocalImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image is no longer available on the server'
      });
    }
    const storedImageUrl = availableLocalImageUrl || normalizedImageUrl;

    const senderId = req.user?.userId || req.user?.id;
    let senderName = 'موظف';

    if (senderId) {
      const user = await getSharedPrismaClient().user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true, email: true }
      });
      if (user) {
        senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف';
      }
    }

    // Create attachment object
    const attachment = {
      url: storedImageUrl,
      name: filename,
      type: 'image',
      mimeType: 'image/jpeg'
    };

    // 💾 حفظ الصورة في قاعدة البيانات
    const savedMessage = await getSharedPrismaClient().message.create({
      data: {
        id: uuidv4(),
        content: storedImageUrl,
        type: 'IMAGE',
        conversationId: id,
        isFromCustomer: false,
        senderId: senderId,
        attachments: JSON.stringify([attachment]),
        metadata: JSON.stringify({
          platform: 'facebook',
          source: 'image_gallery',
          employeeId: senderId,
          employeeName: senderName,
          isFacebookReply: true,
          timestamp: new Date(),
          instantSave: true,
          fileName: filename,
          fromGallery: true
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`💾 [SEND-EXISTING-IMAGE] Message saved: ${savedMessage.id}`);

    // جلب معلومات المحادثة للحصول على companyId و channel
    const conversation = await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.conversation.findUnique({
        where: { id },
        select: { companyId: true, channel: true, customer: true }
      });
    }, 3);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // إرسال الرسالة للـ socket
    const io = socketService.getIO();
    if (io) {
      const socketData = proxySocketMessageData({
        id: savedMessage.id,
        conversationId: savedMessage.conversationId,
        content: savedMessage.content,
        type: 'image',
        isFromCustomer: savedMessage.isFromCustomer,
        timestamp: savedMessage.createdAt,
        metadata: JSON.parse(savedMessage.metadata),
        attachments: savedMessage.attachments,
        isFacebookReply: conversation.channel !== 'TELEGRAM',
        senderId: senderId,
        senderName: senderName,
        lastMessageIsFromCustomer: false,
        lastCustomerMessageIsUnread: false,
        // 🏢 Company Isolation
        companyId: conversation.companyId,
        // 📱 Platform identification for filtering
        platform: conversation.channel ? conversation.channel.toLowerCase() : 'facebook',
        channel: conversation.channel || 'FACEBOOK'
      }, {
        messageId: savedMessage.id
      });

      // ✅ إرسال للشركة فقط - Company Isolation
      io.to(`company_${conversation.companyId}`).emit('new_message', socketData);
      console.log(`⚡ [SEND-EXISTING-IMAGE] Message emitted to company ${conversation.companyId}`);
    }

    // Update conversation last message
    await getSharedPrismaClient().conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: '📷 صورة من الحافظة',
        updatedAt: new Date()
      }
    });

    // محاولة إرسال للـ Facebook (نفس طريقة uploadFile)
    try {
      const conversation = await executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.findUnique({
          where: { id },
          include: { customer: true }
        });
      }, 3);

      const facebookUserId = conversation?.customer?.facebookId;

      if (conversation && conversation.customer && facebookUserId) {
        console.log(`📤 [SEND-EXISTING-IMAGE] Sending to Facebook customer: ${facebookUserId}`);

        // Get Facebook page info - نفس طريقة uploadFile
        let facebookPage = null;
        let actualPageId = null;

        // جرب تجيب الـ page ID من الـ conversation metadata
        if (conversation.metadata) {
          try {
            const metadata = JSON.parse(conversation.metadata);
            if (metadata.pageId) {
              console.log(`🎯 [SEND-EXISTING-IMAGE] Using page ID from conversation metadata: ${metadata.pageId}`);
              const pageTokenData = await getPageToken(metadata.pageId);
              if (pageTokenData) {
                facebookPage = {
                  pageId: metadata.pageId,
                  pageAccessToken: pageTokenData.pageAccessToken,
                  pageName: pageTokenData.pageName,
                  companyId: pageTokenData.companyId
                };
                actualPageId = metadata.pageId;
              }
            }
          } catch (parseError) {
            console.log('⚠️ [SEND-EXISTING-IMAGE] Error parsing conversation metadata:', parseError.message);
          }
        }

        // لو مفيش page، جيب الـ default connected page
        if (!facebookPage) {
          facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
              companyId: conversation.companyId,
              status: 'connected'
            }
          });

          if (facebookPage) {
            actualPageId = facebookPage.pageId;
            console.log(`✅ [SEND-EXISTING-IMAGE] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
          }
        }

        if (facebookPage && facebookPage.pageAccessToken) {
          try {
            console.log(`📤 [SEND-EXISTING-IMAGE] Using production Facebook sending for IMAGE`);

            // 🔧 استخدام sendProductionFacebookMessage (نفس uploadFile)
            const result = await sendProductionFacebookMessage(
              facebookUserId,
              imageUrl,
              'IMAGE',
              actualPageId || facebookPage.pageId,
              facebookPage.pageAccessToken
            );

            if (result.success && result.messageId) {
              await getSharedPrismaClient().message.update({
                where: { id: savedMessage.id },
                data: {
                  metadata: JSON.stringify({
                    ...JSON.parse(savedMessage.metadata),
                    facebookMessageId: result.messageId,
                    sentToFacebook: true
                  })
                }
              });
              console.log(`✅ [SEND-EXISTING-IMAGE] Image sent to Facebook successfully: ${result.messageId}`);

              // 📊 تسجيل الإحصائيات
              await recordSentMessageStat({
                companyId: conversation.companyId,
                facebookPageId: actualPageId,
                recipientFacebookId: facebookUserId,
                recipientCustomerId: conversation.customerId,
                messageId: result.messageId,
                messageContent: storedImageUrl,
                messageType: 'IMAGE',
                messageStatus: 'saved',
                conversationId: id,
                conversationStatus: 'existed',
                sentAt: new Date(),
                savedAt: new Date(),
                conversationCreatedAt: conversation.createdAt
              });
            } else if (result.blocked) {
              console.warn(`🚫 [SEND-EXISTING-IMAGE] Image blocked: ${result.message}`);
            } else {
              console.error(`❌ [SEND-EXISTING-IMAGE] Failed to send image: ${result.message}`);
            }
          } catch (fbError) {
            console.error(`❌ [SEND-EXISTING-IMAGE] Facebook send error:`, fbError.message);
          }
        } else {
          console.warn('⚠️ [SEND-EXISTING-IMAGE] No Facebook page found or missing access token');
        }
      } else {
        console.log('ℹ️ [SEND-EXISTING-IMAGE] Conversation has no Facebook customer ID');
      }
    } catch (facebookError) {
      console.error(`❌ [SEND-EXISTING-IMAGE] Facebook integration error:`, facebookError.message);
    }

    res.json({
      success: true,
      message: 'Image sent successfully',
      data: {
        messageId: savedMessage.id
      }
    });

  } catch (error) {
    console.error('❌ [SEND-EXISTING-IMAGE] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send image'
    });
  }
};

const sendMediaMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const senderId = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID required'
      });
    }

    const conversation = await getSharedPrismaClient().conversation.findFirst({
      where: { id, companyId },
      include: { customer: true }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    const fileType = req.body.type || 'image';
    const caption = req.body.caption || '';
    const fileUrl = req.file.location || req.file.path || `/uploads/${req.file.filename}`;

    let senderName = 'Agent';
    if (senderId) {
      const user = await getSharedPrismaClient().user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true, email: true }
      });
      if (user) {
        senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Agent';
      }
    }

    // Save message to database
    const message = await getSharedPrismaClient().message.create({
      data: {
        id: uuidv4(),
        conversationId: id,
        content: caption || `[${fileType}]`,
        type: fileType.toUpperCase(),
        isFromCustomer: false,
        senderId: senderId,
        metadata: JSON.stringify({
          fileUrl: fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          platform: conversation.channel === 'TELEGRAM' ? 'telegram' : (conversation.channel ? conversation.channel.toLowerCase() : 'facebook'),
          source: 'media_upload'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Send via Telegram if it's a Telegram conversation
    if (conversation.channel === 'TELEGRAM') {
      const result = await telegramBotService.sendReply(id, caption, {
        type: fileType,
        fileUrl: fileUrl
      });
      if (!result.success) {
        console.error('Failed to send via Telegram:', result.error);
      }
    }

    // Update conversation
    await getSharedPrismaClient().conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: caption || `[${fileType}]`,
        isRead: false,
        // 🆕 FIX: Mark as replied (not from customer) so it disappears from "unreplied" tab
        lastMessageIsFromCustomer: false,
        unreadCount: 0
      }
    });

    // Emit socket event
    const io = socketService.getIO();
    if (io) {
      const socketData = proxySocketMessageData({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        type: message.type.toLowerCase(),
        isFromCustomer: message.isFromCustomer,
        timestamp: message.createdAt,
        senderId: senderId,
        senderName: senderName,
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        metadata: JSON.parse(message.metadata),
        companyId: companyId,
        platform: conversation.channel === 'TELEGRAM' ? 'telegram' : (conversation.channel ? conversation.channel.toLowerCase() : 'facebook'),
        channel: conversation.channel || 'FACEBOOK'
      }, {
        messageId: message.id
      });
      io.to(`company_${companyId}`).emit('new_message', socketData);
      console.log(`⚡ [SOCKET] Media message emitted to company ${companyId}`);
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending media message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const sendLocationMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID required'
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const conversation = await getSharedPrismaClient().conversation.findFirst({
      where: { id, companyId },
      include: { customer: true }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const senderId = req.user?.userId || req.user?.id;
    let senderName = 'Agent';
    if (senderId) {
      const user = await getSharedPrismaClient().user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true, email: true }
      });
      if (user) {
        senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Agent';
      }
    }

    // Save message to database
    const savedMessage = await getSharedPrismaClient().message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: id,
        content: `[Location] ${latitude}, ${longitude}`,
        type: 'TEXT',
        isFromCustomer: false,
        senderId: senderId,
        metadata: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          type: 'location',
          platform: conversation.channel === 'TELEGRAM' ? 'telegram' : (conversation.channel ? conversation.channel.toLowerCase() : 'facebook'),
          source: 'location_share'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 📊 تسجيل الإحصائيات
    await recordSentMessageStat({
      companyId: conversation.companyId,
      facebookPageId: conversation.metadata ? JSON.parse(conversation.metadata).pageId : null,
      recipientFacebookId: conversation.customer?.facebookId,
      recipientCustomerId: conversation.customerId,
      messageId: savedMessage.id,
      messageContent: `[Location] ${latitude}, ${longitude}`,
      messageType: 'LOCATION',
      messageStatus: 'saved',
      conversationId: id,
      conversationStatus: 'existed',
      sentAt: new Date(),
      savedAt: new Date(),
      conversationCreatedAt: conversation.createdAt
    });

    // Send via Telegram if it's a Telegram conversation
    if (conversation.channel === 'TELEGRAM') {
      const result = await telegramBotService.sendReply(id, '', {
        type: 'location',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
      if (!result.success) {
        console.error('Failed to send location via Telegram:', result.error);
      }
    }

    // Update conversation
    await getSharedPrismaClient().conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: '[Location]',
        isRead: false,
        // 🆕 FIX: Mark as replied
        lastMessageIsFromCustomer: false,
        unreadCount: 0
      }
    });

    // Emit socket event
    const io = socketService.getIO();
    if (io) {
      const socketData = proxySocketMessageData({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        type: message.type.toLowerCase(),
        isFromCustomer: message.isFromCustomer,
        timestamp: message.createdAt,
        senderId: senderId,
        senderName: senderName,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        metadata: JSON.parse(message.metadata),
        companyId: companyId,
        platform: conversation.channel === 'TELEGRAM' ? 'telegram' : (conversation.channel ? conversation.channel.toLowerCase() : 'facebook'),
        channel: conversation.channel || 'FACEBOOK'
      }, {
        messageId: message.id
      });
      io.to(`company_${companyId}`).emit('new_message', socketData);
      console.log(`⚡ [SOCKET] Location message emitted to company ${companyId}`);
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending location message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


module.exports = {
  postMessageConverstation,
  uploadFile,
  postReply,
  sendExistingImage,
  sendMediaMessage,
  sendLocationMessage
};
