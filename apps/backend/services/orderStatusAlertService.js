/**
 * Order Status-Change Alert Service
 *
 * Manages per-company status alert settings stored in `company.settings.statusAlerts`,
 * sends In-App notifications (`type: 'order_status_alert'`), real-time `order:status_alert`
 * socket events, WhatsApp direct admin/owner alerts, and Telegram alerts,
 * and enforces the TTL deduplication guard (`statusAlertDedup`).
 */

const { checkStatusAlertDedup, releaseStatusAlertDedupKey } = require('../utils/statusAlertDedup');
const { formatPhoneNumber } = require('../utils/phoneFormat');

const DEFAULT_RECIPIENT_ROLES = ['OWNER', 'COMPANY_ADMIN', 'MANAGER'];
const VALID_USER_COMPANY_ROLES = new Set([
  'OWNER',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'ADMIN',
  'MANAGER',
  'AGENT',
  'AFFILIATE',
]);

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'enabled',
  'statuses',
  'channels',
  'recipients',
  'windowMinutes',
  'updatedBy',
  'updatedAt',
]);

const ALLOWED_CHANNEL_KEYS = new Set(['inApp', 'whatsapp', 'telegram']);
const ALLOWED_RECIPIENT_KEYS = new Set(['roles', 'userIds', 'phones', 'telegramChatIds']);
const MAX_LIST_ITEMS = 50;

const SYSTEM_STATUS_LABELS = {
  PENDING: 'قيد الانتظار',
  WAITING_FOR_CONFIRMATION: 'في انتظار التأكيد',
  CONFIRMED: 'مؤكد',
  UNDER_REVIEW: 'تحت المراجعة',
  PROCESSING: 'قيد المعالجة',
  PREPARING: 'قيد التجهيز',
  QUALITY_CHECK: 'فحص الجودة',
  PACKAGED: 'تم التغليف',
  READY_TO_SHIP: 'جاهز للشحن',
  SHIPPED: 'تم الشحن',
  OUT_FOR_DELIVERY: 'خرج للتوصيل',
  DELIVERED: 'تم التسليم',
  COMPLETED: 'مكتمل',
  POSTPONED: 'مؤجل',
  ON_HOLD: 'معلق',
  NO_RESPONSE: 'لا يرد',
  PENDING_CANCELLATION: 'طلب إلغاء',
  CANCELLED: 'ملغي',
  RETURNED: 'مرتجع',
  PARTIALLY_RETURNED: 'مرتجع جزئي',
  PARTIALLY_DELIVERED: 'تسليم جزئي',
  REFUNDED: 'مسترد',
  EXCHANGED: 'مستبدل',
  SCHEDULED: 'مجدول',
  STOCK_SHORTAGE: 'نقص مخزون',
  SHIPPING_FAILED: 'فشل الشحن',
  DUPLICATE_ORDER: 'طلب مكرر',
};

const NON_RETRYABLE_WHATSAPP_REASONS = new Set([
  'no_session',
  'session_not_connected',
  'no_template',
  'template_not_found',
  'no_template_configured',
  'meta_template_not_approved',
  'template_param_mismatch',
  'module_disabled',
  'disabled',
  'notifications_disabled',
  'event_disabled',
]);

function getDefaultStatusAlertSettings() {
  return {
    enabled: true,
    statuses: ['SHIPPED'],
    channels: {
      inApp: true,
      whatsapp: true,
      telegram: false,
    },
    recipients: {
      roles: [...DEFAULT_RECIPIENT_ROLES],
      userIds: [],
      phones: [],
      telegramChatIds: [],
    },
    windowMinutes: 5,
    updatedBy: null,
    updatedAt: null,
  };
}

function normalizePhoneList(rawPhones) {
  let list = [];
  if (Array.isArray(rawPhones)) {
    list = rawPhones;
  } else if (typeof rawPhones === 'string') {
    list = rawPhones.split(/[\n,;]+/);
  }
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    const cleaned = String(entry || '').trim();
    if (!cleaned) continue;
    const dedupKey = cleaned.replace(/[\s\-()]/g, '');
    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    result.push(cleaned);
    if (result.length >= MAX_LIST_ITEMS) break;
  }
  return result;
}

function normalizeCodeList(rawList, fallback = []) {
  if (!Array.isArray(rawList)) {
    return [...fallback];
  }
  const seen = new Set();
  const out = [];
  for (const item of rawList) {
    const normalized = String(item || '').trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

function normalizeStringIdList(rawList) {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const item of rawList) {
    const normalized = String(item || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

/**
 * Pure normalization of `company.settings.statusAlerts`.
 * Preserves explicit empty `statuses: []` once configured; defaults to `['SHIPPED']` only when unconfigured.
 */
function normalizeStatusAlertSettings(rawSettings) {
  const raw = rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)
    ? rawSettings
    : {};

  const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : true;

  const statuses = Array.isArray(raw.statuses)
    ? normalizeCodeList(raw.statuses, [])
    : ['SHIPPED'];

  const rawChannels = raw.channels && typeof raw.channels === 'object' ? raw.channels : {};
  const channels = {
    inApp: rawChannels.inApp !== undefined ? Boolean(rawChannels.inApp) : true,
    whatsapp: rawChannels.whatsapp !== undefined ? Boolean(rawChannels.whatsapp) : true,
    telegram: rawChannels.telegram !== undefined ? Boolean(rawChannels.telegram) : false,
  };

  const rawRecipients = raw.recipients && typeof raw.recipients === 'object' ? raw.recipients : {};
  const roles = Array.isArray(rawRecipients.roles)
    ? normalizeCodeList(rawRecipients.roles, []).filter((r) => VALID_USER_COMPANY_ROLES.has(r))
    : [...DEFAULT_RECIPIENT_ROLES];
  const userIds = normalizeStringIdList(rawRecipients.userIds);
  const phones = normalizePhoneList(rawRecipients.phones);
  const telegramChatIds = normalizeStringIdList(rawRecipients.telegramChatIds);

  let windowMinutes = 5;
  if (raw.windowMinutes !== undefined && raw.windowMinutes !== null && raw.windowMinutes !== '') {
    const parsed = Number(raw.windowMinutes);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1440) {
      windowMinutes = Math.round(parsed);
    }
  }

  const normalized = {
    enabled,
    statuses,
    channels,
    recipients: {
      roles,
      userIds,
      phones,
      telegramChatIds,
    },
    windowMinutes,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
  };

  Object.defineProperty(normalized, '_hasExplicitConfig', {
    value: Boolean(rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)),
    enumerable: false,
    configurable: true,
    writable: true,
  });

  return normalized;
}

/**
 * Pure validation for incoming PUT /order-status-alerts payload.
 */
function validateStatusAlertSettings(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, message: 'بيانات إعدادات التنبيهات غير صالحة' };
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return { isValid: false, message: `حقل غير مسموح به: ${key}` };
    }
  }

  if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') {
    return { isValid: false, message: 'قيمة التفعيل يجب أن تكون منطقية (true/false)' };
  }

  if (payload.statuses !== undefined) {
    if (!Array.isArray(payload.statuses)) {
      return { isValid: false, message: 'قائمة الحالات يجب أن تكون مصفوفة' };
    }
    if (payload.statuses.length > MAX_LIST_ITEMS) {
      return { isValid: false, message: `الحد الأقصى للحالات هو ${MAX_LIST_ITEMS}` };
    }
    if (payload.statuses.some((s) => typeof s !== 'string' || s.trim().length > 80)) {
      return { isValid: false, message: 'أكواد الحالات يجب أن تكون نصوصاً صالحة' };
    }
  }

  if (payload.channels !== undefined) {
    if (typeof payload.channels !== 'object' || payload.channels === null || Array.isArray(payload.channels)) {
      return { isValid: false, message: 'إعدادات القنوات غير صالحة' };
    }
    for (const [k, v] of Object.entries(payload.channels)) {
      if (!ALLOWED_CHANNEL_KEYS.has(k)) {
        return { isValid: false, message: `قناة غير معروفة: ${k}` };
      }
      if (v !== undefined && typeof v !== 'boolean') {
        return { isValid: false, message: 'قيمة تفعيل القناة يجب أن تكون true أو false' };
      }
    }
  }

  if (payload.recipients !== undefined) {
    if (typeof payload.recipients !== 'object' || payload.recipients === null || Array.isArray(payload.recipients)) {
      return { isValid: false, message: 'إعدادات المستقبلين غير صالحة' };
    }
    for (const key of Object.keys(payload.recipients)) {
      if (!ALLOWED_RECIPIENT_KEYS.has(key)) {
        return { isValid: false, message: `حقل مستقبلين غير معروف: ${key}` };
      }
    }

    if (payload.recipients.roles !== undefined) {
      if (!Array.isArray(payload.recipients.roles)) {
        return { isValid: false, message: 'قائمة أدوار المستقبلين يجب أن تكون مصفوفة' };
      }
      if (payload.recipients.roles.length > MAX_LIST_ITEMS) {
        return { isValid: false, message: `الحد الأقصى للأدوار هو ${MAX_LIST_ITEMS}` };
      }
      for (const r of payload.recipients.roles) {
        const normalizedRole = String(r || '').trim().toUpperCase();
        if (!VALID_USER_COMPANY_ROLES.has(normalizedRole)) {
          return { isValid: false, message: `دور مستقبل غير صالح: ${r}` };
        }
      }
    }

    if (payload.recipients.userIds !== undefined) {
      if (!Array.isArray(payload.recipients.userIds) || payload.recipients.userIds.length > MAX_LIST_ITEMS) {
        return { isValid: false, message: 'قائمة المستخدمين المختارين غير صالحة' };
      }
      if (payload.recipients.userIds.some((id) => typeof id !== 'string' || id.trim().length > 100)) {
        return { isValid: false, message: 'معرفات المستخدمين يجب أن تكون نصوصاً صالحة' };
      }
    }

    if (payload.recipients.phones !== undefined) {
      if (!Array.isArray(payload.recipients.phones) && typeof payload.recipients.phones !== 'string') {
        return { isValid: false, message: 'أرقام الهواتف يجب أن تكون مصفوفة أو نصاً' };
      }
      const phoneList = normalizePhoneList(payload.recipients.phones);
      if (phoneList.length > MAX_LIST_ITEMS) {
        return { isValid: false, message: `الحد الأقصى لأرقام الهواتف هو ${MAX_LIST_ITEMS}` };
      }
      for (const p of phoneList) {
        const digits = p.replace(/[\s\-()+]/g, '');
        if (!/^\d{8,15}$/.test(digits)) {
          return { isValid: false, message: `رقم الهاتف غير صالح (يجب أن يحتوي على 8 إلى 15 رقماً): ${p}` };
        }
      }
    }

    if (payload.recipients.telegramChatIds !== undefined) {
      if (!Array.isArray(payload.recipients.telegramChatIds) || payload.recipients.telegramChatIds.length > MAX_LIST_ITEMS) {
        return { isValid: false, message: 'قائمة معرفات تيليجرام غير صالحة' };
      }
      for (const chatId of payload.recipients.telegramChatIds) {
        const str = String(chatId || '').trim();
        if (!str || !/^-?\d{5,20}$|^@[a-zA-Z0-9_]{3,64}$/.test(str)) {
          return { isValid: false, message: `معرف محادثة تيليجرام غير صالح: ${chatId}` };
        }
      }
    }
  }

  if (payload.windowMinutes !== undefined && payload.windowMinutes !== null && payload.windowMinutes !== '') {
    const num = Number(payload.windowMinutes);
    if (!Number.isFinite(num) || num < 0 || num > 1440) {
      return { isValid: false, message: 'نافذة منع التكرار يجب أن تكون بين 0 و 1440 دقيقة' };
    }
  }

  return { isValid: true };
}

function isStatusAlertEnabled(settings, statusCode) {
  if (!settings || settings.enabled !== true) {
    return false;
  }
  const code = String(statusCode || '').trim().toUpperCase();
  if (!code || !Array.isArray(settings.statuses)) {
    return false;
  }
  return settings.statuses.some((s) => String(s || '').trim().toUpperCase() === code);
}

function parseCompanySettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
}

function getPrismaClient(prismaOverride) {
  if (prismaOverride) return prismaOverride;
  const { getSharedPrismaClient } = require('./sharedDatabase');
  return getSharedPrismaClient();
}

async function getStatusAlertSettings(companyId, prismaOverride = null) {
  if (!companyId) {
    return normalizeStatusAlertSettings(null);
  }
  try {
    const prisma = getPrismaClient(prismaOverride);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const companySettings = parseCompanySettings(company?.settings);
    return normalizeStatusAlertSettings(companySettings.statusAlerts);
  } catch (err) {
    console.warn('⚠️ [ORDER-STATUS-ALERT] Error fetching settings:', err.message);
    return normalizeStatusAlertSettings(null);
  }
}

async function getCompanyTeamUsers(companyId, prismaOverride = null) {
  if (!companyId) return [];
  const prisma = getPrismaClient(prismaOverride);
  const userMap = new Map();

  try {
    if (prisma.userCompany?.findMany) {
      const memberships = await prisma.userCompany.findMany({
        where: { companyId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
      for (const m of memberships || []) {
        const u = m?.user;
        if (!u || u.isActive === false) continue;
        userMap.set(u.id, {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'مستخدم',
          email: u.email || null,
          phone: u.phone || null,
          role: String(m.role || u.role || '').toUpperCase(),
        });
      }
    }

    if (prisma.user?.findMany) {
      const directUsers = await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
      });
      for (const u of directUsers || []) {
        if (userMap.has(u.id)) continue;
        userMap.set(u.id, {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'مستخدم',
          email: u.email || null,
          phone: u.phone || null,
          role: String(u.role || '').toUpperCase(),
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ [ORDER-STATUS-ALERT] Failed loading company team users:', err.message);
  }

  return Array.from(userMap.values());
}

async function resolveActiveWhatsAppSession(companyId, prisma) {
  try {
    const WhatsAppManager = require('./whatsapp/WhatsAppManager');
    if (typeof WhatsAppManager.getCompanySessions === 'function') {
      const memSessions = WhatsAppManager.getCompanySessions(companyId) || [];
      const connected = memSessions.find((s) => String(s.status || '').toUpperCase() === 'CONNECTED');
      if (connected) {
        return { id: connected.sessionId, phoneNumber: connected.phoneNumber || null };
      }
    }
  } catch (_) {}

  try {
    if (prisma?.whatsAppSession?.findFirst) {
      const dbSession = await prisma.whatsAppSession.findFirst({
        where: { companyId, status: 'CONNECTED' },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, phoneNumber: true },
      });
      return dbSession || null;
    }
  } catch (_) {}

  return null;
}

async function resolveActiveTelegramConfig(companyId, prisma) {
  try {
    if (prisma?.telegramConfig?.findMany) {
      const configs = await prisma.telegramConfig.findMany({
        where: { companyId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, type: true, botToken: true, isActive: true },
      });
      if (configs && configs.length > 0) {
        return configs.find((c) => c.type === 'BOT') || configs[0];
      }
    }
  } catch (_) {}
  return null;
}

async function getSettingsPageContext(companyId, prismaOverride = null) {
  const prisma = getPrismaClient(prismaOverride);
  const [settings, teamUsers, waSession, tgConfig] = await Promise.all([
    getStatusAlertSettings(companyId, prisma),
    getCompanyTeamUsers(companyId, prisma),
    resolveActiveWhatsAppSession(companyId, prisma),
    resolveActiveTelegramConfig(companyId, prisma),
  ]);

  const statusMap = new Map();
  Object.entries(SYSTEM_STATUS_LABELS).forEach(([code, label], idx) => {
    statusMap.set(code, {
      code,
      name: label,
      color: code === 'SHIPPED' ? '#6366F1' : '#64748B',
      isTerminal: ['DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(code),
      sortOrder: idx + 1,
    });
  });

  try {
    if (prisma.orderStatusConfig?.findMany) {
      const configs = await prisma.orderStatusConfig.findMany({
        where: { companyId, statusType: 'order', isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { code: true, name: true, color: true, sortOrder: true },
      });
      for (const cfg of configs || []) {
        const code = String(cfg.code || '').trim().toUpperCase();
        if (!code) continue;
        const existing = statusMap.get(code);
        statusMap.set(code, {
          code,
          name: cfg.name || existing?.name || code,
          color: cfg.color || existing?.color || '#64748B',
          isTerminal: existing?.isTerminal || false,
          sortOrder: cfg.sortOrder ?? existing?.sortOrder ?? 100,
        });
      }
    }
  } catch (_) {}

  try {
    if (prisma.orderStatusDefinition?.findMany) {
      const defs = await prisma.orderStatusDefinition.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }],
        select: { code: true, name: true, color: true, sortOrder: true },
      });
      for (const def of defs || []) {
        const code = String(def.code || '').trim().toUpperCase();
        if (!code) continue;
        const existing = statusMap.get(code);
        statusMap.set(code, {
          code,
          name: def.name || existing?.name || code,
          color: def.color || existing?.color || '#64748B',
          isTerminal: existing?.isTerminal || false,
          sortOrder: existing?.sortOrder ?? def.sortOrder ?? 200,
        });
      }
    }
  } catch (_) {}

  const telegramAvailable = Boolean(
    tgConfig || (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID)
  );

  return {
    settings,
    teamUsers,
    statuses: Array.from(statusMap.values()).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999)),
    channelStatus: {
      inApp: { available: true },
      whatsapp: { available: Boolean(waSession?.id), phoneNumber: waSession?.phoneNumber || null },
      telegram: { available: telegramAvailable, mode: tgConfig?.type || (telegramAvailable ? 'ENV_BOT' : null) },
    },
  };
}

/**
 * Resolves WhatsApp phone targets, In-App recipient user IDs, and Telegram chat IDs.
 */
async function resolveAlertTargets({ companyId, settings, prisma }) {
  const whatsAppRecipients = [];
  const seenPhones = new Set();
  const userIdSet = new Set();
  const telegramChatIdSet = new Set(settings?.recipients?.telegramChatIds || []);

  const addRecipient = (phone, name = 'المسؤول') => {
    const cleaned = String(phone || '').trim();
    if (!cleaned) return;
    const dedupKey = cleaned.replace(/[\s\-()]/g, '');
    if (!dedupKey || seenPhones.has(dedupKey)) return;
    seenPhones.add(dedupKey);
    whatsAppRecipients.push({ phone: cleaned, name: String(name || 'المسؤول').trim() || 'المسؤول' });
  };

  // 1. Explicit manual phone numbers
  for (const phone of settings?.recipients?.phones || []) {
    addRecipient(phone, 'مستلم مخصص');
  }

  // 2. Active company users matching selected roles OR explicitly chosen userIds
  const roles = (Array.isArray(settings?.recipients?.roles) ? settings.recipients.roles : [])
    .map((r) => String(r || '').trim().toUpperCase())
    .filter((r) => VALID_USER_COMPANY_ROLES.has(r));
  const explicitUserIds = normalizeStringIdList(settings?.recipients?.userIds);
  for (const uid of explicitUserIds) {
    userIdSet.add(uid);
  }

  if ((roles.length > 0 || explicitUserIds.length > 0) && prisma) {
    try {
      if (prisma.userCompany?.findMany) {
        const companyUsers = await prisma.userCompany.findMany({
          where: {
            companyId,
            isActive: true,
            ...(roles.length > 0 && explicitUserIds.length > 0
              ? { OR: [{ role: { in: roles } }, { userId: { in: explicitUserIds } }] }
              : roles.length > 0
                ? { role: { in: roles } }
                : { userId: { in: explicitUserIds } }),
          },
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
          },
        });
        for (const membership of companyUsers || []) {
          const u = membership?.user;
          if (!u || u.isActive === false) continue;
          userIdSet.add(u.id);
          if (u.phone) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            addRecipient(u.phone, fullName || membership.role || 'المسؤول');
          }
        }
      }
    } catch (ucErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] userCompany lookup failed:', ucErr.message);
    }

    try {
      if (prisma.user?.findMany) {
        const directUsers = await prisma.user.findMany({
          where: {
            companyId,
            isActive: true,
            ...(roles.length > 0 && explicitUserIds.length > 0
              ? { OR: [{ role: { in: roles } }, { id: { in: explicitUserIds } }] }
              : roles.length > 0
                ? { role: { in: roles } }
                : { id: { in: explicitUserIds } }),
          },
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
        for (const u of directUsers || []) {
          if (u?.id) userIdSet.add(u.id);
          if (u?.phone) {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            addRecipient(u.phone, fullName || u.role || 'المسؤول');
          }
        }
      }
    } catch (uErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] user lookup failed:', uErr.message);
    }
  }

  // 3. Fallback to HRSettings.ownerWhatsAppNumber, then Company.phone
  const shouldIncludeOwnerFallback =
    whatsAppRecipients.length === 0 ||
    roles.includes('OWNER') ||
    roles.includes('COMPANY_ADMIN');

  if (shouldIncludeOwnerFallback && prisma) {
    try {
      if (prisma.hRSettings?.findUnique) {
        const hrSettings = await prisma.hRSettings.findUnique({
          where: { companyId },
          select: { ownerWhatsAppNumber: true },
        });
        if (hrSettings?.ownerWhatsAppNumber) {
          addRecipient(hrSettings.ownerWhatsAppNumber, 'مالك الشركة');
        }
      }
    } catch (hrErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] HRSettings lookup failed:', hrErr.message);
    }
  }

  if (whatsAppRecipients.length === 0 && prisma) {
    try {
      if (prisma.company?.findUnique) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { phone: true, name: true },
        });
        if (company?.phone) {
          addRecipient(company.phone, company.name || 'مالك الشركة');
        }
      }
    } catch (compErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] Company phone lookup failed:', compErr.message);
    }
  }

  return {
    whatsAppRecipients,
    userIds: Array.from(userIdSet),
    telegramChatIds: Array.from(telegramChatIdSet),
  };
}

/**
 * Preserved array-returning wrapper for backward compatibility.
 */
async function resolveAlertRecipients({ companyId, settings, prisma }) {
  const targets = await resolveAlertTargets({ companyId, settings, prisma });
  return targets.whatsAppRecipients;
}

async function resolveActorName({ changedBy, changedByName, prisma }) {
  if (changedByName && String(changedByName).trim()) {
    return String(changedByName).trim();
  }
  if (changedBy && prisma?.user?.findUnique) {
    try {
      const actor = await prisma.user.findUnique({
        where: { id: changedBy },
        select: { firstName: true, lastName: true, email: true },
      });
      const fullName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim();
      if (fullName) return fullName;
      if (actor?.email) return actor.email;
    } catch (_) {}
  }
  return 'النظام';
}

async function resolveCustomerName({ order, companyId, prisma }) {
  if (order?.customer) {
    const fullName = [order.customer.firstName, order.customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) return fullName;
    if (order.customer.name) return String(order.customer.name).trim();
  }
  if (order?.customerName && String(order.customerName).trim()) {
    return String(order.customerName).trim();
  }
  if (order?.guestName && String(order.guestName).trim()) {
    return String(order.guestName).trim();
  }
  if (order?.customerId && companyId && prisma?.customer?.findFirst) {
    try {
      const cust = await prisma.customer.findFirst({
        where: { id: order.customerId, companyId },
        select: { firstName: true, lastName: true, phone: true },
      });
      const fullName = [cust?.firstName, cust?.lastName].filter(Boolean).join(' ').trim();
      if (fullName) return fullName;
      if (cust?.phone) return cust.phone;
    } catch (_) {}
  }
  return order?.customerPhone || order?.guestPhone || '';
}

async function resolveStatusLabel(code, companyId, prisma) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return '—';
  if (companyId && prisma) {
    try {
      if (prisma.orderStatusConfig?.findFirst) {
        const cfg = await prisma.orderStatusConfig.findFirst({
          where: { companyId, code: normalized, isActive: true },
          select: { name: true },
        });
        if (cfg?.name) return cfg.name;
      }
      if (prisma.orderStatusDefinition?.findFirst) {
        const def = await prisma.orderStatusDefinition.findFirst({
          where: { companyId, code: normalized, isActive: true },
          select: { name: true },
        });
        if (def?.name) return def.name;
      }
    } catch (_) {}
  }
  return SYSTEM_STATUS_LABELS[normalized] || normalized;
}

/**
 * Dispatches WhatsApp alerts.
 * - Uses injected `whatsappService` stub if provided (unit tests).
 * - Otherwise sends direct text via active company WhatsApp session (`WhatsAppMessageHandler.sendText`),
 *   avoiding the broken `category:'ORDER' + eventType:'ANNOUNCEMENT'` template-seeding bug.
 */
async function dispatchWhatsAppAlert({
  companyId,
  orderId = undefined,
  title,
  content,
  recipients,
  whatsappService,
  prisma = null,
}) {
  if (!recipients || recipients.length === 0) {
    return { success: false, reason: 'no_recipients', attempted: 0, sent: 0 };
  }

  // Test stub path
  if (whatsappService) {
    let sentCount = 0;
    let lastReason = null;

    for (const recipient of recipients) {
      try {
        const waResult = await whatsappService.sendNotification({
          companyId,
          recipientPhone: recipient.phone,
          recipientName: recipient.name || 'المسؤول',
          recipientType: 'ADMIN',
          category: 'ORDER',
          eventType: 'ANNOUNCEMENT',
          ...(orderId ? { orderId } : {}),
          variables: {
            title,
            content,
            signature: 'تنبيهات حالة الطلبات',
          },
          priority: 1,
        });

        if (waResult?.success) {
          sentCount += 1;
        } else {
          lastReason = waResult?.reason || waResult?.errorCode || 'send_failed';
          const reasonKey = String(lastReason).toLowerCase();
          const errorCodeKey = String(waResult?.errorCode || '').toLowerCase();
          console.warn(
            `⚠️ [ORDER-STATUS-ALERT] WhatsApp not delivered to ${recipient.phone}: reason=${lastReason}`
          );
          if (
            NON_RETRYABLE_WHATSAPP_REASONS.has(reasonKey) ||
            NON_RETRYABLE_WHATSAPP_REASONS.has(errorCodeKey)
          ) {
            break;
          }
        }
      } catch (waErr) {
        lastReason = waErr?.message || 'whatsapp_exception';
        console.warn(
          `⚠️ [ORDER-STATUS-ALERT] WhatsApp threw for ${recipient.phone}: ${lastReason}`
        );
      }
    }

    return {
      success: sentCount > 0,
      reason: sentCount > 0 ? null : lastReason || 'send_failed',
      attempted: recipients.length,
      sent: sentCount,
    };
  }

  // Production path: send direct admin message over connected WhatsApp session
  const session = await resolveActiveWhatsAppSession(companyId, prisma || getPrismaClient());
  if (!session?.id) {
    return { success: false, reason: 'no_session', attempted: recipients.length, sent: 0 };
  }

  const WhatsAppMessageHandler = require('./whatsapp/WhatsAppMessageHandler');
  const fullText = `${title}\n${content}`;
  let sentCount = 0;
  let lastReason = null;

  for (const recipient of recipients) {
    try {
      const formattedPhone = formatPhoneNumber(recipient.phone) || recipient.phone;
      await WhatsAppMessageHandler.sendText(session.id, formattedPhone, fullText);
      sentCount += 1;
    } catch (waErr) {
      lastReason = waErr?.message || 'send_failed';
      console.warn(
        `⚠️ [ORDER-STATUS-ALERT] Direct WhatsApp send failed for ${recipient.phone}: ${lastReason}`
      );
    }
  }

  return {
    success: sentCount > 0,
    reason: sentCount > 0 ? null : lastReason || 'send_failed',
    attempted: recipients.length,
    sent: sentCount,
  };
}

async function dispatchTelegramAlert({
  companyId,
  chatIds,
  messageText,
  telegramService = null,
  prisma = null,
}) {
  const targets = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];

  if (telegramService?.sendDirectMessage) {
    if (targets.length === 0) {
      return { success: false, reason: 'no_telegram_chat_ids', attempted: 0, sent: 0 };
    }
    let sent = 0;
    let lastReason = null;
    for (const chatId of targets) {
      try {
        await telegramService.sendDirectMessage({ companyId, chatId, content: messageText });
        sent += 1;
      } catch (err) {
        lastReason = err?.message || 'telegram_send_failed';
      }
    }
    return { success: sent > 0, reason: sent > 0 ? null : lastReason, attempted: targets.length, sent };
  }

  const tgConfig = await resolveActiveTelegramConfig(companyId, prisma || getPrismaClient());
  if (targets.length === 0) {
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
      try {
        const telegramAlertService = require('./telegramAlertService');
        await telegramAlertService.sendAlert(messageText);
        return { success: true, reason: null, attempted: 1, sent: 1 };
      } catch (err) {
        return { success: false, reason: err?.message || 'telegram_env_failed', attempted: 1, sent: 0 };
      }
    }
    return { success: false, reason: 'no_telegram_chat_ids', attempted: 0, sent: 0 };
  }

  if (!tgConfig) {
    return { success: false, reason: 'no_telegram_config', attempted: targets.length, sent: 0 };
  }

  let sent = 0;
  let lastReason = null;

  if (tgConfig.type === 'USERBOT') {
    const TelegramUserbotService = require('./TelegramUserbotService');
    for (const chatId of targets) {
      try {
        const res = await TelegramUserbotService.sendMessage(tgConfig.id, companyId, chatId, messageText);
        if (res?.success) sent += 1;
        else lastReason = res?.error || 'telegram_userbot_failed';
      } catch (err) {
        lastReason = err?.message || 'telegram_userbot_exception';
      }
    }
  } else {
    const TelegramBotService = require('./TelegramBotService');
    for (const chatId of targets) {
      try {
        await TelegramBotService.sendDirectMessage({
          configId: tgConfig.id,
          companyId,
          chatId,
          content: messageText,
        });
        sent += 1;
      } catch (err) {
        lastReason = err?.message || 'telegram_bot_failed';
      }
    }
  }

  return {
    success: sent > 0,
    reason: sent > 0 ? null : lastReason || 'telegram_send_failed',
    attempted: targets.length,
    sent,
  };
}

function buildAlertMessages({
  orderNumber,
  oldStatusLabel,
  newStatusLabel,
  actorName,
  customerName,
  now,
}) {
  const fromLabel = oldStatusLabel || '—';
  const toLabel = newStatusLabel || '—';
  const timeText = new Date(now).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const title = `🔔 تنبيه تغيير حالة الطلب #${orderNumber}`;
  const inAppMessage =
    `الطلب #${orderNumber} تغيّر من ${fromLabel} إلى ${toLabel} · بواسطة: ${actorName}` +
    (customerName ? ` · العميل: ${customerName}` : '');
  const whatsappContent =
    `طلب #${orderNumber} · من ${fromLabel} ← ${toLabel} · بواسطة ${actorName} · ${timeText}` +
    (customerName ? ` · العميل: ${customerName}` : '');

  return { title, inAppMessage, whatsappContent, timeText };
}

function emitStatusAlertSocket({ companyId, targetUserIds, payload }) {
  try {
    const socketService = require('./socketService');
    if (targetUserIds && targetUserIds.length > 0 && socketService?.emitToUser) {
      for (const uid of targetUserIds) {
        socketService.emitToUser(uid, 'order:status_alert', payload);
      }
    } else if (socketService?.emitToCompany) {
      socketService.emitToCompany(companyId, 'order:status_alert', payload);
    }
  } catch (_) {}
}

/**
 * Triggers In-App, WhatsApp, and Telegram alerts after an order status change.
 * Never throws; catches errors internally so the primary order mutation is unaffected.
 */
async function alertStatusChange({
  companyId,
  order,
  oldStatus = null,
  newStatus = null,
  customStatusCode = null,
  changedBy = null,
  changedByName = null,
  prisma: prismaOverride = null,
  whatsappService = null,
  telegramService = null,
  notificationSvc = null,
  settings: settingsOverride = null,
  now = Date.now(),
} = {}) {
  try {
    if (!companyId || !order) {
      return { skipped: true, reason: 'missing_context' };
    }

    const effectiveStatus = String(customStatusCode || newStatus || '').trim().toUpperCase();
    const previousStatus = String(oldStatus || '').trim().toUpperCase();
    if (!effectiveStatus) {
      return { skipped: true, reason: 'missing_status' };
    }
    if (previousStatus && previousStatus === effectiveStatus) {
      return { skipped: true, reason: 'unchanged_status' };
    }

    const prisma = getPrismaClient(prismaOverride);
    const settings = settingsOverride || (await getStatusAlertSettings(companyId, prisma));

    if (!isStatusAlertEnabled(settings, effectiveStatus)) {
      return { skipped: true, reason: 'status_not_enabled', statusCode: effectiveStatus };
    }

    if (!settings.channels?.inApp && !settings.channels?.whatsapp && !settings.channels?.telegram) {
      return { skipped: true, reason: 'no_channels_enabled', statusCode: effectiveStatus };
    }

    const dedup = checkStatusAlertDedup({
      companyId,
      orderId: order.id || order.orderNumber,
      statusCode: effectiveStatus,
      windowMinutes: settings.windowMinutes,
      now,
    });

    if (!dedup.allowed) {
      return {
        skipped: true,
        reason: 'deduplicated',
        retryAfterMs: dedup.retryAfterMs,
        statusCode: effectiveStatus,
      };
    }

    const orderNumber = order.orderNumber || order.id;
    const [actorName, customerName, oldStatusLabel, newStatusLabel, targets] = await Promise.all([
      resolveActorName({ changedBy, changedByName, prisma }),
      resolveCustomerName({ order, companyId, prisma }),
      resolveStatusLabel(previousStatus, companyId, prisma),
      resolveStatusLabel(effectiveStatus, companyId, prisma),
      resolveAlertTargets({ companyId, settings, prisma }),
    ]);

    const { title, inAppMessage, whatsappContent, timeText } = buildAlertMessages({
      orderNumber,
      oldStatusLabel,
      newStatusLabel,
      actorName,
      customerName,
      now,
    });

    const targetUrl = orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : '/orders';
    const metadataPayload = {
      orderId: order.id || null,
      orderNumber,
      oldStatus: previousStatus || null,
      newStatus: effectiveStatus,
      oldStatusLabel,
      newStatusLabel,
      changedBy: changedBy || null,
      changedByName: actorName,
      customerName: customerName || null,
      formattedTime: timeText,
      timestamp: new Date(now).toISOString(),
      url: targetUrl,
    };

    let inAppResult = false;
    if (settings.channels?.inApp) {
      try {
        const notifService = notificationSvc || require('./notificationService');
        const recipientUsers = targets.userIds.length > 0 ? targets.userIds : [null];
        let createdAny = false;
        let firstCreatedId = null;

        for (const uid of recipientUsers) {
          const created = await notifService.createNotification({
            companyId,
            title,
            message: inAppMessage,
            type: 'order_status_alert',
            userId: uid,
            metadata: metadataPayload,
          });
          if (created) {
            createdAny = true;
            if (!firstCreatedId) firstCreatedId = created.id;
          }
        }

        emitStatusAlertSocket({
          companyId,
          targetUserIds: targets.userIds,
          payload: {
            id: firstCreatedId || `alert-${orderNumber}-${now}`,
            title,
            message: inAppMessage,
            createdAt: new Date(now).toISOString(),
            ...metadataPayload,
          },
        });

        inAppResult = createdAny;
      } catch (inAppErr) {
        console.warn('⚠️ [ORDER-STATUS-ALERT] In-app notification failed:', inAppErr.message);
      }
    }

    let whatsappResult = { success: false, reason: 'channel_disabled' };
    if (settings.channels?.whatsapp) {
      whatsappResult = await dispatchWhatsAppAlert({
        companyId,
        orderId: order.id,
        title,
        content: whatsappContent,
        recipients: targets.whatsAppRecipients,
        whatsappService,
        prisma,
      });
    }

    let telegramResult = { success: false, reason: 'channel_disabled' };
    if (settings.channels?.telegram) {
      telegramResult = await dispatchTelegramAlert({
        companyId,
        chatIds: targets.telegramChatIds,
        messageText: `${title}\n${whatsappContent}`,
        telegramService,
        prisma,
      });
    }

    // Release dedup quota if ALL enabled channels failed transiently
    const anySucceeded = Boolean(inAppResult || whatsappResult?.success || telegramResult?.success);
    if (!anySucceeded) {
      releaseStatusAlertDedupKey({
        companyId,
        orderId: order.id || order.orderNumber,
        statusCode: effectiveStatus,
      });
    }

    return {
      skipped: false,
      statusCode: effectiveStatus,
      inApp: inAppResult,
      whatsapp: whatsappResult,
      telegram: telegramResult,
    };
  } catch (err) {
    console.warn('⚠️ [ORDER-STATUS-ALERT] alertStatusChange error:', err.message);
    return { skipped: true, reason: 'error', error: err.message };
  }
}

/**
 * Sends a synthetic test alert scoped cleanly without mutating any order rows.
 */
async function sendTestAlert({
  companyId,
  user = null,
  settingsOverride = null,
  prisma: prismaOverride = null,
  whatsappService = null,
  telegramService = null,
  notificationSvc = null,
  now = Date.now(),
} = {}) {
  const prisma = getPrismaClient(prismaOverride);
  const settings = settingsOverride
    ? normalizeStatusAlertSettings(settingsOverride)
    : await getStatusAlertSettings(companyId, prisma);

  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.name ||
    user?.email ||
    'اختبار النظام';

  const targetStatus =
    Array.isArray(settings.statuses) && settings.statuses.length > 0
      ? settings.statuses[0]
      : 'SHIPPED';

  const [oldStatusLabel, newStatusLabel, targets] = await Promise.all([
    resolveStatusLabel('PROCESSING', companyId, prisma),
    resolveStatusLabel(targetStatus, companyId, prisma),
    resolveAlertTargets({ companyId, settings, prisma }),
  ]);

  const { title, inAppMessage, whatsappContent, timeText } = buildAlertMessages({
    orderNumber: 'TEST-1001',
    oldStatusLabel,
    newStatusLabel,
    actorName,
    customerName: 'عميل تجريبي',
    now,
  });

  const actorUserId = user?.id || user?.userId || null;

  let inApp = false;
  if (settings.channels?.inApp) {
    try {
      const notifService = notificationSvc || require('./notificationService');
      const metadataPayload = {
        isTest: true,
        orderNumber: 'TEST-1001',
        oldStatus: 'PROCESSING',
        newStatus: targetStatus,
        oldStatusLabel,
        newStatusLabel,
        changedBy: actorUserId,
        changedByName: actorName,
        customerName: 'عميل تجريبي',
        formattedTime: timeText,
        timestamp: new Date(now).toISOString(),
        url: '/settings/orders/status-alerts',
      };
      const created = await notifService.createNotification({
        companyId,
        title: `[تجربة] ${title}`,
        message: inAppMessage,
        type: 'order_status_alert',
        userId: actorUserId,
        metadata: metadataPayload,
      });

      emitStatusAlertSocket({
        companyId,
        targetUserIds: actorUserId ? [actorUserId] : [],
        payload: {
          id: created?.id || `test-alert-${now}`,
          title: `[تجربة] ${title}`,
          message: inAppMessage,
          createdAt: new Date(now).toISOString(),
          ...metadataPayload,
        },
      });

      inApp = Boolean(created);
    } catch (inAppErr) {
      console.warn('⚠️ [ORDER-STATUS-ALERT] Test in-app notification failed:', inAppErr.message);
    }
  }

  let whatsapp = { success: false, reason: 'channel_disabled' };
  if (settings.channels?.whatsapp) {
    whatsapp = await dispatchWhatsAppAlert({
      companyId,
      title: `[تجربة] ${title}`,
      content: whatsappContent,
      recipients: targets.whatsAppRecipients,
      whatsappService,
      prisma,
    });
  }

  let telegram = { success: false, reason: 'channel_disabled' };
  if (settings.channels?.telegram) {
    telegram = await dispatchTelegramAlert({
      companyId,
      chatIds: targets.telegramChatIds,
      messageText: `[تجربة] ${title}\n${whatsappContent}`,
      telegramService,
      prisma,
    });
  }

  return {
    inApp,
    whatsapp: {
      success: Boolean(whatsapp?.success),
      reason: whatsapp?.reason || null,
    },
    telegram: {
      success: Boolean(telegram?.success),
      reason: telegram?.reason || null,
    },
  };
}

module.exports = {
  DEFAULT_RECIPIENT_ROLES,
  getDefaultStatusAlertSettings,
  normalizeStatusAlertSettings,
  validateStatusAlertSettings,
  isStatusAlertEnabled,
  getStatusAlertSettings,
  getSettingsPageContext,
  getCompanyTeamUsers,
  resolveAlertTargets,
  resolveAlertRecipients,
  alertStatusChange,
  sendTestAlert,
};
