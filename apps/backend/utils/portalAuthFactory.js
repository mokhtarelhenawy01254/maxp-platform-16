const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret, isMissingAuthSecretError } = require('./jwtSecret');
const { getPhoneVariants } = require('./phoneNormalization');

const DEFAULT_TENANT_MISMATCH_MESSAGE = 'الجلسة تخص شركة أخرى — يرجى تسجيل الدخول على هذا النطاق';

const extractBearerOrQueryToken = (req, allowQueryToken = false) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length >= 2 && /^bearer$/i.test(parts[0])) {
      return parts[1];
    }
  }

  if (allowQueryToken === true && req.query?.token) {
    const qToken = String(req.query.token).trim();
    if (qToken) return qToken;
  }

  return null;
};

/**
 * Factory creating unified, tenant-isolated authentication middleware for portal actors
 * (Parent, Teacher, Patient, Doctor, Dental Doctor, etc.).
 */
const createPortalTokenVerifier = (config) => {
  const {
    role,
    idClaimKeys = ['id'],
    model,
    attachAs,
    select,
    allowQueryToken = false,
    errorMessageKey = 'message',
    isInactive,
    afterVerify,
    getActorName,
    messages: customMessages = {},
  } = config || {};

  if (!model || !attachAs) {
    throw new Error('createPortalTokenVerifier requires `model` and `attachAs`');
  }

  const errKey = errorMessageKey || 'message';
  const messages = {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'المستخدم غير موجود',
    inactive: 'الحساب غير نشط',
    ...customMessages,
  };

  return async (req, res, next) => {
    const token = extractBearerOrQueryToken(req, allowQueryToken);
    if (!token) {
      return res.status(401).json({ success: false, [errKey]: messages.missingToken });
    }

    let actor;
    let decoded;

    try {
      decoded = jwt.verify(token, getJwtSecret());

      if (role && decoded?.role !== role) {
        return res.status(401).json({ success: false, [errKey]: messages.invalid });
      }

      const idKey = idClaimKeys.find(
        (key) => decoded?.[key] !== undefined && decoded?.[key] !== null && String(decoded[key]).trim() !== ''
      );
      const actorId = idKey ? decoded[idKey] : null;
      const tokenCompanyId = decoded?.companyId;

      if (!actorId || !tokenCompanyId) {
        return res.status(401).json({ success: false, [errKey]: messages.invalid });
      }

      const prisma = await getSharedPrismaClientAsync();
      const repo = prisma?.[model];
      if (!repo) {
        return res.status(500).json({ success: false, [errKey]: 'خطأ في إعدادات قاعدة البيانات' });
      }

      if (typeof repo.findUnique === 'function') {
        actor = await repo.findUnique({
          where: { id: actorId },
          select,
        });
      } else if (typeof repo.findFirst === 'function') {
        actor = await repo.findFirst({
          where: { id: actorId },
          select,
        });
      }

      if (!actor) {
        return res.status(401).json({ success: false, [errKey]: messages.notFound });
      }

      if (actor.companyId !== tokenCompanyId) {
        return res.status(401).json({ success: false, [errKey]: messages.invalid });
      }

      if (req.company?.id && actor.companyId !== req.company.id) {
        return res.status(403).json({
          success: false,
          code: 'TENANT_MISMATCH',
          [errKey]: DEFAULT_TENANT_MISMATCH_MESSAGE,
          message: DEFAULT_TENANT_MISMATCH_MESSAGE,
          error: DEFAULT_TENANT_MISMATCH_MESSAGE,
        });
      }

      if (typeof isInactive === 'function' && isInactive(actor)) {
        return res.status(403).json({ success: false, [errKey]: messages.inactive });
      }

      if (typeof afterVerify === 'function') {
        const hookResult = await afterVerify(actor, prisma, req);
        if (hookResult && typeof hookResult.status === 'number') {
          return res.status(hookResult.status).json(hookResult.body);
        }
      }
    } catch (error) {
      if (isMissingAuthSecretError(error)) {
        return res.status(500).json({
          success: false,
          code: 'AUTH_CONFIGURATION_ERROR',
          [errKey]: 'إعدادات المصادقة غير مكتملة',
        });
      }
      return res.status(401).json({ success: false, [errKey]: messages.invalid });
    }

    req[attachAs] = actor;
    req.companyId = actor.companyId;
    req.portalActor = {
      id: actor.id,
      companyId: actor.companyId,
      role: role || decoded?.role || null,
      name:
        typeof getActorName === 'function'
          ? getActorName(actor)
          : (actor.name || [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() || ''),
    };

    const tenantContext = require('../services/tenantContext');
    return tenantContext.run(actor.companyId, () => next());
  };
};

/**
 * Verifies a user-supplied secret against stored bcrypt, optional legacy SHA-256 hex,
 * or optional legacy plaintext PIN/secret.
 */
const verifySecretHash = async (rawSecret, storedHash, options = {}) => {
  if (rawSecret === undefined || rawSecret === null) return false;
  if (!storedHash || typeof storedHash !== 'string') return false;

  const raw = String(rawSecret);
  if (!raw) return false;

  const hash = storedHash.trim();
  if (!hash) return false;

  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(raw, hash);
    } catch (_) {
      return false;
    }
  }

  if (options.allowSha256 === true && /^[a-f0-9]{64}$/i.test(hash)) {
    const sha256Hex = crypto.createHash('sha256').update(raw).digest('hex');
    const computedBuf = Buffer.from(sha256Hex, 'utf8');
    const storedBuf = Buffer.from(hash.toLowerCase(), 'utf8');
    if (computedBuf.length === storedBuf.length && crypto.timingSafeEqual(computedBuf, storedBuf)) {
      return true;
    }
  }

  if (options.allowPlaintext === true) {
    const rawBuf = Buffer.from(raw, 'utf8');
    const storedBuf = Buffer.from(storedHash, 'utf8');
    if (rawBuf.length === storedBuf.length && crypto.timingSafeEqual(rawBuf, storedBuf)) {
      return true;
    }
  }

  return false;
};

/**
 * Resolves multi-company portal login candidates with secret-first anti-enumeration:
 * verifies secret across all matching records BEFORE revealing whether the phone/email
 * belongs to one or multiple companies.
 */
const resolvePortalLoginCandidates = async (options) => {
  const {
    prisma,
    model,
    identifier,
    companyId = null,
    whereExtra = {},
    select,
    includeCompanyRelation = true,
    searchFields = { phoneFields: ['phone'], emailFields: ['email'] },
    verifySecret,
    formatCompanyOption,
  } = options || {};

  const trimmedId = String(identifier || '').trim();
  if (!trimmedId || !prisma?.[model]) {
    return { status: 'invalid' };
  }

  if (typeof verifySecret !== 'function') {
    throw new Error('resolvePortalLoginCandidates requires `verifySecret` callback');
  }

  const phoneFields = Array.isArray(searchFields?.phoneFields) ? searchFields.phoneFields : [];
  const emailFields = Array.isArray(searchFields?.emailFields) ? searchFields.emailFields : [];

  const orClauses = [];

  if (phoneFields.length > 0 && !trimmedId.includes('@')) {
    const phoneVariants = getPhoneVariants(trimmedId);
    if (phoneVariants.length > 0) {
      for (const field of phoneFields) {
        orClauses.push({ [field]: { in: phoneVariants } });
      }
    }
  }

  if (emailFields.length > 0) {
    for (const field of emailFields) {
      orClauses.push({ [field]: { equals: trimmedId, mode: 'insensitive' } });
    }
  }

  if (orClauses.length === 0) {
    return { status: 'invalid' };
  }

  const where = {
    OR: orClauses,
    ...(whereExtra || {}),
    ...(companyId ? { companyId } : {}),
  };

  const companyRelationSelect = {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      isActive: true,
    },
  };

  const queryArgs = { where };
  if (select) {
    queryArgs.select = includeCompanyRelation
      ? { companyId: true, ...select, company: companyRelationSelect }
      : { companyId: true, ...select };
  } else if (includeCompanyRelation) {
    queryArgs.include = { company: companyRelationSelect };
  }

  const repo = prisma[model];
  let candidates = [];
  if (typeof repo.findMany === 'function') {
    candidates = await repo.findMany(queryArgs);
  } else if (typeof repo.findFirst === 'function') {
    const single = await repo.findFirst(queryArgs);
    if (single) candidates = [single];
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { status: 'invalid' };
  }

  const companyMap = new Map();
  if (includeCompanyRelation) {
    for (const candidate of candidates) {
      if (candidate?.company?.id) {
        companyMap.set(candidate.company.id, candidate.company);
      }
    }
  }

  const missingCompanyIds = [
    ...new Set(
      candidates
        .map((c) => c?.companyId)
        .filter((id) => Boolean(id) && !companyMap.has(id))
    ),
  ];

  if (missingCompanyIds.length > 0 && typeof prisma?.company?.findMany === 'function') {
    try {
      const companies = await prisma.company.findMany({
        where: { id: { in: missingCompanyIds } },
        select: { id: true, name: true, slug: true, logo: true, isActive: true },
      });
      if (Array.isArray(companies)) {
        for (const comp of companies) {
          if (comp?.id) {
            companyMap.set(comp.id, comp);
          }
        }
      }
    } catch (_) {
      // Safe fallback when company.findMany is mocked/unavailable
    }
  }

  const secretMatches = [];
  for (const candidate of candidates) {
    const matched = await verifySecret(candidate);
    if (matched === true) {
      secretMatches.push(candidate);
    }
  }

  if (secretMatches.length === 0) {
    return { status: 'invalid' };
  }

  const activeMatches = secretMatches.filter((candidate) => {
    const comp = candidate.company || companyMap.get(candidate.companyId);
    return comp ? comp.isActive !== false : true;
  });

  if (activeMatches.length === 0) {
    return { status: 'inactive_company' };
  }

  if (activeMatches.length === 1 || companyId) {
    const chosen = activeMatches[0];
    const resolvedCompany = chosen.company || companyMap.get(chosen.companyId) || null;
    const { company: _omitCompany, ...cleanActor } = chosen;
    return {
      status: 'authenticated',
      actor: cleanActor,
      company: resolvedCompany,
    };
  }

  return {
    status: 'select_company',
    companies: activeMatches.map((candidate) => {
      const comp = candidate.company || companyMap.get(candidate.companyId) || null;
      if (typeof formatCompanyOption === 'function') {
        return formatCompanyOption(candidate, comp);
      }
      return {
        companyId: candidate.companyId,
        companyName: comp?.name || '',
        companySlug: comp?.slug || null,
        companyLogo: comp?.logo || null,
      };
    }),
  };
};

module.exports = {
  createPortalTokenVerifier,
  resolvePortalLoginCandidates,
  verifySecretHash,
};
