const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { t } = require('../legacy-ai-agent/aiAgent/i18n');
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
    const error = new Error(t('agentInbox.expiry_future'));
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
      message: t('agentInbox.no_permission')
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
      const error = new Error(t('agentInbox.company_not_found'));
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
      const error = new Error(t('agentInbox.company_search_not_found', 'ar', { search }));
      error.statusCode = 404;
      throw error;
    }
    return company;
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    const error = new Error(t('agentInbox.company_id_required'));
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
      message: error.message || t('agentInbox.admin_load_failed')
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
        message: t('agentInbox.unknown_user')
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
      message: t('agentInbox.credential_created')
    });
  } catch (error) {
    console.error('Agent Inbox credential create failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || t('agentInbox.credential_create_failed')
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
        message: t('agentInbox.credential_not_found')
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
      message: t('agentInbox.credential_rotated')
    });
  } catch (error) {
    console.error('Agent Inbox credential rotate failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || t('agentInbox.credential_rotate_failed')
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
        message: t('agentInbox.credential_not_found')
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
      message: t('agentInbox.credential_revoked')
    });
  } catch (error) {
    console.error('Agent Inbox credential revoke failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || t('agentInbox.credential_revoke_failed')
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
      message: error.message || t('agentInbox.conversations_list_failed')
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
      message: error.message || t('agentInbox.messages_list_failed')
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
      message: error.message || t('agentInbox.messages_pull_failed'),
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
      message: error.message || t('agentInbox.conversations_pull_failed')
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
      message: error.message || t('agentInbox.evaluate_failed')
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
