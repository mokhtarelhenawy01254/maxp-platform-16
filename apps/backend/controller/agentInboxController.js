const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  AGENT_INBOX_API_SCOPES,
  AGENT_INBOX_DEFAULT_SCOPES,
  generateAgentInboxApiKey,
  maskKeyPrefix,
  normalizeScopes,
  parseStoredArray,
  serializeJson
} = require('../services/taskIntegrationService');
const agentInboxFacebookService = require('../services/agentInboxFacebookService');

const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'];

const getRequestUserId = (req) => req.user?.id || req.user?.userId || null;

const parseFutureDate = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
    const error = new Error('تاريخ انتهاء المفتاح يجب أن يكون في المستقبل');
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const normalizeAgentInboxScopes = (value) => {
  const scopes = normalizeScopes(value, AGENT_INBOX_DEFAULT_SCOPES)
    .filter((scope) => AGENT_INBOX_API_SCOPES.includes(scope));
  return scopes.length > 0 ? scopes : [...AGENT_INBOX_DEFAULT_SCOPES];
};

const hasAgentInboxScope = (credential) => {
  const scopes = normalizeScopes(parseStoredArray(credential.scopes), []);
  return scopes.some((scope) => AGENT_INBOX_API_SCOPES.includes(scope));
};

const validateManagementRole = (req, res) => {
  if (!MANAGEMENT_ROLES.includes(req.user?.role)) {
    res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية لإدارة مفاتيح Agent Inbox'
    });
    return false;
  }

  return true;
};

const resolveManagedCompany = async (req) => {
  const prisma = getSharedPrismaClient();
  const requestedCompanyId = req.body?.companyId || req.query?.companyId;
  const search = String(req.body?.q || req.query?.q || '').trim();

  if (req.user?.role === 'SUPER_ADMIN' && requestedCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: String(requestedCompanyId) },
      select: { id: true, name: true, slug: true, email: true, isActive: true }
    });
    if (!company) {
      const error = new Error('الشركة المطلوبة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    return company;
  }

  if (req.user?.role === 'SUPER_ADMIN' && search) {
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { contains: search } },
          { slug: { contains: search.toLowerCase() } },
          { email: { contains: search } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, email: true, isActive: true }
    });
    if (!company) {
      const error = new Error(`لم يتم العثور على شركة تطابق "${search}"`);
      error.statusCode = 404;
      throw error;
    }
    return company;
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    const error = new Error('معرف الشركة مطلوب');
    error.statusCode = 403;
    throw error;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, email: true, isActive: true }
  });

  if (!company) {
    const error = new Error('الشركة الحالية غير موجودة');
    error.statusCode = 404;
    throw error;
  }

  return company;
};

const formatCredential = (credential) => ({
  id: credential.id,
  name: credential.name,
  description: credential.description,
  scopes: normalizeAgentInboxScopes(parseStoredArray(credential.scopes)),
  isActive: credential.isActive,
  keyPrefixMasked: maskKeyPrefix(credential.keyPrefix),
  lastUsedAt: credential.lastUsedAt,
  expiresAt: credential.expiresAt,
  revokedAt: credential.revokedAt,
  revokedReason: credential.revokedReason,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt
});

const listAgentInboxCredentials = async (prisma, companyId) => {
  const credentials = await prisma.taskApiCredential.findMany({
    where: {
      companyId,
      revokedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  return credentials
    .filter(hasAgentInboxScope)
    .map(formatCredential);
};

const getAdminContext = async (req, res) => {
  try {
    if (!validateManagementRole(req, res)) return;

    const prisma = getSharedPrismaClient();
    const company = await resolveManagedCompany(req);
    const [pages, credentials] = await Promise.all([
      agentInboxFacebookService.fetchCompanyPages(company.id),
      listAgentInboxCredentials(prisma, company.id)
    ]);

    return res.json({
      success: true,
      data: {
        company,
        pages,
        credentials,
        scopes: AGENT_INBOX_API_SCOPES,
        recommendedScopes: AGENT_INBOX_DEFAULT_SCOPES,
        externalEndpoints: {
          conversations: '/api/v1/agent-inbox/facebook/conversations',
          pullRecent: '/api/v1/agent-inbox/facebook/pull-recent',
          pullConversation: '/api/v1/agent-inbox/facebook/conversations/:id/pull',
          evaluateConversation: '/api/v1/agent-inbox/facebook/conversations/:id/evaluate'
        }
      }
    });
  } catch (error) {
    console.error('Agent Inbox admin context failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في تحميل إعدادات Agent Inbox'
    });
  }
};

const createCredential = async (req, res) => {
  try {
    if (!validateManagementRole(req, res)) return;

    const prisma = getSharedPrismaClient();
    const company = await resolveManagedCompany(req);
    const requestUserId = getRequestUserId(req);
    const scopes = normalizeAgentInboxScopes(req.body?.scopes);
    const { rawKey, keyPrefix, keyHash } = generateAgentInboxApiKey();
    const expiresAt = parseFutureDate(req.body?.expiresAt);
    const name = String(req.body?.name || `Agent Inbox - ${company.name}`).trim();
    const description = String(
      req.body?.description || 'Read-only Facebook Inbox access for diagnostics, pull, and reply evaluation.'
    ).trim();

    if (!requestUserId) {
      return res.status(403).json({
        success: false,
        message: 'المستخدم الحالي غير معروف'
      });
    }

    const credential = await prisma.taskApiCredential.create({
      data: {
        companyId: company.id,
        name,
        description,
        userId: null,
        defaultActingUserId: null,
        keyPrefix,
        keyHash,
        scopes: serializeJson(scopes, '[]'),
        expiresAt,
        createdByUserId: requestUserId
      }
    });

    return res.status(201).json({
      success: true,
      data: formatCredential(credential),
      secret: {
        apiKey: rawKey
      },
      message: 'تم إنشاء مفتاح Agent Inbox. انسخه الآن لأنه لن يظهر مرة أخرى.'
    });
  } catch (error) {
    console.error('Agent Inbox credential create failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في إنشاء مفتاح Agent Inbox'
    });
  }
};

const rotateCredential = async (req, res) => {
  try {
    if (!validateManagementRole(req, res)) return;

    const prisma = getSharedPrismaClient();
    const company = await resolveManagedCompany(req);
    const { credentialId } = req.params;
    const existing = await prisma.taskApiCredential.findFirst({
      where: {
        id: credentialId,
        companyId: company.id,
        revokedAt: null
      }
    });

    if (!existing || !hasAgentInboxScope(existing)) {
      return res.status(404).json({
        success: false,
        message: 'مفتاح Agent Inbox غير موجود'
      });
    }

    const { rawKey, keyPrefix, keyHash } = generateAgentInboxApiKey();
    const updated = await prisma.taskApiCredential.update({
      where: { id: credentialId },
      data: {
        keyPrefix,
        keyHash,
        lastUsedAt: null,
        isActive: true
      }
    });

    return res.json({
      success: true,
      data: formatCredential(updated),
      secret: {
        apiKey: rawKey
      },
      message: 'تم تدوير المفتاح. انسخ المفتاح الجديد الآن.'
    });
  } catch (error) {
    console.error('Agent Inbox credential rotate failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل تدوير مفتاح Agent Inbox'
    });
  }
};

const revokeCredential = async (req, res) => {
  try {
    if (!validateManagementRole(req, res)) return;

    const prisma = getSharedPrismaClient();
    const company = await resolveManagedCompany(req);
    const { credentialId } = req.params;
    const existing = await prisma.taskApiCredential.findFirst({
      where: {
        id: credentialId,
        companyId: company.id,
        revokedAt: null
      }
    });

    if (!existing || !hasAgentInboxScope(existing)) {
      return res.status(404).json({
        success: false,
        message: 'مفتاح Agent Inbox غير موجود'
      });
    }

    await prisma.taskApiCredential.update({
      where: { id: credentialId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedByUserId: getRequestUserId(req),
        revokedReason: String(req.body?.reason || 'revoked_from_agent_inbox_page').trim()
      }
    });

    return res.json({
      success: true,
      message: 'تم إلغاء مفتاح Agent Inbox'
    });
  } catch (error) {
    console.error('Agent Inbox credential revoke failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل إلغاء مفتاح Agent Inbox'
    });
  }
};

const getExternalCompanyId = (req) => req.externalTaskApi?.companyId;

const listFacebookConversations = async (req, res) => {
  try {
    const companyId = getExternalCompanyId(req);
    const data = await agentInboxFacebookService.listFacebookConversations(companyId, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Agent Inbox list Facebook conversations failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في جلب محادثات فيسبوك'
    });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const companyId = getExternalCompanyId(req);
    const data = await agentInboxFacebookService.getConversationMessages(
      companyId,
      req.params.conversationId,
      req.query
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Agent Inbox get Facebook messages failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في جلب رسائل المحادثة'
    });
  }
};

const pullConversationMessages = async (req, res) => {
  try {
    const companyId = getExternalCompanyId(req);
    const data = await agentInboxFacebookService.pullFacebookConversationMessages(
      companyId,
      req.params.conversationId,
      req.body || {}
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Agent Inbox pull Facebook messages failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل سحب رسائل المحادثة من فيسبوك',
      code: error.facebookCode || undefined
    });
  }
};

const pullRecentConversations = async (req, res) => {
  try {
    const companyId = getExternalCompanyId(req);
    const data = await agentInboxFacebookService.pullRecentFacebookConversations(
      companyId,
      req.body || {}
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Agent Inbox pull recent Facebook conversations failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل سحب آخر محادثات فيسبوك'
    });
  }
};

const evaluateConversation = async (req, res) => {
  try {
    const companyId = getExternalCompanyId(req);
    const data = await agentInboxFacebookService.evaluateConversation(
      companyId,
      req.params.conversationId
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Agent Inbox evaluate Facebook conversation failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل تقييم المحادثة'
    });
  }
};

module.exports = {
  createCredential,
  evaluateConversation,
  getAdminContext,
  getConversationMessages,
  listFacebookConversations,
  pullConversationMessages,
  pullRecentConversations,
  revokeCredential,
  rotateCredential
};
