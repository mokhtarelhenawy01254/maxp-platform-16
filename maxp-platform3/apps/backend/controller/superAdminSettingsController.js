const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const KashierService = require('../services/kashierService');

const SETTINGS_SYSTEM_NAME = 'kashier_gateway_settings';

/**
 * GET /api/v1/super-admin/platform/settings/kashier
 * Get platform-wide Kashier settings
 */
exports.getKashierSettings = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const setting = await executeWithRetry(async () => {
      return await prisma.systemSettings.findUnique({
        where: { systemName: SETTINGS_SYSTEM_NAME }
      });
    });

    if (!setting) {
      return res.json({
        success: true,
        data: {
          merchantId: process.env.KASHIER_MERCHANT_ID || '',
          apiKey: process.env.KASHIER_API_KEY || '',
          secretKey: '',
          mode: process.env.KASHIER_MODE || 'test',
          enabledPaymentMethods: ['card', 'wallet']
        }
      });
    }

    const config = typeof setting.config === 'string'
      ? JSON.parse(setting.config)
      : setting.config;

    res.json({
      success: true,
      data: {
        merchantId: config.merchantId || '',
        apiKey: config.apiKey || '',
        secretKey: config.secretKey ? '***' : '', // mask secret key for UI safety
        mode: config.mode || 'test',
        enabledPaymentMethods: config.enabledPaymentMethods || ['card', 'wallet']
      }
    });
  } catch (error) {
    console.error('[SUPER-ADMIN-SETTINGS] Error fetching kashier settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إعدادات الدفع المنصية'
    });
  }
};

/**
 * PUT /api/v1/super-admin/platform/settings/kashier
 * Update platform-wide Kashier settings
 */
exports.updateKashierSettings = async (req, res) => {
  try {
    const { merchantId, apiKey, secretKey, mode, enabledPaymentMethods } = req.body;

    if (!merchantId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'الحقول المطلوبة (Merchant ID, API Key) ناقصة'
      });
    }

    const prisma = getSharedPrismaClient();

    // Fetch existing settings to preserve secretKey if it was masked (not updated)
    const existing = await prisma.systemSettings.findUnique({
      where: { systemName: SETTINGS_SYSTEM_NAME }
    });

    let finalSecretKey = secretKey;
    if (existing && existing.config) {
      const existingConfig = typeof existing.config === 'string'
        ? JSON.parse(existing.config)
        : existing.config;
      if (secretKey === '***' || !secretKey) {
        finalSecretKey = existingConfig.secretKey;
      }
    }

    if (!finalSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'الـ Secret Key مطلوب عند إعداد البوابة لأول مرة'
      });
    }

    const configToSave = {
      merchantId,
      apiKey,
      secretKey: finalSecretKey,
      mode: mode || 'test',
      enabledPaymentMethods: enabledPaymentMethods || ['card', 'wallet']
    };

    const setting = await executeWithRetry(async () => {
      return await prisma.systemSettings.upsert({
        where: { systemName: SETTINGS_SYSTEM_NAME },
        update: {
          config: JSON.stringify(configToSave),
          updatedAt: new Date()
        },
        create: {
          systemName: SETTINGS_SYSTEM_NAME,
          displayName: 'Kashier Platform Payment Gateway Settings',
          description: 'Credentials and configs used to bill merchants for their platform subscriptions.',
          category: 'platform',
          isEnabled: true,
          config: JSON.stringify(configToSave)
        }
      });
    });

    res.json({
      success: true,
      message: 'تم حفظ إعدادات الدفع بنجاح',
      data: {
        merchantId,
        apiKey,
        secretKey: '***',
        mode: configToSave.mode,
        enabledPaymentMethods: configToSave.enabledPaymentMethods
      }
    });
  } catch (error) {
    console.error('[SUPER-ADMIN-SETTINGS] Error updating kashier settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث إعدادات الدفع المنصية'
    });
  }
};

/**
 * POST /api/v1/super-admin/platform/settings/kashier/test-connection
 * Test connection with temporary config (before saving)
 */
exports.testKashierConnection = async (req, res) => {
  try {
    const { merchantId, apiKey, secretKey, mode } = req.body;

    if (!merchantId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'الحقول المطلوبة (Merchant ID, API Key) ناقصة'
      });
    }

    // Handle masked secret key from existing config
    let finalSecretKey = secretKey;
    if (secretKey === '***' || !secretKey) {
      const prisma = getSharedPrismaClient();
      const existing = await prisma.systemSettings.findUnique({
        where: { systemName: SETTINGS_SYSTEM_NAME }
      });
      if (existing && existing.config) {
        const existingConfig = typeof existing.config === 'string'
          ? JSON.parse(existing.config)
          : existing.config;
        finalSecretKey = existingConfig.secretKey;
      }
    }

    if (!finalSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال الـ Secret Key لإجراء الاتصال الاختباري'
      });
    }

    // Call createPaymentSession with custom override config (Null companyId)
    const session = await KashierService.createPaymentSession(
      {
        amount: 1,
        currency: 'EGP',
        orderId: `test-platform-${Date.now()}`,
        customer: { email: 'test-platform@maxp.online', reference: 'test-platform' },
        redirectUrl: 'https://maxp.online/success',
        webhookUrl: 'https://maxp.online/webhook',
        description: 'Platform Connection Test Connection',
      },
      null,
      { merchantId, apiKey, secretKey: finalSecretKey, mode: mode || 'test' }
    );

    if (session.success) {
      res.json({
        success: true,
        message: 'تم الاتصال بالبوابة بنجاح! 🚀'
      });
    } else {
      res.status(400).json({
        success: false,
        error: session.error || 'فشل الاتصال ببوابة كاشير. يرجى مراجعة المفاتيح.'
      });
    }
  } catch (error) {
    console.error('[SUPER-ADMIN-SETTINGS] Error testing kashier connection:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع أثناء فحص الاتصال: ' + error.message
    });
  }
};
