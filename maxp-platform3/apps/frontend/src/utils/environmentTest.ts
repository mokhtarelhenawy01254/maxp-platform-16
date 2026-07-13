/**
 * Environment Configuration Test
 * اختبار إعدادات البيئة للتأكد من عملها
 */

import { envConfig } from "../config/environment";
import { config } from "../config";
import { createApiUrl, apiFetch } from "../utils/apiHelpers";

console.log("🧪 Testing Environment Configuration...");

// اختبار إعدادات البيئة الأساسية
console.log("🌍 Environment Config:", {
  hostname: window.location.hostname,
  environment: envConfig.environment,
  isDevelopment: envConfig.isDevelopment,
  isProduction: envConfig.isProduction,
  apiUrl: envConfig.apiUrl,
  wsUrl: envConfig.wsUrl,
  appUrl: envConfig.appUrl,
});

// اختبار config الرئيسي
console.log("⚙️ Main Config:", {
  apiUrl: config.apiUrl,
  isDev: config.isDev,
  isProd: config.isProd,
  env: config.env,
});

// اختبار API helpers
console.log("🛠️ API Helpers Test:");
console.log("Product Categories URL:", createApiUrl("products/categories"));
console.log("Upload URL:", createApiUrl("uploads/multiple"));
console.log("Orders URL:", createApiUrl("orders-new/simple"));

// اختبار شرطي للبيئة
if (envConfig.isDevelopment) {
  console.log("✅ Running in DEVELOPMENT mode");
  console.log("🔌 Backend should be available at:", envConfig.apiUrl);
} else {
  console.log("🚀 Running in PRODUCTION mode");
  console.log("🔌 Backend should be available at:", envConfig.apiUrl);
}

// اختبار API call فعلي (اختياري)
export const testApiConnection = async () => {
  try {
    console.log("🔍 Testing API connection...");
    const response = await apiFetch("products/categories");

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Connection successful!");
      console.log("📦 Categories found:", data.data?.length || 0);
      return true;
    } else {
      console.log("❌ API Connection failed:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ API Connection error:", error);
    return false;
  }
};

// تصدير معلومات البيئة للاستخدام في مكونات أخرى
export const environmentInfo = {
  ...envConfig,
  configTest: {
    apiUrlMatch: config.apiUrl === envConfig.apiUrl,
    allUrlsValid: !!(envConfig.apiUrl && envConfig.wsUrl && envConfig.appUrl),
  },
};

export default {
  envConfig,
  config,
  testApiConnection,
  environmentInfo,
};
