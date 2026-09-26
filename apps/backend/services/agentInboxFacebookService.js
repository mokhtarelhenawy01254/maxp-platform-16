const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient } = require('./sharedDatabase');
const { getPageToken } = require('../controller/conversation/conversationShared');
const { getMetaGraphApiVersion } = require('../config/metaApi');

const FACEBOOK_GRAPH_VERSION = getMetaGraphApiVersion();
const MAX_LIST_LIMIT = 100;
const MAX_PULL_LIMIT = 20;

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
};

const asDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const clampLimit = (value, fallback = 25, max = MAX_LIST_LIMIT) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const maskExternalId = (value) => {
  const raw = String(value || '');
  if (!raw) return null;
  if (raw.length <= 8) return `${raw.slice(0, 2)}****`;
  return `${raw.slice(0, 4)}****${raw.slice(-4)}`;
};

const getConversationPageId = (conversation) => {
  const metadata = parseJson(conversation?.metadata);
  return metadata.pageId || metadata.facebookPageId || metadata.page_id || null;
};

const resolveFallbackPage = async (prisma, companyId, requestedPageId = null) => {
  if (requestedPageId) {
    return prisma.facebookPage.findFirst({
      where: {
        companyId,
        pageId: String(requestedPageId),
        status: 'connected'
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true
      }
    });
  }

  return prisma.facebookPage.findFirst({
    where: {
      companyId,
      status: 'connected'
    },
    orderBy: { connectedAt: 'desc' },
    select: {
      id: true,
      pageId: true,
      pageName: true,
      status: true,
      connectedAt: true
    }
  });
};

const fetchCompanyPages = async (companyId) => {
  const prisma = getSharedPrismaClient();
  return prisma.facebookPage.findMany({
    where: { companyId },
    orderBy: [
      { status: 'asc' },
      { connectedAt: 'desc' }
    ],
    select: {
      id: true,
      pageId: true,
      pageName: true,
      status: true,
      connectedAt: true,
      disconnectedAt: true,
      updatedAt: true
    }
  });
};

const detectIntent = (text) => {
  const normalized = String(text || '').toLowerCase();
  const checks = [
    { intent: 'price', regex: /(price|cost|how much|سعر|بكام|كام|التكلفة|السعر)/i },
    { intent: 'availability', regex: /(available|stock|متاح|موجود|الوان|ألوان|مقاس|مقاسات|size|color)/i },
    { intent: 'order_status', regex: /(order|tracking|شحن|وصل|فين الطلب|اوردر|أوردر|طلب|تتبع)/i },
    { intent: 'shipping', regex: /(delivery|shipping|ship|توصيل|الشحن|الدليفري|المحافظة)/i },
    { intent: 'complaint', regex: /(complaint|wrong|bad|refund|return|مشكلة|زعلان|مرتجع|استرجاع|غلط|تأخير)/i },
    { intent: 'product_image', regex: /(صورة|صوره|photo|picture|image|شكلها)/i }
  ];

  return checks.find((item) => item.regex.test(normalized))?.intent || 'general';
};

const isGenericReply = (text) => {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length <= 6) return true;

  return [
    'تمام',
    'اهلا',
    'أهلا',
    'حاضر',
    'شكرا',
    'تم',
    'ok',
    'hello',
    'hi'
  ].some((reply) => normalized === reply.toLowerCase());
};

const buildMessagePreview = (message) => {
  if (!message) return null;
  const metadata = parseJson(message.metadata);

  return {
    id: message.id,
    content: message.content,
    type: message.type,
    isFromCustomer: message.isFromCustomer,
    isRead: message.isRead,
    createdAt: message.createdAt,
    facebookMessageIdMasked: maskExternalId(metadata.facebookMessageId),
    source: metadata.source || null,
    hasAttachments: Boolean(metadata.hasAttachments),
    hasButtons: Boolean(metadata.hasButtons),
    senderId: message.senderId || null,
    metadata: message.metadata || null,
    isAIResponse: metadata.isAIResponse || (!message.isFromCustomer && !message.senderId) || false
  };
};

const evaluateConversationMessages = (conversation, messages = []) => {
  const sorted = [...messages].sort((a, b) => {
    const aTime = asDate(a.createdAt)?.getTime() || 0;
    const bTime = asDate(b.createdAt)?.getTime() || 0;
    return aTime - bTime;
  });
  const metadata = parseJson(conversation?.metadata);
  const lastCustomerMessage = [...sorted].reverse().find((message) => message.isFromCustomer);
  const lastAnyMessage = sorted[sorted.length - 1] || null;
  const lastCustomerAt = asDate(lastCustomerMessage?.createdAt);
  const replyAfterCustomer = lastCustomerAt
    ? sorted.find((message) => !message.isFromCustomer && asDate(message.createdAt) > lastCustomerAt)
    : null;
  const replyAt = asDate(replyAfterCustomer?.createdAt);
  const now = new Date();
  const minutesSinceCustomer = lastCustomerAt
    ? Math.max(0, Math.round((now.getTime() - lastCustomerAt.getTime()) / 60000))
    : null;
  const responseTimeMinutes = lastCustomerAt && replyAt
    ? Math.max(0, Math.round((replyAt.getTime() - lastCustomerAt.getTime()) / 60000))
    : null;

  const issueCodes = [];
  const recommendations = [];
  let severity = 'low';
  let status = 'healthy';
  let score = 100;

  if (!lastCustomerMessage) {
    status = 'no_customer_message';
    score = 60;
    issueCodes.push('no_customer_message');
    recommendations.push('لا توجد رسالة عميل واضحة في آخر البيانات المحلية.');
  } else if (!replyAfterCustomer) {
    status = 'needs_reply';
    severity = minutesSinceCustomer !== null && minutesSinceCustomer > 60 ? 'high' : 'medium';
    score = minutesSinceCustomer !== null && minutesSinceCustomer > 60 ? 25 : 45;
    issueCodes.push('missing_reply_after_last_customer_message');
    recommendations.push('آخر رسالة من العميل لم يصل بعدها رد من الصفحة.');
  }

  if (metadata.facebookSendError || metadata.notMessageable) {
    status = 'send_blocked';
    severity = 'high';
    score = Math.min(score, 20);
    issueCodes.push(metadata.facebookSendError || 'facebook_not_messageable');
    recommendations.push(metadata.facebookErrorMessage || 'فيسبوك رفض أو منع إرسال آخر رد. راجع صلاحية الصفحة ونافذة الرد.');
  }

  if (responseTimeMinutes !== null && responseTimeMinutes > 120) {
    severity = severity === 'high' ? 'high' : 'medium';
    score = Math.min(score, 70);
    issueCodes.push('slow_reply');
    recommendations.push(`الرد وصل بعد ${responseTimeMinutes} دقيقة من رسالة العميل.`);
  }

  const detectedIntent = detectIntent(lastCustomerMessage?.content);
  if (replyAfterCustomer && ['price', 'availability', 'order_status', 'shipping', 'complaint'].includes(detectedIntent)) {
    if (isGenericReply(replyAfterCustomer.content)) {
      status = status === 'healthy' ? 'weak_reply' : status;
      severity = severity === 'high' ? 'high' : 'medium';
      score = Math.min(score, 65);
      issueCodes.push('reply_too_generic_for_detected_intent');
      recommendations.push('الرد يبدو عامًا مقارنة بسؤال العميل. يحتاج إجابة مباشرة على السعر/التوفر/الشحن/حالة الطلب.');
    }
  }

  return {
    status,
    severity,
    score,
    detectedIntent,
    issueCodes,
    summary: recommendations[0] || 'المحادثة تبدو مستقرة ولا يوجد خلل واضح في آخر تبادل.',
    recommendations,
    responseTimeMinutes,
    minutesSinceCustomer,
    lastCustomerMessage: buildMessagePreview(lastCustomerMessage),
    firstReplyAfterLastCustomer: buildMessagePreview(replyAfterCustomer),
    lastMessage: buildMessagePreview(lastAnyMessage),
    facebookDiagnostics: {
      pageId: metadata.pageId || null,
      facebookSendError: metadata.facebookSendError || null,
      facebookErrorMessage: metadata.facebookErrorMessage || null,
      lastFacebookErrorAt: metadata.lastFacebookErrorAt || null,
      notMessageable: Boolean(metadata.notMessageable)
    }
  };
};

const serializeConversation = (conversation, pageByPageId = {}, includeEvaluation = false) => {
  const metadata = parseJson(conversation.metadata);
  const pageId = getConversationPageId(conversation);
  const latestMessages = Array.isArray(conversation.messages) ? conversation.messages : [];

  return {
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    subject: conversation.subject,
    priority: conversation.priority,
    tags: conversation.tags,
    unreadCount: conversation.unreadCount,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageIsFromCustomer: conversation.lastMessageIsFromCustomer,
    updatedAt: conversation.updatedAt,
    customer: conversation.customer
      ? {
          id: conversation.customer.id,
          name: [conversation.customer.firstName, conversation.customer.lastName].filter(Boolean).join(' ').trim()
            || conversation.customer.phone
            || 'عميل Facebook',
          phone: conversation.customer.phone || null,
          facebookIdMasked: maskExternalId(conversation.customer.facebookId)
        }
      : null,
    page: pageId
      ? {
          pageId,
          pageName: pageByPageId[pageId]?.pageName || metadata.pageName || null
        }
      : null,
    recentMessages: latestMessages.map(buildMessagePreview),
    evaluation: includeEvaluation
      ? evaluateConversationMessages(conversation, latestMessages)
      : undefined
  };
};

const buildConversationWhere = (companyId, query = {}) => {
  const where = {
    companyId,
    channel: 'FACEBOOK'
  };

  if (query.status) {
    where.status = String(query.status).toUpperCase();
  }

  if (query.unrepliedOnly === true || query.unrepliedOnly === 'true' || query.unrepliedOnly === '1') {
    where.lastMessageIsFromCustomer = true;
  }

  if (query.pageId) {
    where.metadata = {
      contains: `"pageId":"${String(query.pageId).replace(/"/g, '')}"`
    };
  }

  return where;
};

const listFacebookConversations = async (companyId, query = {}) => {
  const prisma = getSharedPrismaClient();
  const limit = clampLimit(query.limit, 25);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const skip = (page - 1) * limit;
  const includeEvaluation = query.includeEvaluation === true || query.includeEvaluation === 'true' || query.includeEvaluation === '1';
  const where = buildConversationWhere(companyId, query);

  const [company, pages, total, conversations] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true }
    }),
    fetchCompanyPages(companyId),
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            facebookId: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: includeEvaluation ? 20 : 3
        }
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      skip,
      take: limit
    })
  ]);

  const pageByPageId = Object.fromEntries(pages.map((pageRecord) => [pageRecord.pageId, pageRecord]));

  return {
    company,
    pages,
    conversations: conversations.map((conversation) => {
      const normalized = {
        ...conversation,
        messages: [...(conversation.messages || [])].reverse()
      };
      return serializeConversation(normalized, pageByPageId, includeEvaluation);
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const getConversationMessages = async (companyId, conversationId, query = {}) => {
  const prisma = getSharedPrismaClient();
  const limit = clampLimit(query.limit, 80, 200);
  const includeEvaluation = query.includeEvaluation === true || query.includeEvaluation === 'true' || query.includeEvaluation === '1';

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId,
      channel: 'FACEBOOK'
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          facebookId: true
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: limit
      }
    }
  });

  if (!conversation) {
    const error = new Error('Facebook conversation was not found for this company');
    error.statusCode = 404;
    throw error;
  }

  const pages = await fetchCompanyPages(companyId);
  const pageByPageId = Object.fromEntries(pages.map((pageRecord) => [pageRecord.pageId, pageRecord]));
  const normalized = {
    ...conversation,
    messages: [...(conversation.messages || [])].reverse()
  };

  return serializeConversation(normalized, pageByPageId, includeEvaluation);
};

const mapFacebookAttachment = (fbMessage, attachment, accessToken) => {
  let attachmentType = attachment?.type || null;
  const mimeType = attachment?.mime_type || '';

  if (!attachmentType) {
    if (mimeType.startsWith('image/')) attachmentType = 'image';
    else if (mimeType.startsWith('video/')) attachmentType = 'video';
    else if (mimeType.startsWith('audio/')) attachmentType = 'audio';
    else if (attachment?.image_data?.url) attachmentType = 'image';
    else if (attachment?.payload?.template_type) attachmentType = 'template';
    else attachmentType = 'file';
  }

  if (attachmentType === 'template' && attachment?.payload) {
    const text = attachment.payload.text || fbMessage.message || 'رسالة تفاعلية';
    const buttons = Array.isArray(attachment.payload.buttons)
      ? attachment.payload.buttons.map((button, index) => `${index + 1}. ${button.title || button.text || 'زر'}`).join('\n')
      : '';

    return {
      type: 'TEXT',
      content: buttons ? `${text}\n\nالأزرار:\n${buttons}` : text
    };
  }

  const url = attachment?.image_data?.url
    || attachment?.file_url
    || attachment?.url
    || attachment?.payload?.url
    || '';

  if (attachmentType === 'image' || attachmentType === 'animated_image' || attachmentType === 'sticker') {
    return {
      type: 'IMAGE',
      content: fbMessage.message ? `${fbMessage.message} |IMAGE_URL|${url}` : (url || 'صورة')
    };
  }

  if (['video', 'audio', 'file'].includes(attachmentType)) {
    return {
      type: 'FILE',
      content: fbMessage.message ? `${fbMessage.message} |FILE_URL|${url}` : (url || attachment?.name || 'ملف')
    };
  }

  return {
    type: 'TEXT',
    content: fbMessage.message || url || 'مرفق'
  };
};

const mapFacebookMessage = (fbMessage, { psid, pageId, accessToken, conversationId }) => {
  let messageType = 'TEXT';
  let content = fbMessage.message || '';
  const attachmentsList = Array.isArray(fbMessage.attachments?.data) ? fbMessage.attachments.data : [];
  const attachment = attachmentsList[0] || null;

  const attachmentsData = attachmentsList.map((att, idx) => {
    const mapped = mapFacebookAttachment(fbMessage, att, accessToken);
    const url = att.image_data?.url || att.file_url || att.url || att.payload?.url || att.image?.url || '';
    return {
      id: att.id || null,
      type: mapped.type.toLowerCase(),
      url,
      name: att.name || null,
      attachmentIndex: idx
    };
  }).filter(a => a.url);

  if (attachment) {
    const mapped = mapFacebookAttachment(fbMessage, attachment, accessToken);
    messageType = mapped.type;
    content = mapped.content;
  } else if (fbMessage.sticker) {
    messageType = 'IMAGE';
    content = fbMessage.sticker.url || fbMessage.sticker.file_url || 'ملصق';
  } else if (!content && fbMessage.shares) {
    content = 'محتوى مشترك';
  }

  if (!content || !String(content).trim()) {
    content = messageType === 'TEXT' ? 'رسالة' : 'مرفق';
  }

  const fromId = fbMessage.from?.id || null;
  const toIds = Array.isArray(fbMessage.to?.data) ? fbMessage.to.data.map((target) => target.id) : [];
  const isFromCustomer = fromId === psid
    || (fromId !== pageId && toIds.includes(pageId) && !toIds.includes(psid));

  return {
    id: uuidv4(),
    content,
    type: messageType,
    conversationId,
    isFromCustomer,
    isRead: false,
    attachments: attachmentsData.length > 0 ? JSON.stringify(attachmentsData) : null,
    metadata: JSON.stringify({
      platform: 'facebook',
      source: 'agent_inbox_graph_pull',
      facebookMessageId: fbMessage.id,
      syncedAt: new Date().toISOString(),
      fromId,
      toIds,
      originalMessage: fbMessage.message || null,
      hasAttachments: Boolean(fbMessage.attachments || fbMessage.sticker),
      hasButtons: Boolean(attachment?.payload?.buttons?.length),
      attachmentDetails: fbMessage.attachments?.data || null
    }),
    createdAt: fbMessage.created_time ? new Date(fbMessage.created_time) : new Date(),
    updatedAt: new Date()
  };
};

const resolveConversationPage = async (prisma, companyId, conversation, requestedPageId = null) => {
  const metadataPageId = getConversationPageId(conversation);
  const pageId = requestedPageId || metadataPageId;
  const pageRecord = await resolveFallbackPage(prisma, companyId, pageId);

  if (!pageRecord) {
    const error = new Error('No connected Facebook page is available for this conversation');
    error.statusCode = 400;
    throw error;
  }

  const pageTokenData = await getPageToken(pageRecord.pageId);
  if (!pageTokenData?.pageAccessToken || pageTokenData.companyId !== companyId) {
    const error = new Error('The connected Facebook page token is unavailable or belongs to another company');
    error.statusCode = 403;
    throw error;
  }

  return {
    page: pageRecord,
    accessToken: pageTokenData.pageAccessToken
  };
};

const pullFacebookConversationMessages = async (companyId, conversationId, options = {}) => {
  const prisma = getSharedPrismaClient();
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId,
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
    const error = new Error('Facebook conversation was not found for this company');
    error.statusCode = 404;
    throw error;
  }

  if (!conversation.customer?.facebookId) {
    const error = new Error('This conversation has no Facebook customer id to pull from Graph API');
    error.statusCode = 400;
    throw error;
  }

  const { page, accessToken } = await resolveConversationPage(prisma, companyId, conversation, options.pageId);
  const psid = conversation.customer.facebookId;

  let fbConversationId = null;
  try {
    const conversationResponse = await axios.get(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${page.pageId}/conversations`,
      {
        timeout: 15000,
        params: {
          user_id: psid,
          fields: 'id',
          access_token: accessToken
        }
      }
    );
    fbConversationId = conversationResponse.data?.data?.[0]?.id || null;
  } catch (error) {
    const wrapped = new Error(error.response?.data?.error?.message || error.message || 'Failed to resolve Facebook conversation');
    wrapped.statusCode = error.response?.status || 502;
    wrapped.facebookCode = error.response?.data?.error?.code || null;
    throw wrapped;
  }

  if (!fbConversationId) {
    const error = new Error('Facebook did not return a matching page conversation for this customer');
    error.statusCode = 404;
    throw error;
  }

  const allMessages = [];
  let messagesUrl = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${fbConversationId}/messages`;
  let pageCount = 0;
  const maxPages = Math.max(1, Math.min(Number.parseInt(options.maxPages, 10) || 2, 5));

  while (messagesUrl && pageCount < maxPages) {
    const response = await axios.get(messagesUrl, {
      timeout: 30000,
      params: messagesUrl.includes('?')
        ? undefined
        : {
            fields: 'id,message,from,to,created_time,attachments{id,type,file_url,url,mime_type,name,image_data{url},payload{template_type,text,buttons{type,title,url,payload}}},sticker,shares',
            limit: 50,
            access_token: accessToken
          }
    });

    const data = response.data || {};
    if (Array.isArray(data.data)) {
      allMessages.push(...data.data);
    }

    messagesUrl = data.paging?.next || null;
    pageCount += 1;
  }

  const existingMessages = await prisma.message.findMany({
    where: {
      conversationId,
      metadata: {
        contains: 'facebookMessageId'
      }
    },
    select: {
      metadata: true
    }
  });

  const existingFacebookIds = new Set(
    existingMessages
      .map((message) => parseJson(message.metadata).facebookMessageId)
      .filter(Boolean)
  );

  const messagesToSave = [];
  let skipped = 0;
  let errors = 0;

  for (const fbMessage of allMessages) {
    try {
      if (!fbMessage.id || existingFacebookIds.has(fbMessage.id)) {
        skipped += 1;
        continue;
      }

      messagesToSave.push(mapFacebookMessage(fbMessage, {
        psid,
        pageId: page.pageId,
        accessToken,
        conversationId
      }));
    } catch (error) {
      errors += 1;
    }
  }

  let saved = 0;
  if (messagesToSave.length > 0) {
    const result = await prisma.message.createMany({
      data: messagesToSave,
      skipDuplicates: true
    });
    saved = result.count || 0;
  }

  const latestMessage = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: {
      content: true,
      createdAt: true,
      isFromCustomer: true
    }
  });
  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      isFromCustomer: true,
      isRead: false
    }
  });

  if (latestMessage) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: latestMessage.createdAt,
        lastMessagePreview: String(latestMessage.content || '').slice(0, 120),
        lastMessageIsFromCustomer: latestMessage.isFromCustomer,
        unreadCount,
        updatedAt: new Date()
      }
    });
  }

  const conversationWithMessages = await getConversationMessages(companyId, conversationId, {
    includeEvaluation: true,
    limit: 80
  });

  return {
    page: {
      pageId: page.pageId,
      pageName: page.pageName
    },
    stats: {
      totalFetched: allMessages.length,
      saved,
      skipped,
      errors,
      graphPagesRead: pageCount
    },
    conversation: conversationWithMessages
  };
};

const pullRecentFacebookConversations = async (companyId, options = {}) => {
  const limit = clampLimit(options.limit, 10, MAX_PULL_LIMIT);
  const listed = await listFacebookConversations(companyId, {
    limit,
    pageId: options.pageId,
    unrepliedOnly: options.unrepliedOnly === undefined ? true : options.unrepliedOnly,
    includeEvaluation: true
  });

  const results = [];
  for (const conversation of listed.conversations) {
    try {
      const pulled = await pullFacebookConversationMessages(companyId, conversation.id, {
        pageId: options.pageId,
        maxPages: options.maxPages || 2
      });
      results.push({
        conversationId: conversation.id,
        success: true,
        stats: pulled.stats,
        evaluation: pulled.conversation.evaluation
      });
    } catch (error) {
      results.push({
        conversationId: conversation.id,
        success: false,
        error: error.message,
        statusCode: error.statusCode || 500
      });
    }
  }

  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results
  };
};

const evaluateConversation = async (companyId, conversationId) => {
  const conversation = await getConversationMessages(companyId, conversationId, {
    includeEvaluation: true,
    limit: 100
  });

  return {
    conversationId,
    evaluation: conversation.evaluation,
    conversation
  };
};

module.exports = {
  AGENT_INBOX_FACEBOOK_SCOPES: ['facebook-inbox:read', 'facebook-inbox:evaluate', 'facebook-inbox:draft'],
  evaluateConversation,
  evaluateConversationMessages,
  fetchCompanyPages,
  getConversationMessages,
  listFacebookConversations,
  pullFacebookConversationMessages,
  pullRecentFacebookConversations
};
