const dns = require('dns');
const fs = require('fs');
const fsp = fs.promises;
const net = require('net');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const companyCacheService = require('../services/companyCacheService');
const redisCacheService = require('../services/redisCacheService');
const {
  inferSubdomainSlug,
  shouldLookupCustomDomain,
} = require('../middleware/subdomainMiddleware');

const PORTAL_BRANDING_CACHE_TTL_SECONDS = 300;
const ICON_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_REMOTE_LOGO_BYTES = 5 * 1024 * 1024;
const REMOTE_LOGO_TIMEOUT_MS = 3000;
const MAX_REMOTE_REDIRECTS = 2;

const VALID_ICON_SIZES = new Set(['180', '192', '512']);
const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');
const FALLBACK_ICON_CACHE_DIR = path.join(os.tmpdir(), 'maxp-portal-icons');

const PORTAL_COMPANY_SELECT = {
  id: true,
  name: true,
  slug: true,
  publicCode: true,
  customDomain: true,
  logo: true,
  phone: true,
  isActive: true,
};

const PORTAL_PUBLIC_LOOKUP_SELECT = {
  id: true,
  name: true,
  slug: true,
  publicCode: true,
  customDomain: true,
  logo: true,
};

const PORTAL_LOOKUP_CACHE_TTL_SECONDS = 60;

const ANDROID_ASSET_LINK_PACKAGES = [
  'online.maxp.parent',
  'online.maxp.portal',
  'online.maxp.courier',
  'online.maxp.customer',
  'online.maxp.app',
];

const PORTAL_MANIFEST_CONFIG = {
  parent: {
    title: 'بوابة ولي الأمر',
    prefix: '/parent/',
    scope: '/parent/',
    startUrl: '/parent/dashboard',
  },
  teacher: {
    title: 'بوابة المدرس',
    prefix: '/teacher/',
    scope: '/teacher/',
    startUrl: '/teacher/dashboard',
  },
  student: {
    title: 'الأكاديمية',
    prefix: '/portal/',
    scope: '/portal/',
    startUrl: '/portal/my-courses',
  },
  academy: {
    title: 'الأكاديمية',
    prefix: '/academy/',
    scope: '/academy/',
    startUrl: '/academy/my-courses',
  },
  doctor: {
    title: 'بوابة الطبيب',
    prefix: '/doctor/',
    scope: '/doctor/',
    startUrl: '/doctor/dashboard',
  },
  patient: {
    title: 'بوابة المريض',
    prefix: '/patient/',
    scope: '/patient/',
    startUrl: '/patient/dashboard',
  },
  dental: {
    title: 'بوابة معامل الأسنان',
    prefix: '/dental-portal/',
    scope: '/dental-portal/',
    startUrl: '/dental-portal/dashboard',
  },
  courier: {
    title: 'بوابة المندوب',
    prefix: '/courier-portal/',
    scope: '/courier-portal/',
    startUrl: '/courier-portal/',
  },
  wholesale: {
    title: 'بوابة الموزع',
    prefix: '/wholesale-portal/',
    scope: '/wholesale-portal/',
    startUrl: '/wholesale-portal/orders',
  },
  client: {
    title: 'بوابة العميل',
    prefix: '/client-portal/',
    scope: '/client-portal/',
    startUrl: '/client-portal/',
  },
  customer: {
    title: 'حسابي',
    prefix: '/account/',
    scope: '/account',
    startUrl: '/account',
  },
};

function firstQueryParam(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  return trimmed ? trimmed : null;
}

function parseJsonObjectSafe(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  return `#${hex}`;
}

function extractBrandingColors(rawDesignTokens) {
  const designTokens = parseJsonObjectSafe(rawDesignTokens);
  const colors = parseJsonObjectSafe(designTokens.colors);

  const primaryColor =
    normalizeHex(colors.primary) ||
    normalizeHex(colors.primaryColor) ||
    normalizeHex(colors.accent) ||
    normalizeHex(designTokens.primaryColor) ||
    '#4f46e5';

  const secondaryColor =
    normalizeHex(colors.secondary) ||
    normalizeHex(colors.secondaryColor) ||
    normalizeHex(designTokens.secondaryColor) ||
    '#0f172a';

  const themeMode =
    designTokens.themeMode === 'dark' || designTokens.mode === 'dark'
      ? 'dark'
      : 'light';

  return {
    primaryColor,
    secondaryColor,
    themeMode,
  };
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeCacheId(companyId) {
  const sanitized = String(companyId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized || 'default';
}

function getIconCacheDirs() {
  const primary = process.env.PORTAL_ICONS_CACHE_DIR
    ? path.resolve(process.env.PORTAL_ICONS_CACHE_DIR)
    : path.resolve(__dirname, '../uploads/portal-icons');
  if (primary === FALLBACK_ICON_CACHE_DIR) {
    return [primary];
  }
  return [primary, FALLBACK_ICON_CACHE_DIR];
}

async function queryCompanySafe(prisma, where, preferFindFirst = true) {
  if (!prisma?.company) return null;

  if (preferFindFirst && typeof prisma.company.findFirst === 'function') {
    const res = await prisma.company.findFirst({
      where: { ...where, isActive: true },
      select: PORTAL_COMPANY_SELECT,
    });
    if (res !== undefined) {
      return res;
    }
  }

  if (typeof prisma.company.findUnique === 'function') {
    const res = await prisma.company.findUnique({
      where,
      select: PORTAL_COMPANY_SELECT,
    });
    if (res && res.isActive === false) {
      return null;
    }
    return res ?? null;
  }

  if (!preferFindFirst && typeof prisma.company.findFirst === 'function') {
    const res = await prisma.company.findFirst({
      where: { ...where, isActive: true },
      select: PORTAL_COMPANY_SELECT,
    });
    return res ?? null;
  }

  return null;
}

async function queryCompanyByIdRaw(prisma, id) {
  if (!prisma?.company || !id) return null;

  if (typeof prisma.company.findUnique === 'function') {
    const res = await prisma.company.findUnique({
      where: { id },
      select: PORTAL_COMPANY_SELECT,
    });
    if (res !== undefined) {
      return res;
    }
  }

  if (typeof prisma.company.findFirst === 'function') {
    const res = await prisma.company.findFirst({
      where: { id },
      select: PORTAL_COMPANY_SELECT,
    });
    return res ?? null;
  }

  return null;
}

async function queryStorefrontDesignTokens(prisma, companyId) {
  if (!prisma?.storefrontSettings || !companyId) return null;

  if (typeof prisma.storefrontSettings.findUnique === 'function') {
    const res = await prisma.storefrontSettings.findUnique({
      where: { companyId },
      select: { designTokens: true },
    });
    if (res !== undefined) {
      return res;
    }
  }

  if (typeof prisma.storefrontSettings.findFirst === 'function') {
    const res = await prisma.storefrontSettings.findFirst({
      where: { companyId },
      select: { designTokens: true },
    });
    return res ?? null;
  }

  return null;
}

async function lookupActiveCompanyBySlug(slug, prisma) {
  if (!slug) return null;
  const company = await companyCacheService.getCompanyLookup('slug', slug, async () =>
    queryCompanySafe(prisma, { slug }, true),
  );
  return company && company.isActive !== false ? company : null;
}

async function lookupActiveCompanyById(id, prisma) {
  if (!id) return null;
  const company = await companyCacheService.getCompanyLookup('id', id, async () =>
    queryCompanySafe(prisma, { id }, true),
  );
  return company && company.isActive !== false ? company : null;
}

async function lookupActiveCompanyByPublicCode(code, prisma) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return null;

  const company = await companyCacheService.getCompanyLookup(
    'publicCode',
    trimmed.toLowerCase(),
    async () => {
      if (!prisma?.company) return null;
      if (typeof prisma.company.findFirst === 'function') {
        const res = await prisma.company.findFirst({
          where: {
            publicCode: { equals: trimmed, mode: 'insensitive' },
            isActive: true,
          },
          select: PORTAL_COMPANY_SELECT,
        });
        if (res !== undefined) {
          return res;
        }
      }
      if (typeof prisma.company.findUnique === 'function') {
        const res = await prisma.company.findUnique({
          where: { publicCode: trimmed },
          select: PORTAL_COMPANY_SELECT,
        });
        if (res && res.isActive === false) return null;
        return res ?? null;
      }
      return null;
    },
  );
  return company && company.isActive !== false ? company : null;
}

async function resolvePortalCompany(req) {
  if (!req) return null;

  if (req.company?.id) {
    if (req.company.isActive === false) {
      return null;
    }
    return req.company;
  }

  const rawCompanyId = firstQueryParam(req.query?.companyId);
  const rawSlug = firstQueryParam(req.query?.slug);
  const rawCode = firstQueryParam(req.query?.code);

  if (!rawCompanyId && !rawSlug && !rawCode) {
    return null;
  }

  const prisma = await getSharedPrismaClientAsync();

  if (rawCompanyId) {
    const byId = await lookupActiveCompanyById(rawCompanyId, prisma);
    if (byId) return byId;

    const bySlug = await lookupActiveCompanyBySlug(rawCompanyId, prisma);
    if (bySlug) return bySlug;

    const byCode = await lookupActiveCompanyByPublicCode(rawCompanyId, prisma);
    if (byCode) return byCode;
  }

  if (rawSlug) {
    const bySlug = await lookupActiveCompanyBySlug(rawSlug, prisma);
    if (bySlug) return bySlug;

    const byId = await lookupActiveCompanyById(rawSlug, prisma);
    if (byId) return byId;

    const byCode = await lookupActiveCompanyByPublicCode(rawSlug, prisma);
    if (byCode) return byCode;
  }

  if (rawCode) {
    const byCode = await lookupActiveCompanyByPublicCode(rawCode, prisma);
    if (byCode) return byCode;

    const bySlug = await lookupActiveCompanyBySlug(rawCode, prisma);
    if (bySlug) return bySlug;

    const byId = await lookupActiveCompanyById(rawCode, prisma);
    if (byId) return byId;
  }

  return null;
}

async function resolvePortalBrandingData(req) {
  const company = await resolvePortalCompany(req);
  if (!company?.id) {
    return null;
  }

  const cacheKey = `portal:branding:${company.id}`;
  const cached = await redisCacheService.get(cacheKey).catch(() => null);
  if (cached && cached.companyId) {
    return cached;
  }

  const prisma = await getSharedPrismaClientAsync();
  const [dbCompany, storefrontSettings] = await Promise.all([
    queryCompanyByIdRaw(prisma, company.id).catch(() => null),
    queryStorefrontDesignTokens(prisma, company.id).catch(() => null),
  ]);

  if (dbCompany && dbCompany.isActive === false) {
    return null;
  }

  const effectiveCompany = dbCompany || company;
  if (!effectiveCompany || effectiveCompany.isActive === false) {
    return null;
  }

  const { primaryColor, secondaryColor, themeMode } = extractBrandingColors(
    storefrontSettings?.designTokens,
  );

  const branding = {
    companyId: effectiveCompany.id,
    name: effectiveCompany.name || 'MaxP',
    slug: effectiveCompany.slug || null,
    publicCode: effectiveCompany.publicCode || null,
    customDomain: effectiveCompany.customDomain || null,
    logo: effectiveCompany.logo || null,
    primaryColor,
    secondaryColor,
    themeMode,
    supportPhone: effectiveCompany.phone || null,
  };

  await redisCacheService
    .set(cacheKey, branding, PORTAL_BRANDING_CACHE_TTL_SECONDS)
    .catch(() => {});

  return branding;
}

function getTenantQueryParam(req, branding) {
  const querySlug = firstQueryParam(req.query?.slug);
  const queryCompanyId = firstQueryParam(req.query?.companyId);
  const queryCode = firstQueryParam(req.query?.code);

  if (branding?.slug) {
    return `slug=${encodeURIComponent(branding.slug)}`;
  }
  if (branding?.companyId) {
    return `companyId=${encodeURIComponent(branding.companyId)}`;
  }
  if (querySlug) {
    return `slug=${encodeURIComponent(querySlug)}`;
  }
  if (queryCompanyId) {
    return `companyId=${encodeURIComponent(queryCompanyId)}`;
  }
  if (queryCode) {
    return `code=${encodeURIComponent(queryCode)}`;
  }
  return '';
}

function hasTenantSubdomainOrCustomDomain(req) {
  const rawHost = String(
    req?.headers?.['x-subdomain'] || req?.headers?.host || '',
  )
    .split(':')[0]
    .trim()
    .toLowerCase();
  if (!rawHost) return false;
  const bareHost = rawHost.startsWith('www.') ? rawHost.slice(4) : rawHost;
  if (
    bareHost === 'maxp.online' ||
    bareHost === 'mokhtarelhenawy.online' ||
    bareHost === 'maxp-ai.pro'
  ) {
    return false;
  }
  const mainDomain = process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online';
  return Boolean(
    shouldLookupCustomDomain(bareHost, mainDomain) ||
      inferSubdomainSlug(rawHost, mainDomain),
  );
}

async function getPortalBranding(req, res) {
  try {
    const branding = await resolvePortalBrandingData(req);
    if (!branding) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم تحديد المؤسسة',
      });
    }

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error('❌ [PortalPWA] getPortalBranding failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'تعذر تحميل بيانات الهوية للبوابة',
    });
  }
}

async function getPortalManifest(req, res) {
  try {
    const portalKey = String(firstQueryParam(req.query?.portal) || '')
      .trim()
      .toLowerCase();
    const portalMeta =
      PORTAL_MANIFEST_CONFIG[portalKey] || PORTAL_MANIFEST_CONFIG.student;

    let branding = null;
    try {
      branding = await resolvePortalBrandingData(req);
    } catch (_) {
      branding = null;
    }

    const effectiveBranding = branding || {
      companyId: null,
      name: 'MaxP',
      slug: null,
      publicCode: null,
      logo: null,
      primaryColor: '#4f46e5',
      secondaryColor: '#0f172a',
      themeMode: 'light',
    };

    const tenantParam = branding ? getTenantQueryParam(req, branding) : '';
    const iconQuerySuffix = tenantParam ? `?${tenantParam}` : '';
    const hasQueryTenantParam = Boolean(
      firstQueryParam(req.query?.slug) ||
        firstQueryParam(req.query?.companyId) ||
        firstQueryParam(req.query?.code),
    );
    const resolvedViaQueryWithoutSubdomain = Boolean(
      branding &&
        !hasTenantSubdomainOrCustomDomain(req) &&
        hasQueryTenantParam &&
        tenantParam,
    );

    const startUrl = resolvedViaQueryWithoutSubdomain
      ? `${portalMeta.startUrl}${portalMeta.startUrl.includes('?') ? '&' : '?'}${tenantParam}`
      : portalMeta.startUrl;

    const fullName = `${portalMeta.title} — ${effectiveBranding.name}`;
    const shortBase = effectiveBranding.name || portalMeta.title;
    const shortName = Array.from(String(shortBase).trim())
      .slice(0, 24)
      .join('')
      .trim() || 'MaxP';

    const manifest = {
      name: fullName,
      short_name: shortName,
      start_url: startUrl,
      scope: portalMeta.scope || portalMeta.prefix,
      display: 'standalone',
      orientation: 'portrait',
      dir: 'rtl',
      lang: 'ar',
      theme_color: effectiveBranding.primaryColor || '#4f46e5',
      background_color: '#ffffff',
      icons: [
        {
          src: `/api/v1/public/portal/icon-192.png${iconQuerySuffix}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: `/api/v1/public/portal/icon-512.png${iconQuerySuffix}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(JSON.stringify(manifest));
  } catch (error) {
    console.error('❌ [PortalPWA] getPortalManifest failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'تعذر إنشاء ملف التطبيق',
    });
  }
}

function isPrivateOrReservedIpv4(octets) {
  if (!Array.isArray(octets) || octets.length !== 4) return true;
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && octets[2] === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && octets[2] === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && octets[2] === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // multicast & reserved/broadcast
  return false;
}

function parseIpv6ToWords(ip) {
  const cleaned = String(ip || '').split('%')[0].toLowerCase();
  if (!cleaned) return null;

  let working = cleaned;
  let embeddedV4Words = null;
  if (working.includes('.')) {
    const lastColon = working.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4Part = working.slice(lastColon + 1);
    const v4Octets = v4Part.split('.').map(Number);
    if (
      v4Octets.length !== 4 ||
      v4Octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
      return null;
    }
    embeddedV4Words = [
      (v4Octets[0] << 8) | v4Octets[1],
      (v4Octets[2] << 8) | v4Octets[3],
    ];
    working = `${working.slice(0, lastColon)}:0:0`;
  }

  const sides = working.split('::');
  if (sides.length > 2) return null;

  const left = sides[0] ? sides[0].split(':').filter(Boolean) : [];
  const right = sides[1] ? sides[1].split(':').filter(Boolean) : [];

  if (sides.length === 1 && left.length !== 8) return null;
  if (sides.length === 2 && left.length + right.length >= 8) return null;

  const missing = 8 - (left.length + right.length);
  const groups = [
    ...left,
    ...(sides.length === 2 ? new Array(missing).fill('0') : []),
    ...right,
  ];
  if (groups.length !== 8) return null;

  const words = groups.map((g) => parseInt(g, 16));
  if (words.some((w) => !Number.isInteger(w) || w < 0 || w > 0xffff)) {
    return null;
  }

  if (embeddedV4Words) {
    words[6] = embeddedV4Words[0];
    words[7] = embeddedV4Words[1];
  }
  return words;
}

function isPrivateOrReservedIp(rawIp) {
  const cleaned = String(rawIp || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .split('%')[0]
    .toLowerCase();
  const ipVersion = net.isIP(cleaned);
  if (!ipVersion) return false;

  if (ipVersion === 4) {
    const octets = cleaned.split('.').map(Number);
    return isPrivateOrReservedIpv4(octets);
  }

  const words = parseIpv6ToWords(cleaned);
  if (!words) return true;

  const isAllZeroExceptLast = words.slice(0, 7).every((w) => w === 0);
  // :: (unspecified) and ::1 (loopback)
  if (isAllZeroExceptLast && (words[7] === 0 || words[7] === 1)) {
    return true;
  }
  // ::ffff:0:0/96 IPv4-mapped or ::/96 IPv4-compatible
  if (
    words.slice(0, 5).every((w) => w === 0) &&
    (words[5] === 0xffff || words[5] === 0)
  ) {
    const octets = [
      (words[6] >> 8) & 0xff,
      words[6] & 0xff,
      (words[7] >> 8) & 0xff,
      words[7] & 0xff,
    ];
    return isPrivateOrReservedIpv4(octets);
  }
  // 64:ff9b::/96 NAT64
  if (
    words[0] === 0x0064 &&
    words[1] === 0xff9b &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0
  ) {
    const octets = [
      (words[6] >> 8) & 0xff,
      words[6] & 0xff,
      (words[7] >> 8) & 0xff,
      words[7] & 0xff,
    ];
    return isPrivateOrReservedIpv4(octets);
  }
  // 2002::/16 (6to4 embeds IPv4 in words[1] & words[2])
  if (words[0] === 0x2002) {
    const octets = [
      (words[1] >> 8) & 0xff,
      words[1] & 0xff,
      (words[2] >> 8) & 0xff,
      words[2] & 0xff,
    ];
    if (isPrivateOrReservedIpv4(octets)) return true;
  }
  // fc00::/7 Unique Local Address
  if ((words[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 Link-Local
  if ((words[0] & 0xffc0) === 0xfe80) return true;
  // ff00::/8 Multicast
  if ((words[0] & 0xff00) === 0xff00) return true;

  return false;
}

function isSafeRemoteLogoUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (!hostname) return false;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'ip6-localhost' ||
    hostname === 'ip6-loopback' ||
    hostname === 'metadata' ||
    hostname === 'metadata.google.internal'
  ) {
    return false;
  }

  if (net.isIP(hostname)) {
    return !isPrivateOrReservedIp(hostname);
  }

  // Reject bare integer/hex/octal single-label hosts (e.g. http://redis, http://2130706433)
  if (!hostname.includes('.')) {
    return false;
  }

  return true;
}

async function resolveSafeRemoteTarget(rawUrl) {
  if (!isSafeRemoteLogoUrl(rawUrl)) {
    throw new Error('Blocked unsafe remote logo URL');
  }

  const parsed = new URL(rawUrl.trim());
  let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (!net.isIP(hostname)) {
    const records = await dns.promises.lookup(hostname, { all: true });
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Remote logo hostname could not be resolved');
    }
    for (const entry of records) {
      if (isPrivateOrReservedIp(entry.address)) {
        throw new Error('Blocked remote logo resolving to private network');
      }
    }
  }

  return parsed.toString();
}

function resolveSafeLocalUploadPath(logoPath) {
  if (typeof logoPath !== 'string' || !logoPath.trim()) {
    return null;
  }

  const cleanWithoutQuery = logoPath.trim().split('?')[0].split('#')[0];
  if (cleanWithoutQuery.includes('\0') || cleanWithoutQuery.includes('\\')) {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(cleanWithoutQuery);
  } catch {
    return null;
  }

  if (decoded.includes('\0') || decoded.includes('\\')) {
    return null;
  }

  if (!/^\/?uploads\//i.test(decoded)) {
    return null;
  }

  const relPath = decoded.replace(/^\/?uploads\/+/i, '');
  if (!relPath || relPath.startsWith('portal-icons/')) {
    return null;
  }

  const resolvedPath = path.resolve(UPLOADS_ROOT, relPath);
  if (!resolvedPath.startsWith(UPLOADS_ROOT + path.sep)) {
    return null;
  }

  try {
    const realRoot = fs.realpathSync(UPLOADS_ROOT);
    const realFile = fs.realpathSync(resolvedPath);
    if (!realFile.startsWith(realRoot + path.sep)) {
      return null;
    }
    return realFile;
  } catch {
    return null;
  }
}

async function fetchRemoteLogoBuffer(initialUrl) {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REMOTE_REDIRECTS; hop++) {
    const safeUrl = await resolveSafeRemoteTarget(currentUrl);
    const response = await fetch(safeUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REMOTE_LOGO_TIMEOUT_MS),
      headers: {
        Accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/*;q=0.8',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REMOTE_REDIRECTS) {
        throw new Error('Blocked or excessive remote logo redirects');
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Remote logo returned HTTP ${response.status}`);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_LOGO_BYTES) {
      throw new Error('Remote logo exceeds 5MB size limit');
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_REMOTE_LOGO_BYTES) {
      throw new Error('Remote logo buffer empty or exceeds 5MB limit');
    }

    return Buffer.from(arrayBuffer);
  }

  throw new Error('Failed to fetch remote logo');
}

async function loadLogoSourceBuffer(logoValue) {
  if (typeof logoValue !== 'string' || !logoValue.trim()) {
    return null;
  }

  const trimmed = logoValue.trim();

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    if (!/^https?:/i.test(trimmed)) {
      return null;
    }
    try {
      const remoteBuf = await fetchRemoteLogoBuffer(trimmed);
      await sharp(remoteBuf, { failOnError: true }).metadata();
      return remoteBuf;
    } catch {
      return null;
    }
  }

  const localFilePath = resolveSafeLocalUploadPath(trimmed);
  if (!localFilePath) {
    return null;
  }

  try {
    const stat = await fsp.stat(localFilePath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_REMOTE_LOGO_BYTES) {
      return null;
    }
    const localBuf = await fsp.readFile(localFilePath);
    await sharp(localBuf, { failOnError: true }).metadata();
    return localBuf;
  } catch {
    return null;
  }
}

async function generateMonogramIconBuffer(size, companyName, primaryColor) {
  const safeHex = normalizeHex(primaryColor) || '#4f46e5';
  const chars = Array.from(String(companyName || 'M').trim());
  const firstChar = (chars[0] || 'M').toUpperCase();
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.46);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${safeHex}" />`,
    `<text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}">${escapeXml(firstChar)}</text>`,
    '</svg>',
  ].join('');

  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function compositeLogoIconBuffer(size, logoBuffer) {
  const innerSize = Math.max(1, Math.round(size * 0.76));
  const resizedLogo = await sharp(logoBuffer, { animated: false })
    .rotate()
    .resize({
      width: innerSize,
      height: innerSize,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer();
}

function isPngBuffer(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

async function readCachedIcon(cacheFilename) {
  for (const dir of getIconCacheDirs()) {
    const targetPath = path.join(dir, cacheFilename);
    try {
      const stat = await fsp.stat(targetPath);
      if (stat.isFile() && Date.now() - stat.mtimeMs <= ICON_CACHE_MAX_AGE_MS) {
        const data = await fsp.readFile(targetPath);
        if (isPngBuffer(data)) {
          return data;
        }
      }
    } catch {
      // Cache miss or inaccessible dir; try next candidate
    }
  }
  return null;
}

async function writeCachedIcon(cacheFilename, pngBuffer) {
  for (const dir of getIconCacheDirs()) {
    try {
      await fsp.mkdir(dir, { recursive: true });
      const targetPath = path.join(dir, cacheFilename);
      const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmpPath, pngBuffer);
      await fsp.rename(tmpPath, targetPath);
      return;
    } catch {
      // Try fallback dir
    }
  }
}

function invalidatePortalIconCache(companyId) {
  const safeId = sanitizeCacheId(companyId || 'default');
  for (const dir of getIconCacheDirs()) {
    for (const size of VALID_ICON_SIZES) {
      const filePath = path.join(dir, `${safeId}-${size}.png`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore best-effort cache cleanup failure
      }
    }
  }
}

async function getPortalIcon(req, res) {
  const rawSize = String(req.params?.size || '').trim();
  if (!VALID_ICON_SIZES.has(rawSize)) {
    return res.status(400).json({
      success: false,
      message: 'حجم الأيقونة يجب أن يكون 180 أو 192 أو 512',
    });
  }

  const size = Number(rawSize);

  try {
    let branding = null;
    try {
      branding = await resolvePortalBrandingData(req);
    } catch {
      branding = null;
    }

    const safeCompanyId = sanitizeCacheId(branding?.companyId || 'default');
    const cacheFilename = `${safeCompanyId}-${size}.png`;

    const cachedPng = await readCachedIcon(cacheFilename);
    if (cachedPng) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(cachedPng);
    }

    let pngBuffer = null;
    const logoBuffer = await loadLogoSourceBuffer(branding?.logo);
    if (logoBuffer) {
      try {
        pngBuffer = await compositeLogoIconBuffer(size, logoBuffer);
      } catch {
        pngBuffer = null;
      }
    }

    if (!pngBuffer) {
      pngBuffer = await generateMonogramIconBuffer(
        size,
        branding?.name || 'MaxP',
        branding?.primaryColor || '#4f46e5',
      );
    }

    await writeCachedIcon(cacheFilename, pngBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(pngBuffer);
  } catch (error) {
    console.error('❌ [PortalPWA] getPortalIcon failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'تعذر توليد أيقونة البوابة',
    });
  }
}

function toSafeLookupItem(company, primaryColor = '#4f46e5') {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug || null,
    publicCode: company.publicCode || null,
    customDomain: company.customDomain || null,
    logo: company.logo || null,
    primaryColor: primaryColor || '#4f46e5',
  };
}

async function resolveLightPrimaryColors(prisma, companies) {
  const colorByCompanyId = new Map();
  const list = Array.isArray(companies) ? companies.filter((c) => c?.id) : [];
  if (list.length === 0) return colorByCompanyId;

  if (typeof prisma?.storefrontSettings?.findMany === 'function') {
    const rows = await prisma.storefrontSettings
      .findMany({
        where: { companyId: { in: list.map((c) => c.id) } },
        select: { companyId: true, designTokens: true },
      })
      .catch(() => []);
    for (const row of rows || []) {
      if (row?.companyId) {
        const { primaryColor } = extractBrandingColors(row.designTokens);
        colorByCompanyId.set(row.companyId, primaryColor);
      }
    }
    return colorByCompanyId;
  }

  await Promise.all(
    list.map(async (company) => {
      const settings = await queryStorefrontDesignTokens(prisma, company.id).catch(
        () => null,
      );
      if (settings?.designTokens) {
        const { primaryColor } = extractBrandingColors(settings.designTokens);
        colorByCompanyId.set(company.id, primaryColor);
      }
    }),
  );
  return colorByCompanyId;
}

async function lookupPortalCompanies(req, res) {
  try {
    const rawQuery = firstQueryParam(req.query?.q);
    if (!rawQuery || rawQuery.length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const q = rawQuery.slice(0, 80);
    const cacheKey = `portal:lookup:${q.toLowerCase()}`;
    const cached = await redisCacheService.get(cacheKey).catch(() => null);
    if (Array.isArray(cached)) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.status(200).json({
        success: true,
        data: cached,
      });
    }

    const prisma = await getSharedPrismaClientAsync();
    if (!prisma?.company) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    let exactMatch = null;
    if (typeof prisma.company.findFirst === 'function') {
      exactMatch = await prisma.company.findFirst({
        where: {
          isActive: true,
          OR: [
            { publicCode: { equals: q, mode: 'insensitive' } },
            { slug: { equals: q.toLowerCase(), mode: 'insensitive' } },
          ],
        },
        select: PORTAL_PUBLIC_LOOKUP_SELECT,
      });
    }

    if (exactMatch && exactMatch.isActive !== false) {
      const colorMap = await resolveLightPrimaryColors(prisma, [exactMatch]);
      const items = [
        toSafeLookupItem(
          exactMatch,
          colorMap.get(exactMatch.id) || '#4f46e5',
        ),
      ];
      await redisCacheService
        .set(cacheKey, items, PORTAL_LOOKUP_CACHE_TTL_SECONDS)
        .catch(() => {});
      res.set('Cache-Control', 'public, max-age=60');
      return res.status(200).json({
        success: true,
        data: items,
      });
    }

    const companies =
      typeof prisma.company.findMany === 'function'
        ? await prisma.company.findMany({
            where: {
              isActive: true,
              OR: [
                { publicCode: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: PORTAL_PUBLIC_LOOKUP_SELECT,
            take: 8,
            orderBy: { name: 'asc' },
          })
        : [];

    const activeCompanies = (companies || []).filter(
      (company) => company && company.isActive !== false,
    );
    const colorMap = await resolveLightPrimaryColors(prisma, activeCompanies);
    const items = activeCompanies.map((company) =>
      toSafeLookupItem(company, colorMap.get(company.id) || '#4f46e5'),
    );

    await redisCacheService
      .set(cacheKey, items, PORTAL_LOOKUP_CACHE_TTL_SECONDS)
      .catch(() => {});
    res.set('Cache-Control', 'public, max-age=60');
    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('❌ [PortalPWA] lookupPortalCompanies failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'تعذر البحث عن المؤسسات',
    });
  }
}

function parseSha256Fingerprints(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];
  return rawValue
    .split(',')
    .map((fp) => fp.trim())
    .filter(Boolean);
}

function getAndroidAssetLinks(req, res) {
  const fingerprints = Array.from(
    new Set([
      ...parseSha256Fingerprints(process.env.ANDROID_APP_SHA256_FINGERPRINTS),
      ...parseSha256Fingerprints(process.env.ANDROID_PORTAL_SHA256_FINGERPRINTS),
    ]),
  );

  const statements =
    fingerprints.length === 0
      ? []
      : ANDROID_ASSET_LINK_PACKAGES.map((packageName) => ({
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: packageName,
            sha256_cert_fingerprints: fingerprints,
          },
        }));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(statements);
}

module.exports = {
  PORTAL_MANIFEST_CONFIG,
  extractBrandingColors,
  generateMonogramIconBuffer,
  getAndroidAssetLinks,
  getPortalBranding,
  getPortalIcon,
  getPortalManifest,
  invalidatePortalIconCache,
  isPrivateOrReservedIp,
  isSafeRemoteLogoUrl,
  lookupPortalCompanies,
  normalizeHex,
  resolvePortalBrandingData,
  resolvePortalCompany,
  resolveSafeLocalUploadPath,
};
