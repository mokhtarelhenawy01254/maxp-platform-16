const axios = require('axios');

const getPrisma = () => require('../services/sharedDatabase').getSharedPrismaClient();

const KASHIER_MODE = () => process.env.KASHIER_MODE || 'test';
const KASHIER_BASE_URL = () => getBaseUrlForMode(KASHIER_MODE());
const KASHIER_PAYMENT_URL = () => process.env.KASHIER_PAYMENT_URL || 'https://payments.kashier.io';
const WEBHOOK_BASE_URL = () => process.env.WEBHOOK_BASE_URL || '';

/** Return the correct Kashier API base URL for the given mode (test/live). */
const getBaseUrlForMode = (mode) => {
  if (mode === 'live') {
    return process.env.KASHIER_BASE_URL || 'https://api.kashier.io';
  }
  return process.env.KASHIER_TEST_BASE_URL || 'https://test-api.kashier.io';
};

const getCompanyKashierConfig = async (companyId) => {
  const prisma = getPrisma();
  const settings = await prisma.storefrontSettings.findUnique({
    where: { companyId },
    select: {
      paymentGatewayConfig: true,
      enabledPaymentMethods: true,
    },
  });

  if (!settings?.paymentGatewayConfig) {
    return {
      enabledPaymentMethods: settings?.enabledPaymentMethods || '["cod"]',
      config: null,
      hasConfig: false,
    };
  }

  const config = typeof settings.paymentGatewayConfig === 'string'
    ? JSON.parse(settings.paymentGatewayConfig)
    : settings.paymentGatewayConfig;

  const enabledPaymentMethods = typeof settings.enabledPaymentMethods === 'string'
    ? JSON.parse(settings.enabledPaymentMethods)
    : settings.enabledPaymentMethods;

  const hasKey = (path) => {
    const parts = path.split('.');
    let current = config;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return false;
      current = current[part];
    }
    return !!current && typeof current === 'string' && current.length > 0;
  };

  const finalConfig = {
    ...config,
    apiKey: hasKey('apiKey') ? config.apiKey : null,
    secretKey: hasKey('secretKey') ? config.secretKey : null,
    merchantId: hasKey('merchantId') ? config.merchantId : null,
    mode: hasKey('mode') ? config.mode || 'test' : KASHIER_MODE(),
  };

  return {
    enabledPaymentMethods: Array.isArray(enabledPaymentMethods) ? enabledPaymentMethods : ["cod"],
    config: finalConfig,
    hasConfig: Boolean(finalConfig.merchantId && finalConfig.apiKey && finalConfig.secretKey),
  };
};

const getPlatformKashierConfig = async () => {
  const prisma = getPrisma();
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { systemName: 'kashier_gateway_settings' }
    });

    if (!setting || !setting.config) {
      return {
        merchantId: process.env.KASHIER_MERCHANT_ID || null,
        apiKey: process.env.KASHIER_API_KEY || null,
        secretKey: process.env.KASHIER_SECRET_KEY || null,
        mode: process.env.KASHIER_MODE || 'test',
        enabledPaymentMethods: ['card', 'wallet']
      };
    }

    const config = typeof setting.config === 'string'
      ? JSON.parse(setting.config)
      : setting.config;

    return {
      merchantId: config.merchantId || null,
      apiKey: config.apiKey || null,
      secretKey: config.secretKey || null,
      mode: config.mode || 'test',
      enabledPaymentMethods: Array.isArray(config.enabledPaymentMethods) ? config.enabledPaymentMethods : ['card', 'wallet']
    };
  } catch (error) {
    console.error('[KASHIER] Error fetching platform kashier config:', error);
    return {
      merchantId: process.env.KASHIER_MERCHANT_ID || null,
      apiKey: process.env.KASHIER_API_KEY || null,
      secretKey: process.env.KASHIER_SECRET_KEY || null,
      mode: process.env.KASHIER_MODE || 'test',
      enabledPaymentMethods: ['card', 'wallet']
    };
  }
};

class KashierService {
  static async getPlatformConfig() {
    return getPlatformKashierConfig();
  }

  static async getHeaders(companyId = null, overrideConfig = null) {
    let apiKey = process.env.KASHIER_API_KEY;
    let secretKey = process.env.KASHIER_SECRET_KEY;

    if (overrideConfig) {
      apiKey = overrideConfig.apiKey;
      secretKey = overrideConfig.secretKey;
    } else if (companyId) {
      const { config } = await getCompanyKashierConfig(companyId);
      apiKey = config?.apiKey || apiKey;
      secretKey = config?.secretKey || secretKey;
    } else {
      const platformConfig = await getPlatformKashierConfig();
      apiKey = platformConfig.apiKey || apiKey;
      secretKey = platformConfig.secretKey || secretKey;
    }

    return {
      Authorization: secretKey,
      'api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  static async createPaymentSession({ amount, currency, orderId, customer, redirectUrl, webhookUrl, description }, companyId = null, overrideConfig = null) {
    let merchantId, apiKey, secretKey, mode;

    if (overrideConfig) {
      merchantId = overrideConfig.merchantId;
      apiKey = overrideConfig.apiKey;
      secretKey = overrideConfig.secretKey;
      mode = overrideConfig.mode;
    } else if (companyId) {
      const { config } = await getCompanyKashierConfig(companyId);
      merchantId = config?.merchantId || process.env.KASHIER_MERCHANT_ID;
      apiKey = config?.apiKey || process.env.KASHIER_API_KEY;
      secretKey = config?.secretKey || process.env.KASHIER_SECRET_KEY;
      mode = config?.mode || KASHIER_MODE();
    } else {
      const platformConfig = await getPlatformKashierConfig();
      merchantId = platformConfig.merchantId || process.env.KASHIER_MERCHANT_ID;
      apiKey = platformConfig.apiKey || process.env.KASHIER_API_KEY;
      secretKey = platformConfig.secretKey || process.env.KASHIER_SECRET_KEY;
      mode = platformConfig.mode || KASHIER_MODE();
    }

    if (!merchantId || !apiKey || !secretKey) {
      return {
        success: false,
        error: 'Missing required Kashier configuration',
      };
    }

    const body = {
      amount: Number(amount).toFixed(2),
      currency: currency || 'EGP',
      order: orderId,
      merchantRedirect: redirectUrl,
      serverWebhook: webhookUrl,
      display: 'en',
      type: 'one-time',
      paymentType: 'credit',
      allowedMethods: 'card,wallet',
      enable3DS: true,
      merchantId,
      customer: {
        email: customer?.email || '',
        reference: customer?.reference || orderId,
      },
      description: description || `Payment for order ${orderId}`,
      metaData: { orderId },
      interactionSource: 'ECOMMERCE',
    };

    try {
      const headers = await this.getHeaders(companyId, overrideConfig);
      const effectiveMode = mode || KASHIER_MODE();
      const baseUrl = getBaseUrlForMode(effectiveMode);
      console.log(`[KASHIER] Creating session — mode: ${effectiveMode}, baseUrl: ${baseUrl}`);
      const { data } = await axios.post(
        `${baseUrl}/v3/payment/sessions`,
        body,
        { headers },
      );

      const testMode = mode || KASHIER_MODE();
      const sessionUrl = data.sessionUrl
        ? `${data.sessionUrl}${(testMode === 'test' && !data.sessionUrl.includes('mode=')) ? '?mode=test' : ''}`
        : null;

      return {
        success: true,
        sessionId: data._id,
        sessionUrl,
        paymentParams: data.paymentParams,
        status: data.status,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error('[KASHIER] createPaymentSession failed:', errMsg, error.response?.data);
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  static async getSessionStatus(sessionId, companyId = null) {
    try {
      const headers = await this.getHeaders(companyId);
      const { data } = await axios.get(
        `${KASHIER_BASE_URL()}/v3/payment/sessions/${sessionId}/payment`,
        { headers },
      );
      return {
        success: true,
        status: data.data?.status,
        method: data.data?.method,
        amount: data.data?.amount,
        currency: data.data?.currency,
        merchantOrderId: data.data?.merchantOrderId,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error('[KASHIER] getSessionStatus failed:', errMsg);
      return { success: false, error: errMsg };
    }
  }

  static async getCompanyPaymentConfig(companyId) {
    const { config, enabledPaymentMethods, hasConfig } = await getCompanyKashierConfig(companyId);
    return {
      enabledPaymentMethods,
      hasConfig,
      mode: config?.mode || KASHIER_MODE(),
      merchantId: config?.merchantId || process.env.KASHIER_MERCHANT_ID,
    };
  }

  static async isKashierEnabled(companyId) {
    const { hasConfig, enabledPaymentMethods } = await getCompanyKashierConfig(companyId);
    return hasConfig && enabledPaymentMethods && enabledPaymentMethods.includes('card');
  }
}

module.exports = KashierService;
