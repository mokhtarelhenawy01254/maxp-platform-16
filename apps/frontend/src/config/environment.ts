/**
 * Smart Environment Configuration System
 */

interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  appUrl: string;
  backendUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  environment: "development" | "production";
  googleMapsApiKey: string;
}

type ViteEnvMap = Record<string, string | boolean | undefined>;

const isAbsoluteHttpUrl = (value?: string): boolean =>
  typeof value === "string" && /^https?:\/\//i.test(value);

const isAbsoluteWsUrl = (value?: string): boolean =>
  typeof value === "string" && /^wss?:\/\//i.test(value);

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const isLocalDevHostname = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "0.0.0.0" ||
  hostname === "lvh.me" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("172.") ||
  hostname.endsWith(".local") ||
  hostname.endsWith(".localhost") ||
  hostname.endsWith(".lvh.me") ||
  hostname.endsWith(".test");

const isLocalDevUrl = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  try {
    return isLocalDevHostname(new URL(value, window.location.origin).hostname);
  } catch {
    return false;
  }
};

const toWebSocketOrigin = (value: string): string => {
  const parsed = new URL(value, window.location.origin);
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${parsed.host}`;
};

/**
 * فحص ما إذا كان التطبيق يعمل داخل بيئة تطبيق الموبايل الأصلي (Capacitor)
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === "undefined") return false;
  const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (win.Capacitor?.isNativePlatform?.()) return true;
  if (typeof navigator !== "undefined" && navigator.userAgent?.includes("MaxP-Native-Android")) return true;
  return (
    window.location.protocol === "capacitor:" ||
    window.location.origin === "https://localhost" ||
    window.location.origin === "capacitor://localhost" ||
    window.location.origin === "http://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port) ||
    (window.location.hostname === "localhost" &&
      /Android|iPhone|iPad|iPod/i.test(window.navigator?.userAgent || ""))
  );
};

/**
 * كشف البيئة الحالية بناءً على hostname وبيئة التشغيل
 */
const detectEnvironment = (): "development" | "production" => {
  if (isCapacitorNative()) {
    return "production";
  }

  const hostname = window.location.hostname;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "lvh.me" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".lvh.me") ||
    hostname.endsWith(".test")
  ) {
    return "development";
  }
  return "production";
};

/**
 * إنشاء إعدادات البيئة
 */
const createEnvironmentConfig = (): EnvironmentConfig => {
  const viteEnv = ((typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : (typeof process !== "undefined" ? process.env : {})) as ViteEnvMap;
  const environment = detectEnvironment();
  const isDevelopment = environment === "development";
  const isProduction = environment === "production";

  // الرابط الأساسي من متغيرات البيئة أو تلقائياً
  const envApiUrl =
    typeof viteEnv["VITE_API_URL"] === "string"
      ? viteEnv["VITE_API_URL"]
      : undefined;
  const envWsUrl =
    typeof viteEnv["VITE_WS_URL"] === "string"
      ? viteEnv["VITE_WS_URL"]
      : undefined;
  const envBackendUrl =
    typeof viteEnv["VITE_BACKEND_URL"] === "string"
      ? viteEnv["VITE_BACKEND_URL"]
      : undefined;
  const envProxyTarget =
    typeof viteEnv["VITE_PROXY_TARGET"] === "string"
      ? viteEnv["VITE_PROXY_TARGET"]
      : undefined;
  const configuredDevPort =
    typeof viteEnv["VITE_PORT"] === "string"
      ? viteEnv["VITE_PORT"].trim()
      : "";

  let apiUrl: string;
  let wsUrl: string;
  let appUrl: string;
  let backendUrl: string;

  if (isCapacitorNative()) {
    // 📱 بيئة تطبيق الموبايل الأصلي (Capacitor) - الاتصال المباشر بخادم المنصة السحابي
    const prodTarget = "https://maxp.online";
    apiUrl = envApiUrl || `${prodTarget}/api/v1`;
    backendUrl = envBackendUrl || prodTarget;
    wsUrl = envWsUrl || "wss://maxp.online";
    appUrl = prodTarget;
  } else if (isDevelopment) {
    const directBackendTarget =
      envBackendUrl ||
      (isAbsoluteHttpUrl(envProxyTarget) && envProxyTarget
        ? envProxyTarget
        : "");
    const directBackendBase = stripTrailingSlash(directBackendTarget);
    const isConfiguredDevOrigin =
      !configuredDevPort || window.location.port === configuredDevPort;
    const isLocalPreviewOrigin = isLocalDevHostname(window.location.hostname);
    const shouldUseProxyOrigin =
      isConfiguredDevOrigin || !directBackendBase || isLocalPreviewOrigin;

    // Prefer the Vite proxy for all local preview/dev origins, including
    // alternate ports such as :3011-:3013 that still expose the same proxy.
    // This avoids embedded-browser cross-origin fetch failures while keeping
    // direct backend fallback available for non-local origins.
    apiUrl = shouldUseProxyOrigin
      ? envApiUrl || "/api/v1"
      : envApiUrl && isAbsoluteHttpUrl(envApiUrl)
        ? stripTrailingSlash(envApiUrl)
        : `${directBackendBase}/api/v1`;
    wsUrl =
      envWsUrl && isAbsoluteWsUrl(envWsUrl)
        ? stripTrailingSlash(envWsUrl)
        : shouldUseProxyOrigin
          ? window.location.origin
          : toWebSocketOrigin(directBackendBase);
    backendUrl = directBackendBase || window.location.origin;
    appUrl = window.location.origin;

    if (!shouldUseProxyOrigin && (import.meta.env.DEV || import.meta.env.MODE === "development")) {
      console.warn(
        "🩹 [ENV] Detected a stale dev origin, falling back to the configured backend target:",
        {
          currentOrigin: window.location.origin,
          configuredDevPort,
          backendUrl,
          apiUrl,
          wsUrl,
        },
      );
    }
  } else {
    const currentOrigin = window.location.origin;
    const isSecure = window.location.protocol === "https:";

    // استخدام النطاق الحالي ديناميكياً لتجنب مشاكل CORS
    apiUrl = envApiUrl || `${currentOrigin}/api/v1`;
    backendUrl =
      envBackendUrl ||
      (envApiUrl && envApiUrl.startsWith("http")
        ? envApiUrl.replace(/\/api(?:\/v1)?\/?$/, "")
        : currentOrigin);
    appUrl = currentOrigin;

    if (envWsUrl && isAbsoluteWsUrl(envWsUrl) && !isLocalDevUrl(envWsUrl)) {
      wsUrl = stripTrailingSlash(envWsUrl);
    } else {
      const wsHost = window.location.host;
      wsUrl = isSecure ? `wss://${wsHost}` : `ws://${wsHost}`;
    }
  }

  return {
    apiUrl,
    wsUrl,
    appUrl,
    backendUrl,
    isDevelopment,
    isProduction,
    environment,
    googleMapsApiKey:
      typeof viteEnv["VITE_GOOGLE_MAPS_API_KEY"] === "string"
        ? viteEnv["VITE_GOOGLE_MAPS_API_KEY"]
        : "",
  };
};

// إنشاء إعدادات البيئة
export const envConfig = createEnvironmentConfig();
if (import.meta?.env?.DEV || import.meta?.env?.MODE === "development") {
  console.log(
    "🌍 [ENV] Detected Environment:",
    envConfig.environment,
    "API:",
    envConfig.apiUrl,
    "WS:",
    envConfig.wsUrl,
  );
}

// تسجيل معلومات البيئة في الكونسول
if (import.meta?.env?.DEV || import.meta?.env?.MODE === "development") {
  console.debug("🌍 [ENV-CONFIG] Environment Detection:", {
    hostname: window.location.hostname,

    environment: envConfig.environment,

    apiUrl: envConfig.apiUrl,

    wsUrl: envConfig.wsUrl,

    appUrl: envConfig.appUrl,

    backendUrl: envConfig.backendUrl,
  });
}

// تصدير دوال مساعدة

export const isLocal = () => envConfig.isDevelopment;

export const isProduction = () => envConfig.isProduction;

export const getApiUrl = () => envConfig.apiUrl;

export const getWsUrl = () => envConfig.wsUrl;

export const getAppUrl = () => envConfig.appUrl;

export const getBackendUrl = () => envConfig.backendUrl;

export default envConfig;


