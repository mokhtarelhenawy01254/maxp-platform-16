/**
 * 📲 SMS Gateway Service
 * خدمة إدارة وإرسال الرسائل النصية القصيرة (SMS) عبر بوابات متعددة
 * Multi-provider SMS gateway: Twilio, SMSMisr, Taqnyat, Generic Webhook.
 */

const axios = require('axios');

/**
 * تنظيف وتنسيق رقم الهاتف الدولي القياسي E.164
 * @param {string} phone
 * @param {string} defaultCountryCode
 * @returns {string}
 */
function normalizePhoneNumber(phone, defaultCountryCode = '20') {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // لو الرقم مصري بصيغة 01xxxxxxxxx (11 رقم)
  if (/^01[0125]\d{8}$/.test(cleaned)) {
    return `20${cleaned.substring(1)}`;
  }

  // لو الرقم سعودي بصيغة 05xxxxxxxx (10 أرقام)
  if (/^05\d{8}$/.test(cleaned)) {
    return `966${cleaned.substring(1)}`;
  }

  // لو بدأ بـ 00 نستبدلها
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  return cleaned;
}

/**
 * إرسال SMS عبر Twilio
 */
async function sendViaTwilio(to, text, config = {}) {
  const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = config.senderId || config.fromNumber || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials (accountSid, authToken, fromNumber) are missing');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('To', to.startsWith('+') ? to : `+${to}`);
  params.append('From', fromNumber);
  params.append('Body', text);

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await axios.post(url, params.toString(), {
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  });

  return {
    success: true,
    messageId: response.data?.sid || null,
    provider: 'TWILIO',
    raw: response.data
  };
}

/**
 * إرسال SMS عبر SMSMisr (مصر)
 */
async function sendViaSMSMisr(to, text, config = {}) {
  const username = config.username || config.apiKey;
  const password = config.password || config.apiSecret;
  const sender = config.senderId || 'MaxP';

  if (!username || !password) {
    throw new Error('SMSMisr credentials (username, password) are missing');
  }

  const url = 'https://smsmisr.com/api/SMS/';
  const params = {
    environment: config.environment || 2, // 1 for test, 2 for live
    username,
    password,
    language: /[\u0600-\u06FF]/.test(text) ? 2 : 1, // 2 for Arabic, 1 for English
    sender,
    mobile: to,
    message: text
  };

  const response = await axios.post(url, null, { params, timeout: 15000 });
  const data = response.data;

  // SMSMisr returns code 1901 for success
  const isSuccess = data?.code === '1901' || data?.code === 1901 || String(data?.code || '').includes('1901');
  if (!isSuccess) {
    throw new Error(`SMSMisr rejected: code ${data?.code || 'unknown'} - ${JSON.stringify(data)}`);
  }

  return {
    success: true,
    messageId: data?.id || `smsmisr_${Date.now()}`,
    provider: 'SMSMISR',
    raw: data
  };
}

/**
 * إرسال SMS عبر Taqnyat (السعودية / الخليج)
 */
async function sendViaTaqnyat(to, text, config = {}) {
  const bearerToken = config.bearerToken || config.apiKey;
  const sender = config.senderId;

  if (!bearerToken || !sender) {
    throw new Error('Taqnyat credentials (bearerToken, senderId) are missing');
  }

  const url = 'https://api.taqnyat.sa/v1/messages';
  const payload = {
    recipients: [to],
    body: text,
    sender
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  const isSuccess = response.data?.statusCode === 201 || response.status === 200 || response.status === 201;
  return {
    success: isSuccess,
    messageId: response.data?.msgId || `taqnyat_${Date.now()}`,
    provider: 'TAQNYAT',
    raw: response.data
  };
}

/**
 * إرسال SMS عبر Webhook مخصص
 */
async function sendViaGenericWebhook(to, text, config = {}) {
  const webhookUrl = config.webhookUrl;
  if (!webhookUrl) {
    throw new Error('Generic SMS Webhook URL is missing');
  }

  const payload = {
    to,
    text,
    senderId: config.senderId || 'MaxP',
    metadata: config.metadata || {}
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
  };

  const response = await axios.post(webhookUrl, payload, { headers, timeout: 15000 });
  return {
    success: response.status >= 200 && response.status < 300,
    messageId: response.data?.messageId || response.data?.id || `webhook_${Date.now()}`,
    provider: 'GENERIC_WEBHOOK',
    raw: response.data
  };
}

/**
 * المحرك المركزي لإرسال الرسائل النصية القصيرة SMS
 * @param {object} params
 * @param {string} params.to - رقم المستلم
 * @param {string} params.text - نص الرسالة
 * @param {string} [params.senderId] - اسم الراسل
 * @param {object} [params.config] - إعدادات البوابة الخاصة بالشركة
 * @returns {Promise<{ success: boolean, messageId?: string, provider: string, error?: string }>}
 */
async function sendSMS({ to, text, senderId, config = {} }) {
  if (!to || !text) {
    throw new Error('Missing recipient phone number or message text for SMS');
  }

  const normalizedPhone = normalizePhoneNumber(to);
  const provider = (config.provider || process.env.DEFAULT_SMS_PROVIDER || 'TWILIO').toUpperCase();
  const effectiveConfig = {
    ...config,
    senderId: senderId || config.senderId
  };

  console.log(`📱 [SMS-GATEWAY] Sending SMS to ${normalizedPhone} via ${provider}`);

  try {
    let result;
    switch (provider) {
      case 'TWILIO':
        result = await sendViaTwilio(normalizedPhone, text, effectiveConfig);
        break;
      case 'SMSMISR':
        result = await sendViaSMSMisr(normalizedPhone, text, effectiveConfig);
        break;
      case 'TAQNYAT':
        result = await sendViaTaqnyat(normalizedPhone, text, effectiveConfig);
        break;
      case 'GENERIC_WEBHOOK':
      case 'WEBHOOK':
        result = await sendViaGenericWebhook(normalizedPhone, text, effectiveConfig);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }

    console.log(`✅ [SMS-GATEWAY] Successfully sent SMS to ${normalizedPhone} (ID: ${result.messageId})`);
    return result;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    console.error(`❌ [SMS-GATEWAY] Failed to send SMS via ${provider}:`, errorMsg);
    return {
      success: false,
      provider,
      error: errorMsg
    };
  }
}

module.exports = {
  sendSMS,
  normalizePhoneNumber,
  sendViaTwilio,
  sendViaSMSMisr,
  sendViaTaqnyat,
  sendViaGenericWebhook
};
