/**
 * Production Facebook Messaging Fix - VPS Deployment Ready
 * 
 * This fix addresses Facebook error 2018001 by implementing:
 * 1. Strict recipient validation before sending
 * 2. 24-hour window enforcement
 * 3. Conversation history verification
 * 4. Manual message blocking for invalid recipients
 * 
 * Domain: https://www.mokhtarelhenawy.online
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const FormData = require('form-data');
const {
  isAvailableStoredAsset,
  isLocalUploadAssetPath,
  normalizeStoredAssetUrl,
} = require('./productMediaUtils');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const MEDIA_MESSAGE_TYPES = new Set(['IMAGE', 'FILE', 'VIDEO', 'AUDIO']);
const DEFAULT_MEDIA_MIME_TYPES = {
  IMAGE: 'image/jpeg',
  FILE: 'application/octet-stream',
  VIDEO: 'video/mp4',
  AUDIO: 'audio/mpeg',
};
const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
};

function getConfiguredPublicOrigin() {
  const originCandidates = [
    process.env.PUBLIC_BASE_URL,
    process.env.BACKEND_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.WEBHOOK_BASE_URL,
  ].filter(Boolean);

  for (const candidate of originCandidates) {
    try {
      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeOutgoingMediaUrl(messageContent) {
  if (typeof messageContent !== 'string' || messageContent.trim() === '') {
    return { value: messageContent };
  }

  const normalizedValue = normalizeStoredAssetUrl(messageContent);
  if (!normalizedValue) {
    return {
      error: 'INVALID_MEDIA_URL',
      message: 'رابط الملف غير صالح'
    };
  }

  // If already absolute URL, return as is
  if (normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://')) {
    return { value: normalizedValue };
  }

  // If not relative (doesn't start with /), return as is
  if (!normalizedValue.startsWith('/')) {
    return { value: normalizedValue };
  }

  // Mandatory existence check only for our primary local uploads directory
  if (normalizedValue.startsWith('/uploads/') && !isAvailableStoredAsset(normalizedValue)) {
    return {
      error: 'MISSING_LOCAL_ASSET',
      message: 'الملف المطلوب غير موجود على الخادم',
      details: normalizedValue
    };
  }

  const publicOrigin = getConfiguredPublicOrigin();
  if (!publicOrigin) {
    return {
      error: 'PUBLIC_ORIGIN_NOT_CONFIGURED',
      message: 'تعذر تحديد الرابط العام للملفات على الخادم'
    };
  }

  return {
    value: `${publicOrigin}${normalizedValue}`
  };
}

function getFacebookAttachmentType(messageType) {
  switch (messageType) {
    case 'IMAGE':
      return 'image';
    case 'VIDEO':
      return 'video';
    case 'AUDIO':
      return 'audio';
    case 'FILE':
    default:
      return 'file';
  }
}

function stripMimeTypeParameters(contentType) {
  if (typeof contentType !== 'string') {
    return '';
  }

  return contentType.split(';')[0].trim().toLowerCase();
}

function inferMimeTypeFromUrl(mediaUrl, messageType) {
  if (typeof mediaUrl !== 'string') {
    return DEFAULT_MEDIA_MIME_TYPES[messageType] || 'application/octet-stream';
  }

  const normalizedUrl = mediaUrl.toLowerCase().split('?')[0].split('#')[0];

  if (normalizedUrl.endsWith('.png')) return 'image/png';
  if (normalizedUrl.endsWith('.webp')) return 'image/webp';
  if (normalizedUrl.endsWith('.gif')) return 'image/gif';
  if (normalizedUrl.endsWith('.jpeg') || normalizedUrl.endsWith('.jpg')) return 'image/jpeg';
  if (normalizedUrl.endsWith('.pdf')) return 'application/pdf';
  if (normalizedUrl.endsWith('.mov')) return 'video/quicktime';
  if (normalizedUrl.endsWith('.mp4')) return 'video/mp4';
  if (normalizedUrl.endsWith('.m4a')) return 'audio/mp4';
  if (normalizedUrl.endsWith('.wav')) return 'audio/wav';
  if (normalizedUrl.endsWith('.mp3')) return 'audio/mpeg';

  return DEFAULT_MEDIA_MIME_TYPES[messageType] || 'application/octet-stream';
}

function buildUploadFilename(mediaUrl, mimeType, messageType) {
  let filename = 'attachment';

  if (typeof mediaUrl === 'string' && mediaUrl.trim() !== '') {
    try {
      const parsedUrl = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')
        ? new URL(mediaUrl)
        : null;
      const pathname = parsedUrl ? parsedUrl.pathname : mediaUrl;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      if (lastSegment) {
        filename = decodeURIComponent(lastSegment);
      }
    } catch {
      const fallbackSegment = mediaUrl.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
      if (fallbackSegment) {
        filename = fallbackSegment;
      }
    }
  }

  if (/\.[a-z0-9]+$/i.test(filename)) {
    return filename;
  }

  const normalizedMimeType = stripMimeTypeParameters(mimeType);
  const extension = MIME_EXTENSION_MAP[normalizedMimeType]
    || MIME_EXTENSION_MAP[DEFAULT_MEDIA_MIME_TYPES[messageType]]
    || 'bin';

  return `${filename}.${extension}`;
}

async function downloadMediaForFacebookUpload(mediaUrl, messageType) {
  const response = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      Accept: '*/*',
      'User-Agent': 'MaxP-Media-Relay/1.0',
    },
  });

  const mimeType = stripMimeTypeParameters(response.headers?.['content-type'])
    || inferMimeTypeFromUrl(mediaUrl, messageType);

  return {
    buffer: Buffer.from(response.data),
    mimeType,
    filename: buildUploadFilename(mediaUrl, mimeType, messageType),
  };
}

async function uploadMediaDirectlyToFacebook(recipientId, mediaUrl, messageType, accessToken) {
  const { buffer, mimeType, filename } = await downloadMediaForFacebookUpload(mediaUrl, messageType);
  const form = new FormData();

  form.append('recipient', JSON.stringify({ id: recipientId }));
  form.append('messaging_type', 'RESPONSE');
  form.append('message', JSON.stringify({
    attachment: {
      type: getFacebookAttachmentType(messageType),
      payload: {
        is_reusable: true,
      },
    },
  }));
  form.append('filedata', buffer, {
    filename,
    contentType: mimeType,
    knownLength: buffer.length,
  });

  const response = await axios.post(
    `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/messages`,
    form,
    {
      params: { access_token: accessToken },
      headers: form.getHeaders(),
      timeout: 20000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  return {
    success: true,
    messageId: response.data.message_id,
    recipientId: response.data.recipient_id,
    message: 'تم إرسال الرسالة بنجاح',
    transport: 'DIRECT_FILE_UPLOAD',
  };
}

function shouldPreferDirectMediaUpload(messageType, mediaUrl) {
  if (messageType !== 'IMAGE' || typeof mediaUrl !== 'string') {
    return false;
  }

  return mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://');
}

function parseJsonObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function conversationBelongsToPage(conversation, pageId) {
  const normalizedPageId = String(pageId || '').trim();
  if (!normalizedPageId) {
    return false;
  }

  const metadata = parseJsonObject(conversation?.metadata);
  const conversationPageId = String(
    metadata.pageId || metadata.facebookPageId || metadata.page_id || ''
  ).trim();
  return conversationPageId === normalizedPageId;
}

async function findBestFacebookConversationForRecipient(prisma, recipientId, pageId) {
  if (prisma?.conversation?.findMany) {
    const candidates = await prisma.conversation.findMany({
      where: {
        customer: {
          facebookId: recipientId
        },
        channel: 'FACEBOOK'
      },
      include: {
        customer: true,
        messages: {
          where: {
            isFromCustomer: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: 10
    });

    const samePageWithMessages = candidates.find(conversation => (
      conversationBelongsToPage(conversation, pageId)
      && Array.isArray(conversation.messages)
      && conversation.messages.length > 0
    ));
    if (samePageWithMessages) {
      return samePageWithMessages;
    }

    const anyWithMessages = candidates.find(conversation => (
      Array.isArray(conversation.messages)
      && conversation.messages.length > 0
    ));
    if (anyWithMessages) {
      return anyWithMessages;
    }

    return candidates.find(conversation => conversationBelongsToPage(conversation, pageId))
      || candidates[0]
      || null;
  }

  return prisma.conversation.findFirst({
    where: {
      customer: {
        facebookId: recipientId
      },
      channel: 'FACEBOOK'
    },
    include: {
      customer: true,
      messages: {
        where: {
          isFromCustomer: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
}

function isPageMessagingPermissionError(fbError) {
  const errorCode = fbError?.code;
  const errorMessage = String(fbError?.message || '');

  return (
    errorCode === 190
    && (
      /impersonating a user's page/i.test(errorMessage)
      || /must be granted before impersonating/i.test(errorMessage)
      || /pages_messaging/i.test(errorMessage)
    )
  );
}

/**
 * PRODUCTION: Enhanced Facebook recipient validation with strict enforcement
 * This will PREVENT sending messages to invalid recipients
 */
async function validateFacebookRecipientStrict(recipientId, pageId, accessToken) {
  try {
    //console.log(`🔍 [PROD-VALIDATION] Validating recipient ${recipientId} for page ${pageId}`);

    // 1. Basic validation
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_RECIPIENT_ID',
        message: 'معرف المستلم غير صحيح',
        solutions: ['تحقق من معرف المستلم وأعد المحاولة']
      };
    }

    // 2. Format validation  
    if (!/^\d+$/.test(recipientId) || recipientId.length < 10) {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_ID_FORMAT',
        message: 'تنسيق معرف المستلم غير صحيح',
        solutions: ['تأكد من أن معرف المستلم يحتوي على أرقام فقط وطوله مناسب']
      };
    }

    // 3. Check conversation and 24-hour window - STRICT MODE
    const conversation = await findBestFacebookConversationForRecipient(
      getSharedPrismaClient(),
      recipientId,
      pageId
    );

    if (!conversation) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CONVERSATION_FOUND',
        message: 'لم يتم العثور على محادثة مع هذا العميل',
        solutions: [
          'تأكد من أن العميل أرسل رسالة للصفحة من قبل',
          'تحقق من معرف العميل',
          'قد يحتاج العميل لإرسال رسالة جديدة عبر Messenger'
        ]
      };
    }

    // 4. Check if customer has sent any messages
    if (!conversation.messages || conversation.messages.length === 0) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CUSTOMER_MESSAGES',
        message: 'العميل لم يرسل أي رسائل للصفحة',
        solutions: [
          'اطلب من العميل إرسال رسالة عبر Facebook Messenger أولاً',
          'لا يمكن بدء محادثة من جانب الصفحة حسب سياسات فيسبوك'
        ]
      };
    }

    // 5. Check 24-hour window - STRICT ENFORCEMENT
    const lastCustomerMessage = conversation.messages[0];
    const messageAge = Date.now() - new Date(lastCustomerMessage.createdAt).getTime();
    const hoursAgo = Math.floor(messageAge / (1000 * 60 * 60));
    const within24Hours = messageAge < 24 * 60 * 60 * 1000;

    //console.log(`📊 [PROD-VALIDATION] Last customer message: ${hoursAgo} hours ago`);
    //console.log(`📊 [PROD-VALIDATION] Within 24 hours: ${within24Hours}`);

    if (!within24Hours) {
      return {
        valid: false,
        canSend: false,
        error: 'OUTSIDE_24_HOUR_WINDOW',
        message: `تجاوز نافذة 24 ساعة (آخر رسالة منذ ${hoursAgo} ساعة)`,
        solutions: [
          'انتظر حتى يرسل العميل رسالة جديدة',
          'لا يمكن إرسال رسائل بعد 24 ساعة من آخر رسالة للعميل',
          'هذا قانون فيسبوك وليس خطأ في النظام'
        ],
        lastMessageTime: lastCustomerMessage.createdAt,
        hoursAgo: hoursAgo
      };
    }

    // 6. Additional validation: Check message frequency
    const recentMessages = conversation.messages.filter(msg => {
      const msgAge = Date.now() - new Date(msg.createdAt).getTime();
      return msgAge < 24 * 60 * 60 * 1000;
    });

    return {
      valid: true,
      canSend: true,
      conversation: conversation,
      lastMessageTime: lastCustomerMessage.createdAt,
      hoursAgo: hoursAgo,
      recentMessagesCount: recentMessages.length,
      message: `يمكن إرسال الرسالة - آخر رسالة منذ ${hoursAgo} ساعة`,
      recommendations: [
        'الرسالة ستُرسل بنجاح - العميل نشط خلال 24 ساعة',
        `العميل أرسل ${recentMessages.length} رسالة خلال آخر 24 ساعة`
      ]
    };

  } catch (error) {
    console.error('❌ [PROD-VALIDATION] Database validation error:', error.message);
    return {
      valid: false,
      canSend: false,
      error: 'VALIDATION_ERROR',
      message: 'خطأ في التحقق من صحة البيانات',
      solutions: ['تحقق من اتصال قاعدة البيانات وأعد المحاولة']
    };
  }
}

/**
 * PRODUCTION: Enhanced Facebook message sending with strict validation
 * Will REFUSE to send if validation fails
 */
async function sendProductionFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId, accessToken, replyToMessageId = null) {
  let resolvedMessageContent = messageContent;

  try {
    //console.log(`🏭 [PROD-SEND] Starting production Facebook message send`);
    //console.log(`📱 Recipient: ${recipientId}, Page: ${pageId}, Type: ${messageType}`);
    //console.log(`🔐 Access Token Available: ${!!accessToken}`);
    //console.log(`📄 Access Token Length: ${accessToken?.length || 0}`);

    // STEP 1: Strict validation (this will prevent 2018001 errors)
    const validation = await validateFacebookRecipientStrict(recipientId, pageId, accessToken);

    if (!validation.valid || !validation.canSend) {
      console.error(`❌ [PROD-SEND] Validation failed - BLOCKING message send`);
      console.error(`📝 [PROD-SEND] Reason: ${validation.message}`);

      if (validation.solutions) {
        //console.log('🔧 [PROD-SEND] Solutions:');
        validation.solutions.forEach(solution => {
          //console.log(`   - ${solution}`);
        });
      }

      // Return validation error instead of attempting to send
      return {
        success: false,
        blocked: true,
        error: validation.error,
        message: validation.message,
        solutions: validation.solutions,
        canRetry: false,
        validationDetails: validation
      };
    }

    //console.log(`✅ [PROD-SEND] Validation passed - proceeding with send`);

    if (MEDIA_MESSAGE_TYPES.has(messageType)) {
      const normalizedMedia = normalizeOutgoingMediaUrl(messageContent);
      if (normalizedMedia.error) {
        return {
          success: false,
          blocked: true,
          error: normalizedMedia.error,
          message: normalizedMedia.message,
          details: normalizedMedia.details,
          canRetry: false
        };
      }

      resolvedMessageContent = normalizedMedia.value;
    }

    if (shouldPreferDirectMediaUpload(messageType, resolvedMessageContent)) {
      try {
        return await uploadMediaDirectlyToFacebook(
          recipientId,
          resolvedMessageContent,
          messageType,
          accessToken
        );
      } catch (directUploadError) {
        const directUploadFbError = directUploadError?.response?.data?.error;
        if (directUploadFbError && isPageMessagingPermissionError(directUploadFbError)) {
          return handleProductionFacebookError(directUploadFbError, recipientId, pageId);
        }
        console.warn(`⚠️ [PROD-SEND] Direct media upload failed, falling back to URL send: ${directUploadError.message}`);
      }
    }

    // STEP 2: Prepare message data with correct structure
    const messageData = {
      recipient: { id: recipientId },
      message: {},
      messaging_type: "RESPONSE" // Critical for Facebook policy
    };

    // STEP 3: Set message content
    if (messageType === 'TEXT') {
      // For text messages, use text property
      messageData.message.text = resolvedMessageContent;
    } else if (messageType === 'IMAGE') {
      // For image messages, use attachment
      messageData.message.attachment = {
        type: "image",
        payload: {
          url: resolvedMessageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'FILE') {
      // For file messages, use attachment
      messageData.message.attachment = {
        type: "file",
        payload: {
          url: resolvedMessageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'VIDEO') {
      // For video messages
      messageData.message.attachment = {
        type: "video",
        payload: {
          url: resolvedMessageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'AUDIO') {
      // For audio messages
      messageData.message.attachment = {
        type: "audio",
        payload: {
          url: resolvedMessageContent,
          is_reusable: true
        }
      };
    } else {
      // Default to text for unknown types
      messageData.message.text = resolvedMessageContent;
    }

    // If replying to a specific message, include reply_to reference
    // DISABLED for v25.0+ - Facebook returns "Invalid keys" error
    // if (replyToMessageId) {
    //   messageData.message.reply_to = {
    //     mid: replyToMessageId
    //   };
    // }

    //console.log(`📤 [PROD-SEND] Prepared message data:`, JSON.stringify(messageData, null, 2));

    // STEP 4: Send message to Facebook API
    const response = await axios.post(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/messages`,
      messageData,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 second timeout
      }
    );

    //console.log(`✅ [PROD-SEND] Message sent successfully`);
    //console.log(`📝 [PROD-SEND] Facebook response:`, response.data);

    // Return success with Facebook message ID
    return {
      success: true,
      messageId: response.data.message_id,
      recipientId: response.data.recipient_id,
      message: 'تم إرسال الرسالة بنجاح'
    };

  } catch (error) {
    console.error(`❌ [PROD-SEND] Error sending Facebook message:`, error.message);

    // Handle different types of errors
    if (error.response) {
      console.error(`❌ [PROD-SEND] Facebook API Error Response:`, JSON.stringify(error.response.data, null, 2));
      console.error(`❌ [PROD-SEND] Status: ${error.response.status}`);
      console.error(`❌ [PROD-SEND] Request URL: ${resolvedMessageContent}`);
      console.error(`❌ [PROD-SEND] Message Type: ${messageType}`);
      console.error(`❌ [PROD-SEND] Recipient ID: ${recipientId}`);
      console.error(`❌ [PROD-SEND] Page ID: ${pageId}`);

      // Handle specific Facebook errors
      const fbError = error.response.data?.error;
      if (
        MEDIA_MESSAGE_TYPES.has(messageType)
        && fbError?.code === 100
        && fbError?.error_subcode === 2018047
        && typeof resolvedMessageContent === 'string'
      ) {
        try {
          console.warn(`⚠️ [PROD-SEND] Facebook failed to fetch media URL, retrying with direct upload...`);
          return await uploadMediaDirectlyToFacebook(
            recipientId,
            resolvedMessageContent,
            messageType,
            accessToken
          );
        } catch (directUploadError) {
          console.error(`❌ [PROD-SEND] Direct upload retry failed: ${directUploadError.message}`);
        }
      }

      if (fbError) {
        return handleProductionFacebookError(fbError, recipientId, pageId);
      }

      return {
        success: false,
        error: 'FACEBOOK_API_ERROR',
        message: `خطأ في API فيسبوك: ${error.response.status}`,
        details: error.response.data,
        canRetry: error.response.status >= 500 // Retry for server errors
      };
    } else if (error.request) {
      console.error(`❌ [PROD-SEND] No response received from Facebook`);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'خطأ في الشبكة - لم يتم استلام رد من فيسبوك',
        details: error.message,
        canRetry: true
      };
    } else {
      console.error(`❌ [PROD-SEND] Error setting up request:`, error.message);
      return {
        success: false,
        error: 'REQUEST_SETUP_ERROR',
        message: 'خطأ في إعداد الطلب',
        details: error.message,
        canRetry: false
      };
    }
  }
}

/**
 * PRODUCTION: Enhanced error handling for Facebook API errors
 */
function handleProductionFacebookError(fbError, recipientId, pageId) {
  //console.log(`🔧 [PROD-ERROR] Handling Facebook error:`, fbError);

  const errorCode = fbError?.code;
  const errorSubcode = fbError?.error_subcode;
  const errorMessage = fbError?.message || 'خطأ غير معروف';

  // Common Facebook error patterns
  if (errorCode === 190) {
    if (isPageMessagingPermissionError(fbError)) {
      return {
        success: false,
        error: 'PAGE_MESSAGING_PERMISSION_MISSING',
        message: 'توكن الصفحة لا يملك صلاحيات Messenger المطلوبة',
        details: errorMessage,
        solutions: [
          'أعد ربط الصفحة من الحساب الذي يملك الصفحة فعليًا',
          'تأكد من منح التطبيق صلاحية pages_messaging وباقي صلاحيات الصفحات المطلوبة',
          'حدّث Page Access Token بعد إعادة الربط قبل محاولة إرسال ردود تلقائية جديدة'
        ],
        canRetry: false
      };
    }

    // Access token error
    return {
      success: false,
      error: 'INVALID_ACCESS_TOKEN',
      message: 'رمز الوصول غير صحيح أو منتهي الصلاحية',
      details: errorMessage,
      solutions: [
        'تحقق من صحة رمز الوصول لصفحة فيسبوك',
        'تأكد من أن الرمز يحتوي على الصلاحيات المطلوبة',
        'قم بتحديث رمز الوصول من لوحة التحكم'
      ],
      canRetry: false
    };
  } else if (errorCode === 100 && errorSubcode === 2018001) {
    // 24-hour policy violation (the main error we're fixing)
    return {
      success: false,
      error: 'POLICY_VIOLATION_24H',
      message: 'انتهاك سياسة فيسبوك - خارج نافذة 24 ساعة',
      details: errorMessage,
      solutions: [
        'انتظر حتى يرسل العميل رسالة جديدة',
        'لا يمكن إرسال رسائل بعد 24 ساعة من آخر رسالة للعميل',
        'هذا قانون فيسبوك وليس خطأ في النظام'
      ],
      canRetry: false
    };
  } else if (errorCode === 100) {
    // General parameter error
    return {
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'معلمات الطلب غير صحيحة',
      details: errorMessage,
      solutions: [
        'تحقق من صحة معرف المستلم',
        'تأكد من تنسيق الرسالة',
        'راجع سياسات فيسبوك حول إرسال الرسائل'
      ],
      canRetry: false
    };
  } else if (errorCode === 4) {
    // API limit reached
    return {
      success: false,
      error: 'API_LIMIT_REACHED',
      message: 'تم تجاوز حدود API فيسبوك',
      details: errorMessage,
      solutions: [
        'انتظر بعض الوقت ثم حاول مرة أخرى',
        'قلل من عدد الرسائل المرسلة في نفس الوقت',
        'راجع حدود استخدام API في لوحة تحكم فيسبوك'
      ],
      canRetry: true
    };
  } else {
    // Unknown error
    return {
      success: false,
      error: 'FACEBOOK_ERROR',
      message: `خطأ فيسبوك: ${errorMessage}`,
      details: fbError,
      solutions: [
        'تحقق من سجل الأخطاء لمزيد من التفاصيل',
        'تأكد من اتصال الإنترنت',
        'راجع سياسات فيسبوك حول إرسال الرسائل'
      ],
      canRetry: errorCode >= 200 // Retry for server errors
    };
  }
}

module.exports = {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError,
  shouldPreferDirectMediaUpload,
  uploadMediaDirectlyToFacebook,
  downloadMediaForFacebookUpload,
  buildUploadFilename,
};
