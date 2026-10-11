const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, safeQuery, healthCheck } = require('../services/sharedDatabase');
const socketService = require('../services/socketService');
const { updateConversationLastMessageStatus, resetConversationUnreadCount } = require('../utils/allFunctions');
const { isPermissionError, getPermissionErrorMessage } = require('../utils/dbPermissionHelper');
const { recordSentMessageStat } = require('../utils/statsRecorder');
const {
  shouldStrictlyEnforceFacebookWebhookSignature,
  verifyMetaWebhookSignature
} = require('../utils/webhookSignature');
const { getFacebookAppSecret } = require('../config/facebookAppConfig');
const whatsappMetaWebhookController = require('./whatsappMetaWebhookController');

// ⚠️ CRITICAL: Always use safeQuery() instead of direct prisma calls
// This ensures proper connection management and retry logic
function getPrisma() {
  return getSharedPrismaClient();
}

const parseJsonSafely = (value, fallback = null) => {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

const extractMessageImageUrl = (msg) => {
  if (!msg) return null;
  const attachments = parseJsonSafely(msg.attachments);
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      const url = att?.url || att?.file_url || att?.image_url || att?.image_data?.url || att?.payload?.url || att?.payload?.image_url;
      const type = (att?.type || att?.mime_type || '').toLowerCase();
      if (url && (type.includes('image') || /\.(jpe?g|png|webp|gif|bmp|avif)/i.test(url) || att?.image_data)) {
        return url;
      }
      if (url && (msg.type === 'IMAGE' || msg.type === 'image')) {
        return url;
      }
    }
  }
  if (msg.fileUrl && typeof msg.fileUrl === 'string') {
    const fileUrl = msg.fileUrl.trim();
    if (/\.(jpe?g|png|webp|gif|bmp|avif)/i.test(fileUrl) || msg.type === 'IMAGE' || msg.type === 'image') {
      return fileUrl;
    }
  }
  if (msg.content && typeof msg.content === 'string') {
    const tokenMatch = msg.content.match(/\|IMAGE_URL\|([^\s|]+)/i);
    if (tokenMatch?.[1]) return tokenMatch[1].trim();
    const trimmed = msg.content.trim();
    if (/^(https?:\/\/|\/uploads\/|assets\/|data:|blob:)/i.test(trimmed)) {
      if (/\.(jpe?g|png|webp|gif|bmp|avif)/i.test(trimmed) || msg.type === 'IMAGE' || msg.type === 'image') {
        return trimmed;
      }
    }
  }
  return null;
};

const extractMessageMediaUrl = (msg) => {
  if (!msg) return null;
  const imgUrl = extractMessageImageUrl(msg);
  if (imgUrl) return imgUrl;

  const attachments = parseJsonSafely(msg.attachments);
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      const url = att?.url || att?.file_url || att?.image_url || att?.payload?.url;
      if (url && typeof url === 'string' && url.trim()) return url.trim();
    }
  }
  if (msg.fileUrl && typeof msg.fileUrl === 'string' && msg.fileUrl.trim()) {
    return msg.fileUrl.trim();
  }
  if (msg.content && typeof msg.content === 'string') {
    const tokenMatch = msg.content.match(/\|(?:IMAGE|FILE|VIDEO|AUDIO)_URL\|([^\s|]+)/i);
    if (tokenMatch?.[1]) return tokenMatch[1].trim();
    if (/^(https?:\/\/|\/uploads\/|assets\/)/i.test(msg.content.trim())) {
      return msg.content.trim();
    }
  }
  return null;
};

// Simple in-memory storage for tracking processed messages
const processedMessages = new Map();
const inFlightMessages = new Set(); // 🆕 Track in-flight messages without blocking retries on crash
const processedComments = new Map(); // 🆕 Track processed comments
let lastWebhookPageId = null;

// ⚡ Cache for Facebook pages to avoid repeated database queries
const facebookPagesCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (increased from 5 min for 800+ pages)

// Function to invalidate cached page data when reconnected/updated/disconnected
function invalidateFacebookPageCache(pageId = null) {
  if (pageId) {
    facebookPagesCache.delete(pageId);
    console.log(`🧹 [PAGE-CACHE] Invalidated webhook cache for page: ${pageId}`);
  } else {
    facebookPagesCache.clear();
    console.log('🧹 [PAGE-CACHE] Cleared entire webhook page cache');
  }
}

// Function to get Facebook page with caching
async function getCachedFacebookPage(pageId) {
  const cached = facebookPagesCache.get(pageId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    // Using cached data
    return cached.data;
  }

  // Cache miss - fetching from database
  const pageData = await safeQuery(async () => {
    const prisma = getPrisma();
    return await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });
  }, 2);

  if (pageData && pageData.status === 'connected') {
    //console.log(`✅ [PAGE-CACHE] Using connected page: ${pageData.pageName}`);
  }

  facebookPagesCache.set(pageId, {
    data: pageData,
    timestamp: Date.now()
  });

  return pageData;
}

// دالة للتحقق من صحة محتوى الرسالة
function isValidMessageContent(content) {
  if (!content) return false;
  const trimmed = content.trim();
  // تجاهل الرسائل الفارغة أو التي تحتوي فقط على علامات التوصيل أو مسافات
  if (trimmed.length === 0) return false;
  // تجاهل الرسائل التي تحتوي فقط على علامات ✓✗×
  if (/^[✓✗×\s]+$/.test(trimmed)) return false;
  return true;
}

// Auto-cleanup for processedMessages and cache to prevent memory leak
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;

  // Clean processed messages
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (timestamp < oneHourAgo) {
      processedMessages.delete(messageId);
      cleanedCount++;
    }
  }

  // Clean Facebook pages cache
  let cacheCleanedCount = 0;
  for (const [pageId, cached] of facebookPagesCache.entries()) {
    if ((Date.now() - cached.timestamp) > CACHE_DURATION) {
      facebookPagesCache.delete(pageId);
      cacheCleanedCount++;
    }
  }

  // 🆕 Clean processed comments
  let commentCleanedCount = 0;
  for (const [commentId, timestamp] of processedComments.entries()) {
    if (timestamp < oneHourAgo) {
      processedComments.delete(commentId);
      commentCleanedCount++;
    }
  }

  if (cleanedCount > 0 || cacheCleanedCount > 0 || commentCleanedCount > 0) {
    //console.log(`🧹 [CLEANUP] Messages: ${cleanedCount}, Cache: ${cacheCleanedCount}, Comments: ${commentCleanedCount}`);
  }
}, 30 * 60 * 1000); // Every 30 minutes

const getWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    const { getFacebookOAuthConfig } = require('../config/facebookAppConfig');
    const fbConfig = getFacebookOAuthConfig();
    const validVerifyTokens = new Set(
      [
        process.env.FACEBOOK_VERIFY_TOKEN,
        process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
        fbConfig.facebookWebhookVerifyToken,
        fbConfig.whatsappWebhookVerifyToken,
        '61d94df61ed00ab77e2a7e2c15458d7ce9ec8abc4520a6a83f0b483829617314',
        'simple_chat_verify_token_2025'
      ].filter((t) => typeof t === 'string' && t.trim() !== '')
    );

    if (mode === 'subscribe' && validVerifyTokens.has(token)) {
      console.log('✅ [WEBHOOK] Facebook webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      return whatsappMetaWebhookController.getWebhook(req, res);
    }
  } else {
    console.warn('⚠️ [WEBHOOK] Missing mode or token in verification request');
    return res.sendStatus(400);
  }
};

const postWebhook = async (req, res) => {
  if (req.body?.object === 'whatsapp_business_account') {
    return whatsappMetaWebhookController.postWebhook(req, res);
  }

  const signatureCheck = verifyMetaWebhookSignature(
    req,
    String(getFacebookAppSecret() || '').trim()
  );

  if (!signatureCheck.ok) {
    const statusCode = signatureCheck.reason === 'missing_raw_body' ? 400 : 401;

    if (shouldStrictlyEnforceFacebookWebhookSignature()) {
      console.warn(`🔒 [WEBHOOK] Strict mode enabled - rejecting unsigned webhook (${signatureCheck.reason})`);
      return res.status(statusCode).json({
        success: false,
        error: 'Invalid webhook signature',
        reason: signatureCheck.reason
      });
    }
  }

  const body = req.body;

  res.status(200).send('EVENT_RECEIVED');

  try {
    // console.log("⚠️ [WEBHOOK-DEBUG] Incoming payload:", JSON.stringify(body, null, 2)); // ❌ DEACTIVATED for performance

    // NEW: Skip processing entirely during DB cooldown to avoid log spam and futile retries
    try {
      const db = await healthCheck();
      if (db?.status === 'cooldown') {
        // Database is in cooldown; drop processing silently (response already sent)
        return;
      }
    } catch { /* ignore health check errors */ }

    // Validate request body
    if (!body || !body.entry) {
      //console.log('⚠️ [WEBHOOK] Invalid webhook body received');
      return;
    }

    // Check if webhook contains actual messages
    const hasActualMessages = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.message?.text || msg.message?.attachments)
    );

    // Check if webhook contains feed events (which may include comments)
    const hasFeedEvents = body?.entry?.some(entry =>
      entry.changes?.some(change => change.field === 'feed' && change.value)
    );

    // 🔍 Check for referral BEFORE skipping
    const hasReferralAnywhere = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.referral)
    );

    // 🆕 Check for read receipts (message_reads)
    const hasReadReceipts = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.read?.watermark)
    );

    if (hasReferralAnywhere) {
    }

    // Skip logging for non-message events (delivery, etc.)
    // BUT: Don't skip if there's a referral or read receipts
    if (!hasActualMessages && !hasFeedEvents && !hasReferralAnywhere && !hasReadReceipts) {
      return;
    }

    if (body?.object === 'page') {
      // 🔍 Check if webhook contains referral data before processing
      const hasReferralInBody = body?.entry?.some(entry =>
        entry.messaging?.some(msg => msg.referral)
      );

      if (hasReferralInBody) {
      }

      // Process each entry in the webhook
      for (const entry of body?.entry || []) {
        try {

          // NEW: Check if this page still exists in our database AND is connected
          // If not, ignore the webhook event to prevent processing orphaned events
          // ⚡ Using cache to avoid repeated database queries
          const pageExists = await getCachedFacebookPage(entry.id);

          // 🔒 CRITICAL FIX: Check both existence AND connection status
          if (!pageExists) {
            console.log(`⚠️ [WEBHOOK] Ignoring webhook event from unregistered page: ${entry.id}`);
            continue;
          }

          if (pageExists.status === 'disconnected') {
            //console.log(`⚠️ [WEBHOOK] Ignoring webhook event from DISCONNECTED page: ${pageExists.pageName} (${entry.id})`);
            // console.log(`   This page was disconnected at: ${pageExists.disconnectedAt}`);
            // console.log(`   Please unsubscribe this page from webhooks in Facebook settings`);
            continue;
          }

          // Save Page ID from webhook
          if (entry.id) {
            lastWebhookPageId = entry.id;
          }

          // Process messaging events (existing code)
          if (entry.messaging && entry.messaging.length > 0) {
            try {
              // ⚡ Group messages by senderId for FIFO sequence integrity per customer
              // This guarantees message 1 completes before message 2 starts for the same user,
              // preventing duplicate conversation creation and flipped timestamp ordering.
              const messagesBySender = new Map();
              for (const webhookEvent of entry.messaging) {
                const senderKey = webhookEvent.sender?.id || 'unknown';
                if (!messagesBySender.has(senderKey)) {
                  messagesBySender.set(senderKey, []);
                }
                messagesBySender.get(senderKey).push(webhookEvent);
              }

              const senderPromises = Array.from(messagesBySender.values()).map(async (senderEvents) => {
                for (const webhookEvent of senderEvents) {
                  try {
                    // 🆕 Handle read receipts (message_reads)
                    if (webhookEvent.read?.watermark) {
                      await handleReadReceipt(webhookEvent, entry.id);
                      continue;
                    }

                    // Check if this is an echo message (sent from the page itself)
                    const isEchoMessage = webhookEvent.message?.is_echo === true;
                    const senderId = webhookEvent.sender?.id;
                    const receivingPageId = entry.id;

                    // ✅ Handle echo messages (replies from page)
                    if (isEchoMessage) {
                      await handlePageReply(webhookEvent, receivingPageId);
                      continue;
                    }

                    // 🆕 Extract postId from referral (fast - no API calls)
                    if (webhookEvent.referral) {
                      let postId = null;
                      if (webhookEvent.referral.ads_context_data?.post_id) {
                        postId = webhookEvent.referral.ads_context_data.post_id;
                      } else if (webhookEvent.referral.post_id) {
                        postId = webhookEvent.referral.post_id;
                      } else if (webhookEvent.referral.post_ref) {
                        postId = webhookEvent.referral.post_ref;
                      } else if (webhookEvent.referral.ad_ref) {
                        postId = webhookEvent.referral.ad_ref;
                      } else if (webhookEvent.referral.ad_id) {
                        postId = webhookEvent.referral.ad_id;
                      }

                      if (postId) {
                        webhookEvent._extractedPostId = postId;
                      }
                    }

                    // Handle postback events (button clicks, persistent menu, etc.)
                    if (webhookEvent.postback) {
                      const payload = webhookEvent.postback?.payload;
                      if (payload && typeof payload === 'string') {
                        webhookEvent._isPostback = true;
                        webhookEvent._postbackPayload = payload;
                        webhookEvent.message = {
                          text: payload,
                          mid: `postback_${webhookEvent.timestamp || Date.now()}_${senderId}`,
                        };
                      } else {
                        continue;
                      }
                    }

                    // Deduplication check
                    const messageId = webhookEvent.message?.mid;
                    if (messageId) {
                      if (processedMessages.has(messageId) || inFlightMessages.has(messageId)) {
                        continue;
                      }
                      inFlightMessages.add(messageId);
                    }

                    try {
                      await handleMessage(webhookEvent, receivingPageId);
                      if (messageId) {
                        processedMessages.set(messageId, Date.now());
                      }
                    } finally {
                      if (messageId) {
                        inFlightMessages.delete(messageId);
                      }
                    }
                  } catch (msgError) {
                    console.error('❌ [WEBHOOK] Error processing message event:', msgError.message);
                  }
                }
              });

              // ⚡ RUN IN BACKGROUND: We do NOT await this in the main handler to avoid Facebook timeouts (5s limit)
              // The 200 OK has already been sent, so we can process without blocking the connection
              Promise.all(senderPromises).catch(err => {
                console.error('❌ [WEBHOOK] Background processing failed:', err.message);
              });
            } catch (messagingError) {
              console.error('❌ [WEBHOOK] Messaging grouping error:', messagingError.message);
            }
          }

          // Process feed events (NEW CODE - includes comments, posts, etc.)
          if (entry.changes && entry.changes.length > 0) {
            try {
              for (const change of entry.changes) {
                try {
                  if (change.field === 'feed' && change.value) {
                    // Check if this is a comment event
                    if (change.value.item === 'comment') {
                      // NEW: Check if this comment is from our own page (our bot's reply)
                      if (isCommentFromOurPage(change.value, entry.id)) {
                        //console.log(`🤖 [COMMENT] Ignoring comment from our own page: ${change.value.comment_id}`);
                        continue;
                      }

                      await handleComment(change.value, entry.id);
                    }
                    // We can add more feed event types here in the future
                  }
                } catch (changeError) {
                  // Continue to next change instead of crashing
                }
              }
            } catch (feedError) {
              // Continue to next entry instead of crashing
            }
          }
        } catch (entryError) {
          // Continue to next entry instead of crashing
        }
      }
    }

    // 📸 Handle Instagram DM webhooks (object === 'instagram')
    if (body?.object === 'instagram') {
      for (const entry of body?.entry || []) {
        try {
          const igAccountId = entry.id;

          // Find the FacebookPage that has this Instagram account linked
          const facebookPage = await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.facebookPage.findFirst({
              where: {
                instagramAccountId: igAccountId,
                status: 'connected',
              },
            });
          }, 2);

          if (!facebookPage) {
            console.log(`⚠️ [IG-WEBHOOK] No connected page found for Instagram account: ${igAccountId}`);
            continue;
          }

          if (entry.messaging && entry.messaging.length > 0) {
            const messagePromises = entry.messaging.map(async (webhookEvent) => {
              try {
                const isEcho = webhookEvent.message?.is_echo === true;
                if (isEcho) return; // skip echo for now

                const messageId = webhookEvent.message?.mid;
                if (messageId) {
                  if (processedMessages.has(messageId)) return;
                  processedMessages.set(messageId, Date.now());
                }

                if (webhookEvent.message) {
                  const { handleInstagramMessage } = require('../utils/allFunctions');
                  await handleInstagramMessage(webhookEvent, facebookPage);
                }
              } catch (msgError) {
                console.error('❌ [IG-WEBHOOK] Error processing Instagram message:', msgError.message);
              }
            });

            Promise.all(messagePromises).catch(err => {
              console.error('❌ [IG-WEBHOOK] Background processing failed:', err.message);
            });
          }
        } catch (entryError) {
          console.error('❌ [IG-WEBHOOK] Entry error:', entryError.message);
        }
      }
    }
  } catch (error) {
    // Already sent response to Facebook, so just log and continue
  }
}

// NEW: Function to handle Facebook page replies (echo messages)
async function handlePageReply(webhookEvent, pageId = null) {
  try {
    const messageId = webhookEvent.message?.mid;
    if (!messageId) {
      return;
    }

    const messageText = webhookEvent.message?.text || '';
    const hasAttachments = webhookEvent.message?.attachments && webhookEvent.message.attachments.length > 0;

    // 🤖 Identify if this echo belongs to our system or AI agent
    const {
      isSystemSentFacebookMessage,
      isAiSentFacebookMessage,
      isRecentAiSentImageUrl
    } = require('../utils/facebookMessageTracker');
    const isAiMessage = isAiSentFacebookMessage(messageId);
    const isSystemMessage = isSystemSentFacebookMessage(messageId);

    // ⚡ CRITICAL: Check if this echo message was already processed
    if (processedMessages.has(messageId)) {
      return;
    }

    // Mark as processed immediately to prevent duplicates
    processedMessages.set(messageId, Date.now());

    // Better extraction of recipient ID from echo messages
    // For echo messages, the recipient is actually the customer who receives the message
    const recipientId = webhookEvent.recipient?.id; // Customer who received the message
    const pageSenderId = webhookEvent.sender.id; // Page that sent the message

    // Processing page reply (already logged in postWebhook)

    // Validate that we have a recipient ID
    if (!recipientId) {
      //console.log(`⚠️ [PAGE-REPLY] No recipient ID found in webhook event`);
      return;
    }

    // ⚡ Get companyId from the Facebook page first - استخدام Cache
    // نحتاجه مبكراً لإرسال instant_echo للشركة الصحيحة
    const facebookPage = await getCachedFacebookPage(pageId);

    // ⚡ ULTRA-FAST ECHO: إرسال Socket event فوراً بعد جلب companyId
    // هذا يسمح للفرونت إند بعرض الرسالة فوراً بينما نحن نحفظها في الخلفية
    if (facebookPage && facebookPage.companyId) {
      try {
        const io = socketService.getIO();
        if (io) {
          // نرسل الرسالة مباشرة لمستخدمي الشركة فقط
          const instantEcho = {
            type: 'instant_echo',
            messageId: messageId,
            recipientId: recipientId,
            pageSenderId: pageSenderId,
            content: messageText || '📎 مرفق',
            timestamp: new Date(webhookEvent.timestamp),
            hasAttachments: hasAttachments,
            attachments: hasAttachments ? webhookEvent.message.attachments : null,
            isFromCustomer: false,
            // معلومات أولية - هيتم تحديثها لاحقاً
            isPending: true,
            needsConfirmation: true,
            // 🏢 Company Isolation
            companyId: facebookPage.companyId
          };

          // ✅ إرسال للشركة فقط - Company Isolation
          io.to(`company_${facebookPage.companyId}`).emit('instant_echo', instantEcho);
          //console.log(`⚡ [INSTANT-ECHO] Sent to company ${facebookPage.companyId}: ${messageId.slice(-8)}`);
        }
      } catch (instantError) {
        //console.error(`❌ [INSTANT-ECHO] Failed:`, instantError.message);
      }
    }

    // ⚡ Step 2 disabled for performance (manual message check)

    if (!facebookPage || !facebookPage.companyId) {
      return;
    }

    // Find the customer who received this message with BOTH facebookId AND companyId
    let customer = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.customer.findUnique({
        where: {
          facebookId_companyId: {
            facebookId: recipientId,
            companyId: facebookPage.companyId
          }
        }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    if (!customer) {
      //console.log(`⚠️ [PAGE-REPLY] Customer not found for Facebook ID: ${recipientId}`);
      // console.log(`🚫 [PAGE-REPLY] Skipping echo message - customer should exist from previous conversation`);

      // 📊 [STATS-RECORDER] Record as ignored
      await recordSentMessageStat({
        companyId: facebookPage.companyId,
        facebookPageId: pageId,
        recipientFacebookId: recipientId,
        recipientCustomerId: null,
        messageId: messageId,
        messageContent: messageText || '📎 attachment',
        messageType: hasAttachments ? 'IMAGE' : 'TEXT',
        messageStatus: 'ignored',
        ignoredReason: 'Customer not found locally',
        conversationId: null,
        conversationStatus: null,
        sentAt: new Date(webhookEvent.timestamp)
      }).catch(err => console.error('⚠️ [PAGE-REPLY-IGNORED] Error:', err.message));

      return;
    }

    // Customer found

    // Find existing conversation for this customer
    let conversation = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          status: { in: ['ACTIVE', 'RESOLVED'] }
        },
        orderBy: { lastMessageAt: 'desc' }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    // If no conversation exists, create one
    if (!conversation) {
      // Creating new conversation
      // Create a user-friendly preview for new conversation
      let initialPreview = messageText;
      if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
        const attachment = webhookEvent.message.attachments[0];
        const attachmentType = attachment.type.toUpperCase();
        if (attachmentType === 'TEMPLATE') {
          initialPreview = '📋 رسالة منتج';
        } else if (attachmentType === 'IMAGE') {
          initialPreview = '📷 صورة';
        } else if (attachmentType === 'VIDEO') {
          initialPreview = '🎥 فيديو';
        } else if (attachmentType === 'FILE') {
          initialPreview = '📎 ملف';
        } else if (attachmentType === 'AUDIO') {
          initialPreview = '🎵 صوت';
        } else {
          initialPreview = `[${attachmentType}]`;
        }
      } else if (initialPreview && initialPreview.length > 100) {
        initialPreview = initialPreview.substring(0, 100) + '...';
      }

      conversation = await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.conversation.create({
          data: {
            customerId: customer.id,
            companyId: customer.companyId,
            channel: 'FACEBOOK',
            status: 'ACTIVE',
            lastMessageAt: new Date(webhookEvent.timestamp),
            lastMessagePreview: initialPreview
          }
        });
      }, 3);

      // Conversation created
    }

    // التحقق من صحة محتوى الرسالة قبل الحفظ
    // ✅ السماح بالرسائل التي تحتوي على attachments حتى بدون نص
    // ❌ رفض فقط الرسائل التي لا تحتوي على نص ولا attachments
    if (!isValidMessageContent(messageText) && !hasAttachments) {
      // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
      // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات
      return; // Exit function without saving
    }

    // تحديد نوع الرسالة بناءً على المحتوى (يجب تحديده قبل فحص existingMessage)
    let messageType = 'TEXT';
    let messageContent = messageText;

    // إذا كانت الرسالة تحتوي على attachments فقط بدون نص
    if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
      const attachment = webhookEvent.message.attachments[0];
      const attachmentType = attachment.type.toLowerCase();

      if (attachmentType === 'image') {
        messageType = 'IMAGE';
        messageContent = attachment.payload?.url || '[صورة]';
      } else if (attachmentType === 'video') {
        messageType = 'VIDEO';
        messageContent = attachment.payload?.url || '[فيديو]';
      } else if (attachmentType === 'audio') {
        messageType = 'AUDIO';
        messageContent = attachment.payload?.url || '[صوت]';
      } else if (attachmentType === 'file') {
        messageType = 'FILE';
        messageContent = attachment.payload?.url || '[ملف]';
      } else if (attachmentType === 'template') {
        // معالجة الرسائل التي تحتوي على أزرار (template)
        messageType = 'TEMPLATE';
        const template = attachment.payload;

        // استخراج المحتوى من template
        if (template?.template_type === 'generic' && template?.elements && template.elements.length > 0) {
          const element = template.elements[0];
          // استخدام عنوان العنصر أو النص كمحتوى
          messageContent = element.title || element.subtitle || element.image_url ||
            (element.buttons && element.buttons[0]?.url) ||
            '[رسالة منتج]';
        } else if (template?.template_type === 'button') {
          // رسالة مع أزرار فقط
          messageContent = template.text || '[رسالة مع أزرار]';
        } else {
          messageContent = '[رسالة template]';
        }
      } else if (attachmentType === 'fallback') {
        // بعض الرسائل تأتي كـ fallback
        messageType = 'FILE';
        messageContent = attachment.payload?.url || attachment.url || '[مرفق]';
      } else {
        // أي نوع آخر غير معروف
        messageType = attachment.type.toUpperCase();
        messageContent = attachment.payload?.url || `[${attachment.type}]`;
      }

      // إذا كان هناك أكثر من مرفق، نسجل ذلك
      if (webhookEvent.message.attachments.length > 1) {
      }
    }

    // 🆕 FIX: قراءة معرف المرسل (الموظف) من conversation metadata
    let senderUserId = null; // معرف الموظف (User.id)
    let senderUserName = null; // اسم الموظف

    //console.log(`🔍 [ECHO-DEBUG] Conversation metadata exists: ${!!conversation.metadata}`);

    try {
      if (conversation.metadata) {
        let convMetadata = {};
        try {
          convMetadata = JSON.parse(conversation.metadata);
          // console.log(`📝 [ECHO-DEBUG] Parsed conversation metadata:`, JSON.stringify(convMetadata));
        } catch (parseError) {
          convMetadata = {};
        }

        if (convMetadata.lastSenderId) {
          senderUserId = convMetadata.lastSenderId;
          senderUserName = convMetadata.lastSenderName || 'موظف';
          // console.log(`👤 [ECHO-SENDER] Using sender from metadata: ${senderUserName} (${senderUserId})`);
        } else {
          // console.warn(`⚠️ [ECHO-SENDER] No lastSenderId found in conversation metadata`);
        }
      } else {
        // console.warn(`⚠️ [ECHO-SENDER] No metadata found in conversation`);
      }
    } catch (e) {
    }

    // 🆕 Fallback: If no lastSenderId was in metadata, attribute to conversation's assigned user
    if (!senderUserId && conversation.assignedUserId) {
      senderUserId = conversation.assignedUserId;
      try {
        const assignedUser = await safeQuery(async () => {
          const prisma = getPrisma();
          return await prisma.user.findUnique({
            where: { id: senderUserId },
            select: { firstName: true, lastName: true, email: true }
          });
        }, 2);
        if (assignedUser) {
          senderUserName = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email || 'موظف';
        }
      } catch (uErr) {
        // silent fallback
      }
    }

    // 📊 تحديد نوع الرسالة والمحتوى قبل فحص existingMessage (يستخدم في حالة existingMessage)
    let statMessageType = messageType;
    let statMessageContent = messageContent;

    // 🔍 CRITICAL: Check if message already exists (instant save or broadcast)
    const candidateExistingMessages = await safeQuery(async () => {
      const prisma = getPrisma();
      const trimmedText = (messageText || '').trim();
      const contentFilter = hasAttachments
        ? (trimmedText ? { contains: trimmedText } : messageContent)
        : messageText;

      return await prisma.message.findMany({
        where: {
          conversationId: conversation.id,
          OR: [
            {
              metadata: {
                contains: messageId // Check if facebookMessageId exists in metadata
              }
            },
            ...(contentFilter
              ? [
                  {
                    // Check if this is an instant-saved message matching content and timestamp
                    isFromCustomer: false,
                    content: contentFilter,
                    type: hasAttachments ? webhookEvent.message.attachments[0].type.toUpperCase() : 'TEXT',
                    createdAt: {
                      // Match messages within 10 seconds
                      gte: new Date(webhookEvent.timestamp - 10000),
                      lte: new Date(webhookEvent.timestamp + 10000)
                    }
                  }
                ]
              : [])
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }, 3);

    const existingMessage = (candidateExistingMessages || []).find(msg => {
      try {
        const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata || '{}') : (msg.metadata || {});
        if (meta.facebookMessageId) {
          return meta.facebookMessageId === messageId;
        }
        return true;
      } catch (e) {
        return true;
      }
    });

    if (existingMessage) {

      // تحديث الرسالة الموجودة بـ Facebook Message ID إذا لم يكن موجود
      try {
        const existingMetadata = JSON.parse(existingMessage.metadata || '{}');
        if (!existingMetadata.facebookMessageId) {
          await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.message.update({
              where: { id: existingMessage.id },
              data: {
                metadata: JSON.stringify({
                  ...existingMetadata,
                  facebookMessageId: messageId,
                  echoReceived: true,
                  echoTimestamp: new Date(webhookEvent.timestamp)
                })
              }
            });
          }, 3);
        }
      } catch (updateError) {
      }

      // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
      // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات

      // 📊 [STATS-RECORDER] سجل الإحصائيات إذا كانت الرسالة موجودة بالفعل (Instant Save)
      await recordSentMessageStat({
        companyId: facebookPage.companyId,
        facebookPageId: pageId,
        recipientFacebookId: recipientId,
        recipientCustomerId: customer.id,
        messageId: messageId,
        messageContent: statMessageContent,
        messageType: statMessageType,
        messageStatus: 'saved',
        conversationId: conversation.id,
        conversationStatus: 'existed',
        sentAt: new Date(webhookEvent.timestamp)
      }).catch(err => console.warn('⚠️ [ECHO-STATS] Error:', err.message));

      return; // Exit early to prevent duplicate
    }

    // Resolve reply_to reference if present (customer replied to a specific message)
    const replyToMid = webhookEvent.message?.reply_to?.mid;
    let replyMeta = {};
    if (replyToMid) {
      try {
        const parentMsg = await safeQuery(async () => {
          const prisma = getPrisma();
          return await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              metadata: { contains: replyToMid }
            },
            orderBy: { createdAt: 'desc' }
          });
        }, 3);
        if (parentMsg) {
          const snippet = parentMsg.type === 'IMAGE' ? '📷 صورة' : parentMsg.type === 'FILE' ? '📎 ملف' : (parentMsg.content || '').substring(0, 80);
          let parentSenderName = 'موظف';
          if (parentMsg.isFromCustomer) {
            parentSenderName = `${customer.firstName} ${customer.lastName}`.trim();
          } else {
            try {
              const parentMetadata = typeof parentMsg.metadata === 'string' ? JSON.parse(parentMsg.metadata) : (parentMsg.metadata || {});
              parentSenderName = parentMetadata.employeeName || parentMetadata.senderName || 'موظف';
            } catch (e) {
              parentSenderName = 'موظف';
            }
          }
          const parentImageUrl = extractMessageImageUrl(parentMsg);
          const parentMediaUrl = parentImageUrl || extractMessageMediaUrl(parentMsg);
          replyMeta = {
            replyToResolvedMessageId: parentMsg.id,
            replyToContentSnippet: snippet,
            replyToSenderIsCustomer: !!parentMsg.isFromCustomer,
            replyToType: parentMsg.type,
            replyTo: {
              messageId: parentMsg.id,
              senderName: parentSenderName,
              type: (parentMsg.type || 'text').toLowerCase(),
              content: snippet,
              ...(parentImageUrl ? { imageUrl: parentImageUrl } : {}),
              ...(parentMediaUrl ? { mediaUrl: parentMediaUrl } : {})
            }
          };
        }
      } catch (e) {
        // ignore errors
      }
    }

    // Save the page reply as a message in the existing conversation
    const pageReplyMessage = await safeQuery(async () => {
      const prisma = getPrisma();

      // ✅ FIX: Check if message already exists
      // We look for a message in this conversation with the same content and recent timestamp
      // OR matching metadata if possible.
      // Some page replies are saved before Meta echoes them back, so deduplicate by content/time.

      // Dedup logic: Find message from PAGE (senderId=employeeId/pageId) with same content created in last 60 seconds
      // ⚡ Wide window (60s) to handle slow webhooks or clock skew
      const recentMessages = await prisma.message.findMany({
        where: {
          conversationId: conversation.id,
          isFromCustomer: false,
          createdAt: { gt: new Date(Date.now() - 60000) }
        },
        orderBy: { createdAt: 'desc' }
      });

      const cleanNew = (messageContent || '').trim();
      const matchedMessage = recentMessages.find(m => {
        try {
          const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata || '{}') : (m.metadata || {});
          if (meta.facebookMessageId && meta.facebookMessageId === messageId) {
            return true;
          }
          if (meta.facebookMessageId && meta.facebookMessageId !== messageId) {
            return false;
          }
        } catch (e) {
          // ignore parse error
        }
        const cleanOld = (m.content || '').trim();
        return cleanOld === cleanNew || (cleanOld.length > 10 && cleanNew.includes(cleanOld));
      });

      if (matchedMessage) {
        console.log(`♻️ [WEBHOOK] Duplicate Echo detected. Updating Msg ID ${matchedMessage.id}`);
        // Update the existing message with FB Message ID and confirm delivery
        return await prisma.message.update({
          where: { id: matchedMessage.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(matchedMessage.metadata || '{}'),
              facebookMessageId: messageId, // Update info
              echoConfirmed: true
            }),
            // Ensure it's marked as from page (should be already)
          }
        });
      }

      // Determine if this echo is an AI message
      const isAiEcho = isAiMessage ||
        isRecentAiSentImageUrl(messageContent) ||
        (hasAttachments && webhookEvent.message?.attachments?.some(a => a.payload?.url && isRecentAiSentImageUrl(a.payload.url)));
      const echoSource = isAiEcho ? 'ai_reply' : 'page_reply';
      const resolvedSenderId = isAiEcho ? null : senderUserId;
      const resolvedSenderName = isAiEcho ? 'الذكاء الاصطناعي' : senderUserName;

      // If not found, create new (Standard behavior for manual replies or business suite)
      return await prisma.message.create({
        data: {
          id: uuidv4(),
          content: messageContent,
          type: messageType,
          conversationId: conversation.id,
          isFromCustomer: false, // This is from the page, not the customer
          senderId: resolvedSenderId, // 🆕 FIX: حفظ معرف الموظف الذي أرسل الرسالة
          attachments: hasAttachments ? JSON.stringify(webhookEvent.message.attachments) : null,
          metadata: JSON.stringify({
            platform: 'facebook',
            source: echoSource,
            senderId: pageSenderId, // Facebook page ID
            employeeId: resolvedSenderId, // 🆕 معرف الموظف
            employeeName: resolvedSenderName, // 🆕 اسم الموظف
            recipientId: recipientId,
            isFacebookReply: true, // Mark as Facebook page reply
            facebookMessageId: messageId, // Store the Facebook message ID
            replyToFacebookMessageId: replyToMid,
            hasAttachments: hasAttachments,
            timestamp: new Date(webhookEvent.timestamp),
            ...replyMeta
          }),
          createdAt: new Date(webhookEvent.timestamp),
          updatedAt: new Date(webhookEvent.timestamp) // ✅ FIX: Add required updatedAt field
        }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
    // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات

    // 📊 [STATS-RECORDER] سجل الإحصائيات للرسائل المرسلة من خارج التطبيق (Echo)
    await recordSentMessageStat({
      companyId: facebookPage.companyId,
      facebookPageId: pageId,
      recipientFacebookId: recipientId,
      recipientCustomerId: customer.id,
      messageId: messageId,
      messageContent: messageContent,
      messageType: messageType,
      messageStatus: 'saved',
      conversationId: conversation.id,
      conversationStatus: 'existed',
      sentAt: new Date(webhookEvent.timestamp)
    }).catch(err => console.warn('⚠️ [ECHO-EXTERNAL-STATS] Error:', err.message));

    // 🆕 Update lastMessageIsFromCustomer (this is a page reply, so false)
    await updateConversationLastMessageStatus(conversation.id, false);

    // 🛡️ Human Handover Protocol: Automatically pause AI agent ONLY when real human staff replies
    // NEVER pause AI when:
    // 1. The message was sent by AI (recorded in facebookMessageTracker)
    // 2. The message was sent by our system via Send API (matches our app_id or system tracker)
    // 3. The message metadata indicates source: 'ai_reply'
    // 4. The message contains an image URL recently sent by our AI
    const isAiReply = isAiMessage ||
      isRecentAiSentImageUrl(messageContent) ||
      (hasAttachments && webhookEvent.message?.attachments?.some(a => a.payload?.url && isRecentAiSentImageUrl(a.payload.url))) ||
      (pageReplyMessage?.metadata && (
        typeof pageReplyMessage.metadata === 'string' ? pageReplyMessage.metadata.includes('"source":"ai_reply"') : pageReplyMessage.metadata?.source === 'ai_reply'
      ));

    const { DEFAULT_FACEBOOK_APP_ID } = require('../config/facebookAppConfig');
    const webhookAppId = webhookEvent.message?.app_id ? String(webhookEvent.message.app_id) : null;
    const isOurAppEcho = !!(webhookAppId && (webhookAppId === DEFAULT_FACEBOOK_APP_ID || webhookAppId === process.env.FACEBOOK_APP_ID));

    if (isAiReply || isSystemMessage || isOurAppEcho) {
      console.log(`🤖 [HUMAN-HANDOVER] Skipped handover pause for msg ${messageId}: sent by AI/System (isAi=${isAiReply}, isSystem=${isSystemMessage}, isOurApp=${isOurAppEcho})`);
    } else {
      try {
        let convMetadata = {};
        try {
          if (conversation.metadata) {
            convMetadata = JSON.parse(conversation.metadata);
          }
        } catch (parseError) {
          convMetadata = {};
        }

        if (senderUserId) {
          delete convMetadata.lastSenderId;
          delete convMetadata.lastSenderName;
        }

        // Auto-pause AI agent for 2 hours on real staff handover
        const pauseDurationHours = 2;
        convMetadata.aiPausedUntil = new Date(Date.now() + pauseDurationHours * 60 * 60 * 1000).toISOString();
        convMetadata.lastHumanReplyAt = new Date().toISOString();
        convMetadata.lastHumanSenderName = senderUserName || 'موظف الصفحة';

        await safeQuery(async () => {
          const prisma = getPrisma();
          return await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              aiEnabled: false,
              metadata: JSON.stringify(convMetadata)
            }
          });
        }, 3);
        console.log(`🛡️ [HUMAN-HANDOVER] AI agent paused for ${pauseDurationHours}h on conversation ${conversation.id} due to staff reply`);

        if (facebookPage?.companyId) {
          const io = socketService.getIO();
          if (io) {
            io.to(`company_${facebookPage.companyId}`).emit('conversation:ai_status_changed', {
              conversationId: conversation.id,
              channel: 'FACEBOOK',
              aiEnabled: false,
              aiPausedUntil: convMetadata.aiPausedUntil
            });
          }
        }
      } catch (e) {
        console.warn(`⚠️ [HUMAN-HANDOVER] Failed to update conversation pause metadata:`, e.message);
      }
    }

    // ⚡ Emit confirmation Socket.IO event (الرسالة اتحفظت بنجاح)
    const io = socketService.getIO();
    if (io) {
      try {
        const parsedMetadata = JSON.parse(pageReplyMessage.metadata);
        const socketData = {
          id: pageReplyMessage.id,
          conversationId: pageReplyMessage.conversationId,
          content: pageReplyMessage.content,
          type: pageReplyMessage.type.toLowerCase(),
          isFromCustomer: pageReplyMessage.isFromCustomer,
          timestamp: pageReplyMessage.createdAt,
          metadata: parsedMetadata,
          attachments: pageReplyMessage.attachments, // Keep as string for frontend to parse
          isFacebookReply: true, // Mark as Facebook page reply for frontend
          facebookMessageId: messageId, // Include Facebook message ID
          // 🆕 Add flags for unread tab filtering
          lastMessageIsFromCustomer: pageReplyMessage.isFromCustomer,
          lastCustomerMessageIsUnread: pageReplyMessage.isFromCustomer && !pageReplyMessage.isRead,
          // ✅ Flag للتأكيد - Frontend يستبدل الرسالة المؤقتة بهذه
          isConfirmed: true,
          isPending: false,
          // 🏢 Company Isolation
          companyId: facebookPage.companyId,
          // 📱 Platform identification for filtering
          platform: 'facebook',
          channel: 'FACEBOOK'
        };

        // ✅ إرسال event تأكيد منفصل مع عزل الشركة
        io.to(`company_${facebookPage.companyId}`).emit('echo_confirmed', socketData);
        io.to(`company_${facebookPage.companyId}`).emit('new_message', socketData);
        //console.log(`✅ [ECHO-CONFIRMED] ${messageId.slice(-8)} -> Conv ${conversation.id}`);
      } catch (socketError) {
        // Don't throw - message is already saved
      }
    } else {
      //console.log(`❌ [PAGE-REPLY] Socket.IO not available - message saved but not broadcast`);
    }

    // Update conversation last message
    // Create a user-friendly preview based on message type
    let preview = messageContent;
    if (messageType === 'TEMPLATE') {
      preview = '📋 رسالة منتج';
    } else if (messageType === 'IMAGE') {
      preview = '📷 صورة';
    } else if (messageType === 'VIDEO') {
      preview = '🎥 فيديو';
    } else if (messageType === 'FILE') {
      preview = '📎 ملف';
    } else if (messageType === 'AUDIO') {
      preview = '🎵 صوت';
    } else if (preview && preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }

    // Sanitize preview to prevent hex escape errors
    if (preview) {
      // Remove any problematic characters that could cause hex escape issues
      preview = preview.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
      preview = preview.replace(/\\x[0-9A-Fa-f]{0,1}(?![0-9A-Fa-f])/g, ''); // Remove incomplete hex escapes like \x0 or \x
      preview = preview.replace(/\\x(?![0-9A-Fa-f]{2})/g, ''); // Remove \x not followed by 2 hex digits
      preview = preview.replace(/[\uD800-\uDFFF]/g, ''); // Remove lone surrogates
      preview = preview.replace(/\\/g, '\\\\'); // Escape remaining backslashes
      // Trim and ensure it's a valid string
      preview = preview.trim();
      // Final safety: if still problematic, use a safe fallback
      try {
        JSON.stringify(preview); // Test if it can be serialized
      } catch (e) {
        console.warn('⚠️ [PREVIEW] Failed to serialize preview, using fallback');
        preview = '[رسالة]'; // Safe fallback
      }
    }

    try {
      await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(webhookEvent.timestamp),
            lastMessagePreview: preview || ''
          }
        });
      }, 3);
    } catch (updateError) {
      // Don't throw - this is non-critical, message is already saved
    }

    // Processing completed

  } catch (error) {
  }
}

// NEW: Function to check if a comment is from our own page
function isCommentFromOurPage(commentData, pageId) {
  try {
    // PRIMARY CHECK: If sender ID matches page ID, this is definitely our own comment
    if (commentData.from?.id === pageId) {
      // console.log(`🤖 [COMMENT] Detected our own comment by sender ID match: ${commentData.comment_id}`);
      return true;
    }

    // SECONDARY CHECK: If the comment text matches our standard response
    // We'll check against a more generic pattern since responses can be customized
    if (commentData.message.includes("Thank you for your comment") ||
      commentData.message.includes("We'll get back to you soon")) {
      // console.log(`🤖 [COMMENT] Detected our standard response pattern: ${commentData.comment_id}`);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Simplified message handling function with QUEUE SYSTEM
async function handleMessage(webhookEvent, pageId = null) {
  const startTime = Date.now();
  const messageId = webhookEvent.message?.mid || `msg_${Date.now()}`;
  try {
    const senderId = webhookEvent.sender.id;
    // 🆕 Handle referral events without message object (OPEN_THREAD events)
    const messageText = webhookEvent.message?.text || null;
    const attachments = webhookEvent.message?.attachments || null;
    const hasReferral = !!webhookEvent.referral;

    // Extract the recipient page ID from the webhook event
    const recipientPageId = webhookEvent.recipient?.id || pageId;

    // ⚡ DEBUG: Log immediately with timestamp

    console.log(`📥 [WEBHOOK-RCV] Received message ${messageId} from ${senderId} for page ${recipientPageId}`);

    // ⚡ Get companyId asynchronously (don't block) - use cache first if available
    const cached = facebookPagesCache.get(recipientPageId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      // ⚡ Fast path: Use cached data immediately
      const facebookPage = cached.data;
      if (facebookPage && facebookPage.companyId) {
        const companyId = facebookPage.companyId;

        // 🆕 For referral events without message, process directly (don't queue)
        if (hasReferral && !webhookEvent.message) {
          const { handleFacebookMessage } = require('../utils/allFunctions');
          handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
          });
          return;
        }

        // ⚡ INSTANT PREVIEW: إرسال إشعار فوري للفرونت إند قبل المعالجة
        try {
          const io = socketService.getIO();
          if (io) {
            const instantPreview = {
              type: 'message_preview',
              senderId: senderId,
              content: messageText || (hasReferral ? '📌 جاي من منشور' : '📎 مرفق'),
              timestamp: new Date(),
              companyId: companyId,
              pageId: recipientPageId,
              isProcessing: true
            };
            io.to(`company_${companyId}`).emit('message_preview', instantPreview);
          }
        } catch (previewError) {
          // Ignore preview errors
        }

        const { handleFacebookMessage } = require('../utils/allFunctions');
        handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
        });
        return;
      }
    }

    // ⚡ Slow path: Fetch from database (non-blocking)
    getCachedFacebookPage(recipientPageId).then(async (facebookPage) => {
      if (!facebookPage || !facebookPage.companyId) {
        // Fallback to direct processing
        const { handleFacebookMessage } = require('../utils/allFunctions');
        handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
        });

        // 📊 [STATS-RECORDER] Record as ignored
        console.warn(`⚠️ [WEBHOOK-IGNORE] Page ${recipientPageId} not found in DB for message ${messageId}`);
        recordSentMessageStat({
          companyId: 'UNKNOWN', // We don't have the company ID
          facebookPageId: recipientPageId,
          recipientFacebookId: senderId,
          recipientCustomerId: null,
          messageId: messageId,
          messageContent: messageText || '[attachment]',
          messageType: attachments ? 'IMAGE' : 'TEXT',
          messageStatus: 'ignored',
          ignoredReason: 'Company/Page not found in DB',
          conversationId: null,
          conversationStatus: null,
          sentAt: new Date()
        }).catch(err => console.error('⚠️ [MSG-SLOW-PATH-IGNORED] Error:', err.message));

        return;
      }

      const companyId = facebookPage.companyId;

      // 🆕 For referral events without message, process directly (don't queue)
      if (hasReferral && !webhookEvent.message) {
        const { handleFacebookMessage } = require('../utils/allFunctions');
        // ⚡ CRITICAL: Use setImmediate to process in next tick (non-blocking)
        setImmediate(() => {
          handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
          });
        });
        return;
      }

      // ⚡ INSTANT PREVIEW: إرسال إشعار فوري للفرونت إند قبل المعالجة
      try {
        const io = socketService.getIO();
        if (io) {
          const instantPreview = {
            type: 'message_preview',
            senderId: senderId,
            content: messageText || (hasReferral ? '📌 جاي من منشور' : '📎 مرفق'),
            timestamp: new Date(),
            companyId: companyId,
            pageId: recipientPageId,
            isProcessing: true // علامة أن الرسالة قيد المعالجة
          };

          // إرسال للشركة فقط
          io.to(`company_${companyId}`).emit('message_preview', instantPreview);
          // console.log(`⚡ [INSTANT] Preview sent to company ${companyId}`);
        }
      } catch (previewError) {
        // لا نوقف المعالجة إذا فشل الإرسال الفوري
        // console.warn(`⚠️ [INSTANT] Preview failed:`, previewError.message);
      }

      const { handleFacebookMessage } = require('../utils/allFunctions');
      handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
      });
    }).catch(error => {
      // Fallback to direct processing
      const { handleFacebookMessage } = require('../utils/allFunctions');
      handleFacebookMessage(webhookEvent, recipientPageId).catch(fallbackError => {
      });
    });

  } catch (error) {

    // Fallback to direct processing if queue fails
    try {
      const recipientPageId = webhookEvent.recipient?.id || pageId;
      const { handleFacebookMessage } = require('../utils/allFunctions');
      await handleFacebookMessage(webhookEvent, recipientPageId);
    } catch (fallbackError) {
    }
  }
}

// NEW: Function to handle Facebook comments
async function handleComment(commentData, pageId = null) {
  try {
    // ⚡ Deduplication check
    const commentId = commentData.comment_id;
    if (commentId && processedComments.has(commentId)) {
      // console.log(`🚫 [WEBHOOK] Skipping duplicate comment queuing: ${commentId}`);
      return;
    }
    if (commentId) processedComments.set(commentId, Date.now());

    const data = {
      comment_id: commentData.comment_id,
      commentData,
      pageId
    };

    const { handleFacebookComment } = require('../utils/allFunctions');
    await handleFacebookComment(commentData, pageId);

  } catch (error) {
  }
}

// Simple function to send response to Facebook
async function sendFacebookResponse(recipientId, messageText) {
  try {
    // Implementation would go here
  } catch (error) {
  }
}

// 🆕 Handle read receipts (message_reads) from Facebook
async function handleReadReceipt(webhookEvent, pageId) {
  try {
    const senderId = webhookEvent.sender?.id; // Customer who read the messages
    const watermark = webhookEvent.read?.watermark; // Timestamp of last read message

    if (!senderId || !watermark) {
      return;
    }


    // Get the Facebook page to find companyId
    const facebookPage = await getCachedFacebookPage(pageId);
    if (!facebookPage || !facebookPage.companyId) {
      return;
    }

    // Find the conversation for this customer
    const conversation = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.findFirst({
        where: {
          companyId: facebookPage.companyId,
          customer: {
            facebookId: senderId
          }
        },
        select: { id: true }
      });
    }, 1);

    if (!conversation) {
      return;
    }

    // Update all messages sent before watermark to 'read' status
    let updatedCount = 0;
    try {
      updatedCount = await safeQuery(async () => {
        const prisma = getPrisma();
        const result = await prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            isFromCustomer: false,
            isRead: false, // Only update unread messages
            createdAt: { lte: new Date(watermark) }
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
        return result.count;
      }, 1);
    } catch (updateError) {
      if (isPermissionError(updateError)) {
        // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [DB-PERMISSION] Cannot mark messages as read: ${getPermissionErrorMessage(updateError)}`);
        }
        updatedCount = 0;
      } else {
        throw updateError;
      }
    }

    if (updatedCount > 0) {

      // Emit socket event to update frontend
      const io = socketService.getIO();
      if (io) {
        io.to(`company_${facebookPage.companyId}`).emit('messages_read', {
          conversationId: conversation.id,
          customerId: senderId,
          watermark: watermark,
          readAt: new Date()
        });
      }
    }
  } catch (error) {
  }
}

module.exports = {
  getWebhook,
  postWebhook,
  handleReadReceipt,
  handlePageReply,
  invalidateFacebookPageCache,
};
