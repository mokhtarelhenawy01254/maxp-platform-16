// Enhanced allFunctions.js with Facebook profile fetching
const { getSharedPrismaClient, getSharedPrismaClientAsync, safeQuery } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid'); // ✅ FIX: Add uuid import for message creation
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const { recordSentMessageStat } = require('./statsRecorder');
const { checkNegativeKeywords } = require('./keywordFilter');
const {
  ensureValidFacebookPageAccessToken,
  getFacebookGraphError
} = require('./facebookPageTokenUtils');
const { proxySocketMessageData } = require('./facebookMediaProxy');

// ✅ FIX: Don't create prisma instance at module load time
// Always use getPrisma() inside async functions with async/await
async function getPrisma() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    throw new Error('Failed to get Prisma client');
  }
  return prisma;
}

// ✅ FIX: Helper function that automatically handles prisma in safeQuery
async function safePrismaQuery(operationName, operation) {
  return safeQuery(async (prisma) => {
    // ✅ CRITICAL: Ensure prisma is valid before using
    if (!prisma) {
      throw new Error('Prisma client not available in safeQuery');
    }
    return await operation(prisma);
  }, operationName);
}

// Global variables
const pageTokenCache = new Map();
let lastWebhookPageId = null;
const sentMessagesCache = new Set();
const facebookSentCache = new Set();
const customerProfileCache = new Map(); // Cache for customer profiles

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

// 📊 دالة لتسجيل زيارة البوست (تلقائي)
async function trackPostVisit(postId, companyId) {
  if (!postId || !companyId) {
    return; // لا تسجل إذا لم يكن هناك postId أو companyId
  }

  try {
    await safeQuery(async () => {
      const prisma = getSharedPrismaClient();

      // البحث عن PostTracking موجود
      const existingTracking = await prisma.postTracking.findUnique({
        where: {
          postId_companyId: {
            postId: postId,
            companyId: companyId
          }
        }
      });

      if (existingTracking) {
        // تحديث العداد وتاريخ آخر زيارة
        await prisma.postTracking.update({
          where: {
            postId_companyId: {
              postId: postId,
              companyId: companyId
            }
          },
          data: {
            visitCount: {
              increment: 1
            },
            lastVisitAt: new Date()
          }
        });
        //console.log(`📊 [POST-TRACKING] Updated visit count for post ${postId}: ${existingTracking.visitCount + 1}`);
      } else {
        // إنشاء تسجيل جديد
        await prisma.postTracking.create({
          data: {
            postId: postId,
            companyId: companyId,
            visitCount: 1,
            firstVisitAt: new Date(),
            lastVisitAt: new Date(),
            updatedAt: new Date()
          }
        });
        //console.log(`📊 [POST-TRACKING] Created new tracking for post ${postId}`);
      }
    });
  } catch (error) {
    // لا نرمي الخطأ حتى لا نؤثر على تدفق العملية الرئيسية
    console.error(`❌ [POST-TRACKING] Error tracking post visit:`, error.message);
  }
}

function updatePageTokenCache(pageId, pageAccessToken, pageName, companyId) {
  pageTokenCache.set(pageId, {
    pageAccessToken: pageAccessToken,
    pageName: pageName,
    companyId: companyId,
    lastUsed: Date.now()
  });
  //console.log(`💾 [PAGE-CACHE] Updated cache for page: ${pageName} (${pageId})`);
}

async function getPageToken(pageId) {
  // 🔒 CRITICAL FIX: Always check database for status, even if cached
  // This ensures disconnected pages are not used
  try {
    const page = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.facebookPage.findUnique({
        where: { pageId: pageId }
      });
    });

    // Check if page exists and is connected
    if (!page) {
      console.log(`⚠️ [PAGE-CACHE] Page ${pageId} not found in database`);
      // Remove from cache if exists
      if (pageTokenCache.has(pageId)) {
        pageTokenCache.delete(pageId);
        console.log(`🗑️ [PAGE-CACHE] Removed ${pageId} from cache`);
      }
      return null;
    }

    // 🔒 CRITICAL: Check if page is disconnected
    if (page.status === 'disconnected') {
      console.log(`❌ [PAGE-CACHE] Page ${page.pageName} (${pageId}) is DISCONNECTED - cannot use`);
      console.log(`   Disconnected at: ${page.disconnectedAt}`);
      // Remove from cache if exists
      if (pageTokenCache.has(pageId)) {
        pageTokenCache.delete(pageId);
        console.log(`🗑️ [PAGE-CACHE] Removed disconnected page from cache`);
      }
      return null;
    }

    // Page is connected - update cache and return
    if (page.pageAccessToken) {
      updatePageTokenCache(pageId, page.pageAccessToken, page.pageName, page.companyId);
      //console.log(`✅ [PAGE-CACHE] Using connected page: ${page.pageName}`);
      return {
        pageId: page.pageId,
        pageAccessToken: page.pageAccessToken,
        pageName: page.pageName,
        companyId: page.companyId,
        status: page.status,
        lastUsed: Date.now()
      };
    }
  } catch (error) {
    console.error(`❌ [PAGE-CACHE] Error searching for page ${pageId}:`, error);
  }

  return null;
}

function isPageAuthoredFacebookComment({ senderId, pageId, pageData } = {}) {
  const normalizedSenderId = String(senderId || '').trim();
  const normalizedPageId = String(pageId || pageData?.pageId || '').trim();
  return Boolean(normalizedSenderId && normalizedPageId && normalizedSenderId === normalizedPageId);
}

async function fetchFacebookUserProfileAttempt(userId, pageAccessToken) {
  if (!userId || !pageAccessToken) {
    return {
      profile: null,
      error: {
        code: null,
        message: 'Missing required parameters for Facebook profile fetch'
      }
    };
  }

  if (customerProfileCache.has(userId)) {
    const cached = customerProfileCache.get(userId);
    const ageInMinutes = (Date.now() - cached.timestamp) / (1000 * 60);
    if (ageInMinutes < 60) {
      return {
        profile: cached,
        error: null,
        fromCache: true
      };
    }
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/${getMetaGraphApiVersion()}/${userId}`, {
      params: {
        fields: 'first_name,last_name,profile_pic',
        access_token: pageAccessToken
      },
      timeout: 3000
    });

    const data = response.data;

    if (!data?.first_name) {
      return {
        profile: null,
        error: {
          code: null,
          message: 'Facebook profile response is missing first_name'
        }
      };
    }

    const profileData = {
      ...data,
      timestamp: Date.now()
    };
    customerProfileCache.set(userId, profileData);

    return {
      profile: data,
      error: null,
      fromCache: false
    };
  } catch (error) {
    const graphError = getFacebookGraphError(error);
    console.error(`❌ [PROFILE] Error fetching Facebook profile for ${userId}:`, graphError);
    return {
      profile: null,
      error: graphError,
      fromCache: false
    };
  }
}

// NEW: Function to fetch Facebook user profile
async function fetchFacebookUserProfile(userId, pageAccessTokenOrOptions) {
  try {
    const options = typeof pageAccessTokenOrOptions === 'string'
      ? { pageAccessToken: pageAccessTokenOrOptions }
      : (pageAccessTokenOrOptions || {});

    const {
      pageAccessToken,
      pageId,
      companyId,
      onRecoveredToken
    } = options;

    if (!userId || !pageAccessToken) {
      console.log(`❌ [PROFILE] Missing required parameters - userId: ${!!userId}, token: ${!!pageAccessToken}`);
      return null;
    }

    const attempt = await fetchFacebookUserProfileAttempt(userId, pageAccessToken);
    if (attempt.profile) {
      return attempt.profile;
    }

    const shouldAttemptRecovery = Boolean(
      pageId &&
      companyId &&
      (
        attempt.error?.code === 190 ||
        /impersonating a user's page/i.test(attempt.error?.message || '')
      )
    );

    if (!shouldAttemptRecovery) {
      return null;
    }

    console.warn(`⚠️ [PROFILE] Page token failed for page ${pageId}; attempting token recovery before using fallback customer name`);

    const recovery = await ensureValidFacebookPageAccessToken({
      companyId,
      pageId,
      pageAccessToken,
      allowRefresh: true
    });

    if (!recovery.ok) {
      console.warn(`⚠️ [PROFILE] Token recovery failed for page ${pageId}:`, {
        validation: recovery.validation?.error || recovery.validation?.reason,
        refresh: recovery.refresh?.error || recovery.refresh?.reason
      });
      return null;
    }

    if (typeof onRecoveredToken === 'function') {
      await onRecoveredToken(recovery);
    }

    const retryAttempt = await fetchFacebookUserProfileAttempt(userId, recovery.pageAccessToken);
    return retryAttempt.profile || null;
  } catch (error) {
    console.error(`❌ [PROFILE] Unexpected error while fetching Facebook profile for ${userId}:`, error);
    return null;
  }
}

// Import Facebook validation functions
const {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError,
  sendFacebookSenderAction
} = require('./production-facebook-fix');

// Send message to Facebook Messenger
async function sendFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId = null, replyToMessageId = null) {
  try {
    //console.log(`📤 [FACEBOOK-SEND] Sending message to ${recipientId}`);


    // منع التكرار - فحص إذا كانت الرسالة أُرسلت من قبل
    // استخدام رابط كامل للصور لتجنب اعتبار صور مختلفة كمكررة
    // تضمين replyToMessageId لمنع حجب ردود مختلفة على رسائل مختلفة من نفس العميل
    const contentForHash = messageType === 'IMAGE' ? messageContent : messageContent.substring(0, 50);
    const replyIdPart = replyToMessageId ? `_${replyToMessageId}` : '';
    const messageHash = `${recipientId}_${contentForHash}${replyIdPart}_${Date.now() - (Date.now() % 60000)}`;
    if (facebookSentCache.has(messageHash)) {
      console.log(`⚠️ [FACEBOOK-SEND] Message already sent recently - skipping duplicate: ${messageHash}`);
      return { success: true, message: 'Message already sent recently', wasCached: true };
    }

    // Basic recipient ID validation
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      //console.log('❌ [FACEBOOK-SEND] Invalid recipient ID:', recipientId);
      return {
        success: false,
        error: 'INVALID_RECIPIENT_ID',
        message: 'معرف المستلم غير صحيح'
      };
    }

    // Skip sending for test IDs
    if (recipientId.includes('test-') || recipientId.length < 10) {
      //console.log('⚠️ [FACEBOOK-SEND] Skipping Facebook send for test ID:', recipientId);
      return { success: true, message: 'Test ID - message not sent to Facebook' };
    }

    // Find the appropriate page for sending
    let pageData = null;
    let actualPageId = null;

    // First: Use specified Page ID if available
    if (pageId) {
      pageData = await getPageToken(pageId);
      actualPageId = pageId;
      //console.log(`🎯 [PAGE-SELECT] Using specified page: ${pageId}`);
    }

    // Second: Use last webhook Page ID
    if (!pageData && lastWebhookPageId) {
      pageData = await getPageToken(lastWebhookPageId);
      actualPageId = lastWebhookPageId;
      //console.log(`🔄 [PAGE-SELECT] Using last webhook page: ${lastWebhookPageId}`);
    }

    // Third: Find default page
    if (!pageData) {
      const defaultPage = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.facebookPage.findFirst({
          where: { status: 'connected' },
          orderBy: { connectedAt: 'desc' }
        });
      });

      if (defaultPage) {
        pageData = {
          pageId: defaultPage.pageId,
          pageAccessToken: defaultPage.pageAccessToken,
          pageName: defaultPage.pageName,
          companyId: defaultPage.companyId,
          lastUsed: Date.now()
        };
        actualPageId = defaultPage.pageId;
        updatePageTokenCache(defaultPage.pageId, defaultPage.pageAccessToken, defaultPage.pageName, defaultPage.companyId);
        //console.log(`🔄 [PAGE-SELECT] Using default page: ${defaultPage.pageName}`);
      } else {
        console.error(`❌ [SECURITY] No valid page found`);
        return {
          success: false,
          error: 'NO_VALID_PAGE',
          message: 'لم يتم العثور على صفحة فيسبوك صالحة'
        };
      }
    }

    if (!pageData || !pageData.pageAccessToken) {
      //console.log('⚠️ Facebook Page Access Token not found');
      return { success: false, error: 'No active page found' };
    }

    if (!actualPageId) {
      //console.log('⚠️ Page ID not found');
      return { success: false, error: 'Page ID not found' };
    }

    const PAGE_ACCESS_TOKEN = pageData.pageAccessToken;
    //console.log(`🔑 Using Page Access Token for page: ${pageData.pageName} (${actualPageId})`);

    const result = await sendFacebookMessageViaDeliveryOutbox({
      recipientId,
      messageContent,
      messageType,
      pageId: actualPageId,
      pageAccessToken: PAGE_ACCESS_TOKEN,
      companyId: pageData.companyId,
      messageId: messageHash,
      source: 'send_facebook_message',
      replyToMessageId,
    });

    if (result.success) {
      console.log(`✅ [FACEBOOK-SEND] Message sent successfully: ${result.messageId} (Type: ${messageType})`);

      try {
        const { recordSystemSentFacebookMessage } = require('./facebookMessageTracker');
        if (result.messageId) {
          recordSystemSentFacebookMessage(result.messageId, {
            isAi: false,
            source: 'send_facebook_message'
          });
        }
      } catch (trackErr) {
        // silent
      }

      // إضافة للكاش لمنع التكرار
      facebookSentCache.add(messageHash);
      if (messageType === 'IMAGE') {
        console.log(`📸 [CACHE] Image URL added to cache: ${contentForHash.substring(0, 80)}...`);
      }

      // تنظيف الكاش بعد 5 دقائق
      setTimeout(() => {
        facebookSentCache.delete(messageHash);
      }, 5 * 60 * 1000);

      return result;
    } else {
      console.error(`❌ [FACEBOOK-SEND] Failed to send message: ${result.message}`);
      return result;
    }

  } catch (error) {
    console.error('❌ [FACEBOOK-SEND] Error in Facebook message:', error);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'خطأ في الشبكة أو الاتصال',
      details: error.message
    };
  }
}

async function sendFacebookMessageViaDeliveryOutbox({
  recipientId,
  messageContent,
  messageType = 'TEXT',
  pageId,
  pageAccessToken,
  replyToMessageId = null,
} = {}) {
  return sendProductionFacebookMessage(
    recipientId,
    messageContent,
    messageType,
    pageId,
    pageAccessToken,
    replyToMessageId,
  );
}

// NEW: Function to handle Facebook comments with configured static responses
async function handleFacebookComment(commentData, pageId = null) {
  const prisma = await getPrisma(); // ✅ Get connected instance
  try {
    //console.log(`💬 [COMMENT] Processing Facebook comment: ${commentData.comment_id}`);

    // Extract comment information
    const commentId = commentData.comment_id;
    const postId = commentData.post_id;
    const senderId = commentData.from?.id;
    const senderName = commentData.from?.name;
    const commentText = commentData.message;
    const createdTime = new Date(commentData.created_time * 1000);

    // Validate required data
    if (!commentId || !postId || !senderId || !commentText) {
      //console.log('❌ [COMMENT] Missing required comment data');
      return;
    }

    // Get page access token
    let pageData = null;
    if (pageId) {
      pageData = await getPageToken(pageId);
    }

    if (!pageData && lastWebhookPageId) {
      pageData = await getPageToken(lastWebhookPageId);
    }

    if (!pageData) {
      const defaultPage = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.facebookPage.findFirst({
          where: { status: 'connected' },
          orderBy: { connectedAt: 'desc' }
        });
      }); // ✅ Using prisma from function scope

      if (defaultPage) {
        pageData = {
          pageAccessToken: defaultPage.pageAccessToken,
          pageName: defaultPage.pageName,
          companyId: defaultPage.companyId,
          lastUsed: Date.now()
        };
      }
    }

    // 📊 تسجيل زيارة البوست تلقائياً
    if (postId && pageData && pageData.companyId) {
      trackPostVisit(postId, pageData.companyId).catch(err => {
        console.error('❌ [POST-TRACKING] Failed to track post visit:', err.message);
      });
    }

    if (!pageData || !pageData.pageAccessToken) {
      //console.log('❌ [COMMENT] No valid page data found for comment response');
      return;
    }

    const resolvedPageId = pageId || lastWebhookPageId || pageData.pageId || null;
    if (isPageAuthoredFacebookComment({ senderId, pageId: resolvedPageId, pageData })) {
      console.log(`🤖 [COMMENT] Ignoring page-authored comment ${commentId} from page ${resolvedPageId}`);
      return;
    }

    // Check if this is a new comment (not a reply from our bot)
    const existingComment = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.facebookComment.findUnique({
        where: { commentId: commentId }
      });
    });

    // DEBUG: Log the existing comment check
    //console.log(`🔍 [COMMENT] Checking existing comment ${commentId}:`, existingComment ? 'FOUND' : 'NOT FOUND');

    // NEW: Check if we've already responded to this comment
    if (existingComment && existingComment.response && existingComment.respondedAt) {
      //console.log(`⚠️ [COMMENT] Already responded to comment ${commentId} at ${existingComment.respondedAt}`);
      return;
    }

    // DEBUG: Log why we're processing (or not processing) this comment
    if (existingComment) {
      if (existingComment.response) {
        //console.log(`🔍 [COMMENT] Comment ${commentId} has response but no respondedAt`);
      } else {
        //console.log(`🔍 [COMMENT] Comment ${commentId} has no response yet`);
      }
    } else {
      //console.log(`🔍 [COMMENT] Comment ${commentId} is new`);
    }

    let filterSettings = null;

    // --- AUTOMATED FILTERING (runs before DB save) ---
    try {
      const STATIC_BAD_WORDS = [
        "وحش", "وحشة", "رديء", "رديئة", "سيء", "سيئة", "مقرف", "زفت", "خرا", "زبالة", "نصب", "نصابين", "حرامية", "سرقة", "غالي", "غالية",
        "مبالغ فيه", "مقلب", "مش زي الصورة", "مش حلو", "خامة وحشة", "خامة سيئة", "جودة سيئة", "بايظ", "بايظة", "اتقطع", "اتفك", "باظ بسرعة",
        "اتوسخ بسرعة", "مقاس غلط", "ضيق", "واسع", "مش مظبوط", "مريحش", "مش مريح", "تأخير", "اتأخر", "خدمة سيئة", "خدمة وحشة", "مش بيردوا",
        "تجاهل", "خداع", "كدب", "مضروب", "تقليد", "فاشل", "تجربة سيئة", "مش انصح بيه", "لا انصح", "متشتروش", "وحش جدًا", "مش عاجبني",
        "مش كويس", "خيبة", "فاضي من الجودة", "تعبان", "تعبانة", "شكلها وحش", "شكلها رخيص", "شكلها مش حلو", "خامة تعبانة", "خامة رخيصة",
        "ضعيف", "ضعيفة", "مش عملي", "مش مناسب", "مش نفس المقاس", "المقاس غلط", "المقاس مش مظبوط", "واسع جدًا", "ضيق جدًا", "مبهدل",
        "مبهدلة", "اتخرب", "اتقطعت", "اتفكت", "اتفك بسرعة", "باظت", "باظ بعد يوم", "باظ بعد لبسة", "مش أصلي", "تقليد رخيص", "مضروب جدًا",
        "ضحك على الناس", "استغلال", "سعره مبالغ فيه", "غالي على الفاضي", "مش مستاهل", "فلوس على الفاضي", "فلوسي راحت", "تجربة وحشة",
        "تجربة فاشلة", "خدمة سيئة جدًا", "رد بطيء", "مفيش رد", "تجاهل العملاء", "مش موثوق", "مش مضمون", "ما انصحش بيه", "ما يستاهلش",
        "مش حلوة", "شكلها مش حلو", "لبسها مش مريح", "تقيل", "خفيف زيادة", "ضعيف الخامة", "سهل يتقطع", "مش متين", "غير مريح", "بيضايق في اللبس",
        "مش عملي خالص", "شكله قديم", "موديله قديم", "موضة قديمة", "تصميم وحش", "تصميم فاشل", "شكلها غريب", "لبسها صعب", "مش ثابت",
        "بيزحلق", "بيوجع الرجل", "بيوسع بسرعة", "بيضيق", "بيبوظ بسرعة", "بيتهالك", "بيتمزق", "بيسود", "اللون راح", "اللون اتغير", "اللون بهت",
        "اللون مختلف", "مش نفس اللون", "الصورة غير الحقيقة", "غير اللي في الصورة", "غير المتوقع", "مخيب للآمال", "توقعاتي كانت أعلى",
        "أقل من المتوقع", "الجودة ضعيفة", "مش قد كده", "عادي جدًا", "عادي خالص", "ملوش لازمة", "مش مفيد", "خسارة الفلوس", "ضيعت فلوسي",
        "ضيعت وقتي", "مش يستاهل السعر", "السعر مش منطقي", "غالي جدًا على كده", "أغلى من قيمته", "السعر مبالغ فيه جدًا", "مش مناسب للسعر",
        "المفروض أرخص", "في السوق أرخص", "في أحسن منه", "في أفضل منه", "فيه بدائل أحسن", "في ماركات أحسن", "في جودة أحسن", "الطلب غلط",
        "وصل غلط", "المنتج غلط", "المقاس مختلف", "المقاس مش زي المكتوب", "الطلب ناقص", "المنتج ناقص", "مش نفس الطلب", "بعتولي حاجة تانية",
        "غير المطلوب", "الشحن بطيء", "التوصيل بطيء", "اتأخر كتير", "وصل متأخر", "اتأخر أيام", "خدمة ضعيفة", "خدمة غير جيدة", "التعامل سيء",
        "التعامل مش كويس", "تعامل غير محترم", "رد غير لائق", "الرد متأخر", "محدش بيرد", "محدش مهتم", "تجاهل الرسائل", "مفيش اهتمام",
        "مفيش متابعة", "خدمة بعد البيع سيئة", "مش مضمون خالص", "مش موثوق فيه", "مش محل ثقة", "تجربة سيئة جدًا", "تجربة غير مرضية",
        "مش راضي", "مش راضية", "غير راضي عن المنتج", "غير راضية عن الطلب", "ندمت على الشراء", "مش هكرر التجربة", "آخر مرة أشتري", "wahsh",
        "zft", "nasb", "haramia", "msh helw", "ghali", "نصااااب", "وحشش", "غااالي", "زفتتت", "وحششش", "سيييء", "غااالي", "خرا",
        "مش عاجباني خالص", "شكلها يكسف", "شكلها مش لايق", "لبسها مش مريح خالص", "بتوجع الرجل", "بتعور الرجل", "بتضايق في المشي",
        "بتتعب الرجل", "بتتكسر بسرعة", "بتتهرى بسرعة", "بتبهدل بسرعة", "بتفقد شكلها", "بتبوظ بسرعة", "مش معمولة صح", "الشغل فيها تعبان",
        "الخياطة وحشة", "الخياطة بايظة", "التقفيل وحش", "التقفيل تعبان", "باين إنها رخيصة", "شكلها مش نضيف", "شكلها مش شيك", "شكلها مش مودرن",
        "موديلها قديم", "مش ماشية مع الموضة", "ملهاش لازمة", "ضيعت فلوسي عليها", "فلوس كتير عليها", "سعرها مش منطقي", "سعرها مبالغ فيه أوي",
        "أغلى من اللازم", "مش مستاهلة السعر", "مش مستاهلة الفلوس", "في أحسن منها بكتير", "السوق مليان أحسن منها", "جالي غير اللي طلبته",
        "بعتولي حاجة غيرها", "الطلب طلع غلط", "المقاس طلع مختلف", "المقاس مش زي ما مكتوب", "التوصيل اتأخر أوي", "الطلب اتأخر كتير",
        "محدش بيرد علينا", "الرد بطئ جدًا", "خدمة العملاء وحشة", "التعامل مش حلو", "تجربة مش حلوة", "تجربة زفت", "آخر مرة أطلب",
        "مش هطلب منكم تاني", "التقفيل وحش", "يقرف", "شكله مش نفس اللي في الصورة", "الحقيقة معفن", "مش حلو"
      ].join(',');

      const resolvedPageId = pageId || lastWebhookPageId || (pageData && pageData.pageId ? pageData.pageId : null);

      const [loadedFilterSettings, pageInfo] = await Promise.all([
        safeQuery(async () => { const prisma = getSharedPrismaClient(); return await prisma.aiSetting.findFirst({ where: { companyId: pageData.companyId } }); }),
        resolvedPageId ? safeQuery(async () => { const prisma = getSharedPrismaClient(); return await prisma.facebookPage.findUnique({ where: { pageId: resolvedPageId } }); }) : Promise.resolve(null)
      ]);

      filterSettings = loadedFilterSettings;

      // We process the filter if autoFilterEnabled is true OR we have our static words to always check
      const isAutoFilterOn = filterSettings?.autoFilterEnabled || pageInfo?.autoFilterEnabled || true; // Force true since we have static words

      if (isAutoFilterOn) {
        const _allKw = `${STATIC_BAD_WORDS},${filterSettings?.negativeKeywords || ''},${pageInfo?.negativeKeywords || ''}`;
        const _match = checkNegativeKeywords(commentText, _allKw);
        if (_match && _match.matched) {
          console.log(`🛡️ [FILTER] Deleting comment ${commentId} - matched keyword: "${_match.keyword}"`);
          const _del = await deleteFacebookComment(commentId, pageData.pageAccessToken);
          if (!_del) await hideFacebookComment(commentId, pageData.pageAccessToken);
          return; // 🛑 Do NOT save to DB, do NOT send a reply
        }
      }
    } catch (_fe) { console.error('❌ [FILTER-ERROR]', _fe.message); }
    // --- END AUTOMATED FILTERING ---

    // Save or update comment in database
    let savedComment;
    await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      if (existingComment) {
        // Update existing comment
        savedComment = await prisma.facebookComment.update({
          where: { id: existingComment.id },
          data: {
            message: commentText, // Update in case comment was edited
            createdTime: createdTime,
            pageId: pageId || lastWebhookPageId,
            companyId: pageData.companyId
          }
        });
        //console.log(`💾 [COMMENT] Updated existing comment in database: ${commentId}`);
      } else {
        // Create new comment
        savedComment = await prisma.facebookComment.create({
          data: {
            commentId: commentId,
            postId: postId,
            senderId: senderId,
            senderName: senderName,
            message: commentText,
            createdTime: createdTime,
            pageId: pageId || lastWebhookPageId,
            companyId: pageData.companyId
          }
        });
        //console.log(`💾 [COMMENT] Saved new comment to database: ${commentId}`);
      }
    });

    // CORRECT FLOW: Check Post Settings FIRST (Priority), then Page Settings (Fallback)
    // BUT: If post settings is 'manual', skip to page settings
    let postSettings = null;
    let settingsSource = null;

    // 1. FIRST: Check for post-specific settings (PRIORITY)
    try {
      const postSpecificSettings = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.postResponseSettings.findUnique({
          where: {
            postId_companyId: {
              postId: postId,
              companyId: pageData.companyId
            }
          },
          include: { product: { select: { id: true, name: true, price: true, description: true } } }
        });
      });

      // Only use post settings if it's NOT manual
      if (postSpecificSettings && postSpecificSettings.responseMethod !== 'manual') {
        console.log(`📝 [COMMENT] Using POST-SPECIFIC settings for post ${postId} (PRIORITY) - Method: ${postSpecificSettings.responseMethod}`);
        postSettings = postSpecificSettings;
        settingsSource = 'post';
      } else if (postSpecificSettings && postSpecificSettings.responseMethod === 'manual') {
        console.log(`⏭️ [COMMENT] Post settings is 'manual', checking page settings...`);
      }
    } catch (error) {
      //console.log('⚠️ [COMMENT] Could not fetch post response settings from database');
    }

    // 2. FALLBACK: If no post settings OR post is manual, check page-level settings
    if (!postSettings && pageId) {
      try {
        const pageSettings = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          return await prisma.pageResponseSettings.findUnique({
            where: {
              pageId_companyId: {
                pageId: pageId,
                companyId: pageData.companyId
              }
            }
          });
        });

        if (pageSettings) {
          console.log(`📄 [COMMENT] Using PAGE-LEVEL settings for page ${pageId} (FALLBACK) - Method: ${pageSettings.responseMethod}`);
          postSettings = pageSettings;
          settingsSource = 'page';
        }
      } catch (error) {
        //console.log('⚠️ [COMMENT] Could not fetch page response settings from database');
      }
    }

    if (settingsSource) {
      console.log(`✅ [COMMENT] Settings loaded from: ${settingsSource}`);
    }

    // Handle based on response method
    if (postSettings) {
      // Process based on the specific response method for this post
      if (postSettings.responseMethod === 'fixed' && postSettings.commentMessages) {
        // Pick a random comment response from variations
        let commentResponseText = '';
        try {
          const messagesArray = JSON.parse(postSettings.commentMessages);
          if (messagesArray && messagesArray.length > 0) {
            const randomIndex = Math.floor(Math.random() * messagesArray.length);
            commentResponseText = messagesArray[randomIndex];
          }
        } catch (e) {
          console.warn('⚠️ [FIXED-COMMENT] Failed to parse comment messages:', e);
          commentResponseText = postSettings.commentMessages; // Fallback to raw string
        }

        if (!commentResponseText || !commentResponseText.trim()) {
          console.log('⚠️ [FIXED-COMMENT] No valid comment message found, skipping');
          return;
        }

        const messengerResponseText = postSettings.fixedMessengerMessage || commentResponseText;

        // Mark as responded BEFORE sending the reply
        try {
          await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            await prisma.facebookComment.update({
              where: { id: savedComment.id },
              data: {
                response: commentResponseText,
                respondedAt: new Date()
              }
            });
          });
        } catch (dbError) {
          console.error(`❌ [COMMENT] Failed to mark comment ${commentId} as responded in database:`, dbError);
          return;
        }

        // Send the response as a comment reply
        console.log(`📤 [FIXED-COMMENT] Sending fixed comment reply: "${commentResponseText}"`);
        await sendFacebookCommentReply(commentId, commentResponseText, pageData.pageAccessToken);

        // NEW: Also send the response to Facebook Messenger
        if (senderId) {
          // Import the sendProductionFacebookMessage function
          const { sendProductionFacebookMessage } = require('./production-facebook-fix');

          // Find customer by Facebook ID
          let customer = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.customer.findFirst({
              where: {
                facebookId: senderId,
                companyId: pageData.companyId
              }
            });
          });

          // If customer doesn't exist, create one
          if (!customer) {
            customer = await safeQuery(async () => {
              const prisma = getSharedPrismaClient();
              return await prisma.customer.create({
                data: {
                  facebookId: senderId,
                  firstName: senderName || 'Facebook User',
                  lastName: '',
                  email: null,
                  phone: null,
                  companyId: pageData.companyId,
                  metadata: JSON.stringify({
                    source: 'facebook_comment',
                    commentId: commentId,
                    postId: postId
                  })
                }
              });
            });
          }

          // Find or create conversation
          let conversation = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.conversation.findFirst({
              where: {
                customerId: customer.id,
                status: { in: ['ACTIVE', 'RESOLVED'] }
              },
              orderBy: { updatedAt: 'desc' }
            });
          });

          // If no conversation exists, create one
          if (!conversation) {
            // Get page data for metadata
            let pageName = null;
            if (pageData) {
              pageName = pageData.pageName;
            } else if (pageId) {
              // Try to get page name from database
              const page = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.facebookPage.findUnique({
                  where: { pageId: pageId }
                });
              });
              if (page) {
                pageName = page.pageName;
              }
            }

            const conversationMetadata = {
              platform: 'facebook',
              source: 'comment_reply',
              pageId: pageId,
              pageName: pageName
            };

            conversation = await safeQuery(async () => {
              const prisma = getSharedPrismaClient();
              return await prisma.conversation.create({
                data: {
                  customerId: customer.id,
                  companyId: pageData.companyId,
                  channel: 'FACEBOOK',
                  status: 'ACTIVE',
                  lastMessageAt: new Date(),
                  metadata: JSON.stringify(conversationMetadata),
                  // 🆕 FIX: Bot reply means not from customer
                  lastMessageIsFromCustomer: false,
                  unreadCount: 0
                }
              });
            });
          } else if (conversation.status === 'RESOLVED') {
            // Reactivate resolved conversation
            conversation = await safeQuery(async () => {
              const prisma = getSharedPrismaClient();
              return await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  status: 'ACTIVE',
                  lastMessageAt: new Date(),
                  updatedAt: new Date(),
                  // 🆕 FIX: Bot reply means not from customer
                  lastMessageIsFromCustomer: false,
                  unreadCount: 0
                }
              });
            });
          }

          // Save the response as a message from the admin (not from customer)
          const message = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.message.create({
              data: {
                conversationId: conversation.id,
                content: messengerResponseText,
                type: 'TEXT',
                isFromCustomer: false,
                metadata: JSON.stringify({
                  platform: 'facebook',
                  source: 'comment_reply',
                  isFixedResponse: true,
                  senderId: 'system',
                  commentId: commentId,
                  postId: postId
                })
              }
            });
          });

          // Send the message to Facebook Messenger
          console.log(`📤 [FIXED-COMMENT-MESSENGER] Sending messenger message: "${messengerResponseText}"`);
          let messengerSuccess = true;
          if (customer.facebookId && pageData && pageData.pageAccessToken) {
            const messengerResponse = await sendFacebookMessageViaDeliveryOutbox({
              recipientId: customer.facebookId,
              messageContent: messengerResponseText,
              messageType: 'TEXT',
              pageId,
              pageAccessToken: pageData.pageAccessToken,
              companyId: pageData.companyId,
              conversationId: conversation.id,
              customerId: customer.id,
              messageId: message.id,
              source: 'fixed_comment_messenger_reply',
            });

            if (messengerResponse.success) {
              console.log(`✅ [FIXED-COMMENT-MESSENGER] Successfully sent fixed response to Messenger for user ${customer.facebookId}`);

              // Update message with Facebook message ID
              await prisma.message.update({
                where: { id: message.id },
                data: {
                  metadata: JSON.stringify({
                    ...JSON.parse(message.metadata),
                    facebookMessageId: messengerResponse.messageId,
                    facebookSentAt: new Date().toISOString()
                  })
                }
              });

              // 📊 [STATS-RECORDER] سجل الإحصائيات للرد على التعليق
              await recordSentMessageStat({
                companyId: pageData.companyId,
                facebookPageId: pageId,
                recipientFacebookId: customer.facebookId,
                recipientCustomerId: customer.id,
                messageId: messengerResponse.messageId,
                messageContent: messengerResponseText,
                messageType: 'TEXT',
                messageStatus: 'saved',
                conversationId: conversation.id,
                conversationStatus: 'existed',
                sentAt: new Date()
              }).catch(err => console.error('⚠️ [COMMENT-STATS] Error:', err.message));
            } else {
              console.warn(`⚠️ [FIXED-COMMENT-MESSENGER] Failed to send fixed response to Messenger for user ${customer.facebookId}:`, messengerResponse.message);
              messengerSuccess = false;

              // 📊 [STATS-RECORDER] Record as ignored
              await recordSentMessageStat({
                companyId: pageData.companyId,
                facebookPageId: pageId,
                recipientFacebookId: customer.facebookId,
                recipientCustomerId: customer.id,
                messageId: `failed_comment_fixed_${commentId}_${Date.now()}`,
                messageContent: messengerResponseText,
                messageType: 'TEXT',
                messageStatus: 'ignored',
                ignoredReason: messengerResponse.message || 'Facebook API Error',
                conversationId: conversation.id,
                conversationStatus: 'existed',
                sentAt: new Date()
              }).catch(err => console.error('⚠️ [COMMENT-STATS-IGNORED] Error:', err.message));
            }
          } else {
            console.warn(`⚠️ [FIXED-COMMENT-MESSENGER] Cannot send to Messenger - missing data for user ${customer.facebookId}`);
            messengerSuccess = false;

            // 📊 [STATS-RECORDER] Record as ignored
            await recordSentMessageStat({
              companyId: pageData.companyId,
              facebookPageId: pageId,
              recipientFacebookId: senderId,
              recipientCustomerId: customer ? customer.id : null,
              messageId: `failed_comment_fixed_nodata_${commentId}_${Date.now()}`,
              messageContent: messengerResponseText,
              messageType: 'TEXT',
              messageStatus: 'ignored',
              ignoredReason: 'Missing Facebook ID or token',
              conversationId: conversation ? conversation.id : null,
              conversationStatus: conversation ? 'existed' : null,
              sentAt: new Date()
            }).catch(err => console.error('⚠️ [COMMENT-STATS-IGNORED] Error:', err.message));
          }
        }
        return; // Exit after sending fixed response
      } else if (postSettings.responseMethod === 'manual') {
        //console.log(`📝 [COMMENT] Manual response method set for post ${postId} - no automatic response`);
        return;
      } else if (postSettings.responseMethod === 'ai') {
        console.log(`🤖 [COMMENT] AI response method for comment ${commentId} on post ${postId}`);

        const { sendChatMessage } = require('../services/aiSdkClient');

        const memoryContext = postSettings.product
          ? { referredProduct: { id: postSettings.product.id, name: postSettings.product.name, price: postSettings.product.price, description: postSettings.product.description } }
          : null;

        let customer = existingComment
          ? await safeQuery(async () => { const p = getSharedPrismaClient(); return await p.customer.findFirst({ where: { facebookId: senderId, companyId: pageData.companyId } }); })
          : null;
        if (!customer && senderId) {
          customer = await safeQuery(async () => {
            const p = getSharedPrismaClient();
            return await p.customer.create({ data: { facebookId: senderId, firstName: senderName || 'FB User', lastName: '', email: null, phone: null, companyId: pageData.companyId, metadata: JSON.stringify({ source: 'facebook_comment_ai' }) } });
          });
        }

        const aiResponse = customer ? await sendChatMessage({ companyId: pageData.companyId, customerId: customer.id, message: commentText, channel: 'facebook', memoryContext }).catch(e => { console.error('❌ [COMMENT-AI] AI service error:', e.message); return null; }) : null;

        if (aiResponse?.reply) {
          await sendFacebookCommentReply(commentId, aiResponse.reply, pageData.pageAccessToken);

          await safeQuery(async () => {
            const p = getSharedPrismaClient();
            await p.facebookComment.update({ where: { id: savedComment.id }, data: { response: aiResponse.reply, respondedAt: new Date() } });
          });

          if (senderId && customer) {
            const { sendProductionFacebookMessage } = require('./production-facebook-fix');
            const conversation = await safeQuery(async () => {
              const p = getSharedPrismaClient();
              return await p.conversation.findFirst({ where: { customerId: customer.id, status: { in: ['ACTIVE', 'RESOLVED'] } }, orderBy: { updatedAt: 'desc' } });
            });
            if (conversation) {
              await safeQuery(async () => {
                const p = getSharedPrismaClient();
                await p.message.create({ data: { conversationId: conversation.id, content: aiResponse.reply, type: 'TEXT', isFromCustomer: false, metadata: JSON.stringify({ platform: 'facebook', source: 'comment_ai_reply', commentId }) } });
              });
            }
            await sendProductionFacebookMessage(senderId, aiResponse.reply, 'TEXT', pageId, pageData.pageAccessToken).catch(e => console.warn('⚠️ [COMMENT-AI] Messenger send failed:', e.message));
          }
        } else {
          console.warn(`⚠️ [COMMENT-AI] No AI reply for comment ${commentId}`);
        }
        return;
      }
    }

  } catch (error) {
    console.error('❌ [COMMENT] Error handling Facebook comment:', error);
  }
}

// NEW: Function to send a reply to a Facebook comment
async function sendFacebookCommentReply(commentId, messageText, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${commentId}/comments`;

    const response = await axios.post(url,
      new URLSearchParams({ message: messageText, access_token: pageAccessToken }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    if (response.data?.error) {
      console.error('❌ [COMMENT-REPLY] Error sending comment reply:', response.data.error);
      if (response.data.error.code === 200) {
        console.error('💡 [COMMENT-REPLY] Code 200 usually means permission issues');
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ [COMMENT-REPLY] Error sending comment reply:', error?.response?.data || error.message);
    return false;
  }
}

// ENHANCED: Handle Facebook messages with real profile fetching
async function handleFacebookMessage(webhookEvent, currentPageId = null) {
  const handleStartTime = Date.now();
  const messageId = webhookEvent.message?.mid || `msg_${Date.now()}`;
  const prisma = await getPrisma(); // ✅ Get connected instance
  try {
    console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [0ms] 🔍 [HANDLE] Starting handleFacebookMessage`);

    const senderId = webhookEvent.sender.id;
    // 🆕 Handle referral events without message object (OPEN_THREAD events)
    // Prefer the quick_reply payload (button tap) over the button title so rules/flows match on payload values.
    const messageText = resolveInboundMessageText(webhookEvent);
    let attachments = webhookEvent.message?.attachments || null;

    // 🆕 Extract postId from webhookEvent (fast - already extracted in webhookController)
    // ✅ FIX: Also extract directly from referral if not already extracted
    let postId = webhookEvent._extractedPostId || null;

    // ✅ FIX: If postId not found, try to extract from referral directly
    if (!postId && webhookEvent.referral) {
      if (webhookEvent.referral.ads_context_data?.post_id) {
        postId = webhookEvent.referral.ads_context_data.post_id;
        console.log('✅ [POST-REF] Extracted postId directly from referral.ads_context_data.post_id:', postId);
      } else if (webhookEvent.referral.post_id) {
        postId = webhookEvent.referral.post_id;
        console.log('✅ [POST-REF] Extracted postId directly from referral.post_id:', postId);
      } else if (webhookEvent.referral.post_ref) {
        postId = webhookEvent.referral.post_ref;
        console.log('✅ [POST-REF] Extracted postId directly from referral.post_ref:', postId);
      } else if (webhookEvent.referral.ad_ref) {
        postId = webhookEvent.referral.ad_ref;
        console.log('✅ [POST-REF] Extracted postId directly from referral.ad_ref:', postId);
      } else if (webhookEvent.referral.ad_id) {
        postId = webhookEvent.referral.ad_id;
        console.log('✅ [POST-REF] Extracted postId directly from referral.ad_id (fallback):', postId);
      }

      // Attach to webhookEvent for later use
      if (postId) {
        webhookEvent._extractedPostId = postId;
      }
    }

    const applyReferralAdMetadata = (metadata = {}) => {
      if (webhookEvent.referral?.ad_id) {
        metadata.adId = webhookEvent.referral.ad_id;
      }
      if (webhookEvent.referral?.ad_ref) {
        metadata.adRef = webhookEvent.referral.ad_ref;
      }
      if (webhookEvent.referral?.ads_context_data) {
        metadata.adsContextData = webhookEvent.referral.ads_context_data;
      }
      return metadata;
    };

    // Use pageId from current message or fallback to last webhook
    const messagePageId = currentPageId || webhookEvent.recipient?.id || lastWebhookPageId;
    //console.log(`📄 [MESSAGE-PAGE] Using page ID for this message: ${messagePageId}`);

    // Update lastWebhookPageId
    if (webhookEvent.recipient?.id) {
      lastWebhookPageId = webhookEvent.recipient.id;
    }

    // Find or create customer
    let pageData = null;
    if (messagePageId) {
      const pageDataStartTime = Date.now();
      pageData = await getPageToken(messagePageId);
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - pageDataStartTime}ms] 📄 [HANDLE] Got pageData for pageId: ${messagePageId}`);
    }

    // Enhanced page data diagnostics
    //console.log(`🔍 [PAGE-DIAGNOSTIC] Page ID: ${messagePageId}`);
    //console.log(`🔍 [PAGE-DIAGNOSTIC] Page data found:`, pageData ? 'YES' : 'NO');

    // 📊 تسجيل زيارة البوست تلقائياً
    if (postId && pageData && pageData.companyId) {
      trackPostVisit(postId, pageData.companyId).catch(err => {
        console.error('❌ [POST-TRACKING] Failed to track post visit:', err.message);
      });
    }

    if (pageData) {
      //console.log(`🔍 [PAGE-DIAGNOSTIC] Page name: ${pageData.pageName}`);
      //console.log(`🔍 [PAGE-DIAGNOSTIC] Company ID: ${pageData.companyId}`);
      //console.log(`🔍 [PAGE-DIAGNOSTIC] Has access token: ${!!pageData.pageAccessToken}`);
    } else {
      // Check all available pages
      //console.log(`🔍 [PAGE-DIAGNOSTIC] Checking all available pages...`);
      const allPages = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.facebookPage.findMany({
          select: {
            pageId: true,
            pageName: true,
            status: true,
            companyId: true,
            connectedAt: true
          }
        });
      });
      //console.log(`🔍 [PAGE-DIAGNOSTIC] All pages in database:`, allPages);
    }

    if (!pageData) {
      console.error(`❌ [SECURITY] No page data found for pageId: ${messagePageId}`);
      return;
    }

    let targetCompanyId = pageData.companyId;
    if (!targetCompanyId) {
      console.error(`❌ [SECURITY] No companyId found - rejecting request`);
      return;
    }

    // Verify company exists
    const companyExists = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.company.findUnique({
        where: { id: targetCompanyId }
      });
    });

    if (!companyExists) {
      console.error(`❌ [SECURITY] Company not found: ${targetCompanyId}`);
      return;
    }

    //console.log(`✅ [SECURITY] Verified company: ${companyExists.name} (${targetCompanyId})`);

    {
      // Use try-catch to handle race condition

      // NEW: Fetch real Facebook profile before creating/updating customer
      const facebookProfile = await fetchFacebookUserProfile(senderId, {
        pageAccessToken: pageData.pageAccessToken,
        pageId: messagePageId,
        companyId: targetCompanyId,
        onRecoveredToken: async (recovery) => {
          pageData.pageAccessToken = recovery.pageAccessToken;
          if (recovery.page?.name) {
            pageData.pageName = recovery.page.name;
          }
          updatePageTokenCache(
            messagePageId,
            recovery.pageAccessToken,
            recovery.page?.name || pageData.pageName,
            targetCompanyId
          );
        }
      });

      let firstName = 'عميل فيسبوك';
      let lastName = senderId.slice(-4);

      if (facebookProfile && facebookProfile.first_name) {
        firstName = facebookProfile.first_name;
        lastName = facebookProfile.last_name || '';
      }

      // Try to find existing customer first (using compound unique key)
      const customerStartTime = Date.now();
      let customer = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.customer.findFirst({
          where: {
            facebookId: senderId,
            companyId: targetCompanyId
          }
        });
      });
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - customerStartTime}ms] 👤 [HANDLE] ${customer ? 'Found' : 'Creating'} customer for ${senderId}`);

      if (!customer) {
        // Customer doesn't exist, try to create
        try {
          customer = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.customer.create({
              data: {
                facebookId: senderId,
                firstName: firstName,
                lastName: lastName,
                email: `facebook_${senderId}@example.com`,
                phone: '',
                companyId: targetCompanyId,
                metadata: JSON.stringify({
                  facebookProfile: facebookProfile,
                  profileFetched: !!facebookProfile,
                  profileFetchedAt: new Date().toISOString(),
                  profilePicture: facebookProfile?.profile_pic
                })
              }
            });
          });
        } catch (createError) {
          // If create failed due to race condition, try to find again
          if (createError.code === 'P2002') {
            //console.log(`🔄 [RACE-CONDITION] Customer created by another request, fetching...`);
            customer = await safeQuery(async () => {
              const prisma = getSharedPrismaClient();
              return await prisma.customer.findFirst({
                where: {
                  facebookId: senderId,
                  companyId: targetCompanyId
                }
              });
            });

            if (!customer) {
              // This should never happen, but just in case
              throw new Error(`Failed to find customer after race condition: ${senderId}`);
            }
          } else {
            // Different error, rethrow
            throw createError;
          }
        }
      } else {
        // OPTIONAL: Update existing customer's name if we have better data
        //console.log(`👤 [CUSTOMER-UPDATE] Checking if we should update existing customer: ${customer.firstName} ${customer.lastName}`);

        // Only update if current name is generic or from previous failed attempts
        const isGenericName = customer.firstName === 'عميل فيسبوك' ||
          customer.firstName.includes('عميل فيسبوك') ||
          customer.firstName === 'Facebook' ||
          customer.lastName === 'User' ||
          customer.firstName === 'مستخدم';

        if (isGenericName) {
          //console.log(`🔄 [CUSTOMER-UPDATE] Current name is generic, attempting to fetch real name...`);

          const facebookProfile = await fetchFacebookUserProfile(senderId, {
            pageAccessToken: pageData.pageAccessToken,
            pageId: messagePageId,
            companyId: targetCompanyId,
            onRecoveredToken: async (recovery) => {
              pageData.pageAccessToken = recovery.pageAccessToken;
              if (recovery.page?.name) {
                pageData.pageName = recovery.page.name;
              }
              updatePageTokenCache(
                messagePageId,
                recovery.pageAccessToken,
                recovery.page?.name || pageData.pageName,
                targetCompanyId
              );
            }
          });

          if (facebookProfile && (facebookProfile.first_name || facebookProfile.name)) {
            // Use first_name and last_name if available
            let firstName = customer.firstName;
            let lastName = customer.lastName;

            if (facebookProfile.first_name) {
              firstName = facebookProfile.first_name;
              lastName = facebookProfile.last_name || '';
            }
            // Fallback to parsing the 'name' field
            else if (facebookProfile.name) {
              const nameParts = facebookProfile.name.split(' ');
              firstName = nameParts[0] || facebookProfile.name;
              lastName = nameParts.slice(1).join(' ') || '';
            }

            // Only update if we got a better name than what we already have
            if (firstName !== customer.firstName || lastName !== customer.lastName) {
              const updatedCustomer = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.customer.update({
                  where: { id: customer.id },
                  data: {
                    firstName: firstName,
                    lastName: lastName,
                    metadata: JSON.stringify({
                      ...customer.metadata ? JSON.parse(customer.metadata) : {},
                      facebookProfile: facebookProfile,
                      profileUpdated: true,
                      profileUpdatedAt: new Date().toISOString(),
                      profilePicture: facebookProfile.profile_pic
                    })
                  }
                });
              });

              customer = updatedCustomer;
              //console.log(`✅ [CUSTOMER-UPDATE] Updated customer name to: ${customer.firstName} ${customer.lastName}`);
            } else {
              //console.log(`ℹ️ [CUSTOMER-UPDATE] Name unchanged: ${customer.firstName} ${customer.lastName}`);
            }
          } else {
            //console.log(`⚠️ [CUSTOMER-UPDATE] Could not fetch better name, keeping existing: ${customer.firstName} ${customer.lastName}`);
          }
        } else {
          //console.log(`ℹ️ [CUSTOMER-UPDATE] Customer already has a non-generic name: ${customer.firstName} ${customer.lastName}`);
        }
      }

      // 🚫 فحص إذا كان العميل محظور على هذه الصفحة
      const blockedCheckStartTime = Date.now();

      // ✅ FIX: Use getSharedPrismaClientAsync to guarantee connection
      const facebookPage = await safeQuery(async () => {
        const prisma = await getSharedPrismaClientAsync();
        if (!prisma) {
          throw new Error('Prisma client not available');
        }
        return await prisma.facebookPage.findUnique({
          where: { pageId: messagePageId },
          select: { id: true }
        });
      }, 'findFacebookPage');

      if (facebookPage) {
        const isBlocked = await safeQuery(async () => {
          const prisma = await getSharedPrismaClientAsync();
          if (!prisma) {
            throw new Error('Prisma client not available');
          }
          return await prisma.blockedCustomersOnPage.findFirst({
            where: {
              facebookPageId: facebookPage.id,
              OR: [
                { customerId: customer.id },
                { facebookId: senderId }
              ]
            }
          });
        }, 'checkIsBlocked');

        if (isBlocked) {
          console.log(`🚫 [BLOCKED] Customer ${customer.id} (${senderId}) is blocked on page ${messagePageId} - ignoring message`);
          console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - blockedCheckStartTime}ms] 🚫 [BLOCKED] Block check completed`);
          return; // تجاهل الرسالة تماماً
        }
      }
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - blockedCheckStartTime}ms] ✅ [BLOCKED] Customer not blocked`);

      // Find or create conversation
      const conversationStartTime = Date.now();
      let conversation = await safeQuery(async () => {
        const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
        const prisma = await getSharedPrismaClientAsync();
        if (!prisma) {
          throw new Error('Prisma client not available for conversation query');
        }
        return await prisma.conversation.findFirst({
          where: {
            customerId: customer.id,
            channel: 'FACEBOOK'
          },
          orderBy: { updatedAt: 'desc' }
        });
      });
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - conversationStartTime}ms] 💬 [HANDLE] ${conversation ? 'Found' : 'Will create'} conversation for customer ${customer.id}`);

      const timestamp = new Date();

      if (conversation && conversation.status === 'RESOLVED') {
        // Update metadata with page information when reactivating conversation
        let updatedMetadata = {};
        if (conversation.metadata) {
          try {
            updatedMetadata = JSON.parse(conversation.metadata);
          } catch (e) {
            // If parsing fails, start with empty object
            updatedMetadata = {};
          }
        }

        // Add/Update page information and post reference
        updatedMetadata.platform = 'facebook';
        updatedMetadata.source = 'messenger';
        updatedMetadata.pageId = messagePageId;
        updatedMetadata.pageName = pageData?.pageName || null;
        // Preserve existing postId or add new one if available
        if (!updatedMetadata.postId && postId) {
          updatedMetadata.postId = postId;
          console.log('✅ [POST-REF] Adding postId to reactivated conversation:', postId);
        }
        applyReferralAdMetadata(updatedMetadata);

        conversation = await safeQuery(async () => {
          const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
          const prisma = await getSharedPrismaClientAsync();
          if (!prisma) {
            throw new Error('Prisma client not available for conversation update');
          }
          return await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: 'ACTIVE',
              lastMessageAt: timestamp,
              updatedAt: new Date(),
              metadata: JSON.stringify(updatedMetadata),
              // 🆕 FIX: Msg from customer means it's unreplied
              lastMessageIsFromCustomer: true,
              unreadCount: { increment: 1 }
            }
          });
        });
        //console.log(`🔄 Reactivated conversation: ${conversation.id}`);
      } else if (conversation && conversation.status === 'ACTIVE') {
        // Update metadata with page information when updating active conversation
        let updatedMetadata = {};
        if (conversation.metadata) {
          try {
            updatedMetadata = JSON.parse(conversation.metadata);
          } catch (e) {
            // If parsing fails, start with empty object
            updatedMetadata = {};
          }
        }

        // Add/Update page information and post reference
        updatedMetadata.platform = 'facebook';
        updatedMetadata.source = 'messenger';
        updatedMetadata.pageId = messagePageId;
        updatedMetadata.pageName = pageData?.pageName || null;
        // Preserve existing postId or add new one if available
        if (!updatedMetadata.postId && postId) {
          updatedMetadata.postId = postId;
          console.log('✅ [POST-REF] Adding postId to active conversation:', postId);
        }
        applyReferralAdMetadata(updatedMetadata);

        conversation = await safeQuery(async () => {
          const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
          const prisma = await getSharedPrismaClientAsync();
          if (!prisma) {
            throw new Error('Prisma client not available for active conversation update');
          }
          return await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: timestamp,
              updatedAt: new Date(),
              metadata: JSON.stringify(updatedMetadata),
              // 🆕 FIX: Message from customer means it's unreplied
              lastMessageIsFromCustomer: true,
              unreadCount: { increment: 1 }
            }
          });
        });

        //console.log(`🔄 Updated existing active conversation: ${conversation.id}`);
      }

      let isNewConversation = false;
      if (!conversation) {
        // Create metadata with page information and post reference
        const conversationMetadata = {
          platform: 'facebook',
          source: 'messenger',
          pageId: messagePageId,
          pageName: pageData?.pageName || null,
          postId: postId || null // 🆕 Save postId if available (fast - no API calls)
        };
        applyReferralAdMetadata(conversationMetadata);

        if (postId) {
          console.log('✅ [POST-REF] Saving postId to new conversation:', postId);
        }

        conversation = await safeQuery(async () => {
          const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
          const prisma = await getSharedPrismaClientAsync();
          if (!prisma) {
            throw new Error('Prisma client not available for conversation creation');
          }
          return await prisma.conversation.create({
            data: {
              customerId: customer.id,
              companyId: customer.companyId,
              channel: 'FACEBOOK',
              status: 'ACTIVE',
              lastMessageAt: timestamp,
              metadata: JSON.stringify(conversationMetadata),
              // 🆕 FIX: New conversation starts as unreplied
              lastMessageIsFromCustomer: true,
              unreadCount: 1
            }
          });
        });

        //console.log(`💬 New conversation created: ${conversation.id}`);
        isNewConversation = true;
      }

      // Determine message type and content
      let messageType = 'TEXT';
      let content = messageText || '';
      let attachmentsData = [];
      let originalMediaUrls = [];
      let mediaArchivedCount = 0;

      if (attachments && attachments.length > 0) {
        // حفظ جميع المرفقات
        attachmentsData = attachments;

        // Normalize Facebook attachment format for AI service
        attachmentsData = attachmentsData.map(a => ({
          type: a.type || 'image',
          url: a.payload?.url || a.url || a.payload?.sticker_id || '',
          detail: 'high'
        })).filter(a => a.url);

        // 📎 [MEDIA-ARCHIVE] SKILL 8.9.14: Meta/CDN media URLs are signed and
        // short-lived. Download ONCE now (handler runs after the webhook ack)
        // and re-host locally, or the agent's later run hits a dead link and
        // replies hours late or blind.
        try {
          const { archiveAttachments } = require('../services/chatMediaArchiveService');
          const archiveResult = await archiveAttachments(attachmentsData);
          attachmentsData = archiveResult.attachments;
          originalMediaUrls = archiveResult.originals.map(o => o.original);
          mediaArchivedCount = archiveResult.archivedCount;
        } catch (archiveError) {
          console.warn(`📎 [MEDIA-ARCHIVE] Unexpected archive failure (keeping original URLs): ${archiveError.message}`);
        }

        // تحديد نوع الرسالة بناءً على أول مرفق
        const attachment = attachments[0];
        const attachmentType = attachment.type.toLowerCase();

        if (attachmentType === 'image') {
          messageType = 'IMAGE';
          content = attachmentsData[0]?.url || attachment.payload?.url || content;
        } else if (attachmentType === 'video') {
          messageType = 'VIDEO';
          content = attachmentsData[0]?.url || attachment.payload?.url || content;
        } else if (attachmentType === 'audio') {
          messageType = 'AUDIO';
          content = attachmentsData[0]?.url || attachment.payload?.url || content;
        } else if (attachmentType === 'file') {
          messageType = 'FILE';
          content = attachmentsData[0]?.url || attachment.payload?.url || content;
        } else if (attachmentType === 'template') {
          // معالجة الرسائل التي تحتوي على أزرار (template)
          messageType = 'TEMPLATE';
          const template = attachment.payload;

          // استخراج المحتوى من template
          if (template?.template_type === 'generic' && template?.elements && template.elements.length > 0) {
            const element = template.elements[0];
            // استخدام عنوان العنصر أو النص كمحتوى
            content = element.title || element.subtitle || messageText || '[رسالة منتج]';

            // حفظ معلومات إضافية في attachmentsData
            if (!messageText && element.title) {
              content = element.title;
            }
          } else if (template?.template_type === 'button') {
            // رسالة مع أزرار فقط
            content = template.text || messageText || '[رسالة مع أزرار]';
          } else {
            content = messageText || '[رسالة template]';
          }
        } else if (attachmentType === 'fallback') {
          // بعض الرسائل تأتي كـ fallback
          messageType = 'FILE';
          content = attachment.payload?.url || attachment.url || messageText || '[مرفق]';
        } else {
          // أي نوع آخر غير معروف
          console.log(`⚠️ [ATTACHMENT] نوع مرفق غير معروف: ${attachmentType}`);
          messageType = 'FILE';
          content = attachment.payload?.url || messageText || `[${attachmentType}]`;
        }

        // إذا كان هناك أكثر من مرفق، نسجل ذلك
        if (attachments.length > 1) {
          console.log(`📎 [ATTACHMENTS] الرسالة تحتوي على ${attachments.length} مرفقات`);
        }
      }

      // 🆕 Handle referral events without message (OPEN_THREAD events)
      // For OPEN_THREAD events, just create/update conversation without creating a message
      const hasReferral = !!webhookEvent.referral;
      const hasNoMessage = !webhookEvent.message;

      if (hasReferral && hasNoMessage) {
        console.log('✅ [POST-REF] OPEN_THREAD event - conversation created/updated with postId:', postId);
        return; // Conversation already created/updated above, no need to create message
      }

      // NEW: Capture Facebook message ID and reply reference FIRST
      const fbMessageId = webhookEvent.message?.mid;
      const replyToMid = webhookEvent.message?.reply_to?.mid;

      // ✅ FIX: التحقق من صحة محتوى الرسالة لجميع الأنواع (بما في ذلك الرسائل الفارغة من الإعلانات)
      // ✅ FIX: لو في replyToMid (اقتباس)، الرسالة مش فارغة حتى لو مفيش نص
      const isEmptyMessage = messageType === 'TEXT' && !isValidMessageContent(content) && !replyToMid;
      const hasNoAttachments = !attachments || attachments.length === 0;

      if (isEmptyMessage && hasNoAttachments) {
        // ✅ FIX: إذا كانت الرسالة فارغة لكن يوجد referral، نحدث المحادثة بـ postId فقط بدون إنشاء رسالة
        if (hasReferral && postId) {
          console.log(`⚠️ [CUSTOMER-MESSAGE] رسالة فارغة من إعلان تم تجاهلها - تحديث المحادثة بـ postId: ${postId}`);

          // ✅ FIX: تحديث metadata المحادثة بـ postId إذا لم يكن موجوداً (حتى لو كانت المحادثة موجودة مسبقاً)
          if (conversation) {
            try {
              let metadata = {};
              if (conversation.metadata) {
                try {
                  metadata = JSON.parse(conversation.metadata);
                } catch (e) {
                  metadata = {};
                }
              }

              // تحديث postId إذا لم يكن موجوداً أو إذا كان postId الجديد مختلفاً
              if (!metadata.postId && postId) {
                metadata.postId = postId;
                applyReferralAdMetadata(metadata);

                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    metadata: JSON.stringify(metadata)
                  }
                });
                console.log(`✅ [POST-REF] تم تحديث المحادثة بـ postId: ${postId} من رسالة فارغة`);
              } else if (metadata.postId && metadata.postId !== postId) {
                // إذا كان postId موجوداً لكن مختلفاً، نحدثه
                metadata.postId = postId;
                applyReferralAdMetadata(metadata);
                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    metadata: JSON.stringify(metadata)
                  }
                });
                console.log(`✅ [POST-REF] تم تحديث postId في المحادثة من ${metadata.postId} إلى ${postId}`);
              }
            } catch (e) {
              console.warn('⚠️ [POST-REF] Error updating conversation metadata:', e.message);
            }
          }
        } else {
          console.log(`⚠️ [CUSTOMER-MESSAGE] رسالة فارغة أو غير صالحة تم تجاهلها من العميل: "${content}"`);
        }
        return; // تجاهل الرسالة الفارغة
      }

      // ✅ FIX: لو العميل رد باقتباس من غير نص، نخزن محتوى افتراضي عشان الرسالة تظهر
      if (replyToMid && messageType === 'TEXT' && !isValidMessageContent(content)) {
        content = '[رد على رسالة]';
        messageType = 'TEXT';
      }

      // 🔍 DEBUG: Log reply_to information
      // console.log('🔍 [REPLY-DEBUG] Message data:', {
      //   mid: fbMessageId,
      //   hasReplyTo: !!webhookEvent.message?.reply_to,
      //   replyToMid: replyToMid,
      //   fullMessage: JSON.stringify(webhookEvent.message).substring(0, 200)
      // });

      let replyMeta = {};
      if (replyToMid) {
        try {
          const parentMsg = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.message.findFirst({
              where: {
                conversationId: conversation.id,
                metadata: { contains: replyToMid }
              },
              orderBy: { createdAt: 'desc' }
            });
          });
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
          // ignore reply resolution errors
        }
      }

      // ⚡ CRITICAL DEDUPLICATION: Check if message already exists in DB
      // This handles duplicates that might have bypassed the in-memory check
      const existingMessage = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            metadata: { contains: fbMessageId }
          }
        });
      }, 3);

      if (existingMessage) {
        console.log(`♻️ [DEDUPLICATION] Message ${fbMessageId} already exists (ID: ${existingMessage.id}). Skipping save.`);
        return;
      }

      // Save message to database
      const messageData = {
        id: uuidv4(), // ✅ FIX: Add required id field
        content: content,
        type: messageType,
        conversationId: conversation.id,
        isFromCustomer: true,
        isRead: false, // ⚡ رسالة جديدة من العميل = غير مقروءة
        attachments: attachmentsData ? JSON.stringify(attachmentsData) : null,
        metadata: JSON.stringify({
          platform: 'facebook',
          source: 'messenger',
          senderId: senderId,
          hasAttachments: !!attachments,
          messageType: messageType,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          facebookMessageId: fbMessageId,
          replyToFacebookMessageId: replyToMid,
          ...(originalMediaUrls.length > 0 ? { originalMediaUrls, mediaArchivedCount } : {}),
          ...replyMeta
        }),
        createdAt: timestamp,
        updatedAt: timestamp // ✅ FIX: Add required updatedAt field
      };

      const saveStartTime = Date.now();
      const newMessage = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.message.create({
          data: messageData
        });
      }, 5); // High priority
      const afterSaveTime = Date.now();
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${afterSaveTime - saveStartTime}ms] 💾 [HANDLE] Message saved to DB: ${newMessage.id} from ${customer.firstName} ${customer.lastName}`);
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${afterSaveTime - handleStartTime}ms] ⏱️ [HANDLE] Total time to save message`);

      // 🆕 Update lastMessageIsFromCustomer (this is a customer message)
      await updateConversationLastMessageStatus(conversation.id, true);

      // ⚡ OPTIMIZATION: Send socket event IMMEDIATELY after saving message
      // Don't wait for conversation update - send message first, update conversation in background
      const socketStartTime = Date.now();
      const socketService = require('../services/socketService');
      const io = socketService.getIO();
      if (io) {
        const socketData = proxySocketMessageData({
          id: newMessage.id,
          conversationId: newMessage.conversationId,
          content: newMessage.content,
          type: newMessage.type.toLowerCase(),
          isFromCustomer: newMessage.isFromCustomer,
          timestamp: newMessage.createdAt,
          attachments: newMessage.attachments ? JSON.parse(newMessage.attachments) : null,
          metadata: newMessage.metadata ? JSON.parse(newMessage.metadata) : null,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          // 🏢 Company Isolation
          companyId: customer.companyId,
          // 📱 Platform identification for filtering
          platform: 'facebook',
          channel: 'FACEBOOK'
        }, {
          messageId: newMessage.id,
          customerId: customer.id
        });

        // ✅ إرسال للشركة فقط - Company Isolation
        io.to(`company_${customer.companyId}`).emit('new_message', socketData);
        console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - socketStartTime}ms] 🔌 [SOCKET] Message emitted to company ${customer.companyId} - MESSAGE SHOULD BE VISIBLE NOW!`);
        console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - handleStartTime}ms] ✅ [HANDLE] Message saved and sent to frontend - Total time so far`);

        try {
          const { sendBrowserPushToCompany } = require('../services/browserPushService');
          const previewBody =
            messageType === 'IMAGE'
              ? 'أرسل العميل صورة جديدة'
              : messageType === 'FILE'
                ? 'أرسل العميل ملفًا جديدًا'
                : content && content.trim() !== ''
                  ? content
                  : 'لديك رسالة جديدة من عميل';

          void sendBrowserPushToCompany({
            companyId: customer.companyId,
            typeId: 'customer_message',
            title: `رسالة جديدة من ${`${customer.firstName} ${customer.lastName}`.trim() || 'عميل'}`,
            body: previewBody,
            compactBody: 'لديك رسالة جديدة من عميل',
            url: `/facebook-inbox?conversationId=${encodeURIComponent(conversation.id)}`,
            data: {
              conversationId: conversation.id,
              customerId: customer.id,
              channel: 'FACEBOOK',
            },
          }).catch((pushError) => {
            console.error(`❌ [WEB-PUSH-${messageId.slice(-8)}] Error sending message push:`, pushError.message || pushError);
          });
        } catch (pushBootstrapError) {
          console.error(`❌ [WEB-PUSH-${messageId.slice(-8)}] Failed to bootstrap message push:`, pushBootstrapError.message || pushBootstrapError);
        }

        // Emit new conversation event if this is a new conversation
        if (isNewConversation) {
          const convEventStartTime = Date.now();
          // Transform conversation data to match frontend format
          const conversationData = {
            id: conversation.id,
            customerName: `${customer.firstName} ${customer.lastName}`.trim() || 'عميل',
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.createdAt,
            unreadCount: 1,
            platform: 'facebook',
            isOnline: false,
            messages: [socketData],
            // Add page information
            pageName: pageData?.pageName || null,
            pageId: messagePageId,
            // 🆕 Add flags for unread tab filtering
            lastMessageIsFromCustomer: true,
            lastCustomerMessageIsUnread: true,
            // 🔧 FIX: Clear lastSenderName for customer messages
            lastSenderName: null
          };

          // Emit to company room
          socketService.emitNewConversation(customer.companyId, conversationData);
          console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - convEventStartTime}ms] 📤 [SOCKET] New conversation event emitted`);
        }
      }

      // 🔧 FIX: Update conversation lastMessagePreview AFTER sending socket (non-blocking)
      const lastMessagePreview = messageType === 'IMAGE' ? '📷 صورة' :
        messageType === 'FILE' ? '📎 ملف' :
          (content && content.trim() !== '' ?
            (content.length > 100 ? content.substring(0, 100) + '...' : content) :
            null);

      if (lastMessagePreview) {
        const updateConvStartTime = Date.now();
        // ⚡ OPTIMIZATION: Don't await - update in background
        // 🔧 FIX: Clear lastSenderName from metadata when customer sends a message
        safeQuery(async () => {
          const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
          const prisma = await getSharedPrismaClientAsync();
          return await prisma.conversation.findUnique({
            where: { id: conversation.id },
            select: { metadata: true }
          });
        }, 3).then(conv => {
          let metadata = {};
          if (conv?.metadata) {
            try {
              metadata = JSON.parse(conv.metadata);
            } catch (e) {
              console.warn('⚠️ Error parsing conversation metadata:', e);
            }
          }
          // Clear lastSenderName when customer sends a message
          delete metadata.lastSenderName;
          delete metadata.lastSenderId;

          // We need prisma here too, but it's in the background. 
          // Let's get it again or pass it. Using getSharedPrismaClient() is safer here if already initialized.
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const prisma = getSharedPrismaClient();
          if (!prisma) return;

          return prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: timestamp,
              lastMessagePreview: lastMessagePreview,
              metadata: JSON.stringify(metadata),
              updatedAt: new Date()
            }
          });
        }).then(() => {
          console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - updateConvStartTime}ms] 🔄 [HANDLE] Updated conversation preview (background)`);
        }).catch(error => {
          console.error(`⏱️ [TIMING-${messageId.slice(-8)}] ❌ [HANDLE] Error updating conversation preview:`, error);
        });
      }

      // 🔔 إنشاء إشعار للرسالة الجديدة من العميل
      if (newMessage.isFromCustomer && customer.companyId) {
        try {
          // 🚫 NOTIFICATIONS DISABLED TEMPORARILY
          /*
          const notificationContent = newMessage.content 
            ? (newMessage.content.length > 50 ? newMessage.content.substring(0, 50) + '...' : newMessage.content)
            : (newMessage.type === 'IMAGE' ? '📷 صورة' : newMessage.type === 'FILE' ? '📎 ملف' : 'رسالة جديدة');
   
          await prisma.notification.create({
            data: {
              companyId: customer.companyId,
              userId: null, // إشعار عام للشركة
              type: 'new_message',
              title: `رسالة جديدة من ${customer.firstName || 'عميل'}`,
              message: notificationContent,
              data: JSON.stringify({
                conversationId: conversation.id,
                messageId: newMessage.id,
                customerId: customer.id,
                customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
                messageType: newMessage.type
              })
            }
          });
   
          // 🔌 إرسال إشعار عبر Socket للشركة
          const socketService = require('../services/socketService');
          socketService.emitToCompany(customer.companyId, 'new_message_notification', {
            conversationId: conversation.id,
            customerId: customer.id,
            customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            message: notificationContent,
            timestamp: newMessage.createdAt
          });
   
          console.log(`🔔 [NOTIFICATION] Created new message notification for company ${customer.companyId}`);
          */
        } catch (notifError) {
          console.error('❌ [NOTIFICATION] Error creating message notification:', notifError);
        }
      }

      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - handleStartTime}ms] ✅ [HANDLE] Total handleFacebookMessage time - Message should be visible now!`);

      // ── 🤖 Bot automation for Facebook Messenger (no-AI rules: welcome / keyword / default) ──
      let botHandledFb = false;
      const fbBotText = (messageText || (messageType === 'TEXT' ? content : '') || '').trim();
      if (fbBotText && customer.companyId && pageData?.pageAccessToken) {
        try {
          const { isUnsubscribeText, isUnsubscribed, recordUnsubscribe, UNSUBSCRIBE_CONFIRMATION } = require('../services/botUnsubscribeService');
          const alreadyUnsubscribed = await isUnsubscribed(customer.companyId, customer.id, 'FACEBOOK');
          const isStop = isUnsubscribeText(fbBotText);
          if (isStop || alreadyUnsubscribed) {
            if (isStop) {
              await recordUnsubscribe(customer.companyId, customer.id, 'FACEBOOK', fbBotText.slice(0, 200));
              await sendProductionFacebookMessage(
                senderId,
                UNSUBSCRIBE_CONFIRMATION,
                'TEXT',
                messagePageId,
                pageData.pageAccessToken
              );
            }
            botHandledFb = true;
          }

          const { evaluateInboundBotReply } = require('../services/botRuleEngine');
          const firstContact = (await prisma.message.count({
            where: { conversationId: conversation.id }
          })) <= 1;

          const evaluation = await evaluateInboundBotReply({
            companyId: customer.companyId,
            text: fbBotText,
            channel: 'FACEBOOK',
            customer: {
              firstName: customer.firstName,
              lastName: customer.lastName,
            },
            isFirstMessage: firstContact,
          });

          if (evaluation?.kind && (evaluation.replyText || evaluation.mediaUrl)) {
            const { sendFacebookRichMessage } = require('../services/botMessageSender');
            const fbResult = evaluation.buttons && evaluation.buttons.length > 0
              ? await sendFacebookRichMessage({
                  senderId,
                  pageId: messagePageId,
                  pageAccessToken: pageData.pageAccessToken,
                  text: evaluation.replyText,
                  mediaUrl: evaluation.replyType === 'IMAGE' ? evaluation.mediaUrl : null,
                  buttons: evaluation.buttons,
                })
              : await sendProductionFacebookMessage(
                  senderId,
                  evaluation.replyType === 'IMAGE' ? evaluation.mediaUrl : evaluation.replyText,
                  evaluation.replyType === 'IMAGE' ? 'IMAGE' : 'TEXT',
                  messagePageId,
                  pageData.pageAccessToken
                );
            if (fbResult?.success) {
              const replySource = evaluation.kind === 'smart_reply'
                ? 'smart_reply'
                : (evaluation.kind === 'rule'
                  ? 'rule_reply'
                  : (evaluation.kind === 'welcome' ? 'welcome_reply' : 'default_reply'));

              const savedReply = await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  content: evaluation.replyText,
                  type: 'TEXT',
                  isFromCustomer: false,
                  senderId: null,
                  metadata: JSON.stringify({
                    platform: 'facebook',
                    source: replySource,
                    ruleId: evaluation.ruleId || null,
                    templateName: evaluation.templateName || null,
                    matchedKeyword: evaluation.matchedKeyword || null,
                    isFacebookReply: true,
                    timestamp: new Date(),
                  }),
                },
              }).catch((e) => {
                console.error('[BOT-RULES] Failed to save FB bot reply:', e.message);
                return null;
              });

              if (savedReply) {
                try {
                  const socketService = require('../services/socketService');
                  const io = socketService.getIO();
                  if (io) {
                    const socketData = proxySocketMessageData({
                      id: savedReply.id,
                      conversationId: savedReply.conversationId,
                      content: savedReply.content,
                      type: savedReply.type.toLowerCase(),
                      isFromCustomer: false,
                      timestamp: savedReply.createdAt,
                      metadata: JSON.parse(savedReply.metadata || '{}'),
                      senderId: null,
                      senderName: evaluation.kind === 'smart_reply' ? 'الردود التلقائية' : 'البوت الآلي',
                      lastMessageIsFromCustomer: false,
                      lastCustomerMessageIsUnread: false,
                      companyId: customer.companyId,
                      platform: 'facebook',
                      channel: 'FACEBOOK',
                    }, {
                      messageId: savedReply.id,
                    });
                    io.to(`company_${customer.companyId}`).emit('new_message', socketData);
                  }
                } catch (sockErr) {
                  console.warn('⚠️ [BOT-RULES] Socket emit error:', sockErr.message);
                }

                safeQuery(async () => {
                  const p = getPrisma();
                  return await p.conversation.update({
                    where: { id: conversation.id },
                    data: {
                      lastMessageAt: new Date(),
                      lastMessagePreview: evaluation.replyText.length > 100 ? evaluation.replyText.substring(0, 100) + '...' : evaluation.replyText,
                      lastMessageIsFromCustomer: false,
                      unreadCount: 0,
                      updatedAt: new Date(),
                    },
                  });
                }, 2).catch(() => {});
              }

              botHandledFb = true;
            }
          }
        } catch (e) {
          console.error('❌ [BOT-RULES] Error in Facebook bot automation:', e.message);
        }
      }

      if (!botHandledFb && customer?.id) {
        try {
          const { onCustomerReply } = require('../services/botFlowRuntime');
          const flowResult = await onCustomerReply({
            companyId: customer.companyId,
            customerId: customer.id,
            channel: 'FACEBOOK',
            text: fbBotText,
            sendStep: async (step) => {
              const { sendFacebookRichMessage } = require('../services/botMessageSender');
              if (step.buttons && step.buttons.length > 0) {
                await sendFacebookRichMessage({
                  senderId,
                  pageId: messagePageId,
                  pageAccessToken: pageData.pageAccessToken,
                  text: step.content,
                  mediaUrl: step.mediaUrl || null,
                  buttons: step.buttons,
                });
              } else if (step.mediaUrl) {
                await sendProductionFacebookMessage(
                  senderId,
                  step.mediaUrl,
                  'IMAGE',
                  messagePageId,
                  pageData.pageAccessToken
                );
              } else {
                await sendProductionFacebookMessage(
                  senderId,
                  step.content,
                  'TEXT',
                  messagePageId,
                  pageData.pageAccessToken
                );
              }
              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  content: step.content,
                  type: 'TEXT',
                  isFromCustomer: false,
                  senderId: null,
                  metadata: JSON.stringify({ platform: 'facebook', source: 'flow_step' }),
                },
              }).catch(() => {});
            },
          });
          if (flowResult?.handled) {
            botHandledFb = true;
          }
        } catch (e) {
          console.error('❌ [BOT-FLOW] Error in Facebook flow handling:', e.message);
        }
      }

      // ── 🤖 AI Auto-Reply for Facebook Messenger (fire-and-forget, never blocks the webhook) ──
      const hasCustomerTextForAi = isValidMessageContent(messageText || content);
      const hasCustomerAttachmentsForAi = Array.isArray(attachmentsData) && attachmentsData.length > 0;
      const aiCustomerContent = (
        messageText || (messageType === 'TEXT' ? content : '')
      ).trim();
      const shouldRunFacebookAiAutoReply = Boolean(
        !botHandledFb &&
        customer.companyId &&
        (hasCustomerTextForAi || hasCustomerAttachmentsForAi) &&
        (aiCustomerContent || hasCustomerAttachmentsForAi)
      );

      if (shouldRunFacebookAiAutoReply) {
        setImmediate(async () => {
          try {
            console.log(`🤖 [AI-AUTOREPLY] Triggered AI auto-reply check for customer: ${customer.id}`);

            // 1. Gate check: AI settings and working hours
            const { getSharedPrismaClient } = require('../services/sharedDatabase');
            const prisma = getSharedPrismaClient();
            const { getEffectiveAiAutoReplySetting } = require('../services/aiSettingsResolver');
            const aiSetting = await getEffectiveAiAutoReplySetting(customer.companyId, prisma);
            if (!aiSetting?.autoReplyEnabled) { console.log('🤖 [AI-AUTOREPLY] AI auto-reply disabled for company'); return; }
            if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
              try {
                const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
                const now = new Date();
                const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
                const today = hours[dayName];
                if (today && !today.enabled) { console.log('🤖 [AI-AUTOREPLY] Outside working hours (day disabled)'); return; }
                if (today && today.start && today.end) {
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const [startH, startM] = today.start.split(':').map(Number);
                  const [endH, endM] = today.end.split(':').map(Number);
                  const startMin = startH * 60 + startM;
                  const endMin = endH * 60 + endM;
                  if (currentMinutes < startMin || currentMinutes > endMin) { console.log('🤖 [AI-AUTOREPLY] Outside working hours (time)'); return; }
                }
              } catch(e) { /* continue if parsing fails */ }
            }

            // 2. Debounce: accumulate messages within N seconds, then process once
            const { accumulateFB } = require('../services/facebookDebounceService');

            accumulateFB(senderId, messagePageId, customer.companyId, pageData?.pageAccessToken, {
              message: aiCustomerContent,
              customerId: customer.id,
              conversationId: conversation.id,
              companyId: customer.companyId,
              messagePageId,
              senderId,
              fbMessageId,
              attachments: attachmentsData,
            }, async (entries) => {
              if (entries.length === 0) return;

              const combinedMessage = entries.map(e => e.message).join('\n---\n');
              const combinedAttachments = entries.flatMap(e => e.attachments || []).filter(Boolean);
              const first = entries[0];
              const latestPageData = await getPageToken(first.messagePageId);
              const accessToken = latestPageData?.pageAccessToken || pageData?.pageAccessToken;

              console.log(`🤖 [AI-AUTOREPLY] Processing ${entries.length} debounced message(s) as one request`);

              if (first.conversationId) {
                const prisma = getSharedPrismaClient();
                const conversation = await prisma.conversation.findUnique({
                  where: { id: first.conversationId },
                  select: { aiEnabled: true, metadata: true }
                });
                if (conversation && conversation.aiEnabled === false) {
                  console.log(`🤖 [AI-AUTOREPLY] AI auto-reply disabled for conversation ${first.conversationId}`);
                  return;
                }
                if (conversation?.metadata) {
                  try {
                    const convMeta = typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : conversation.metadata;
                    if (convMeta?.aiPausedUntil && new Date(convMeta.aiPausedUntil) > new Date()) {
                      console.log(`🤖 [AI-AUTOREPLY] AI agent is paused until ${convMeta.aiPausedUntil} due to human handover on conversation ${first.conversationId}`);
                      return;
                    }
                  } catch (e) {}
                }
              }

              // Pre-fetch fresh Facebook image attachments into Base64 data URLs
              // to prevent DeepSeek and vision providers from failing on external CDN downloads
              for (const att of combinedAttachments) {
                if ((att.type === 'image' || att.type === 'photo') && att.url && !att.data_url) {
                  try {
                    const axios = require('axios');
                    const imgResp = await axios.get(att.url, {
                      responseType: 'arraybuffer',
                      timeout: 7000,
                      headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (imgResp.status === 200 && imgResp.data) {
                      const ct = imgResp.headers['content-type'] || 'image/jpeg';
                      const b64 = Buffer.from(imgResp.data).toString('base64');
                      att.data_url = `data:${ct};base64,${b64}`;
                      console.log(`📸 [FB-AI-ATTACHMENT] Successfully pre-fetched image into Base64 (${Math.round(b64.length / 1024)} KB)`);
                    }
                  } catch (imgErr) {
                    console.warn(`⚠️ [FB-AI-ATTACHMENT] Failed to pre-fetch image URL: ${imgErr.message}`);
                  }
                }
              }

              // 3. Process through Python AI service
              const aiSdkClient = require('../services/aiSdkClient');
              const result = await aiSdkClient.sendChatMessage({
                companyId: first.companyId,
                customerId: first.customerId,
                message: combinedMessage,
                threadId: first.conversationId,
                channel: 'FACEBOOK',
                attachments: combinedAttachments.length > 0 ? combinedAttachments : undefined,
              });

              // Silent Escalation with Polite Customer Reassurance
              if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
                const { flagThreadForHumanTakeover } = require('../services/silentEscalationService');
                await flagThreadForHumanTakeover({
                  companyId: first.companyId,
                  conversationId: first.conversationId,
                  customerId: first.customerId,
                  reason: result.escalation?.reason || 'ai_failure',
                  customerMessage: combinedMessage,
                  channel: 'FACEBOOK',
                });

                if (accessToken) {
                  const handoverNotice = 'ثواني بس هحول حضرتك لأحد زملائنا في خدمة العملاء عشان يتابع معاك ويفيدك بالتفصيل فوراً 🙏';
                  try {
                    await sendFacebookMessage(first.senderId, handoverNotice, 'TEXT', first.messagePageId, first.fbMessageId);
                    const prisma = getSharedPrismaClient();
                    await prisma.message.create({
                      data: {
                        id: require('crypto').randomUUID(),
                        content: handoverNotice,
                        type: 'TEXT',
                        conversationId: first.conversationId,
                        isFromCustomer: false,
                        senderId: null,
                        metadata: JSON.stringify({
                          platform: 'facebook',
                          source: 'handover_reassurance',
                          isFacebookReply: true,
                          timestamp: new Date()
                        }),
                        createdAt: new Date(),
                        updatedAt: new Date()
                      }
                    }).catch(() => {});
                  } catch (e) {
                    console.error('❌ [AI-AUTOREPLY] Failed to send handover reassurance:', e.message);
                  }
                }
                return;
              }

              const rawReplyText = result.reply;

              if (rawReplyText) {
                const { sanitizeAiReply } = require('./aiReplySanitizer');
                const { cleanedText: replyText, attachments } = sanitizeAiReply(
                  rawReplyText,
                  result.response_attachments || result.responseAttachments
                );

                console.log(`🤖 [AI-AUTOREPLY] AI response cleaned: "${(replyText || '').substring(0, 50)}..." [attachments: ${attachments.length}]`);

                // 4. Save the AI reply to database (cleaned text without ugly raw image links)
                const replyId = require('crypto').randomUUID();
                const savedReply = await safeQuery(async () => {
                  return await prisma.message.create({
                    data: {
                      id: replyId,
                      content: replyText || ' ',
                      type: 'TEXT',
                      conversationId: first.conversationId,
                      isFromCustomer: false,
                      senderId: null,
                      metadata: JSON.stringify({
                        platform: 'facebook',
                        source: 'ai_reply',
                        isFacebookReply: true,
                        timestamp: new Date(),
                        instantSave: true,
                        debouncedBatchCount: entries.length,
                        attachments: attachments.map(a => ({ type: a.type, url: a.url })),
                      }),
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  });
                }, 3);

                console.log(`💾 [AI-AUTOREPLY] AI reply saved to DB: ${savedReply.id}`);

                // 5. Emit the AI reply to frontend
                const socketService = require('../services/socketService');
                const io = socketService.getIO();
                if (io) {
                  const socketData = proxySocketMessageData({
                    id: savedReply.id,
                    conversationId: savedReply.conversationId,
                    content: savedReply.content,
                    type: savedReply.type.toLowerCase(),
                    isFromCustomer: savedReply.isFromCustomer,
                    timestamp: savedReply.createdAt,
                    metadata: JSON.parse(savedReply.metadata),
                    senderId: null,
                    senderName: 'الذكاء الاصطناعي',
                    lastMessageIsFromCustomer: false,
                    lastCustomerMessageIsUnread: false,
                    companyId: first.companyId,
                    platform: 'facebook',
                    channel: 'FACEBOOK'
                  }, {
                    messageId: savedReply.id
                  });

                  io.to(`company_${first.companyId}`).emit('new_message', socketData);
                  console.log(`⚡ [AI-AUTOREPLY] AI reply emitted to company socket room`);
                }

                // 6. Update conversation metadata
                await safeQuery(async () => {
                  return await prisma.conversation.update({
                    where: { id: first.conversationId },
                    data: {
                      lastMessageAt: new Date(),
                      lastMessagePreview: replyText.length > 100 ? replyText.substring(0, 100) + '...' : replyText,
                      lastMessageIsFromCustomer: false,
                      unreadCount: 0,
                      updatedAt: new Date()
                    }
                  });
                }, 3);

                // 7. Send the reply to Facebook Messenger
                if (accessToken) {
                  const textToSend = replyText.trim();
                  let fbResult = { success: true };

                  if (textToSend) {
                    fbResult = await sendFacebookMessage(first.senderId, textToSend, 'TEXT', first.messagePageId, first.fbMessageId);
                  }

                  if (fbResult.success) {
                    console.log(`✅ [AI-AUTOREPLY] AI text reply sent successfully to Facebook.`);
                    if (fbResult.messageId) {
                      try {
                        const { recordSystemSentFacebookMessage } = require('./facebookMessageTracker');
                        recordSystemSentFacebookMessage(fbResult.messageId, {
                          isAi: true,
                          source: 'ai_reply',
                          conversationId: first.conversationId
                        });
                      } catch (trackErr) {}

                      await safeQuery(async () => {
                        return await prisma.message.update({
                          where: { id: savedReply.id },
                          data: {
                            metadata: JSON.stringify({
                              ...JSON.parse(savedReply.metadata),
                              facebookMessageId: fbResult.messageId,
                              sentToFacebook: true
                            })
                          }
                        });
                      }, 3);
                    }
                  } else {
                    console.error(`❌ [AI-AUTOREPLY] Failed to send AI reply to Facebook:`, fbResult.message || fbResult.error);
                  }

                  // 7b. Send image attachments from AI response natively as IMAGE messages
                  console.log(`[FB-AI-ATTACHMENTS] sending ${attachments?.length || 0} native attachment(s)`);
                  if (Array.isArray(attachments)) {
                    for (const att of attachments) {
                      if (att.type === 'image' && att.url && !att.url.startsWith('data:')) {
                        console.log(`[FB-AI-ATTACHMENT] sending native image: ${att.url.substring(0, 80)}...`);
                        try {
                          const imgResult = await sendFacebookMessage(first.senderId, att.url, 'IMAGE', first.messagePageId, first.fbMessageId);
                          if (imgResult.success) {
                            console.log(`✅ [FB-AI-ATTACHMENT] AI image attachment sent to Facebook.`);
                            if (imgResult.messageId) {
                              try {
                                const { recordSystemSentFacebookMessage } = require('./facebookMessageTracker');
                                recordSystemSentFacebookMessage(imgResult.messageId, {
                                  isAi: true,
                                  source: 'ai_reply',
                                  conversationId: first.conversationId,
                                  url: att.url
                                });
                              } catch (trackErr) {}
                            }

                            // 📸 CRITICAL FIX: Persist the AI image attachment into the database as an AI reply!
                            // This ensures the database and frontend have the exact image, and prevents Meta's
                            // Echo Webhook from misinterpreting this as a manual human staff reply (which would pause the AI).
                            const imgReplyId = require('crypto').randomUUID();
                            const savedImgReply = await safeQuery(async () => {
                              return await prisma.message.create({
                                data: {
                                  id: imgReplyId,
                                  content: att.url,
                                  type: 'IMAGE',
                                  conversationId: first.conversationId,
                                  isFromCustomer: false,
                                  senderId: null,
                                  attachments: JSON.stringify([{ type: 'image', payload: { url: att.url } }]),
                                  metadata: JSON.stringify({
                                    platform: 'facebook',
                                    source: 'ai_reply',
                                    isFacebookReply: true,
                                    facebookMessageId: imgResult.messageId || null,
                                    sentToFacebook: true,
                                    timestamp: new Date()
                                  }),
                                  createdAt: new Date(),
                                  updatedAt: new Date()
                                }
                              });
                            }, 3);

                            // Emit the AI image message to socket so frontend chat updates live
                            if (io && savedImgReply) {
                              try {
                                const imgSocketData = proxySocketMessageData({
                                  id: savedImgReply.id,
                                  conversationId: savedImgReply.conversationId,
                                  content: savedImgReply.content,
                                  type: 'image',
                                  isFromCustomer: false,
                                  timestamp: savedImgReply.createdAt,
                                  metadata: JSON.parse(savedImgReply.metadata),
                                  senderId: null,
                                  senderName: 'الذكاء الاصطناعي',
                                  lastMessageIsFromCustomer: false,
                                  lastCustomerMessageIsUnread: false,
                                  companyId: first.companyId,
                                  platform: 'facebook',
                                  channel: 'FACEBOOK'
                                }, { messageId: savedImgReply.id });
                                io.to(`company_${first.companyId}`).emit('new_message', imgSocketData);
                              } catch (sockErr) {
                                console.warn('[FB-AI-ATTACHMENT] Failed to emit socket data for image:', sockErr.message);
                              }
                            }
                          } else {
                            console.error(`❌ [FB-AI-ATTACHMENT] Failed to send image:`, imgResult.error || imgResult.message);
                          }
                        } catch (e) {
                          console.error('[FB-AI-ATTACHMENT] Exception sending image:', e.message);
                        }
                      } else {
                        console.log(`[FB-AI-ATTACHMENT] skipping attachment type=${att.type} url=${(att.url || '').substring(0, 40)}...`);
                      }
                    }
                  }
                } else {
                  console.error(`❌ [AI-AUTOREPLY] Missing Facebook Page Access Token for page: ${first.messagePageId}`);
                }
              } else {
                console.log(`🤖 [AI-AUTOREPLY] AI service returned no reply (skipped or disabled).`);
              }
            });
          } catch (aiError) {
            console.error('❌ [AI-AUTOREPLY] Error in Facebook AI auto-reply loop:', aiError);
          }
        });
      }

      //console.log(`🎉 [WEBHOOK] Message processing completed for customer: ${customer.firstName} ${customer.lastName}`);
      return;
    }


  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
    // Failsafe: stop typing on errors
    try {
      // typingKeepAlive may not be defined if error occurred earlier but it's harmless
      if (typeof typingKeepAlive !== 'undefined' && typingKeepAlive) {
        clearInterval(typingKeepAlive);
      }
      const socketService = require('../services/socketService');
      if (pageData && pageData.pageAccessToken && messagePageId) {
        await sendFacebookSenderAction(senderId, 'typing_off', messagePageId, pageData.pageAccessToken);
      }
    } catch (e) {
      // ignore
    }
  }
}

// Stub functions for compatibility
async function handleMessageDirectly(senderId, messageText, webhookEvent) {
  //console.log(`📨 Direct message from ${senderId}: "${messageText}"`);
  await handleFacebookMessage(webhookEvent);
}

// NEW: Function to delete a Facebook comment
async function deleteFacebookComment(commentId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${commentId}`;

    const response = await axios.delete(url, {
      params: { access_token: pageAccessToken },
      timeout: 15000,
    });

    if (response.data?.error) {
      console.error('❌ [COMMENT-DELETE] Error deleting comment:', response.data.error);
      return false;
    }

    if (response.data?.success === true) {
      return true;
    } else {
      console.error('❌ [COMMENT-DELETE] Unexpected response format:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ [COMMENT-DELETE] Error deleting comment:', error?.response?.data || error.message);
    return false;
  }
}

// NEW: Function to hide a Facebook comment
async function hideFacebookComment(commentId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${commentId}`;

    const response = await axios.post(url,
      new URLSearchParams({ is_hidden: 'true', access_token: pageAccessToken }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    if (response.data?.error) {
      console.error('❌ [COMMENT-HIDE] Error hiding comment:', response.data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ [COMMENT-HIDE] Error hiding comment:', error?.response?.data || error.message);
    return false;
  }
}

// Enhanced diagnostic function
async function diagnoseFacebookSending(recipientId, messageContent, pageId = null) {
  const prisma = await getPrisma(); // ✅ Get connected instance
  //console.log('🔍 [DIAGNOSTIC] Starting Facebook sending diagnosis...');

  try {
    // Step 1: Check recipient ID
    //console.log(`🔍 [DIAGNOSTIC] Step 1 - Recipient ID: ${recipientId}`);
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      //console.log('❌ [DIAGNOSTIC] Invalid recipient ID');
      return { success: false, error: 'INVALID_RECIPIENT_ID' };
    }

    // Step 2: Check page data
    //console.log(`🔍 [DIAGNOSTIC] Step 2 - Page ID: ${pageId}`);
    let pageData = null;
    if (pageId) {
      pageData = await getPageToken(pageId);
      //console.log(`🔍 [DIAGNOSTIC] Page data found:`, pageData ? 'YES' : 'NO');
    }

    // Step 3: Check last webhook page
    //console.log(`🔍 [DIAGNOSTIC] Step 3 - Last webhook page: ${lastWebhookPageId}`);
    if (!pageData && lastWebhookPageId) {
      pageData = await getPageToken(lastWebhookPageId);
      //console.log(`🔍 [DIAGNOSTIC] Last webhook page data:`, pageData ? 'YES' : 'NO');
    }

    // Step 4: Check default page
    if (!pageData) {
      //console.log(`🔍 [DIAGNOSTIC] Step 4 - Searching for default page...`);
      const defaultPage = await prisma.facebookPage.findFirst({
        where: { status: 'connected' },
        orderBy: { connectedAt: 'desc' }
      });
      //console.log(`🔍 [DIAGNOSTIC] Default page found:`, defaultPage ? 'YES' : 'NO');
      if (defaultPage) {
        pageData = {
          pageAccessToken: defaultPage.pageAccessToken,
          pageName: defaultPage.pageName,
          companyId: defaultPage.companyId,
          lastUsed: Date.now()
        };
      }
    }

    // Step 5: Final validation
    //console.log(`🔍 [DIAGNOSTIC] Step 5 - Final validation:`);
    //console.log(`   - Page data exists: ${!!pageData}`);
    //console.log(`   - Page access token exists: ${!!pageData?.pageAccessToken}`);
    //console.log(`   - Page name: ${pageData?.pageName || 'N/A'}`);
    //console.log(`   - Company ID: ${pageData?.companyId || 'N/A'}`);

    if (!pageData || !pageData.pageAccessToken) {
      //console.log('❌ [DIAGNOSTIC] No valid page data found');
      return { success: false, error: 'NO_VALID_PAGE' };
    }

    return {
      success: true,
      message: 'Diagnostic completed - no actual message sent',
      diagnostic: {
        recipientId,
        pageId: pageId || lastWebhookPageId,
        hasToken: !!pageData.pageAccessToken,
        pageName: pageData.pageName
      }
    };

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Error during diagnosis:', error);
    return { success: false, error: 'DIAGNOSTIC_ERROR', details: error.message };
  }
}

// 🆕 دالة مركزية لتحديث lastMessageIsFromCustomer في المحادثة
async function updateConversationLastMessageStatus(conversationId, isFromCustomer) {
  if (!conversationId) return;

  try {
    const prisma = await getPrisma();

    const updateData = {
      lastMessageIsFromCustomer: Boolean(isFromCustomer),
      lastMessageAt: new Date()
    };

    // إذا كانت الرسالة من العميل، زيادة عداد الرسائل غير المقروءة
    if (isFromCustomer) {
      updateData.unreadCount = { increment: 1 };
    }

    await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      await prisma.conversation.update({
        where: { id: conversationId },
        data: updateData
      });
    });

    console.log(`✅ [CONV-UPDATE] Updated conversation ${conversationId}: lastMessageIsFromCustomer=${isFromCustomer}`);
  } catch (error) {
    console.error(`❌ [CONV-UPDATE] Failed to update conversation ${conversationId}:`, error.message);
  }
}

// 🆕 دالة لإعادة تعيين عداد الرسائل غير المقروءة عند الرد
async function resetConversationUnreadCount(conversationId) {
  if (!conversationId) return;

  try {
    const prisma = await getPrisma();

    await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: 0,
          lastMessageIsFromCustomer: false
        }
      });
    });

    console.log(`✅ [CONV-UPDATE] Reset unread count for conversation ${conversationId}`);
  } catch (error) {
    console.error(`❌ [CONV-UPDATE] Failed to reset unread count for ${conversationId}:`, error.message);
  }
}


// 📸 Handle incoming Instagram DM messages
async function handleInstagramMessage(webhookEvent, facebookPage) {
  try {
    const senderId = webhookEvent.sender?.id;
    const messageId = webhookEvent.message?.mid || `ig_msg_${Date.now()}`;
    const messageText = webhookEvent.message?.text || null;
    const attachments = webhookEvent.message?.attachments || null;
    const companyId = facebookPage.companyId;

    if (!senderId || !companyId) {
      console.error('❌ [IG-MSG] Missing senderId or companyId');
      return;
    }

    console.log(`📸 [IG-MSG] Received message ${messageId} from Instagram user ${senderId}`);

    // ── 1. Find or create customer (keyed on instagramId + companyId) ──────
    let customer = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.customer.findFirst({
        where: { instagramId: senderId, companyId }
      });
    });

    if (!customer) {
      try {
        customer = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          return await prisma.customer.create({
            data: {
              instagramId: senderId,
              firstName: 'عميل',
              lastName: 'إنستجرام',
              email: `instagram_${senderId}@example.com`,
              phone: '',
              companyId,
              metadata: JSON.stringify({ source: 'instagram_dm', senderId })
            }
          });
        });
      } catch (createErr) {
        if (createErr.code === 'P2002') {
          customer = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.customer.findFirst({
              where: { instagramId: senderId, companyId }
            });
          });
        } else {
          throw createErr;
        }
      }
    }

    if (!customer) {
      console.error('❌ [IG-MSG] Could not find or create customer for', senderId);
      return;
    }

    // ── 2. Find or create INSTAGRAM conversation ───────────────────────────
    let isNewConversation = false;
    let conversation = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          channel: 'INSTAGRAM',
          status: { in: ['ACTIVE', 'RESOLVED'] }
        },
        orderBy: { updatedAt: 'desc' }
      });
    });

    const timestamp = new Date();
    const igMeta = JSON.stringify({
      platform: 'instagram',
      source: 'direct_message',
      igAccountId: facebookPage.instagramAccountId,
      igAccountName: facebookPage.instagramAccountName,
      pageId: facebookPage.pageId,
      pageName: facebookPage.pageName
    });

    if (!conversation) {
      conversation = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.create({
          data: {
            customerId: customer.id,
            companyId,
            channel: 'INSTAGRAM',
            status: 'ACTIVE',
            lastMessageAt: timestamp,
            metadata: igMeta,
            lastMessageIsFromCustomer: true,
            unreadCount: 1
          }
        });
      });
      isNewConversation = true;
    } else {
      conversation = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'ACTIVE',
            lastMessageAt: timestamp,
            metadata: igMeta,
            lastMessageIsFromCustomer: true,
            unreadCount: { increment: 1 }
          }
        });
      });
    }

    // ── 3. Determine message type & content ───────────────────────────────
    let messageType = 'TEXT';
    let content = messageText || '';

    if (attachments && attachments.length > 0) {
      const att = attachments[0];
      const attType = att.type?.toLowerCase();
      if (attType === 'image') { messageType = 'IMAGE'; content = att.payload?.url || '[صورة]'; }
      else if (attType === 'video') { messageType = 'VIDEO'; content = att.payload?.url || '[فيديو]'; }
      else if (attType === 'audio') { messageType = 'AUDIO'; content = att.payload?.url || '[صوت]'; }
      else if (attType === 'file') { messageType = 'FILE'; content = att.payload?.url || '[ملف]'; }
      else { content = att.payload?.url || messageText || `[${att.type}]`; }
    }

    if (!content && messageType === 'TEXT') {
      console.log('⚠️ [IG-MSG] Empty message, skipping');
      return;
    }

    // ── 4. Save message ────────────────────────────────────────────────────
    const savedMessage = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content,
          type: messageType,
          isFromCustomer: true,
          isRead: false,
          metadata: JSON.stringify({
            instagramMessageId: messageId,
            senderId,
            platform: 'instagram'
          })
        }
      });
    });

    // ── 5. Emit Socket.IO ──────────────────────────────────────────────────
    try {
      const socketService = require('../services/socketService');
      const io = socketService.getIO();
      if (io) {
        const socketPayload = {
          id: savedMessage.id,
          conversationId: conversation.id,
          content: savedMessage.content,
          type: savedMessage.type.toLowerCase(),
          isFromCustomer: true,
          timestamp: savedMessage.createdAt,
          companyId,
          platform: 'instagram',
          channel: 'INSTAGRAM',
          isNewConversation,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            instagramId: senderId
          }
        };
        io.to(`company_${companyId}`).emit('new_message', socketPayload);
        if (isNewConversation) {
          io.to(`company_${companyId}`).emit('new_conversation', { ...socketPayload, conversation });
        }

        try {
          const { sendBrowserPushToCompany } = require('../services/browserPushService');
          void sendBrowserPushToCompany({
            companyId,
            typeId: 'customer_message',
            title: `رسالة انستجرام من ${customer.firstName || 'عميل'}`,
            body: messageText || 'أرسل العميل رسالة جديدة على انستجرام',
            compactBody: 'رسالة انستجرام جديدة',
            url: `/facebook-inbox?conversationId=${encodeURIComponent(conversation.id)}`,
            requireInteraction: true,
            data: {
              conversationId: conversation.id,
              customerId: customer.id,
              channel: 'INSTAGRAM',
            },
          }).catch((pushError) => {
            console.warn('⚠️ [IG-PUSH] Error:', pushError.message || pushError);
          });
        } catch (_) {}
      }
    } catch (socketErr) {
      console.error('⚠️ [IG-MSG] Socket emit error:', socketErr.message);
    }

    // ── 5.5 Bot / Smart Replies for Instagram ─────────────────────────────
    let botHandledIg = false;
    const igBotText = (messageText || (messageType === 'TEXT' ? content : '') || '').trim();
    if (igBotText && companyId && facebookPage?.pageAccessToken) {
      try {
        const { evaluateInboundBotReply } = require('../services/botRuleEngine');
        const pClient = getPrisma();
        const firstContact = (await pClient.message.count({
          where: { conversationId: conversation.id }
        })) <= 1;

        const evaluation = await evaluateInboundBotReply({
          companyId,
          text: igBotText,
          channel: 'INSTAGRAM',
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
          isFirstMessage: firstContact,
        });

        if (evaluation?.kind && evaluation.replyText) {
          const igResult = await sendInstagramMessage({
            recipientId: senderId,
            messageText: evaluation.replyText,
            igAccountId: facebookPage.instagramAccountId || facebookPage.pageId,
            pageAccessToken: facebookPage.pageAccessToken,
            companyId,
          });

          if (igResult?.success) {
            const replySource = evaluation.kind === 'smart_reply'
              ? 'smart_reply'
              : (evaluation.kind === 'rule'
                ? 'rule_reply'
                : (evaluation.kind === 'welcome' ? 'welcome_reply' : 'default_reply'));

            const savedReply = await pClient.message.create({
              data: {
                conversationId: conversation.id,
                content: evaluation.replyText,
                type: 'TEXT',
                isFromCustomer: false,
                senderId: null,
                metadata: JSON.stringify({
                  platform: 'instagram',
                  source: replySource,
                  ruleId: evaluation.ruleId || null,
                  templateName: evaluation.templateName || null,
                  matchedKeyword: evaluation.matchedKeyword || null,
                  isInstagramReply: true,
                  instagramMessageId: igResult.messageId || null,
                  timestamp: new Date(),
                }),
              },
            }).catch((e) => {
              console.error('[BOT-RULES] Failed to save IG bot reply:', e.message);
              return null;
            });

            if (savedReply) {
              try {
                const socketService = require('../services/socketService');
                const io = socketService.getIO();
                if (io) {
                  const socketPayload = {
                    id: savedReply.id,
                    conversationId: conversation.id,
                    content: savedReply.content,
                    type: 'text',
                    isFromCustomer: false,
                    timestamp: savedReply.createdAt,
                    companyId,
                    platform: 'instagram',
                    channel: 'INSTAGRAM',
                    senderName: evaluation.kind === 'smart_reply' ? 'الردود التلقائية' : 'البوت الآلي',
                  };
                  io.to(`company_${companyId}`).emit('new_message', socketPayload);
                }
              } catch (sockErr) {
                console.warn('⚠️ [BOT-RULES] IG Socket emit error:', sockErr.message);
              }

              safeQuery(async () => {
                const p = getPrisma();
                return await p.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    lastMessageAt: new Date(),
                    lastMessagePreview: evaluation.replyText.length > 100 ? evaluation.replyText.substring(0, 100) + '...' : evaluation.replyText,
                    lastMessageIsFromCustomer: false,
                    unreadCount: 0,
                    updatedAt: new Date(),
                  },
                });
              }, 2).catch(() => {});
            }

            botHandledIg = true;
          }
        }
      } catch (e) {
        console.error('❌ [BOT-RULES] Error in Instagram bot automation:', e.message);
      }
    }

    // ── 6. AI Auto-Reply for Instagram─────────────────────────────────────
    const hasCustomerTextForAi = messageText && messageText.trim().length > 0;
    const hasCustomerAttachmentsForAi = attachments && attachments.length > 0;
    const aiCustomerContent = [
      messageText || '',
      attachments && attachments.length > 0
        ? `[${attachments.map(a => a.type || 'attachment').join(', ')}]`
        : ''
    ].filter(Boolean).join('\n\n').trim();

    const shouldRunInstagramAiAutoReply = Boolean(
      !botHandledIg &&
      customer.companyId &&
      (hasCustomerTextForAi || hasCustomerAttachmentsForAi) &&
      aiCustomerContent
    );

    if (shouldRunInstagramAiAutoReply) {
      setImmediate(async () => {
        try {
          console.log(`🤖 [IG-AI-AUTOREPLY] Triggered AI auto-reply for Instagram user: ${senderId}`);
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const prisma = getSharedPrismaClient();
          const { getEffectiveAiAutoReplySetting } = require('../services/aiSettingsResolver');
          const aiSetting = await getEffectiveAiAutoReplySetting(customer.companyId, prisma);
          if (!aiSetting?.autoReplyEnabled) { console.log('🤖 [IG-AI-AUTOREPLY] AI auto-reply disabled for company'); return; }
          if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
            try {
              const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
              const now = new Date();
              const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
              const today = hours[dayName];
              if (today && !today.enabled) { console.log('🤖 [IG-AI-AUTOREPLY] Outside working hours (day disabled)'); return; }
              if (today && today.start && today.end) {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = today.start.split(':').map(Number);
                const [endH, endM] = today.end.split(':').map(Number);
                const startMin = startH * 60 + startM;
                const endMin = endH * 60 + endM;
                if (currentMinutes < startMin || currentMinutes > endMin) { console.log('🤖 [IG-AI-AUTOREPLY] Outside working hours (time)'); return; }
              }
            } catch(e) { /* continue if parsing fails */ }
          }

          const aiSdkClient = require('../services/aiSdkClient');
          const igAttachments = attachments && attachments.length > 0
            ? attachments.map(a => ({
                type: a.type || 'image',
                url: a.payload?.url || a.url || '',
                detail: 'high'
              })).filter(a => a.url)
            : undefined;

          if (conversation && conversation.aiEnabled === false) {
            console.log('🤖 [IG-AI-AUTOREPLY] AI auto-reply disabled for conversation');
            return;
          }

          const result = await aiSdkClient.sendChatMessage({
            companyId: customer.companyId,
            customerId: customer.id,
            message: aiCustomerContent,
            threadId: conversation.id,
            channel: 'INSTAGRAM',
            attachments: igAttachments
          });

          // Silent Escalation: AI failed → flag for human takeover, send nothing to customer
          if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
            const { flagThreadForHumanTakeover } = require('../services/silentEscalationService');
            await flagThreadForHumanTakeover({
              companyId: customer.companyId,
              conversationId: conversation.id,
              customerId: customer.id,
              reason: result.escalation?.reason || 'ai_failure',
              customerMessage: aiCustomerContent,
              channel: 'INSTAGRAM',
            });
            return;
          }

          const replyText = result.reply;

          if (replyText) {
            console.log(`🤖 [IG-AI-AUTOREPLY] AI generated Instagram response: "${replyText.substring(0, 50)}..."`);

            const replyId = require('crypto').randomUUID();
            const savedReply = await safeQuery(async () => {
              return await prisma.message.create({
                data: {
                  id: replyId,
                  content: replyText,
                  type: 'TEXT',
                  conversationId: conversation.id,
                  isFromCustomer: false,
                  senderId: null,
                  metadata: JSON.stringify({
                    platform: 'instagram',
                    source: 'ai_reply',
                    isInstagramReply: true,
                    timestamp: new Date(),
                    instantSave: true
                  }),
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
            }, 3);

            console.log(`💾 [IG-AI-AUTOREPLY] AI reply saved to DB: ${savedReply.id}`);

            const socketService2 = require('../services/socketService');
            const io2 = socketService2.getIO();
            if (io2) {
              const socketData = {
                id: savedReply.id,
                conversationId: savedReply.conversationId,
                content: savedReply.content,
                type: savedReply.type.toLowerCase(),
                isFromCustomer: savedReply.isFromCustomer,
                timestamp: savedReply.createdAt,
                metadata: JSON.parse(savedReply.metadata),
                senderId: null,
                senderName: 'AI Agent',
                lastMessageIsFromCustomer: false,
                lastCustomerMessageIsUnread: false,
                companyId: customer.companyId,
                platform: 'instagram',
                channel: 'INSTAGRAM'
              };
              io2.to(`company_${customer.companyId}`).emit('new_message', socketData);
            }

            await safeQuery(async () => {
              return await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessageAt: new Date(),
                  lastMessagePreview: replyText.length > 100 ? replyText.substring(0, 100) + '...' : replyText,
                  lastMessageIsFromCustomer: false,
                  unreadCount: 0,
                  updatedAt: new Date()
                }
              });
            }, 3);

            if (facebookPage?.instagramAccountId && facebookPage?.pageAccessToken) {
              try {
                const axios = require('axios');
                const IG_GRAPH_API = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${facebookPage.instagramAccountId}/messages`;
                const igRes = await axios.post(IG_GRAPH_API, {
                  recipient: { id: senderId },
                  message: { text: replyText },
                  access_token: facebookPage.pageAccessToken
                }, {
                  timeout: 15000,
                  headers: { 'Content-Type': 'application/json' }
                });

                console.log(`✅ [IG-AI-AUTOREPLY] AI reply sent to Instagram user ${senderId}`);

                if (igRes.data?.message_id) {
                  await safeQuery(async () => {
                    return await prisma.message.update({
                      where: { id: savedReply.id },
                      data: {
                        metadata: JSON.stringify({
                          ...JSON.parse(savedReply.metadata),
                          instagramMessageId: igRes.data.message_id,
                          sentToInstagram: true
                        })
                      }
                    });
                  }, 2);
                }
              } catch (sendErr) {
                console.error('❌ [IG-AI-AUTOREPLY] Failed sending to Instagram:', sendErr.response?.data || sendErr.message);
              }
            }
          }
        } catch (aiErr) {
          console.error('❌ [IG-AI-AUTOREPLY] AI processing error:', aiErr.message);
        }
      });
    }

    console.log(`✅ [IG-MSG] Saved Instagram message ${messageId} for company ${companyId}`);
  } catch (error) {
    console.error('❌ [IG-MSG] Error handling Instagram message:', error.message);
  }
}

async function sendInstagramMessage({ recipientId, messageText, igAccountId, pageAccessToken, companyId }) {
  try {
    if (!recipientId || !igAccountId || !pageAccessToken) {
      return { success: false, error: 'MISSING_PARAMS', reason: 'MISSING_INSTAGRAM_SEND_PARAMS' };
    }

    const axios = require('axios');
    const IG_GRAPH_API = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${igAccountId}/messages`;

    const response = await axios.post(IG_GRAPH_API, {
      recipient: { id: recipientId },
      message: { text: messageText },
      access_token: pageAccessToken
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    const messageId = response.data?.message_id;
    console.log(`✅ [IG-SEND] Message sent to Instagram user ${recipientId} | ID: ${messageId?.slice(-8) || 'N/A'}`);

    return { success: true, messageId, data: response.data };
  } catch (error) {
    const errorData = error.response?.data || {};
    console.error(`❌ [IG-SEND] Failed: ${errorData?.error?.message || error.message}`);
    return {
      success: false,
      error: errorData?.error?.type || 'IG_SEND_ERROR',
      message: errorData?.error?.message || error.message,
      code: errorData?.error?.code
    };
  }
}

async function handleTikTokMessage(inbound, companyId) {
  try {
    const senderId = inbound?.fromOpenId;
    const messageId = inbound?.messageId || `tiktok_msg_${Date.now()}`;
    const messageText = inbound?.text || '';
    const attachments = inbound?.attachments || null;
    const timestamp = inbound?.timestamp || new Date();

    if (!senderId || !companyId) {
      console.error('❌ [TT-MSG] Missing senderId or companyId');
      return;
    }

    console.log(`🎵 [TT-MSG] Received message ${messageId} from TikTok user ${senderId}`);

    // ── 1. Find or create customer (keyed on tiktokId + companyId) ──────
    let customer = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.customer.findUnique({
        where: { tiktokId_companyId: { tiktokId: senderId, companyId } }
      });
    });

    if (!customer) {
      try {
        customer = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          return await prisma.customer.create({
            data: {
              tiktokId: senderId,
              firstName: 'عميل',
              lastName: 'تيك توك',
              email: `tiktok_${senderId}@example.com`,
              phone: '',
              companyId,
              metadata: JSON.stringify({ source: 'tiktok_dm', senderId })
            }
          });
        });
      } catch (createErr) {
        if (createErr.code === 'P2002') {
          customer = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.customer.findUnique({
              where: { tiktokId_companyId: { tiktokId: senderId, companyId } }
            });
          });
        } else {
          throw createErr;
        }
      }
    }

    if (!customer) {
      console.error('❌ [TT-MSG] Could not find or create customer for', senderId);
      return;
    }

    // ── 2. Find or create TIKTOK conversation ───────────────────────────
    let isNewConversation = false;
    let conversation = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          channel: 'TIKTOK',
          status: { in: ['ACTIVE', 'RESOLVED'] }
        },
        orderBy: { updatedAt: 'desc' }
      });
    });

    const ttMeta = JSON.stringify({
      platform: 'tiktok',
      source: 'direct_message',
      businessOpenId: inbound?.businessOpenId || null
    });

    if (!conversation) {
      conversation = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.create({
          data: {
            customerId: customer.id,
            companyId,
            channel: 'TIKTOK',
            status: 'ACTIVE',
            lastMessageAt: timestamp,
            metadata: ttMeta,
            lastMessageIsFromCustomer: true,
            unreadCount: 1
          }
        });
      });
      isNewConversation = true;
    } else {
      conversation = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'ACTIVE',
            lastMessageAt: timestamp,
            metadata: ttMeta,
            lastMessageIsFromCustomer: true,
            unreadCount: { increment: 1 }
          }
        });
      });
    }

    // ── 3. Determine message type & content ───────────────────────────────
    let messageType = 'TEXT';
    let content = messageText || '';

    if (attachments && attachments.length > 0) {
      const att = attachments[0];
      const attType = att.type?.toLowerCase();
      if (attType === 'image') { messageType = 'IMAGE'; content = att.url || '[صورة]'; }
      else if (attType === 'video') { messageType = 'VIDEO'; content = att.url || '[فيديو]'; }
      else if (attType === 'audio') { messageType = 'AUDIO'; content = att.url || '[صوت]'; }
      else if (attType === 'file') { messageType = 'FILE'; content = att.url || '[ملف]'; }
      else { content = att.url || messageText || `[${att.type}]`; }
    }

    if (!content && messageType === 'TEXT') {
      console.log('⚠️ [TT-MSG] Empty message, skipping');
      return;
    }

    // ── 4. Save message ────────────────────────────────────────────────────
    const savedMessage = await safeQuery(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content,
          type: messageType,
          isFromCustomer: true,
          isRead: false,
          metadata: JSON.stringify({
            tiktokMessageId: messageId,
            senderId,
            platform: 'tiktok'
          })
        }
      });
    });

    // ── 5. Emit Socket.IO ──────────────────────────────────────────────────
    try {
      const socketService = require('../services/socketService');
      const io = socketService.getIO();
      if (io) {
        const socketPayload = {
          id: savedMessage.id,
          conversationId: conversation.id,
          content: savedMessage.content,
          type: savedMessage.type.toLowerCase(),
          isFromCustomer: true,
          timestamp: savedMessage.createdAt,
          companyId,
          platform: 'tiktok',
          channel: 'TIKTOK',
          isNewConversation,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            tiktokId: senderId
          }
        };
        io.to(`company_${companyId}`).emit('new_message', socketPayload);
        if (isNewConversation) {
          io.to(`company_${companyId}`).emit('new_conversation', { ...socketPayload, conversation });
        }
      }
    } catch (socketErr) {
      console.error('⚠️ [TT-MSG] Socket emit error:', socketErr.message);
    }

    // ── 5.5 Bot / Smart Replies for TikTok ────────────────────────────────
    let botHandledTikTok = false;
    const ttBotText = (messageText || '').trim();
    if (ttBotText && companyId) {
      try {
        const { evaluateInboundBotReply } = require('../services/botRuleEngine');
        const pClient = getPrisma();
        const firstContact = (await pClient.message.count({
          where: { conversationId: conversation.id }
        })) <= 1;

        const evaluation = await evaluateInboundBotReply({
          companyId,
          text: ttBotText,
          channel: 'TIKTOK',
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
          isFirstMessage: firstContact,
        });

        if (evaluation?.kind && evaluation.replyText) {
          const tiktokMessagingService = require('../services/tiktok/tiktokMessagingService');
          const ttResult = await tiktokMessagingService.sendTextMessage({
            companyId,
            toOpenId: senderId,
            text: evaluation.replyText,
          });

          if (ttResult?.success) {
            const replySource = evaluation.kind === 'smart_reply'
              ? 'smart_reply'
              : (evaluation.kind === 'rule'
                ? 'rule_reply'
                : (evaluation.kind === 'welcome' ? 'welcome_reply' : 'default_reply'));

            const replyId = require('crypto').randomUUID();
            const savedReply = await safeQuery(async () => {
              return await pClient.message.create({
                data: {
                  id: replyId,
                  conversationId: conversation.id,
                  content: evaluation.replyText,
                  type: 'TEXT',
                  isFromCustomer: false,
                  senderId: null,
                  metadata: JSON.stringify({
                    platform: 'tiktok',
                    source: replySource,
                    isTikTokReply: true,
                    ruleId: evaluation.ruleId || null,
                    templateName: evaluation.templateName || null,
                    matchedKeyword: evaluation.matchedKeyword || null,
                    timestamp: new Date(),
                  }),
                },
              });
            });

            const socketService = require('../services/socketService');
            const io = socketService.getIO();
            if (io && savedReply) {
              io.to(`company_${companyId}`).emit('new_message', {
                id: savedReply.id,
                conversationId: conversation.id,
                content: savedReply.content,
                type: 'text',
                isFromCustomer: false,
                timestamp: savedReply.createdAt,
                metadata: JSON.parse(savedReply.metadata || '{}'),
                senderId: null,
                senderName: evaluation.templateName || 'الرد التلقائي الذكي',
                companyId,
                platform: 'tiktok',
                channel: 'TIKTOK',
              });
            }

            await safeQuery(async () => {
              return await pClient.conversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessageAt: new Date(),
                  lastMessagePreview: evaluation.replyText.length > 100 ? evaluation.replyText.substring(0, 100) + '...' : evaluation.replyText,
                  lastMessageIsFromCustomer: false,
                  unreadCount: 0,
                  updatedAt: new Date(),
                },
              });
            });

            botHandledTikTok = true;
          }
        }
      } catch (botErr) {
        console.error('⚠️ [TT-MSG] Bot / Smart Reply error:', botErr.message);
      }
    }

    // ── 6. AI Auto-Reply for TikTok ──────────────────────────────────────
    const hasCustomerTextForAi = messageText && messageText.trim().length > 0;
    const hasCustomerAttachmentsForAi = attachments && attachments.length > 0;
    const aiCustomerContent = [
      messageText || '',
      attachments && attachments.length > 0
        ? `[${attachments.map(a => a.type || 'attachment').join(', ')}]`
        : ''
    ].filter(Boolean).join('\n\n').trim();

    const shouldRunTikTokAiAutoReply = Boolean(
      !botHandledTikTok &&
      customer.companyId &&
      (hasCustomerTextForAi || hasCustomerAttachmentsForAi) &&
      aiCustomerContent
    );

    if (shouldRunTikTokAiAutoReply) {
      setImmediate(async () => {
        try {
          console.log(`🤖 [TT-AI-AUTOREPLY] Triggered AI auto-reply for TikTok user: ${senderId}`);
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const prisma = getSharedPrismaClient();
          const { getEffectiveAiAutoReplySetting } = require('../services/aiSettingsResolver');
          const aiSetting = await getEffectiveAiAutoReplySetting(customer.companyId, prisma);
          if (!aiSetting?.autoReplyEnabled) { console.log('🤖 [TT-AI-AUTOREPLY] AI auto-reply disabled for company'); return; }
          if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
            try {
              const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
              const now = new Date();
              const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
              const today = hours[dayName];
              if (today && !today.enabled) { console.log('🤖 [TT-AI-AUTOREPLY] Outside working hours (day disabled)'); return; }
              if (today && today.start && today.end) {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = today.start.split(':').map(Number);
                const [endH, endM] = today.end.split(':').map(Number);
                const startMin = startH * 60 + startM;
                const endMin = endH * 60 + endM;
                if (currentMinutes < startMin || currentMinutes > endMin) { console.log('🤖 [TT-AI-AUTOREPLY] Outside working hours (time)'); return; }
              }
            } catch(e) { /* continue if parsing fails */ }
          }

          if (conversation && conversation.aiEnabled === false) {
            console.log('🤖 [TT-AI-AUTOREPLY] AI auto-reply disabled for conversation');
            return;
          }

          const aiSdkClient = require('../services/aiSdkClient');
          const ttAttachments = attachments && attachments.length > 0
            ? attachments.map(a => ({ type: a.type || 'image', url: a.url || '', detail: 'high' })).filter(a => a.url)
            : undefined;

          const result = await aiSdkClient.sendChatMessage({
            companyId: customer.companyId,
            customerId: customer.id,
            message: aiCustomerContent,
            threadId: conversation.id,
            channel: 'TIKTOK',
            attachments: ttAttachments
          });

          if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
            const { flagThreadForHumanTakeover } = require('../services/silentEscalationService');
            await flagThreadForHumanTakeover({
              companyId: customer.companyId,
              conversationId: conversation.id,
              customerId: customer.id,
              reason: result.escalation?.reason || 'ai_failure',
              customerMessage: aiCustomerContent,
              channel: 'TIKTOK',
            });
            return;
          }

          const replyText = result.reply;

          if (replyText) {
            console.log(`🤖 [TT-AI-AUTOREPLY] AI generated TikTok response: "${replyText.substring(0, 50)}..."`);

            const replyId = require('crypto').randomUUID();
            const savedReply = await safeQuery(async () => {
              return await prisma.message.create({
                data: {
                  id: replyId,
                  content: replyText,
                  type: 'TEXT',
                  conversationId: conversation.id,
                  isFromCustomer: false,
                  senderId: null,
                  metadata: JSON.stringify({
                    platform: 'tiktok',
                    source: 'ai_reply',
                    isTikTokReply: true,
                    timestamp: new Date(),
                    instantSave: true
                  }),
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
            }, 3);

            const socketService2 = require('../services/socketService');
            const io2 = socketService2.getIO();
            if (io2) {
              const socketData = {
                id: savedReply.id,
                conversationId: savedReply.conversationId,
                content: savedReply.content,
                type: savedReply.type.toLowerCase(),
                isFromCustomer: savedReply.isFromCustomer,
                timestamp: savedReply.createdAt,
                metadata: JSON.parse(savedReply.metadata),
                senderId: null,
                senderName: 'AI Agent',
                lastMessageIsFromCustomer: false,
                lastCustomerMessageIsUnread: false,
                companyId: customer.companyId,
                platform: 'tiktok',
                channel: 'TIKTOK'
              };
              io2.to(`company_${customer.companyId}`).emit('new_message', socketData);
            }

            await safeQuery(async () => {
              return await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessageAt: new Date(),
                  lastMessagePreview: replyText.length > 100 ? replyText.substring(0, 100) + '...' : replyText,
                  lastMessageIsFromCustomer: false,
                  unreadCount: 0,
                  updatedAt: new Date()
                }
              });
            }, 3);

            // Deliver the AI reply to the TikTok user via Business Messaging API.
            const tiktokMessagingService = require('../services/tiktok/tiktokMessagingService');
            const sent = await tiktokMessagingService.sendTextMessage({
              companyId: customer.companyId,
              toOpenId: senderId,
              text: replyText
            });

            if (sent?.success) {
              console.log(`✅ [TT-AI-AUTOREPLY] AI reply sent to TikTok user ${senderId}`);
              await safeQuery(async () => {
                return await prisma.message.update({
                  where: { id: savedReply.id },
                  data: {
                    metadata: JSON.stringify({
                      ...JSON.parse(savedReply.metadata),
                      tiktokMessageId: sent.data?.message_id || null,
                      sentToTikTok: true
                    })
                  }
                });
              }, 2);
            } else {
              console.warn(`⚠️ [TT-AI-AUTOREPLY] TikTok delivery failed:`, sent?.message || sent?.error);
            }
          }
        } catch (aiErr) {
          console.error('❌ [TT-AI-AUTOREPLY] AI processing error:', aiErr.message);
        }
      });
    }

    console.log(`✅ [TT-MSG] Saved TikTok message ${messageId} for company ${companyId}`);
  } catch (error) {
    console.error('❌ [TT-MSG] Error handling TikTok message:', error.message);
  }
}

function resolveInboundMessageText(webhookEvent) {
  const quickReplyPayload = webhookEvent?.message?.quick_reply?.payload || null;
  const postbackPayload = webhookEvent?._isPostback ? webhookEvent._postbackPayload : null;
  return quickReplyPayload || postbackPayload || webhookEvent?.message?.text || null;
}

module.exports = {
  sendFacebookMessage,
  sendFacebookMessageViaDeliveryOutbox,
  sendInstagramMessage,
  handleMessageDirectly,
  handleFacebookMessage,
  resolveInboundMessageText,
  handleInstagramMessage,
  handleTikTokMessage,
  getPageToken,
  updatePageTokenCache,
  diagnoseFacebookSending,
  fetchFacebookUserProfile,
  handleFacebookComment,
  isPageAuthoredFacebookComment,
  sendFacebookCommentReply,
  deleteFacebookComment,
  hideFacebookComment,
  updateConversationLastMessageStatus,
  resetConversationUnreadCount
};
