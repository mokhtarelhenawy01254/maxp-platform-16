/**
 * URL Helper Utilities
 * مساعدات لإدارة الروابط بذكاء حسب البيئة
 */

import { envConfig } from "../config/environment";

/**
 * بناء رابط webhook كامل
 */
export const buildWebhookUrl = (path: string = "webhook"): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${envConfig.appUrl}/api/v1/integrations/facebook/${cleanPath}`;
};

/**
 * بناء رابط API كامل
 */
export const buildApiUrl = (endpoint: string): string => {
  // إزالة الشرطة المائلة في البداية إذا وجدت
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // إذا كان الـ endpoint فارغ، نرجع الـ base URL فقط
  if (!cleanEndpoint) {
    return envConfig.apiUrl;
  }

  const baseUrl = envConfig.apiUrl.endsWith("/")
    ? envConfig.apiUrl.slice(0, -1)
    : envConfig.apiUrl;
  return `${baseUrl}/${cleanEndpoint}`;
};

/**
 * بناء رابط WebSocket كامل
 */
export const buildWsUrl = (path: string = ""): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return cleanPath ? `${envConfig.wsUrl}/${cleanPath}` : envConfig.wsUrl;
};

/**
 * بناء رابط التطبيق كامل
 */
export const buildAppUrl = (path: string = ""): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return cleanPath ? `${envConfig.appUrl}/${cleanPath}` : envConfig.appUrl;
};

/**
 * تحويل رابط من الإنتاج إلى التطوير أو العكس
 */
export const adaptUrlForEnvironment = (url: string): string => {
  if (!url) return url;

  // إذا كانت بيئة تطوير
  if (envConfig.isDevelopment) {
    // تحويل روابط الإنتاج إلى محلية
    return url
      .replace("https://www.mokhtarelhenawy.online/api/v1", envConfig.apiUrl)
      .replace("https://www.mokhtarelhenawy.online", envConfig.appUrl)
      .replace("wss://mokhtarelhenawy.online", envConfig.wsUrl)
      .replace("https://maxp.online/api/v1", envConfig.apiUrl)
      .replace("https://maxp.online", envConfig.appUrl)
      .replace("wss://maxp.online", envConfig.wsUrl);
  } else {
    // تحويل روابط التطوير إلى الإنتاج
    return url
      .replace(/http:\/\/localhost:\d+\/api\/v1/, envConfig.apiUrl)
      .replace(/http:\/\/localhost:\d+/, envConfig.appUrl)
      .replace(/ws:\/\/localhost:\d+/, envConfig.wsUrl);
  }
};

/**
 * فحص ما إذا كان الرابط محلي أم لا
 */
export const isLocalUrl = (url: string): boolean => {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("local")
  );
};

/**
 * فحص ما إذا كان الرابط للإنتاج أم لا
 */
export const isProductionUrl = (url: string): boolean => {
  return url.includes("maxp-ai.site");
};

/**
 * الحصول على معلومات البيئة الحالية
 */
export const getEnvironmentInfo = () => {
  return {
    environment: envConfig.environment,
    isDevelopment: envConfig.isDevelopment,
    isProduction: envConfig.isProduction,
    apiUrl: envConfig.apiUrl,
    wsUrl: envConfig.wsUrl,
    appUrl: envConfig.appUrl,
  };
};

/**
 * تسجيل معلومات الرابط للتطوير
 */
export const logUrlInfo = (label: string, url: string) => {
  if (envConfig.isDevelopment) {
    console.log(`🔗 [URL-HELPER] ${label}:`, {
      original: url,
      adapted: adaptUrlForEnvironment(url),
      environment: envConfig.environment,
    });
  }
};

export default {
  buildApiUrl,
  buildWsUrl,
  buildAppUrl,
  buildWebhookUrl,
  adaptUrlForEnvironment,
  isLocalUrl,
  isProductionUrl,
  getEnvironmentInfo,
  logUrlInfo,
};
