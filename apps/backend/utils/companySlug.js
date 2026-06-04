const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  sanitizeSlug,
  validateSlug,
  isReservedSlug,
  suggestSlug
} = require('./slugValidator');

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;

const buildStableFallbackSeed = ({ email, companyId } = {}) => {
  const emailSeed = sanitizeSlug(String(email || '').split('@')[0] || '');
  if (emailSeed.length >= MIN_SLUG_LENGTH) {
    return emailSeed;
  }

  const companySeed = sanitizeSlug(String(companyId || '').replace(/-/g, '').slice(-12));
  if (companySeed.length >= MIN_SLUG_LENGTH) {
    return `store-${companySeed}`;
  }

  const randomSeed = crypto.randomBytes(4).toString('hex');
  return `store-${randomSeed}`;
};

const normalizeBaseSlug = (value) => {
  let baseSlug = sanitizeSlug(value || '');

  if (!baseSlug || baseSlug.length < MIN_SLUG_LENGTH) {
    return '';
  }

  if (isReservedSlug(baseSlug)) {
    baseSlug = sanitizeSlug(`store-${baseSlug}`);
  }

  if (!baseSlug || baseSlug.length < MIN_SLUG_LENGTH) {
    return '';
  }

  const validation = validateSlug(baseSlug);
  return validation.valid ? baseSlug : '';
};

const trimBaseForSuffix = (baseSlug, suffix = '') => {
  const allowedBaseLength = Math.max(MIN_SLUG_LENGTH, MAX_SLUG_LENGTH - suffix.length);
  return baseSlug.slice(0, allowedBaseLength).replace(/-+$/g, '');
};

const isSlugTaken = async (prisma, slug, excludeCompanyId) => {
  const where = excludeCompanyId
    ? {
        slug,
        NOT: { id: excludeCompanyId }
      }
    : { slug };

  const existingCompany = await prisma.company.findFirst({
    where,
    select: { id: true }
  });

  return Boolean(existingCompany);
};

const buildBaseSlug = ({ name, email, companyId } = {}) => {
  const candidates = [
    normalizeBaseSlug(suggestSlug(name || '')),
    normalizeBaseSlug(name || ''),
    normalizeBaseSlug(buildStableFallbackSeed({ email, companyId }))
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return normalizeBaseSlug(`store-${Date.now().toString(36)}`) || `store-${crypto.randomBytes(4).toString('hex')}`;
};

const generateUniqueCompanySlug = async (
  name,
  {
    prisma = getSharedPrismaClient(),
    email,
    companyId,
    excludeCompanyId
  } = {}
) => {
  const baseSlug = buildBaseSlug({ name, email, companyId });

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const trimmedBase = trimBaseForSuffix(baseSlug, suffix);
    const candidate = `${trimmedBase}${suffix}`;
    const validation = validateSlug(candidate);

    if (!validation.valid || isReservedSlug(candidate)) {
      continue;
    }

    if (!(await isSlugTaken(prisma, candidate, excludeCompanyId))) {
      return candidate;
    }
  }

  const emergencySlug = `store-${crypto.randomBytes(6).toString('hex')}`.slice(0, MAX_SLUG_LENGTH);
  if (!(await isSlugTaken(prisma, emergencySlug, excludeCompanyId))) {
    return emergencySlug;
  }

  throw new Error('تعذر إنشاء رابط فريد للمتجر');
};

const ensureCompanySlug = async (
  companyOrId,
  {
    prisma = getSharedPrismaClient()
  } = {}
) => {
  if (!companyOrId) {
    return null;
  }

  let company =
    typeof companyOrId === 'string'
      ? await prisma.company.findUnique({
          where: { id: companyOrId },
          select: {
            id: true,
            name: true,
            slug: true,
            email: true
          }
        })
      : companyOrId;

  if (!company) {
    return null;
  }

  if (company.slug && String(company.slug).trim().length > 0) {
    return company;
  }

  const slug = await generateUniqueCompanySlug(company.name, {
    prisma,
    email: company.email,
    companyId: company.id,
    excludeCompanyId: company.id
  });

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: { slug }
  });

  return typeof companyOrId === 'string'
    ? updatedCompany
    : {
        ...company,
        slug: updatedCompany.slug
      };
};

module.exports = {
  generateUniqueCompanySlug,
  ensureCompanySlug
};
