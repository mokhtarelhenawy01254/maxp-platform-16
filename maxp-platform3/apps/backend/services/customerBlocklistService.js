const DEFAULT_CHECKOUT_MESSAGE =
  'لا يمكن إتمام الطلب لهذا العميل حالياً. برجاء التواصل مع خدمة العملاء.';
const DEFAULT_INTERNAL_WARNING =
  'هذا العميل محظور من إنشاء الطلبات. راجع السبب قبل أي إجراء.';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  blockCheckout: true,
  blockManualOrders: true,
  blockAffiliateManualOrders: true,
  blockAiOrderCreation: true,
  matchPhone: true,
  matchEmail: true,
  matchFacebook: true,
  matchWhatsapp: true,
  allowManagerOverride: true,
  defaultAction: 'BLOCK_ORDERS',
  checkoutMessage: DEFAULT_CHECKOUT_MESSAGE,
  internalWarningMessage: DEFAULT_INTERNAL_WARNING,
});

const ADMIN_OVERRIDE_ROLES = new Set([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
  'MANAGER',
  'ADMIN',
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function stripPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value) {
  let digits = stripPhone(value);
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }

  return digits;
}

function getPhoneVariants(value) {
  const raw = stripPhone(value);
  const normalized = normalizePhone(value);
  const variants = new Set([raw, normalized].filter(Boolean));

  if (normalized.startsWith('0') && normalized.length >= 10) {
    const withoutLeadingZero = normalized.slice(1);
    variants.add(withoutLeadingZero);
    variants.add(`20${withoutLeadingZero}`);
  }

  if (raw.startsWith('20') && raw.length === 12) {
    variants.add(`0${raw.slice(2)}`);
  }

  return Array.from(variants);
}

function normalizeAction(action, fallback = 'BLOCK_ORDERS') {
  const normalized = String(action || fallback).trim().toUpperCase();
  if (['BLOCK_ORDERS', 'REQUIRE_MANAGER_APPROVAL', 'BLOCK_COD_ONLY'].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeReasonCode(reasonCode) {
  const normalized = String(reasonCode || 'OTHER').trim().toUpperCase();
  return normalized || 'OTHER';
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCashPayment(paymentMethod) {
  const method = String(paymentMethod || '').trim().toUpperCase();
  return ['CASH', 'COD', 'CASH_ON_DELIVERY', 'الدفع عند الاستلام'].includes(method);
}

function canOverride(userRole) {
  return ADMIN_OVERRIDE_ROLES.has(String(userRole || '').toUpperCase());
}

function sourceIsEnabled(settings, source, userRole) {
  const normalizedSource = String(source || '').toLowerCase();
  const normalizedRole = String(userRole || '').toUpperCase();

  if (normalizedSource === 'public_checkout' || normalizedSource === 'checkout') {
    return settings.blockCheckout !== false;
  }

  if (normalizedSource === 'ai' || normalizedSource === 'conversation') {
    return settings.blockAiOrderCreation !== false;
  }

  if (normalizedSource === 'manual' || normalizedSource === 'orders-enhanced') {
    if (normalizedRole === 'AFFILIATE') {
      return settings.blockAffiliateManualOrders !== false;
    }
    return settings.blockManualOrders !== false;
  }

  return true;
}

function parseMetadata(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function formatRule(rule) {
  if (!rule) return null;
  return {
    ...rule,
    metadata: parseMetadata(rule.metadata),
  };
}

function buildPublicPayload({ rule, settings, action, source, overrideApplied = false }) {
  const isPublic = ['public_checkout', 'checkout'].includes(String(source || '').toLowerCase());
  const message = isPublic
    ? settings.checkoutMessage || DEFAULT_CHECKOUT_MESSAGE
    : settings.internalWarningMessage || DEFAULT_INTERNAL_WARNING;

  const code =
    action === 'REQUIRE_MANAGER_APPROVAL'
      ? 'CUSTOMER_REQUIRES_MANAGER_APPROVAL'
      : action === 'BLOCK_COD_ONLY'
        ? 'CUSTOMER_COD_BLOCKED'
        : 'CUSTOMER_BLOCKED';

  return {
    blocked: !overrideApplied,
    overrideApplied,
    code,
    message,
    action,
    rule: formatRule(rule),
  };
}

function sendBlockedResponse(res, evaluation) {
  const payload = evaluation?.payload || evaluation;
  const status = payload?.code === 'CUSTOMER_REQUIRES_MANAGER_APPROVAL' ? 409 : 403;

  return res.status(status).json({
    success: false,
    code: payload?.code || 'CUSTOMER_BLOCKED',
    message: payload?.message || DEFAULT_INTERNAL_WARNING,
    error: payload?.message || DEFAULT_INTERNAL_WARNING,
    customerBlock: payload,
  });
}

function isMissingTableError(error, expectedTables = []) {
  if (String(error?.code || '') !== 'P2021') {
    return false;
  }

  const table = String(error?.meta?.table || '').toLowerCase();
  return expectedTables.length === 0
    || expectedTables.some(expected => table.includes(String(expected).toLowerCase()));
}

async function getSettings(prisma, companyId) {
  if (!companyId || !prisma?.customerBlockSettings) {
    return { ...DEFAULT_SETTINGS, companyId };
  }

  try {
    const settings = await prisma.customerBlockSettings.findUnique({
      where: { companyId },
    });

    return {
      ...DEFAULT_SETTINGS,
      ...(settings || {}),
      companyId,
      checkoutMessage: settings?.checkoutMessage || DEFAULT_CHECKOUT_MESSAGE,
      internalWarningMessage: settings?.internalWarningMessage || DEFAULT_INTERNAL_WARNING,
      defaultAction: normalizeAction(settings?.defaultAction, DEFAULT_SETTINGS.defaultAction),
    };
  } catch (error) {
    console.warn('⚠️ [CUSTOMER-BLOCKLIST] Falling back to default settings:', error.message);
    return { ...DEFAULT_SETTINGS, companyId };
  }
}

async function upsertSettings(prisma, companyId, input = {}) {
  const updateData = {};
  [
    'enabled',
    'blockCheckout',
    'blockManualOrders',
    'blockAffiliateManualOrders',
    'blockAiOrderCreation',
    'matchPhone',
    'matchEmail',
    'matchFacebook',
    'matchWhatsapp',
    'allowManagerOverride',
  ].forEach((key) => {
    if (input[key] !== undefined) {
      updateData[key] = Boolean(input[key]);
    }
  });

  if (input.defaultAction !== undefined) {
    updateData.defaultAction = normalizeAction(input.defaultAction);
  }

  if (input.checkoutMessage !== undefined) {
    updateData.checkoutMessage = String(input.checkoutMessage || '').trim() || DEFAULT_CHECKOUT_MESSAGE;
  }

  if (input.internalWarningMessage !== undefined) {
    updateData.internalWarningMessage =
      String(input.internalWarningMessage || '').trim() || DEFAULT_INTERNAL_WARNING;
  }

  return prisma.customerBlockSettings.upsert({
    where: { companyId },
    update: updateData,
    create: {
      companyId,
      ...DEFAULT_SETTINGS,
      ...updateData,
    },
  });
}

function buildMatchWhere(settings, identifiers) {
  const OR = [];
  const phoneVariants = getPhoneVariants(identifiers.phone);
  const emailNormalized = normalizeEmail(identifiers.email);
  const facebookId = String(identifiers.facebookId || '').trim();
  const whatsappId = String(identifiers.whatsappId || '').trim();
  const customerId = String(identifiers.customerId || '').trim();

  if (customerId) {
    OR.push({ customerId });
  }

  if (settings.matchPhone !== false && phoneVariants.length > 0) {
    OR.push({ phoneNormalized: { in: phoneVariants } });
  }

  if (settings.matchEmail !== false && emailNormalized) {
    OR.push({ emailNormalized });
  }

  if (settings.matchFacebook !== false && facebookId) {
    OR.push({ facebookId });
  }

  if (settings.matchWhatsapp !== false && whatsappId) {
    OR.push({ whatsappId });
  }

  return OR;
}

async function findActiveRule(prisma, companyId, identifiers = {}, settings = null) {
  const resolvedSettings = settings || (await getSettings(prisma, companyId));
  const OR = buildMatchWhere(resolvedSettings, identifiers);

  if (!companyId || OR.length === 0 || !prisma?.customerBlockRule) {
    return null;
  }

  const now = new Date();

  try {
    return await prisma.customerBlockRule.findFirst({
      where: {
        companyId,
        status: 'ACTIVE',
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
        AND: [{ OR }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingTableError(error, ['customer_block_rules'])) {
      console.warn('⚠️ [CUSTOMER-BLOCKLIST] Rule lookup skipped because customer block tables are not present.');
      return null;
    }
    throw error;
  }
}

async function evaluateCustomerBlock(prisma, options = {}) {
  const {
    companyId,
    customerId,
    phone,
    email,
    facebookId,
    whatsappId,
    source,
    userRole,
    paymentMethod,
    allowOverride,
  } = options;

  if (!companyId) {
    return { blocked: false, payload: null };
  }

  const settings = await getSettings(prisma, companyId);
  if (!settings.enabled || !sourceIsEnabled(settings, source, userRole)) {
    return { blocked: false, payload: null, settings };
  }

  const rule = await findActiveRule(
    prisma,
    companyId,
    { customerId, phone, email, facebookId, whatsappId },
    settings,
  );

  if (!rule) {
    return { blocked: false, payload: null, settings };
  }

  const action = normalizeAction(rule.action, settings.defaultAction);

  if (action === 'BLOCK_COD_ONLY' && !isCashPayment(paymentMethod)) {
    return {
      blocked: false,
      warning: true,
      payload: buildPublicPayload({ rule, settings, action, source, overrideApplied: true }),
      settings,
      rule,
    };
  }

  const overrideApplied =
    Boolean(allowOverride) &&
    settings.allowManagerOverride !== false &&
    canOverride(userRole);

  if (overrideApplied) {
    return {
      blocked: false,
      overrideApplied: true,
      payload: buildPublicPayload({ rule, settings, action, source, overrideApplied: true }),
      settings,
      rule,
    };
  }

  return {
    blocked: true,
    payload: buildPublicPayload({ rule, settings, action, source }),
    settings,
    rule,
  };
}

async function listRules(prisma, companyId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;
  const status = String(filters.status || 'ACTIVE').toUpperCase();
  const search = String(filters.search || '').trim();

  const where = { companyId };
  if (status !== 'ALL') {
    where.status = status;
  }

  if (search) {
    const phoneVariants = getPhoneVariants(search);
    const emailNormalized = normalizeEmail(search);
    where.OR = [
      { phone: { contains: search } },
      { email: { contains: search } },
      { reasonNote: { contains: search } },
      { customer: { is: { firstName: { contains: search } } } },
      { customer: { is: { lastName: { contains: search } } } },
    ];

    if (phoneVariants.length > 0) {
      where.OR.push({ phoneNormalized: { in: phoneVariants } });
    }

    if (emailNormalized) {
      where.OR.push({ emailNormalized });
    }
  }

  const [rules, total] = await Promise.all([
    prisma.customerBlockRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    }),
    prisma.customerBlockRule.count({ where }),
  ]);

  return {
    data: rules.map(formatRule),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

async function createRule(prisma, companyId, input = {}, actor = {}) {
  let customer = null;
  const customerId = String(input.customerId || '').trim();

  if (customerId) {
    customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        facebookId: true,
        whatsappId: true,
        status: true,
      },
    });

    if (!customer) {
      const error = new Error('العميل غير موجود أو لا يتبع هذه الشركة');
      error.statusCode = 404;
      throw error;
    }
  }

  const phone = String(input.phone || customer?.phone || '').trim();
  const email = String(input.email || customer?.email || '').trim();
  const facebookId = String(input.facebookId || customer?.facebookId || '').trim();
  const whatsappId = String(input.whatsappId || customer?.whatsappId || '').trim();
  const phoneNormalized = normalizePhone(phone);
  const emailNormalized = normalizeEmail(email);

  if (!customer?.id && !phoneNormalized && !emailNormalized && !facebookId && !whatsappId) {
    const error = new Error('يجب تحديد عميل أو رقم هاتف أو بريد إلكتروني للحظر');
    error.statusCode = 400;
    throw error;
  }

  const settings = await getSettings(prisma, companyId);
  const existing = await findActiveRule(
    prisma,
    companyId,
    {
      customerId: customer?.id || null,
      phone,
      email,
      facebookId,
      whatsappId,
    },
    settings,
  );

  const startsAt = normalizeDate(input.startsAt) || new Date();
  const expiresAt = normalizeDate(input.expiresAt);
  const data = {
    companyId,
    customerId: customer?.id || null,
    phone: phone || null,
    phoneNormalized: phoneNormalized || null,
    email: email || null,
    emailNormalized: emailNormalized || null,
    facebookId: facebookId || null,
    whatsappId: whatsappId || null,
    reasonCode: normalizeReasonCode(input.reasonCode),
    reasonNote: String(input.reasonNote || input.reason || '').trim() || null,
    action: normalizeAction(input.action, settings.defaultAction),
    startsAt,
    expiresAt,
    status: 'ACTIVE',
    createdBy: actor.id || null,
    createdByName: actor.name || actor.email || null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  };

  const rule = await prisma.$transaction(async (tx) => {
    const savedRule = existing
      ? await tx.customerBlockRule.update({
          where: { id: existing.id },
          data: {
            ...data,
            liftedAt: null,
            liftedBy: null,
            liftedByName: null,
            liftedReason: null,
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                status: true,
              },
            },
          },
        })
      : await tx.customerBlockRule.create({
          data,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                status: true,
              },
            },
          },
        });

    if (customer?.id) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { status: 'BLOCKED' },
      });
    }

    return savedRule;
  });

  return {
    data: formatRule(rule),
    created: !existing,
  };
}

async function liftRule(prisma, companyId, ruleId, input = {}, actor = {}) {
  const existing = await prisma.customerBlockRule.findFirst({
    where: { id: ruleId, companyId },
    include: { customer: true },
  });

  if (!existing) {
    const error = new Error('قاعدة الحظر غير موجودة');
    error.statusCode = 404;
    throw error;
  }

  const lifted = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerBlockRule.update({
      where: { id: existing.id },
      data: {
        status: 'LIFTED',
        liftedAt: new Date(),
        liftedBy: actor.id || null,
        liftedByName: actor.name || actor.email || null,
        liftedReason: String(input.liftedReason || input.reason || '').trim() || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (existing.customerId) {
      const activeCount = await tx.customerBlockRule.count({
        where: {
          companyId,
          customerId: existing.customerId,
          status: 'ACTIVE',
          id: { not: existing.id },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (activeCount === 0) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    return updated;
  });

  return formatRule(lifted);
}

module.exports = {
  DEFAULT_SETTINGS,
  DEFAULT_CHECKOUT_MESSAGE,
  DEFAULT_INTERNAL_WARNING,
  normalizeEmail,
  normalizePhone,
  getPhoneVariants,
  getSettings,
  upsertSettings,
  findActiveRule,
  evaluateCustomerBlock,
  sendBlockedResponse,
  listRules,
  createRule,
  liftRule,
};
