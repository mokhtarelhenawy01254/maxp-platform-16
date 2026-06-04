/**
 * Smart Environment Configuration System for Backend
 * نظام ذكي لكشف البيئة وتحديد الروابط تلقائياً للخادم الخلفي
 */

const fs = require('fs');
const path = require('path');

const KNOWN_DOMAIN_ALIASES = {
  'mokhtarelhenawy.online': ['maxp.online'],
  'maxp.online': ['mokhtarelhenawy.online']
};

const getEnvValueFromFiles = (filePaths, key) => {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const matchingLine = fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !line.startsWith('#') &&
          line.startsWith(`${key}=`)
      );

    if (!matchingLine) {
      continue;
    }

    return matchingLine
      .slice(key.length + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }

  return null;
};

const resolveFrontendPort = () => {
  const configuredPort =
    process.env.FRONTEND_PORT ||
    process.env.VITE_PORT ||
    getEnvValueFromFiles(
      [
        path.resolve(__dirname, '../../frontend/.env.local'),
        path.resolve(__dirname, '../../frontend/.env'),
      ],
      'VITE_PORT'
    );

  return configuredPort || '3001';
};

const parseCommaSeparatedDomains = (...values) => {
  return values
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeDomain = (value) => {
  if (!value) {
    return null;
  }

  let candidate = value.trim();
  if (!candidate) {
    return null;
  }

  if (!/^[a-z]+:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const hostname = new URL(candidate).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch (error) {
    return null;
  }
};

const resolveAllowedDomains = (mainDomain) => {
  const domains = new Set();

  const addDomain = (value) => {
    const normalized = normalizeDomain(value);
    if (normalized) {
      domains.add(normalized);
    }
  };

  addDomain(mainDomain);
  addDomain(process.env.APP_URL);
  addDomain(process.env.FRONTEND_URL);
  addDomain(process.env.BACKEND_URL);

  parseCommaSeparatedDomains(
    process.env.ALLOWED_FRONTEND_DOMAINS,
    process.env.ADDITIONAL_ALLOWED_DOMAINS,
    process.env.DOMAIN_ALIASES
  ).forEach(addDomain);

  const pendingDomains = Array.from(domains);
  while (pendingDomains.length > 0) {
    const domain = pendingDomains.pop();
    const aliases = KNOWN_DOMAIN_ALIASES[domain] || [];

    aliases.forEach((alias) => {
      const normalizedAlias = normalizeDomain(alias);
      if (normalizedAlias && !domains.has(normalizedAlias)) {
        domains.add(normalizedAlias);
        pendingDomains.push(normalizedAlias);
      }
    });
  }

  return Array.from(domains);
};

const detectEnvironment = () => {
  // فحص متغيرات البيئة أولاً
  if (process.env.NODE_ENV === 'production') {
    console.log('production');
    return 'production';
  }

  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }

  // فحص الـ hostname أو المنافذ
  const port = process.env.PORT || '3001';

  // إذا كان المنفذ محلي أو في نطاق التطوير
  if (port === '3001' || port === '3007' || process.env.NODE_ENV !== 'production') {
    return 'development';
  }

  return 'production';
};

const createEnvironmentConfig = () => {
  const environment = detectEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  // Get main domain from env or default to mokhtarelhenawy.online
  const MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online';
  const allowedDomains = resolveAllowedDomains(MAIN_DOMAIN);

  let frontendUrl;
  let backendUrl;
  let apiBaseUrl;
  let wsUrl;
  const frontendPort = resolveFrontendPort();
  const localDevPorts = Array.from(
    new Set([frontendPort, '3000', '3001', '3007', '3008'])
  );
  const localDevOrigins = localDevPorts.flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://0.0.0.0:${port}`
  ]);
  const localDevOriginPatterns = [
    ...localDevOrigins,
    // Preview/dev servers often run on ephemeral ports like 3011-3013.
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/0\.0\.0\.0:\d+$/
  ];

  if (isDevelopment) {
    // إعدادات بيئة التطوير
    const backendPort = process.env.PORT || '3007';

    frontendUrl = `http://localhost:${frontendPort}`;
    backendUrl = `http://localhost:${backendPort}`;
    apiBaseUrl = `http://localhost:${backendPort}/api/v1`;
    wsUrl = `ws://localhost:${backendPort}`;
  } else {
    // إعدادات بيئة الإنتاج - استخدام النطاق بدون www كافتراضي لتقليل مشاكل CORS
    const productionDomain = `https://${MAIN_DOMAIN}`;
    const productionDomainWWW = `https://www.${MAIN_DOMAIN}`;

    frontendUrl = productionDomain;
    backendUrl = productionDomain;
    apiBaseUrl = `${productionDomain}/api/v1`;
    wsUrl = `wss://${MAIN_DOMAIN}`;
  }

  const allowedOriginPatterns = [
    ...localDevOriginPatterns,
    ...allowedDomains.flatMap((domain) => {
      const escapedDomain = domain.replace(/\./g, '\\.');
      const subdomainRegex = new RegExp(`^https:\/\/[a-zA-Z0-9-]+\.${escapedDomain}$`);

      return [
        `https://${domain}`,
        `https://www.${domain}`,
        subdomainRegex
      ];
    })
  ];

  return {
    environment,
    isDevelopment,
    isProduction,
    frontendUrl,
    backendUrl,
    apiBaseUrl,
    wsUrl,
    mainDomain: MAIN_DOMAIN,
    allowedDomains,

    // CORS Origins - Allow both www, non-www, and all subdomains
    // Using function to dynamically validate origins
    corsOrigins: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOriginPatterns.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return pattern === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn('🚫 [CORS] Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },

    // Database Configuration
    database: {
      // يمكن إضافة إعدادات قاعدة البيانات حسب البيئة
      ssl: isProduction,
      logging: isDevelopment
    }
  };
};

// إنشاء إعدادات البيئة
const envConfig = createEnvironmentConfig();

// تسجيل معلومات البيئة
console.log('🌍 [BACKEND-ENV] Environment Detection:', {
  environment: envConfig.environment,
  frontendUrl: envConfig.frontendUrl,
  backendUrl: envConfig.backendUrl,
  apiBaseUrl: envConfig.apiBaseUrl,
  mainDomain: envConfig.mainDomain,
  allowedDomains: envConfig.allowedDomains
});

module.exports = envConfig;
