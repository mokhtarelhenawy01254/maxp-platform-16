/**
 * Facebook Ads Service - v25.0
 * 
 * Service للتعامل مع Facebook Marketing API v25.0
 * آخر تحديث: مايو 2026
 * 
 * المزايا المدعومة:
 * ═══════════════════════════════════════════════════
 * ✅ Simplified Campaign Objectives (OUTCOME_*)
 * ✅ Advantage+ Creative (Individual Enhancements)
 * ✅ Advantage+ Audience & Placements
 * ✅ Enhanced Location Targeting (-6.7% cost)
 * ✅ A/B Testing
 * ✅ Dynamic Creative Optimization
 * ✅ Custom & Lookalike Audiences
 * ✅ Lead Generation Forms
 * ✅ Conversion API (CAPI)
 * ✅ Attribution Settings
 * ✅ Scheduled Ads
 * ═══════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { Transform } = require('stream');
const { getMetaGraphApiBaseUrl, getMetaGraphApiVersion } = require('../config/metaApi');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// ═══════════════════════════════════════════════════
// Campaign Objectives Mapping (v25.0 Simplified)
// ═══════════════════════════════════════════════════
const OBJECTIVE_MAPPING = {
  // Legacy -> Simplified (v25.0)
  'LINK_CLICKS': 'OUTCOME_TRAFFIC',
  'CONVERSIONS': 'OUTCOME_SALES',
  'LEAD_GENERATION': 'OUTCOME_LEADS',
  'BRAND_AWARENESS': 'OUTCOME_AWARENESS',
  'REACH': 'OUTCOME_AWARENESS',
  'VIDEO_VIEWS': 'OUTCOME_ENGAGEMENT',
  'POST_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
  'PAGE_LIKES': 'OUTCOME_ENGAGEMENT',
  'APP_INSTALLS': 'OUTCOME_APP_PROMOTION',
  'MESSAGES': 'OUTCOME_ENGAGEMENT',
  'CATALOG_SALES': 'OUTCOME_SALES',
  'STORE_VISITS': 'OUTCOME_TRAFFIC',
  // Already simplified (pass through)
  'OUTCOME_AWARENESS': 'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS': 'OUTCOME_LEADS',
  'OUTCOME_APP_PROMOTION': 'OUTCOME_APP_PROMOTION',
  'OUTCOME_TRAFFIC': 'OUTCOME_TRAFFIC',
  'OUTCOME_SALES': 'OUTCOME_SALES'
};

const SUPPORTED_FULL_AD_CREATIVE_TYPES = new Set([
  'SINGLE_IMAGE',
  'SINGLE_VIDEO',
  'CAROUSEL',
  'EXISTING_POST'
]);

const MAX_REMOTE_AD_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_REMOTE_AD_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_REMOTE_MEDIA_REDIRECTS = 3;
const META_WRITE_UNCERTAIN_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNREFUSED',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT'
]);

const EGYPT_GOVERNORATE_KEYS = {
  // Cairo (القاهرة)
  'cairo': '1001', 'القاهرة': '1001', 'قاهرة': '1001', '1001': '1001',
  // Giza (الجيزة)
  'giza': '998', 'الجيزة': '998', 'جيزة': '998', '998': '998',
  // Alexandria (الإسكندرية)
  'alexandria': '996', 'الإسكندرية': '996', 'الاسكندرية': '996', 'اسكندرية': '996', 'إسكندرية': '996', '996': '996',
  // Dakahlia (الدقهلية / المنصورة)
  'dakahlia': '991', 'الدقهلية': '991', 'دقهلية': '991', 'المنصورة': '991', '991': '991',
  // Sharqia (الشرقية / الزقازيق)
  'sharqia': '1004', 'الشرقية': '1004', 'شرقية': '1004', 'الزقازيق': '1004', '1004': '1004',
  // Gharbia (الغربية / طنطا / المحلة)
  'gharbia': '995', 'الغربية': '995', 'غربية': '995', 'طنطا': '995', 'المحلة': '995', '995': '995',
  // Monufia (المنوفية / شبين الكوم)
  'monufia': '999', 'menofia': '999', 'المنوفية': '999', 'منوفية': '999', '999': '999',
  // Kafr El Sheikh (كفر الشيخ)
  'kafr el sheikh': '1011', 'kafr el-sheikh': '1011', 'كفر الشيخ': '1011', 'كفرالشيخ': '1011', '1011': '1011',
  // Beheira (البحيرة / دمنهور)
  'beheira': '993', 'البحيرة': '993', 'بحيرة': '993', 'دمنهور': '993', '993': '993',
  // Damietta (دمياط)
  'damietta': '1010', 'دمياط': '1010', '1010': '1010',
  // Port Said (بورسعيد)
  'port said': '1009', 'بورسعيد': '1009', 'بور سعيد': '1009', '1009': '1009',
  // Ismailia (الإسماعيلية)
  'ismailia': '997', 'الإسماعيلية': '997', 'الاسماعيلية': '997', 'اسماعيلية': '997', '997': '997',
  // Qalyubia (القليوبية / بنها)
  'qalyubia': '1002', 'القليوبية': '1002', 'قليوبية': '1002', 'بنها': '1002', 'شبرا الخيمة': '1002', '1002': '1002',
  // Suez (السويس)
  'suez': '1005', 'السويس': '1005', 'سويس': '1005', '1005': '1005',
  // Asyut (أسيوط)
  'asyut': '1007', 'أسيوط': '1007', 'اسيوط': '1007', '1007': '1007',
  // Sohag (سوهاج)
  'sohag': '1014', 'سوهاج': '1014', '1014': '1014',
  // Qena (قنا)
  'qena': '1013', 'قنا': '1013', '1013': '1013',
  // Aswan (أسوان)
  'aswan': '1006', 'أسوان': '1006', 'اسوان': '1006', '1006': '1006',
  // Luxor (الأقصر)
  'luxor': '4194', 'الأقصر': '4194', 'الاقصر': '4194', 'اقصر': '4194', '4194': '4194',
  // Red Sea (البحر الأحمر)
  'red sea': '992', 'البحر الأحمر': '992', 'البحر الاحمر': '992', 'الغردقة': '992', '992': '992',
  // Matrouh (مطروح)
  'matrouh': '1012', 'مطروح': '1012', 'مرسى مطروح': '1012', '1012': '1012',
  // Beni Suef (بني سويف)
  'beni suef': '1008', 'بني سويف': '1008', '1008': '1008',
  // Minya (المنيا)
  'minya': '1000', 'المنيا': '1000', 'منيا': '1000', '1000': '1000',
  // Faiyum (الفيوم)
  'faiyum': '994', 'fayoum': '994', 'الفيوم': '994', 'فيوم': '994', '994': '994',
  // New Valley (الوادي الجديد)
  'new valley': '1003', 'الوادي الجديد': '1003', 'وادي جديد': '1003', '1003': '1003',
  // North Sinai (شمال سيناء)
  'north sinai': '1016', 'شمال سيناء': '1016', '1016': '1016',
  // South Sinai (جنوب سيناء)
  'south sinai': '1015', 'جنوب سيناء': '1015', '1015': '1015',
};

const DELTA_GOVERNORATE_KEYS = ['991', '1004', '995', '999', '1011', '993', '1010', '1009', '997', '1002'];

const EGYPT_GOVERNORATE_NAMES_BY_KEY = {
  '1001': 'القاهرة',
  '998': 'الجيزة',
  '996': 'الإسكندرية',
  '991': 'الدقهلية',
  '1004': 'الشرقية',
  '995': 'الغربية',
  '999': 'المنوفية',
  '1011': 'كفر الشيخ',
  '993': 'البحيرة',
  '1010': 'دمياط',
  '1009': 'بورسعيد',
  '997': 'الإسماعيلية',
  '1002': 'القليوبية',
  '1005': 'السويس',
  '1007': 'أسيوط',
  '1014': 'سوهاج',
  '1013': 'قنا',
  '1006': 'أسوان',
  '4194': 'الأقصر',
  '992': 'البحر الأحمر',
  '1012': 'مطروح',
  '1008': 'بني سويف',
  '1000': 'المنيا',
  '994': 'الفيوم',
  '1003': 'الوادي الجديد',
  '1016': 'شمال سيناء',
  '1015': 'جنوب سيناء',
};

function extractMetaErrorMessage(error) {
  const errObj = error?.response?.data?.error || error?.response?.data;
  if (!errObj) return error?.message || 'Unknown Meta API error';
  if (typeof errObj === 'string') return errObj;
  return (
    errObj.error_user_msg ||
    errObj.error_user_title ||
    errObj.message ||
    JSON.stringify(errObj)
  );
}

function isMetaWriteUncertainError(error) {
  if (!error) return false;
  if (error.response) return false;
  return Boolean(
    error.request ||
      META_WRITE_UNCERTAIN_ERROR_CODES.has(error.code) ||
      /timeout|network|socket|connection/i.test(String(error.message || ''))
  );
}

function normalizeIpAddress(address) {
  if (!address) return '';
  const normalized = String(address).trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.slice('::ffff:'.length);
    if (net.isIPv4(mappedIpv4)) {
      return mappedIpv4;
    }
  }
  return normalized;
}

function isPrivateIpAddress(address) {
  const normalizedAddress = normalizeIpAddress(address);
  if (!normalizedAddress) return true;
  if (net.isIPv4(normalizedAddress)) {
    const parts = normalizedAddress.split('.').map((part) => Number(part));
    return (
      parts[0] === 0 ||
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
      (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
      parts[0] >= 224
    );
  }

  if (net.isIPv6(normalizedAddress)) {
    return (
      normalizedAddress === '::' ||
      normalizedAddress === '::1' ||
      normalizedAddress.startsWith('::ffff:') ||
      normalizedAddress.startsWith('fc') ||
      normalizedAddress.startsWith('fd') ||
      normalizedAddress.startsWith('fe80:') ||
      normalizedAddress.startsWith('ff') ||
      normalizedAddress.startsWith('2001:db8:')
    );
  }

  return true;
}

function createPinnedLookup(addresses) {
  const safeAddresses = (Array.isArray(addresses) ? addresses : [])
    .map((entry) => {
      const address = normalizeIpAddress(entry?.address || entry);
      return {
        address,
        family: net.isIP(address) || entry?.family,
      };
    })
    .filter((entry) => entry.address && entry.family);

  return (hostname, options, callback) => {
    let lookupOptions = options;
    let lookupCallback = callback;
    if (typeof lookupOptions === 'function') {
      lookupCallback = lookupOptions;
      lookupOptions = {};
    }

    if (!safeAddresses.length) {
      return lookupCallback(new Error(`No safe address available for ${hostname}`));
    }

    if (lookupOptions?.all) {
      return lookupCallback(null, safeAddresses);
    }

    const preferredFamily = Number(lookupOptions?.family || 0);
    const selectedAddress =
      safeAddresses.find((entry) => preferredFamily && entry.family === preferredFamily) ||
      safeAddresses[0];
    return lookupCallback(null, selectedAddress.address, selectedAddress.family);
  };
}

function createRemoteMediaAgents(parsedUrl, addresses) {
  const pinnedLookup = createPinnedLookup(addresses);
  const agentOptions = { lookup: pinnedLookup };
  return {
    httpAgent: parsedUrl.protocol === 'http:' ? new http.Agent(agentOptions) : undefined,
    httpsAgent: parsedUrl.protocol === 'https:' ? new https.Agent(agentOptions) : undefined
  };
}

function createMaxBytesStream(maxBytes, label) {
  let receivedBytes = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        callback(new Error(`${label} exceeds the maximum allowed size`));
        return;
      }
      callback(null, chunk);
    }
  });
}

async function assertSafeRemoteMediaUrl(mediaUrl, label = 'Media') {
  let parsedUrl;
  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    throw new Error(`Invalid ${label.toLowerCase()} URL`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`${label} URL must use http or https`);
  }

  const hostname = normalizeIpAddress(parsedUrl.hostname);
  if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error(`Local ${label.toLowerCase()} URLs are not allowed for Meta upload`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error(`Private ${label.toLowerCase()} URLs are not allowed for Meta upload`);
    }
    return {
      parsedUrl,
      addresses: [{ address: normalizeIpAddress(hostname), family: net.isIP(hostname) }]
    };
  }

  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error(`${label} URL resolved to a private or unavailable address`);
  }

  return {
    parsedUrl,
    addresses
  };
}

async function fetchSafeRemoteMedia(mediaUrl, options = {}) {
  const {
    label = 'Media',
    responseType = 'arraybuffer',
    maxBytes = MAX_REMOTE_AD_IMAGE_BYTES
  } = options;
  let currentUrl = mediaUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REMOTE_MEDIA_REDIRECTS; redirectCount += 1) {
    const safety = await assertSafeRemoteMediaUrl(currentUrl, label);
    const agents = createRemoteMediaAgents(safety.parsedUrl, safety.addresses);

    const response = await axios.get(currentUrl, {
      responseType,
      timeout: 15000,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      maxRedirects: 0,
      httpAgent: agents.httpAgent,
      httpsAgent: agents.httpsAgent,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'MaxP-FacebookAds/1.0'
      }
    });

    const location = response.headers?.location;
    if (response.status >= 300 && response.status < 400 && location) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const contentLength = Number(response.headers?.['content-length'] || 0);
    if (contentLength > maxBytes) {
      throw new Error(`${label} exceeds the maximum allowed size`);
    }

    if (responseType === 'stream' && response.data?.pipe) {
      response.data = response.data.pipe(createMaxBytesStream(maxBytes, label));
    }

    return response;
  }

  throw new Error(`${label} URL has too many redirects`);
}

class FacebookAdsService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = getMetaGraphApiVersion();
    this.baseUrl = getMetaGraphApiBaseUrl();
  }

  /**
   * الحصول على Account ID بالصيغة الصحيحة
   */
  getAccountId() {
    return this.adAccountId?.startsWith('act_') 
      ? this.adAccountId 
      : `act_${this.adAccountId}`;
  }

  /**
   * تحويل Objective القديم للجديد (v22.0 Simplified)
   */
  normalizeObjective(objective) {
    return OBJECTIVE_MAPPING[objective] || objective;
  }

  async fetchPagedData(initialUrl, initialParams = {}) {
    let nextUrl = initialUrl;
    let params = initialParams;
    let paging = null;
    const data = [];

    do {
      const response = await axios.get(nextUrl, { params });
      data.push(...(response.data.data || []));
      paging = response.data.paging || null;
      nextUrl = paging?.next || null;
      params = undefined;
    } while (nextUrl);

    return { data, paging };
  }

  /**
   * ============================================
   * Campaign Methods
   * ============================================
   */

  /**
   * إنشاء حملة جديدة
   */
  async createCampaign(data) {
    try {
      const {
        name,
        objective,
        status = 'PAUSED',
        adAccountId = this.adAccountId,
        // الحقول الجديدة
        specialAdCategories = [],
        budgetOptimization = false,
        budgetType,
        budgetAmount,
        spendLimit,
        buyingType = 'AUCTION',
        bidStrategy,
        bidValue
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }

      const accountId = adAccountId.startsWith('act_')
        ? adAccountId
        : `act_${adAccountId}`;

      // ✅ v25.0: تحويل Objective للصيغة الجديدة (Simplified)
      const normalizedObjective = this.normalizeObjective(objective);

      // بناء بيانات الحملة (v25.0 format)
      const campaignData = {
        name,
        objective: normalizedObjective,
        status,
        special_ad_categories: specialAdCategories,
        buying_type: buyingType
      };

      // ✅ v25.0: Advantage+ Budget Optimization (CBO) - Enhanced
      if (budgetOptimization && budgetAmount) {
        campaignData.is_campaign_budget_optimization_on = true;
        
        // ✅ v25.0: Budget Rebalance Flag
        if (data.budgetRebalance !== undefined) {
          campaignData.budget_rebalance_flag = data.budgetRebalance;
        }
        
        // ✅ v25.0: Lifetime Budget Optimization
        if (data.lifetimeBudgetOptimization !== undefined) {
          campaignData.lifetime_budget_optimization = data.lifetimeBudgetOptimization;
        }
        
        // تحديد نوع الميزانية (Facebook يتوقع القيمة بالسنتات)
        if (budgetType === 'DAILY') {
          campaignData.daily_budget = Math.round(budgetAmount * 100);
        } else if (budgetType === 'LIFETIME') {
          campaignData.lifetime_budget = Math.round(budgetAmount * 100);
        }
      } else {
        // Meta v24 requires an explicit value when the campaign does not use
        // campaign-budget optimization and the budget lives on the ad set.
        campaignData.is_adset_budget_sharing_enabled = Boolean(
          data.adSetBudgetSharingEnabled
        );
      }

      // إضافة حد الإنفاق إذا كان موجود
      if (spendLimit) {
        campaignData.spend_cap = Math.round(spendLimit * 100);
      }

      if (budgetOptimization && budgetAmount) {
        Object.assign(
          campaignData,
          this.buildBidStrategy(bidStrategy || 'LOWEST_COST', bidValue)
        );
      }

      console.log('📤 Creating Facebook campaign with data:', JSON.stringify(campaignData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/campaigns`,
        campaignData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Facebook campaign created:', response.data.id);

      return {
        success: true,
        campaignId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook campaign:', error.response?.data || error.message);

      const errSubcode = error.response?.data?.error?.error_subcode;
      const errMsg = String(error.response?.data?.error?.message || '').toLowerCase();
      if ((errSubcode === 2490487 || errMsg.includes('bid') || errMsg.includes('عرض الأسعار')) && campaignData.bid_strategy) {
        console.warn('🔄 [Self-Healing] Detected Meta Campaign bid strategy rejection. Retrying with explicit LOWEST_COST_WITHOUT_CAP...');
        try {
          const healedCampaignData = {
            ...campaignData,
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
          };
          delete healedCampaignData.bid_amount;
          delete healedCampaignData.bid_constraints;
          const retryRes = await axios.post(
            `${this.baseUrl}/${accountId}/campaigns`,
            healedCampaignData,
            { params: { access_token: this.accessToken } }
          );
          if (retryRes?.data?.id) {
            console.log('✅ [Self-Healing] Facebook campaign created successfully on auto-retry:', retryRes.data.id);
            return {
              success: true,
              campaignId: retryRes.data.id,
              data: retryRes.data,
              selfHealed: true
            };
          }
        } catch (retryErr) {
          console.error('❌ [Self-Healing] Campaign retry failed:', retryErr.response?.data || retryErr.message);
        }
      }

      return {
        success: false,
        error: extractMetaErrorMessage(error),
        metaWriteUncertain: isMetaWriteUncertainError(error)
      };
    }
  }

  /**
   * تحديث حملة
   */
  async updateCampaign(campaignId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${campaignId}`,
        data,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث إعلان في Meta
   */
  async updateAd(adId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${adId}`,
        data,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Facebook ad:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف حملة
   */
  async deleteCampaign(campaignId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${campaignId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب معلومات حملة
   */
  async getCampaign(campaignId, fields = ['id', 'name', 'objective', 'status', 'created_time', 'updated_time']) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${campaignId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: fields.join(',')
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع الحملات
   */
  async getCampaigns(adAccountId = null, fields = ['id', 'name', 'objective', 'account_id', 'status', 'configured_status', 'effective_status']) {
    try {
      const accountId = adAccountId || this.adAccountId;
      
      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }
      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const result = await this.fetchPagedData(`${this.baseUrl}/${normalizedAccountId}/campaigns`, {
        access_token: this.accessToken,
        fields: fields.join(','),
        limit: 100
      });

      return {
        success: true,
        data: result.data,
        paging: result.paging
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaigns:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getAdSets(adAccountId = null, fields = [
    'id',
    'name',
    'campaign{id,name}',
    'status',
    'configured_status',
    'effective_status',
    'daily_budget',
    'lifetime_budget',
    'optimization_goal',
    'billing_event',
    'targeting',
    'promoted_object',
    'created_time',
    'updated_time',
    'start_time',
    'end_time'
  ]) {
    try {
      const accountId = adAccountId || this.adAccountId;

      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const result = await this.fetchPagedData(`${this.baseUrl}/${normalizedAccountId}/adsets`, {
        access_token: this.accessToken,
        fields: fields.join(','),
        limit: 100
      });

      return {
        success: true,
        data: result.data,
        paging: result.paging
      };
    } catch (error) {
      console.error('❌ Error getting Facebook ad sets:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getAds(adAccountId = null, fields = [
    'id',
    'name',
    'campaign{id,name}',
    'adset{id,name}',
    'status',
    'configured_status',
    'effective_status',
    'created_time',
    'updated_time'
  ]) {
    try {
      const accountId = adAccountId || this.adAccountId;

      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const result = await this.fetchPagedData(`${this.baseUrl}/${normalizedAccountId}/ads`, {
        access_token: this.accessToken,
        fields: fields.join(','),
        limit: 100
      });

      return {
        success: true,
        data: result.data,
        paging: result.paging
      };
    } catch (error) {
      console.error('❌ Error getting Facebook ads:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getCampaignInsights(campaignId, dateRange = null) {
    try {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const params = {
        access_token: this.accessToken,
        fields: [
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'action_values',
          'purchase_roas',
          'inline_link_clicks',
          'cost_per_inline_link_click'
        ].join(','),
        limit: 100
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      }

      const result = await this.fetchPagedData(`${this.baseUrl}/${campaignId}/insights`, params);

      return {
        success: true,
        data: result.data,
        paging: result.paging
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaign insights:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * AdSet Methods
   * ============================================
   */

  /**
   * إنشاء AdSet جديد
   */
  async createAdSet(campaignId, data) {
    try {
      const {
        name,
        status = 'PAUSED',
        targeting,
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent,
        placementType,
        placements,
        performanceGoal,
        conversionEvent,
        conversionLocation,
        attributionWindow,
        pixelId,
        bidStrategy,
        bidValue,
        existingCustomerBudgetPercentage
      } = data;

      // بناء بيانات الاستهداف
      const effectiveTargeting = {
        ...(targeting || {}),
        ...(data.devicePlatforms && { devicePlatforms: data.devicePlatforms }),
        ...(data.onlyWifi !== undefined && { onlyWifi: data.onlyWifi })
      };
      const targetingSpec = this.buildAdvancedTargetingSpec(effectiveTargeting);

      // استخدام Ad Account ID الصحيح (act_ prefix)
      const accountId = this.adAccountId?.startsWith('act_') 
        ? this.adAccountId 
        : `act_${this.adAccountId}`;

      // بناء بيانات الميزانية (فقط إذا لم يكن CBO مفعل)
      let budgetData = {};
      if (budgetType && budgetAmount) {
        budgetData = budgetType === 'DAILY' 
          ? { daily_budget: Math.round(budgetAmount * 100) } // Facebook expects cents
          : { lifetime_budget: Math.round(budgetAmount * 100) };
      }

      // تحديد optimization_goal الصحيح بناءً على نوع الحملة
      let finalOptimizationGoal = optimizationGoal || 'LINK_CLICKS';
      let promotedObject = {};

      // للمبيعات والـ Leads - استخدام OFFSITE_CONVERSIONS
      if (conversionEvent && pixelId) {
        finalOptimizationGoal = 'OFFSITE_CONVERSIONS';
        promotedObject = {
          pixel_id: pixelId,
          custom_event_type: conversionEvent // PURCHASE, ADD_TO_CART, etc.
        };
      }

      const resolvedAttributionWindow = this.resolveAttributionWindow({
        attributionWindow,
        optimizationGoal: finalOptimizationGoal
      });
      const attributionSpec = this.buildAttributionSpec(resolvedAttributionWindow);

      // بناء Bid Strategy
      const bidData = this.buildBidStrategy(bidStrategy || 'LOWEST_COST', bidValue);
      if (!bidData.bid_strategy && (budgetData.daily_budget || budgetData.lifetime_budget)) {
        bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
      }

      const adSetData = {
        name,
        status,
        campaign_id: campaignId,
        ...budgetData,
        billing_event: billingEvent || 'IMPRESSIONS',
        optimization_goal: finalOptimizationGoal,
        targeting: targetingSpec,
        ...bidData
      };

      // إضافة promoted_object للتحويلات
      if (Object.keys(promotedObject).length > 0) {
        adSetData.promoted_object = promotedObject;
      }

      // ✅ v26.0: Existing Customer Budget Cap (ECBC)
      if (existingCustomerBudgetPercentage !== undefined && Number(existingCustomerBudgetPercentage) > 0) {
        adSetData.existing_customer_budget_percentage = Number(existingCustomerBudgetPercentage);
      }

      // إضافة Attribution Spec
      if (attributionSpec && attributionSpec.length > 0) {
        adSetData.attribution_spec = attributionSpec;
      }

      // Dayparting / Ad Scheduling (Supported only with lifetime budget)
      if (data.adSchedulingEnabled && Array.isArray(data.adScheduleDays) && data.adScheduleDays.length > 0 && budgetType === 'LIFETIME') {
        const startMinute = Math.max(0, Math.min(1440, (Number(data.adScheduleStartHour) || 0) * 60));
        const endMinute = Math.max(0, Math.min(1440, (Number(data.adScheduleEndHour) || 24) * 60));
        adSetData.pacing_type = ['standard'];
        adSetData.adset_schedule = [
          {
            days: data.adScheduleDays,
            start_minute: startMinute,
            end_minute: endMinute,
            timezone_type: 'USER'
          }
        ];
      }

      // Brand Safety / Inventory Filter
      if (data.inventoryFilter) {
        const filterMap = {
          STANDARD: 'BARRIER_MEDIUM',
          FULL: 'BARRIER_LOW',
          LIMITED: 'BARRIER_HIGH'
        };
        const barrier = filterMap[data.inventoryFilter] || data.inventoryFilter;
        adSetData.inventory_filter = barrier;
      }

      // CBO Ad Set Spend Limits (Minimum / Maximum daily spend target)
      if (data.adSetSpendLimitsEnabled || data.adSetMinDailySpend || data.adSetMaxDailySpend) {
        if (data.adSetMinDailySpend && Number(data.adSetMinDailySpend) > 0) {
          adSetData.daily_min_spend_target = Math.round(Number(data.adSetMinDailySpend) * 100);
        }
        if (data.adSetMaxDailySpend && Number(data.adSetMaxDailySpend) > 0) {
          adSetData.daily_spend_cap = Math.round(Number(data.adSetMaxDailySpend) * 100);
        }
      }

      // ✅ v22.0: Advantage+ Placements (Automatic) or Manual Placements
      if (placementType === 'AUTOMATIC' || !placementType) {
        // Automatic placements are Meta's default when no manual placement
        // restrictions are sent. v24 rejects `advantage_placement` in
        // targeting_automation, so keep the targeting spec clean here.
      } else if (placementType === 'MANUAL' && placements && placements.length > 0) {
        // Manual Placements
        adSetData.targeting = {
          ...adSetData.targeting,
          ...this.buildPlacementsSpec(placements)
        };
      }

      console.log('📤 Creating Facebook AdSet with data:', JSON.stringify(adSetData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adsets`,
        adSetData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Facebook AdSet created:', response.data.id);

      return {
        success: true,
        adSetId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook AdSet:', error.response?.data || error.message);

      const errSubcode = error.response?.data?.error?.error_subcode;
      const errMsg = String(error.response?.data?.error?.message || '').toLowerCase();

      // 🛡️ 2026 In-Flight Self-Healing: If Meta rejects with bid strategy subcode 2490487 or bid constraint error
      if (errSubcode === 2490487 || errMsg.includes('bid') || errMsg.includes('عرض الأسعار')) {
        console.warn('🔄 [Self-Healing] Detected Meta AdSet bid strategy rejection. Retrying with explicit LOWEST_COST_WITHOUT_CAP...');
        try {
          const healedAdSetData = {
            ...adSetData,
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
          };
          delete healedAdSetData.bid_amount;
          delete healedAdSetData.bid_constraints;

          const retryRes = await axios.post(
            `${this.baseUrl}/${accountId}/adsets`,
            healedAdSetData,
            {
              params: {
                access_token: this.accessToken
              }
            }
          );
          if (retryRes?.data?.id) {
            console.log('✅ [Self-Healing] Facebook AdSet created successfully on auto-retry:', retryRes.data.id);
            return {
              success: true,
              adSetId: retryRes.data.id,
              data: retryRes.data,
              selfHealed: true
            };
          }
        } catch (retryErr) {
          console.error('❌ [Self-Healing] AdSet retry failed:', retryErr.response?.data || retryErr.message);
        }
      }

      return {
        success: false,
        error: extractMetaErrorMessage(error)
      };
    }
  }

  /**
   * بناء Placements Spec
   */
  buildPlacementsSpec(placements) {
    const placementSpec = {
      publisher_platforms: [],
      facebook_positions: [],
      instagram_positions: [],
      messenger_positions: [],
      audience_network_positions: []
    };

    const platformMap = {
      'FACEBOOK_FEED': { platform: 'facebook', position: 'feed' },
      'FACEBOOK_STORIES': { platform: 'facebook', position: 'story' },
      'FACEBOOK_REELS': { platform: 'facebook', position: 'facebook_reels' },
      'FACEBOOK_MARKETPLACE': { platform: 'facebook', position: 'marketplace' },
      'FACEBOOK_RIGHT_COLUMN': { platform: 'facebook', position: 'right_hand_column' },
      'INSTAGRAM_FEED': { platform: 'instagram', position: 'stream' },
      'INSTAGRAM_STORIES': { platform: 'instagram', position: 'story' },
      'INSTAGRAM_REELS': { platform: 'instagram', position: 'reels' },
      'INSTAGRAM_EXPLORE': { platform: 'instagram', position: 'explore' },
      'MESSENGER_INBOX': { platform: 'messenger', position: 'messenger_home' },
      'MESSENGER_STORIES': { platform: 'messenger', position: 'story' },
      'AUDIENCE_NETWORK': { platform: 'audience_network', position: 'classic' }
    };

    placements.forEach(placement => {
      const mapping = platformMap[placement];
      if (mapping) {
        if (!placementSpec.publisher_platforms.includes(mapping.platform)) {
          placementSpec.publisher_platforms.push(mapping.platform);
        }
        
        const positionKey = `${mapping.platform}_positions`;
        if (placementSpec[positionKey] && !placementSpec[positionKey].includes(mapping.position)) {
          placementSpec[positionKey].push(mapping.position);
        }
      }
    });

    // إزالة المصفوفات الفارغة
    Object.keys(placementSpec).forEach(key => {
      if (Array.isArray(placementSpec[key]) && placementSpec[key].length === 0) {
        delete placementSpec[key];
      }
    });

    return placementSpec;
  }

  normalizeLocationTypes(locationTypes, fallback = ['home', 'recent']) {
    const allowedTypes = new Set(['home', 'recent']);
    const normalized = Array.isArray(locationTypes)
      ? locationTypes.filter((type) => allowedTypes.has(type))
      : [];

    return normalized.length > 0 ? normalized : fallback;
  }

  normalizeGeoRegion(region) {
    if (!region) return null;
    const rawVal = typeof region === 'object' ? (region.key || region.name || '') : String(region);
    const clean = String(rawVal).trim().toLowerCase();

    // Expand Delta governorates bundle
    if (clean === 'الدلتا' || clean === 'محافظات الدلتا' || clean === 'delta' || clean.includes('دلتا')) {
      return DELTA_GOVERNORATE_KEYS.map((k) => ({ key: k }));
    }

    const mappedKey = EGYPT_GOVERNORATE_KEYS[clean] || EGYPT_GOVERNORATE_KEYS[String(rawVal).trim()];
    if (mappedKey) {
      return { key: mappedKey };
    }

    // If it's already numeric (official Meta region key)
    if (/^\d+$/.test(clean)) {
      return { key: clean };
    }

    return { key: String(rawVal) };
  }

  normalizeGeoCity(city) {
    const key = typeof city === 'object' ? city?.key : city;
    if (!key) return null;

    const radius =
      typeof city === 'object' && Number.isFinite(Number(city.radius))
        ? Math.max(1, Number(city.radius))
        : 25;

    return {
      key: String(key),
      radius,
      distance_unit:
        typeof city === 'object' && city.distance_unit
          ? city.distance_unit
          : 'kilometer'
    };
  }

  normalizeCustomLocation(loc) {
    if (!loc || typeof loc !== 'object') return null;
    const lat = Number(loc.latitude ?? loc.lat);
    const lng = Number(loc.longitude ?? loc.lng ?? loc.long);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;

    const radius = Number.isFinite(Number(loc.radius)) ? Math.max(1, Number(loc.radius)) : 5;
    const distance_unit = loc.distance_unit === 'mile' ? 'mile' : 'kilometer';

    const res = {
      latitude: lat,
      longitude: lng,
      radius,
      distance_unit
    };
    if (loc.name) res.name = String(loc.name);
    return res;
  }

  /**
   * Search Meta Geo Locations (Cities, Regions, Zip Codes, Countries) dynamically
   * Uses GET /v25.0/search?type=adgeolocation
   */
  async searchGeoLocations({ query, countryCode = 'EG', locationTypes = ['region', 'city'], limit = 10 } = {}) {
    if (!query || !String(query).trim()) return [];
    try {
      const params = {
        type: 'adgeolocation',
        q: String(query).trim(),
        limit: Math.min(Number(limit) || 10, 50),
        access_token: this.accessToken
      };
      if (countryCode) {
        params.country_code = String(countryCode).trim().toUpperCase();
      }
      if (Array.isArray(locationTypes) && locationTypes.length > 0) {
        params.location_types = JSON.stringify(locationTypes);
      }
      const response = await axios.get(`${this.baseUrl}/search`, { params, timeout: 10000 });
      return response.data?.data || [];
    } catch (err) {
      console.warn('⚠️ Failed to search Meta geo locations:', extractMetaErrorMessage(err));
      return [];
    }
  }

  /**
   * Search Meta Interests dynamically
   * Uses GET /v25.0/search?type=adinterest
   */
  async searchInterests({ query, limit = 10 } = {}) {
    if (!query || !String(query).trim()) return [];
    try {
      const params = {
        type: 'adinterest',
        q: String(query).trim(),
        limit: Math.min(Number(limit) || 10, 50),
        access_token: this.accessToken
      };
      const response = await axios.get(`${this.baseUrl}/search`, { params, timeout: 10000 });
      return response.data?.data || [];
    } catch (err) {
      console.warn('⚠️ Failed to search Meta interests:', extractMetaErrorMessage(err));
      return [];
    }
  }

  /**
   * بناء Targeting Spec (v22.0 Enhanced)
   */
  buildTargetingSpec(targeting) {
    if (!targeting) {
      return {};
    }

    const spec = {};

    // Age targeting
    if (targeting.ageMin || targeting.age_min) spec.age_min = targeting.ageMin || targeting.age_min;
    if (targeting.ageMax || targeting.age_max) spec.age_max = targeting.ageMax || targeting.age_max;
    
    // Gender targeting (1 = male, 2 = female)
    if (targeting.genders && targeting.genders.length > 0) {
      spec.genders = targeting.genders.map(g => {
        if (g === 'male' || g === '1') return 1;
        if (g === 'female' || g === '2') return 2;
        return parseInt(g) || g;
      });
    }
    
    const cities = Array.isArray(targeting.cities)
      ? targeting.cities.map((city) => this.normalizeGeoCity(city)).filter(Boolean)
      : [];
    const rawRegions = Array.isArray(targeting.regions)
      ? targeting.regions.flatMap((region) => this.normalizeGeoRegion(region)).filter(Boolean)
      : [];
    const seenRegionKeys = new Set();
    const regions = [];
    for (const r of rawRegions) {
      if (r && r.key && !seenRegionKeys.has(r.key)) {
        seenRegionKeys.add(r.key);
        regions.push(r);
      }
    }

    const customLocations = Array.isArray(targeting.customLocations || targeting.custom_locations || targeting.geo_locations?.custom_locations)
      ? (targeting.customLocations || targeting.custom_locations || targeting.geo_locations?.custom_locations)
          .map((loc) => this.normalizeCustomLocation(loc))
          .filter(Boolean)
      : [];

    const hasLocalGeoTargets = cities.length > 0 || regions.length > 0 || customLocations.length > 0;

    // Meta rejects overlapping geo targets, so countries are only sent when
    // the ad set is not already scoped to child regions/cities.
    const resolvedCountries = (
      (Array.isArray(targeting.locations) && targeting.locations.length > 0 ? targeting.locations : null) ||
      (Array.isArray(targeting.countries) && targeting.countries.length > 0 ? targeting.countries : null) ||
      (Array.isArray(targeting.geo_locations?.countries) && targeting.geo_locations.countries.length > 0 ? targeting.geo_locations.countries : null) ||
      (hasLocalGeoTargets ? null : ['EG'])
    );

    const geoLocations = {};
    if (!hasLocalGeoTargets && resolvedCountries && resolvedCountries.length > 0) {
      geoLocations.countries = resolvedCountries;
    }
    if (regions.length > 0) {
      geoLocations.regions = regions;
    }
    if (cities.length > 0) {
      geoLocations.cities = cities;
    }
    if (customLocations.length > 0) {
      geoLocations.custom_locations = customLocations;
    }
    if (Object.keys(geoLocations).length > 0) {
      geoLocations.location_types = this.normalizeLocationTypes(
        targeting.locationTypes || targeting.location_types || targeting.geo_locations?.location_types,
        hasLocalGeoTargets ? ['home'] : ['home', 'recent']
      );
      spec.geo_locations = geoLocations;
    }

    // 🛡️ 2026 COD Logistics & Excluded Geo Locations
    const rawExcludedRegions = Array.isArray(targeting.excludedRegions || targeting.excluded_regions || targeting.excluded_geo_locations?.regions)
      ? (targeting.excludedRegions || targeting.excluded_regions || targeting.excluded_geo_locations?.regions).flatMap((r) => this.normalizeGeoRegion(r)).filter(Boolean)
      : [];
    const seenExcludedRegionKeys = new Set();
    const excludedRegions = [];
    for (const r of rawExcludedRegions) {
      if (r && r.key && !seenExcludedRegionKeys.has(r.key)) {
        seenExcludedRegionKeys.add(r.key);
        excludedRegions.push(r);
      }
    }

    const excludedCities = Array.isArray(targeting.excludedCities || targeting.excluded_cities || targeting.excluded_geo_locations?.cities)
      ? (targeting.excludedCities || targeting.excluded_cities || targeting.excluded_geo_locations?.cities).map((c) => this.normalizeGeoCity(c)).filter(Boolean)
      : [];

    const excludedCustomLocations = Array.isArray(targeting.excludedCustomLocations || targeting.excluded_custom_locations || targeting.excluded_geo_locations?.custom_locations)
      ? (targeting.excludedCustomLocations || targeting.excluded_custom_locations || targeting.excluded_geo_locations?.custom_locations)
          .map((loc) => this.normalizeCustomLocation(loc))
          .filter(Boolean)
      : [];

    const excludedGeoLocations = {};
    if (excludedRegions.length > 0) excludedGeoLocations.regions = excludedRegions;
    if (excludedCities.length > 0) excludedGeoLocations.cities = excludedCities;
    if (excludedCustomLocations.length > 0) excludedGeoLocations.custom_locations = excludedCustomLocations;

    if (Object.keys(excludedGeoLocations).length > 0) {
      excludedGeoLocations.location_types = ['home'];
      spec.excluded_geo_locations = excludedGeoLocations;
    }

    // Interest targeting
    if (targeting.interests && targeting.interests.length > 0) {
      spec.interests = targeting.interests.map(i => 
        typeof i === 'object' ? i : { id: i, name: i }
      );
    }
    
    // Behavior targeting
    if (targeting.behaviors && targeting.behaviors.length > 0) {
      spec.behaviors = targeting.behaviors.map(b => 
        typeof b === 'object' ? b : { id: b }
      );
    }
    
    // Custom Audiences
    if (targeting.customAudiences && targeting.customAudiences.length > 0) {
      spec.custom_audiences = targeting.customAudiences.map(aud => ({ id: aud }));
    }

    // Lookalike Audiences
    if (targeting.lookalikeAudiences && targeting.lookalikeAudiences.length > 0) {
      spec.custom_audiences = [
        ...(spec.custom_audiences || []),
        ...targeting.lookalikeAudiences.map(aud => ({ id: aud }))
      ];
    }

    // Excluded Audiences
    if (targeting.excludedAudiences && targeting.excludedAudiences.length > 0) {
      spec.excluded_custom_audiences = targeting.excludedAudiences.map(aud => ({ id: aud }));
    }

    // Meta rule: When Advantage+ Audience (advantage_audience: 1) is active,
    // Meta strictly forbids age_max < 65. If the user specified a custom age_max < 65,
    // advantage_audience must be 0 to allow standard custom demographic targeting.
    const isCustomAgeCap = Boolean(spec.age_max && spec.age_max < 65);
    const resolvedAdvantageAudience = isCustomAgeCap
      ? 0
      : targeting.advantageAudience === false
        ? 0
        : 1;

    spec.targeting_automation = {
      advantage_audience: resolvedAdvantageAudience
    };

    // In Meta v26: When Advantage+ Audience is active (1), detailed targeting expansion
    // is automatically managed by Meta's AI algorithm, so legacy expansion flags are only
    // sent when running in standard manual custom audience mode (0) to prevent API schema rejections.
    if (resolvedAdvantageAudience === 0) {
      if (targeting.audienceExpansion) {
        spec.targeting_automation.audience_expansion = targeting.audienceExpansion;
      }
      if (targeting.lookalikeExpansion !== undefined) {
        spec.targeting_automation.lookalike_expansion = targeting.lookalikeExpansion;
      }
      if (targeting.targetingExpansion) {
        spec.targeting_optimization = targeting.targetingExpansion === true 
          ? 'expansion_all' 
          : targeting.targetingExpansion;
      }
    }

    // Detailed Targeting: Narrow Audience (AND logic)
    if (targeting.narrowInterests && targeting.narrowInterests.length > 0) {
      const baseInterests = (targeting.interests || []).map(i => 
        typeof i === 'object' ? i : { id: i, name: i }
      );
      const narrowInterests = targeting.narrowInterests.map(i => 
        typeof i === 'object' ? i : { id: i, name: i }
      );
      spec.flexible_spec = [
        ...(baseInterests.length > 0 ? [{ interests: baseInterests }] : []),
        { interests: narrowInterests }
      ];
      // Prevent conflicting flat interests when flexible_spec is active
      delete spec.interests;
    } else if (targeting.flexibleSpec && targeting.flexibleSpec.length > 0) {
      spec.flexible_spec = targeting.flexibleSpec;
    }

    // Detailed Targeting Exclusions
    if (targeting.excludedInterests && targeting.excludedInterests.length > 0) {
      spec.exclusions = {
        ...(spec.exclusions || {}),
        interests: targeting.excludedInterests.map(i => 
          typeof i === 'object' ? i : { id: i, name: i }
        )
      };
    } else if (targeting.exclusions) {
      spec.exclusions = targeting.exclusions;
    }

    return spec;
  }

  /**
   * ============================================
   * Ad Methods
   * ============================================
   */

  /**
   * إنشاء إعلان جديد
   */
  async createAd(adSetId, creativeData) {
    try {
      const {
        name,
        status = 'PAUSED',
        pageId,
        creativeType = 'SINGLE_IMAGE',
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl,
        displayLink,
        urlParameters,
        carouselCards = [],
        textVariations = [],
        headlineVariations = [],
        whatsappGreeting,
        whatsappQuickFaqs = [],
        postId,
        advantageCreative = false,
        textGeneration = false,
        imageEnhancement = false,
        musicEnhancement = false,
        imageTemplates = false,
        videoHighlight = false,
        textOptimizations = false,
        expandImage = false,
        visualTouchups = false,
        relevantComments = false,
        priceOverlay = false
      } = creativeData;

      // إنشاء Creative أولاً
      const creativeResult = await this.createCreative({
        pageId,
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl,
        displayLink,
        urlParameters,
        carouselCards,
        textVariations,
        headlineVariations,
        whatsappGreeting,
        whatsappQuickFaqs,
        postId,
        advantageCreative,
        textGeneration,
        imageEnhancement,
        musicEnhancement,
        imageTemplates,
        videoHighlight,
        textOptimizations,
        expandImage,
        visualTouchups,
        relevantComments,
        priceOverlay
      });

      if (!creativeResult.success) {
        return creativeResult;
      }

      // إنشاء Ad مع ربطه بالـ Creative
      const adData = {
        name,
        status,
        adset_id: adSetId,
        creative: {
          creative_id: creativeResult.creativeId
        },
        ...(creativeData.multiAdvertiserAds !== false && {
          contextual_multi_ads: { enroll_status: "OPT_IN" }
        })
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/ads`,
        adData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        adId: response.data.id,
        creativeId: creativeResult.creativeId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook Ad:', error.response?.data || error.message);
      return {
        success: false,
        error: extractMetaErrorMessage(error)
      };
    }
  }

  /**
   * إنشاء Creative (v22.0 with Individual Enhancements)
   */
  async createCreative(data) {
    try {
      const {
        pageId,
        creativeType = 'SINGLE_IMAGE',
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl,
        displayLink,
        urlParameters,
        carouselCards = [],
        // ✅ v26.0: Individual Advantage+ Creative Enhancements
        advantageCreative = false,
        textGeneration = false,
        imageEnhancement = false,
        musicEnhancement = false,
        imageTemplates = false,
        videoHighlight = false,
        textOptimizations = false,
        expandImage = false,
        visualTouchups = false,
        relevantComments = false,
        priceOverlay = false,
        postId,
        textVariations = [],
        headlineVariations = [],
        whatsappGreeting,
        whatsappQuickFaqs = []
      } = data;

      if (!pageId) {
        return {
          success: false,
          error: 'Facebook Page ID is required for the ad creative'
        };
      }

      const normalizedCreativeType = creativeType || 'SINGLE_IMAGE';

      if (normalizedCreativeType !== 'EXISTING_POST' && !linkUrl) {
        return {
          success: false,
          error: 'Destination URL is required for the ad creative'
        };
      }
      const callToActionPayload = {
        type: callToAction || 'LEARN_MORE',
        value: { link: linkUrl }
      };

      if ((callToAction === 'WHATSAPP_MESSAGE' || String(linkUrl).includes('wa.me')) && whatsappGreeting) {
        callToActionPayload.value.app_destination = 'WHATSAPP';
      }

      const creativeData = {
        object_story_spec: {
          page_id: pageId,
          ...(data.instagramActorId && {
            instagram_actor_id: data.instagramActorId
          })
        }
      };

      if (normalizedCreativeType === 'SINGLE_IMAGE') {
        if (!imageHash) {
          return {
            success: false,
            error: 'Image hash is required for single-image ads'
          };
        }

        creativeData.object_story_spec.link_data = {
          link: linkUrl,
          message: primaryText,
          call_to_action: callToActionPayload,
          image_hash: imageHash
        };

        if (headline) creativeData.object_story_spec.link_data.name = headline;
        if (description) creativeData.object_story_spec.link_data.description = description;
        if (displayLink) creativeData.object_story_spec.link_data.caption = displayLink;
        if (whatsappGreeting && (callToAction === 'WHATSAPP_MESSAGE' || String(linkUrl).includes('wa.me'))) {
          creativeData.object_story_spec.link_data.page_welcome_message = whatsappGreeting;
        }
      } else if (normalizedCreativeType === 'SINGLE_VIDEO') {
        if (!videoId) {
          return {
            success: false,
            error: 'Video ID is required for single-video ads'
          };
        }

        creativeData.object_story_spec.video_data = {
          video_id: videoId,
          message: primaryText,
          call_to_action: callToActionPayload
        };

        if (headline) creativeData.object_story_spec.video_data.title = headline;
        if (description) creativeData.object_story_spec.video_data.link_description = description;
      } else if (normalizedCreativeType === 'CAROUSEL') {
        const validCards = (carouselCards || []).filter((card) => card && card.imageHash && card.linkUrl && card.headline);

        if (validCards.length < 2) {
          return {
            success: false,
            error: 'Carousel ads require at least two cards with image, headline, and link'
          };
        }

        creativeData.object_story_spec.link_data = {
          link: linkUrl,
          message: primaryText,
          call_to_action: callToActionPayload,
          child_attachments: validCards.map((card) => {
            const attachment = {
              link: card.linkUrl || linkUrl,
              image_hash: card.imageHash,
              name: card.headline,
              call_to_action: {
                type: callToAction || 'LEARN_MORE',
                value: { link: card.linkUrl || linkUrl }
              }
            };

            if (card.description) attachment.description = card.description;
            return attachment;
          }),
          multi_share_optimized: true,
          multi_share_end_card: false
        };

        if (headline) creativeData.object_story_spec.link_data.name = headline;
        if (description) creativeData.object_story_spec.link_data.description = description;
        if (displayLink) creativeData.object_story_spec.link_data.caption = displayLink;
      } else if (normalizedCreativeType === 'EXISTING_POST') {
        if (!postId) {
          return {
            success: false,
            error: 'Post ID is required when promoting an existing page post'
          };
        }
        // In Meta Marketing API, existing post creative uses object_story_id
        // Format: {page_id}_{post_id}
        let formattedStoryId;
        const normalizedPageId = String(pageId).trim();
        const strPostId = String(postId).trim();
        if (strPostId.includes('_')) {
          const [part1, part2] = strPostId.split('_');
          if (part1 === normalizedPageId) {
            formattedStoryId = `${normalizedPageId}_${part2}`;
          } else if (part2 === normalizedPageId) {
            formattedStoryId = `${normalizedPageId}_${part1}`;
          } else {
            formattedStoryId = `${normalizedPageId}_${part2 || part1}`;
          }
        } else {
          formattedStoryId = `${normalizedPageId}_${strPostId}`;
        }
        delete creativeData.object_story_spec;
        creativeData.object_story_id = formattedStoryId;
      } else {
        return {
          success: false,
          error: `Creative type ${normalizedCreativeType} is not supported in the full-ad wizard yet`
        };
      }

      if (urlParameters) {
        creativeData.url_tags = urlParameters;
      }

      // ✅ v26.0: Individual Advantage+ Creative Enhancements
      const isExistingPost = normalizedCreativeType === 'EXISTING_POST';
      const hasReelsWithImage = Boolean(
        imageHash &&
        Array.isArray(data?.placements) &&
        data.placements.some((p) => String(p).toUpperCase().includes('REELS'))
      );
      // NOTE: Existing page posts (object_story_id) cannot accept creative-altering Advantage+ specs.
      // Meta strictly limits existing post specs to [IG_VIDEO_NATIVE_SUBTITLE, IMAGE_ANIMATION, PRODUCT_BROWSING, PRODUCT_METADATA_AUTOMATION, PROFILE_CARD, STANDARD_ENHANCEMENTS_CATALOG, TEXT_OVERLAY_TRANSLATION]
      const shouldEnableEnhancements = !isExistingPost && (
        advantageCreative ||
        hasReelsWithImage ||
        expandImage ||
        imageEnhancement ||
        textGeneration ||
        textOptimizations ||
        visualTouchups ||
        relevantComments ||
        priceOverlay
      );

      if (shouldEnableEnhancements) {
        const creativeFeaturesSpec = {};

        // Text Generation (Meta-generated ad copy variations)
        if (textGeneration) {
          creativeFeaturesSpec.text_generation = {
            enroll_status: 'OPT_IN'
          };
        }

        // Text Optimizations (optimize existing text)
        if (textOptimizations) {
          creativeFeaturesSpec.text_optimizations = {
            enroll_status: 'OPT_IN'
          };
        }

        // Image Enhancement (crop, filter, brightness) - Meta Marketing API uses image_touchups
        if (imageEnhancement && imageHash) {
          creativeFeaturesSpec.image_touchups = {
            enroll_status: 'OPT_IN'
          };
        }

        // Image Templates (add overlays, frames)
        if (imageTemplates && imageHash) {
          creativeFeaturesSpec.image_templates = {
            enroll_status: 'OPT_IN'
          };
        }

        // Video Highlight (auto-trim to best moments)
        if (videoHighlight && videoId) {
          creativeFeaturesSpec.video_highlight = {
            enroll_status: 'OPT_IN'
          };
        }

        // Music Enhancement (add background music)
        if (musicEnhancement && videoId) {
          creativeFeaturesSpec.music = {
            enroll_status: 'OPT_IN'
          };
        }

        // ✅ v26.0: Generative Expand (Auto-uncrop/expand for Reels & Stories 9:16)
        if ((expandImage || hasReelsWithImage) && imageHash) {
          creativeFeaturesSpec.expand_image = {
            enroll_status: 'OPT_IN'
          };
          creativeFeaturesSpec.image_templates = {
            enroll_status: 'OPT_IN'
          };
        }

        // ✅ v26.0: Adaptive Visual Touchups (per-user brightness & contrast tuning)
        if (visualTouchups && (imageHash || videoId)) {
          creativeFeaturesSpec.visual_touchups = {
            enroll_status: 'OPT_IN'
          };
        }

        // ✅ v26.0: Social Proof & Relevant Comments amplification (Meta official parameter is inline_comment)
        if (relevantComments) {
          creativeFeaturesSpec.inline_comment = {
            enroll_status: 'OPT_IN'
          };
        }

        // ✅ v26.0: Catalog / Product Price Overlay
        if (priceOverlay) {
          creativeFeaturesSpec.catalog_carousel_overlay = {
            enroll_status: 'OPT_IN'
          };
        }

        // If master switch advantageCreative is true, enable recommended defaults for eligible assets if none were explicitly set
        if (advantageCreative) {
          if (imageHash && !creativeFeaturesSpec.image_touchups) {
            creativeFeaturesSpec.image_touchups = { enroll_status: 'OPT_IN' };
          }
          if (!creativeFeaturesSpec.text_optimizations) {
            creativeFeaturesSpec.text_optimizations = { enroll_status: 'OPT_IN' };
          }
          if (!creativeFeaturesSpec.inline_comment) {
            creativeFeaturesSpec.inline_comment = { enroll_status: 'OPT_IN' };
          }
        }

        // Only attach degrees_of_freedom_spec if at least one feature is configured
        if (Object.keys(creativeFeaturesSpec).length > 0) {
          creativeData.degrees_of_freedom_spec = {
            creative_features_spec: creativeFeaturesSpec
          };
        }
      }

      console.log('📤 Creating Creative (v26.0):', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/adcreatives`,
        creativeData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: extractMetaErrorMessage(error)
      };
    }
  }

  /**
   * 📄 جلب منشورات الصفحة لاستخدامها كإعلان (Use Existing Post)
   */
  async getPagePublishedPosts(pageId, limit = 25) {
    try {
      if (!pageId) {
        throw new Error('Page ID is required');
      }

      const response = await axios.get(
        `${this.baseUrl}/${pageId}/published_posts`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,message,story,created_time,full_picture,permalink_url,shares,attachments{media,type,unshimmed_url}',
            limit
          }
        }
      );

      const posts = (response.data?.data || []).map(post => ({
        id: post.id,
        message: post.message || post.story || 'بدون نص',
        createdTime: post.created_time,
        pictureUrl: post.full_picture || post.attachments?.data?.[0]?.media?.image?.src || null,
        permalinkUrl: post.permalink_url,
        sharesCount: post.shares?.count || 0
      }));

      return {
        success: true,
        posts
      };
    } catch (error) {
      console.error('❌ Error fetching page published posts:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        posts: []
      };
    }
  }

  /**
   * ============================================
   * 🚀 CREATE FULL AD (Campaign + AdSet + Ad)
   * ============================================
   * هذه الدالة تنشئ إعلان كامل بخطوة واحدة
   * تقوم بإنشاء: Campaign → AdSet → Creative → Ad
   */
  async createFullAd(data) {
    try {
      console.log('🚀 Starting Full Ad Creation...');
      
      const {
        // Campaign Data
        campaignName,
        objective,
        specialAdCategories = [],
        buyingType = 'AUCTION',
        
        // Ad Set Level - الميزات الجديدة
        performanceGoal,
        conversionEvent,
        conversionLocation,
        attributionWindow,
        dynamicCreative = false,
        pixelId,
        
        // Budget Data
        budgetOptimization = false, // CBO
        budgetType = 'DAILY',
        budgetAmount,
        bidStrategy,
        bidValue,
        frequencyCap,
        frequencyCapInterval,
        spendLimit,
        existingCustomerBudgetPercentage,
        
        // Schedule Data
        startTime,
        endTime,
        
        // AdSet Data
        adSetName,
        optimizationGoal = 'LINK_CLICKS',
        billingEvent = 'IMPRESSIONS',
        
        // Targeting Data
        targeting = {},
        
        // Placements Data
        placementType = 'AUTOMATIC',
        placements = [],
        
        // Ad Creative Data
        adName,
        pageId,
        creativeType = 'SINGLE_IMAGE',
        primaryText,
        headline,
        description,
        callToAction = 'LEARN_MORE',
        linkUrl,
        displayLink,
        urlParameters,
        imageUrl,
        imageHash,
        videoUrl,
        videoId,
        carouselCards = [],
        textVariations = [],
        headlineVariations = [],
        whatsappGreeting,
        whatsappQuickFaqs = [],
        devicePlatforms = [],
        onlyWifi = false,
        leadFormId,
        postId,
        
        // Advantage+ Creative Enhancements (v26.0)
        advantageCreative = false,
        textGeneration = false,
        imageEnhancement = false,
        musicEnhancement = false,
        imageTemplates = false,
        videoHighlight = false,
        textOptimizations = false,
        expandImage = false,
        visualTouchups = false,
        relevantComments = false,
        priceOverlay = false,
        
        // Status
        status = 'PAUSED'
      } = data;

      // 🛡️ Hermes-Grade Defensive Auto-Hydration: Prevent Blank Targeting ({})
      const effectiveTargeting = {
        ...(targeting || {}),
        ageMin: (targeting && (targeting.ageMin || targeting.age_min)) || data.ageMin || data.age_min,
        ageMax: (targeting && (targeting.ageMax || targeting.age_max)) || data.ageMax || data.age_max,
        genders: (targeting && targeting.genders) || (
          data.genders === 'WOMEN' ? ['female'] :
          data.genders === 'MEN' ? ['male'] :
          Array.isArray(data.genders) ? data.genders : undefined
        ),
        cities: (targeting && targeting.cities && targeting.cities.length > 0) ? targeting.cities : (data.cities || data.targetCities || []),
        regions: (targeting && targeting.regions && targeting.regions.length > 0) ? targeting.regions : (data.regions || data.targetRegions || []),
        interests: (targeting && targeting.interests && targeting.interests.length > 0) ? targeting.interests : (data.interests || data.targetInterests || []),
        countries: (targeting && (targeting.countries || targeting.locations)) || (data.country ? [data.country] : (data.targetCountry ? [data.targetCountry] : ['EG'])),
        customLocations: (targeting && targeting.customLocations && targeting.customLocations.length > 0) ? targeting.customLocations : (data.customLocations || data.targetCustomLocations || []),
        excludedCities: (targeting && targeting.excludedCities && targeting.excludedCities.length > 0) ? targeting.excludedCities : (data.excludedCities || data.targetExcludedCities || []),
        excludedRegions: (targeting && targeting.excludedRegions && targeting.excludedRegions.length > 0) ? targeting.excludedRegions : (data.excludedRegions || data.targetExcludedRegions || []),
        excludedCustomLocations: (targeting && targeting.excludedCustomLocations && targeting.excludedCustomLocations.length > 0) ? targeting.excludedCustomLocations : (data.excludedCustomLocations || []),
      };

      const results = {
        campaign: null,
        adSet: null,
        creative: null,
        ad: null,
        errors: []
      };

      if (!SUPPORTED_FULL_AD_CREATIVE_TYPES.has(creativeType)) {
        return {
          success: false,
          step: 'validation',
          error: `Creative type ${creativeType} is not supported yet. Please use image, video, carousel, or existing post.`,
          results
        };
      }

      if (!pageId) {
        return {
          success: false,
          step: 'validation',
          error: 'Facebook Page ID is required',
          results
        };
      }

      if (creativeType === 'EXISTING_POST') {
        if (!postId) {
          return {
            success: false,
            step: 'validation',
            error: 'Post ID is required when selecting an existing page post',
            results
          };
        }
      } else if (!primaryText || !linkUrl) {
        return {
          success: false,
          step: 'validation',
          error: 'Primary text and destination URL are required for new ads',
          results
        };
      }

      let finalImageHash = imageHash;
      let finalVideoId = videoId;
      let preparedCarouselCards = [];

      if (creativeType === 'SINGLE_IMAGE') {
        if (!finalImageHash && !imageUrl) {
          return {
            success: false,
            step: 'validation',
            error: 'Image URL or image hash is required for single-image ads',
            results
          };
        }

        if (imageUrl && !finalImageHash) {
          console.log('📦 Step 0a: Uploading Image before campaign creation...');
          const uploadResult = await this.uploadImage(imageUrl);
          if (!uploadResult.success) {
            return {
              success: false,
              step: 'imageUpload',
              error: uploadResult.error,
              results
            };
          }

          finalImageHash = uploadResult.hash;
          console.log('✅ Image uploaded:', finalImageHash);
        }
      }

      if (creativeType === 'SINGLE_VIDEO') {
        if (!finalVideoId && !videoUrl) {
          return {
            success: false,
            step: 'validation',
            error: 'Video URL or video ID is required for single-video ads',
            results
          };
        }

        if (videoUrl && !finalVideoId) {
          console.log('📦 Step 0b: Uploading Video before campaign creation...');
          const uploadResult = await this.uploadVideo(videoUrl, {
            name: adName || `${campaignName} - Video`,
            description
          });
          if (!uploadResult.success) {
            return {
              success: false,
              step: 'videoUpload',
              error: uploadResult.error,
              results
            };
          }

          finalVideoId = uploadResult.videoId;
          console.log('✅ Video uploaded:', finalVideoId);
        }
      }

      if (creativeType === 'CAROUSEL') {
        const candidateCards = (carouselCards || []).filter((card) => card);
        if (candidateCards.length < 2) {
          return {
            success: false,
            step: 'validation',
            error: 'Carousel ads require at least two cards',
            results
          };
        }

        for (const [index, card] of candidateCards.entries()) {
          if ((!card.imageHash && !card.imageUrl) || !card.headline || !card.linkUrl) {
            return {
              success: false,
              step: 'validation',
              error: `Carousel card ${index + 1} requires an image, headline, and destination URL`,
              results
            };
          }

          let cardImageHash = card.imageHash;
          if (!cardImageHash && card.imageUrl) {
            console.log(`📦 Step 0c: Uploading Carousel card ${index + 1} image...`);
            const uploadResult = await this.uploadImage(card.imageUrl);
            if (!uploadResult.success) {
              return {
                success: false,
                step: 'carouselImageUpload',
                error: uploadResult.error,
                results
              };
            }
            cardImageHash = uploadResult.hash;
          }

          preparedCarouselCards.push({
            ...card,
            imageHash: cardImageHash,
            linkUrl: card.linkUrl || linkUrl
          });
        }
      }

      let finalStoryImageHash = null;
      let finalStoryVideoId = null;

      if (data.customStoriesMedia) {
        if (data.storyImageUrl) {
          console.log('📦 Step 0d: Uploading Story/Reels Image...');
          const uploadResult = await this.uploadImage(data.storyImageUrl);
          if (uploadResult.success) {
            finalStoryImageHash = uploadResult.hash;
            console.log('✅ Story Image uploaded:', finalStoryImageHash);
          }
        }
        if (data.storyVideoUrl) {
          console.log('📦 Step 0e: Uploading Story/Reels Video...');
          const uploadResult = await this.uploadVideo(data.storyVideoUrl, {
            name: `${adName || campaignName} - Story/Reels 9:16`,
            description
          });
          if (uploadResult.success) {
            finalStoryVideoId = uploadResult.videoId;
            console.log('✅ Story Video uploaded:', finalStoryVideoId);
          }
        }
      }

      const effectiveBidStrategy =
        this.normalizeBidStrategyInput(bidStrategy) || 'LOWEST_COST';
      const normalizedObjective = this.normalizeObjective(objective);
      const supportsConversionOptimization = ['OUTCOME_SALES', 'OUTCOME_LEADS']
        .includes(normalizedObjective);
      const effectiveConversionEvent = supportsConversionOptimization
        ? conversionEvent
        : undefined;
      const effectivePixelId = supportsConversionOptimization
        ? pixelId
        : undefined;
      const effectiveAttributionWindow = this.resolveAttributionWindow({
        attributionWindow,
        optimizationGoal:
          effectiveConversionEvent && effectivePixelId
            ? 'OFFSITE_CONVERSIONS'
            : optimizationGoal
      });

      // ========================================
      // Step 1: Create Campaign
      // ========================================
      console.log('📦 Step 1: Creating Campaign...');
      
      const campaignData = {
        name: campaignName,
        objective,
        status,
        specialAdCategories,
        buyingType,
        bidStrategy: effectiveBidStrategy,
        bidValue,
        ...(data.isSplitTest && {
          isSplitTest: true,
          splitTestVariable: data.splitTestVariable || 'CREATIVE'
        })
      };

      // إذا كان CBO مفعل، أضف الميزانية على مستوى الحملة
      if (budgetOptimization) {
        campaignData.budgetOptimization = true;
        campaignData.budgetType = budgetType;
        campaignData.budgetAmount = budgetAmount;
      }

      if (spendLimit) {
        campaignData.spendLimit = spendLimit;
      }

      const campaignResult = await this.createCampaign(campaignData);
      
      if (!campaignResult.success) {
        console.error('❌ Campaign creation failed:', campaignResult.error);
        results.campaign = campaignResult;
        return {
          success: false,
          step: 'campaign',
          error: campaignResult.error,
          metaWriteUncertain: Boolean(campaignResult.metaWriteUncertain),
          results
        };
      }
      
      results.campaign = campaignResult;
      console.log('✅ Campaign created:', campaignResult.campaignId);

      // ========================================
      // Step 2: Create AdSet
      // ========================================
      console.log('📦 Step 2: Creating AdSet...');
      
      const adSetData = {
        name: adSetName || `${campaignName} - AdSet`,
        status,
        targeting: effectiveTargeting,
        optimizationGoal,
        billingEvent,
        placementType,
        placements,
        devicePlatforms,
        onlyWifi,
        
        // الميزات الجديدة
        performanceGoal: supportsConversionOptimization ? performanceGoal : undefined,
        conversionEvent: effectiveConversionEvent,
        conversionLocation: supportsConversionOptimization ? conversionLocation : undefined,
        attributionWindow: effectiveAttributionWindow,
        pixelId: effectivePixelId,
        bidStrategy: budgetOptimization ? undefined : effectiveBidStrategy,
        bidValue: budgetOptimization ? undefined : bidValue,
        frequencyCap,
        frequencyCapInterval,
        existingCustomerBudgetPercentage,
        inventoryFilter: data.inventoryFilter,
        adSchedulingEnabled: data.adSchedulingEnabled,
        adScheduleDays: data.adScheduleDays,
        adScheduleStartHour: data.adScheduleStartHour,
        adScheduleEndHour: data.adScheduleEndHour,
        adSetSpendLimitsEnabled: data.adSetSpendLimitsEnabled,
        adSetMinDailySpend: data.adSetMinDailySpend,
        adSetMaxDailySpend: data.adSetMaxDailySpend
      };

      // إذا لم يكن CBO مفعل، أضف الميزانية على مستوى AdSet
      if (!budgetOptimization) {
        adSetData.budgetType = budgetType;
        adSetData.budgetAmount = budgetAmount;
      }

      // إضافة الجدولة
      if (startTime) adSetData.startTime = startTime;
      if (endTime) adSetData.endTime = endTime;

      const adSetResult = await this.createAdSet(campaignResult.campaignId, adSetData);
      
      if (!adSetResult.success) {
        console.error('❌ AdSet creation failed:', adSetResult.error);
        results.errors.push({ step: 'adSet', error: adSetResult.error });
        
        // محاولة حذف الحملة التي تم إنشاؤها
        console.log('🗑️ Rolling back: Deleting campaign...');
        await this.deleteCampaign(campaignResult.campaignId);
        
        return {
          success: false,
          step: 'adSet',
          error: adSetResult.error,
          results
        };
      }
      
      results.adSet = adSetResult;
      console.log('✅ AdSet created:', adSetResult.adSetId);

      // ========================================
      // Step 3: Media was validated/uploaded before campaign creation
      // ========================================

      // ========================================
      // Step 4: Create Ad (includes Creative)
      // ========================================
      console.log('📦 Step 4: Creating Ad...');
      
      const adCreativeData = {
        name: adName || `${campaignName} - Ad`,
        status,
        pageId,
        instagramActorId: data.instagramActorId,
        multiAdvertiserAds: data.multiAdvertiserAds !== false,
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl,
        displayLink,
        urlParameters,
        imageHash: finalImageHash,
        videoId: finalVideoId,
        customStoriesMedia: data.customStoriesMedia,
        storyImageHash: finalStoryImageHash,
        storyVideoId: finalStoryVideoId,
        carouselCards: preparedCarouselCards,
        postId,
        textVariations,
        headlineVariations,
        whatsappGreeting,
        whatsappQuickFaqs,
        // Advantage+ Creative (v26.0)
        advantageCreative,
        textGeneration,
        imageEnhancement,
        musicEnhancement,
        imageTemplates,
        videoHighlight,
        textOptimizations,
        expandImage,
        visualTouchups,
        relevantComments,
        priceOverlay
      };

      const adResult = await this.createAd(adSetResult.adSetId, adCreativeData);
      
      if (!adResult.success) {
        console.error('❌ Ad creation failed:', adResult.error);
        results.errors.push({ step: 'ad', error: adResult.error });
        
        // لا نحذف Campaign و AdSet لأنهم قد يكونوا مفيدين
        // المستخدم يمكنه إضافة Ad لاحقاً
        
        return {
          success: false,
          step: 'ad',
          error: adResult.error,
          results,
          partialSuccess: true, // Campaign و AdSet تم إنشاؤهم بنجاح
          message: 'Campaign and AdSet created successfully, but Ad creation failed. You can add an Ad manually.'
        };
      }
      
      results.ad = adResult;
      results.creative = { creativeId: adResult.creativeId };
      console.log('✅ Ad created:', adResult.adId);

      // ========================================
      // Success!
      // ========================================
      console.log('🎉 Full Ad Creation Complete!');
      
      return {
        success: true,
        campaignId: campaignResult.campaignId,
        adSetId: adSetResult.adSetId,
        adId: adResult.adId,
        creativeId: adResult.creativeId,
        imageHash: finalImageHash,
        videoId: finalVideoId,
        storyImageHash: finalStoryImageHash,
        storyVideoId: finalStoryVideoId,
        carouselCards: preparedCarouselCards,
        results,
        message: 'Full ad created successfully!'
      };

    } catch (error) {
      console.error('❌ Error in createFullAd:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        step: 'unknown'
      };
    }
  }

  /**
   * ============================================
   * Creative Media Upload Methods
   * ============================================
   */

  /**
   * رفع صورة إلى Facebook
   */
  async uploadImage(imageUrl) {
    try {
      let buffer = null;
      let contentType = 'image/jpeg';

      // 1. If image is in local uploads folder (standard store products), read directly from disk
      if (typeof imageUrl === 'string') {
        try {
          const urlObj = imageUrl.startsWith('http') ? new URL(imageUrl) : null;
          const relativePath = urlObj ? urlObj.pathname : imageUrl;
          if (relativePath.includes('/uploads/')) {
            const diskSubPath = relativePath.slice(relativePath.indexOf('/uploads/') + 1);
            const possibleDiskPaths = [
              path.resolve(process.cwd(), diskSubPath),
              path.resolve(__dirname, '..', diskSubPath),
              path.resolve('/var/www/backend2', diskSubPath),
            ];
            for (const p of possibleDiskPaths) {
              if (fs.existsSync(p)) {
                buffer = fs.readFileSync(p);
                const ext = path.extname(p).toLowerCase();
                if (ext === '.png') contentType = 'image/png';
                else if (ext === '.webp') contentType = 'image/webp';
                else contentType = 'image/jpeg';
                break;
              }
            }
          }
        } catch (localReadErr) {
          // ignore and fall back to network fetch
        }
      }

      // 2. Otherwise download over network
      if (!buffer) {
        let imageResponse;
        try {
          imageResponse = await fetchSafeRemoteMedia(imageUrl, {
            label: 'Image',
            responseType: 'arraybuffer',
            maxBytes: MAX_REMOTE_AD_IMAGE_BYTES
          });
        } catch (fetchErr) {
          // Resilient fallback with axios ignoring internal loopback TLS issues
          imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          });
        }

        buffer = Buffer.from(imageResponse.data);
        contentType = imageResponse.headers?.['content-type'] || 'image/jpeg';
      }

      if (!contentType.startsWith('image/') || buffer.length < 64) {
        return {
          success: false,
          error: 'Image URL did not return a valid image file',
          data: {
            contentType,
            fileSize: buffer.length
          }
        };
      }

      if (buffer.length > MAX_REMOTE_AD_IMAGE_BYTES) {
        return {
          success: false,
          error: 'Remote image is larger than the allowed upload limit',
          data: {
            contentType,
            fileSize: buffer.length
          }
        };
      }

      // Meta adimages endpoint only supports JPEG, PNG, GIF, BMP (not WebP).
      // If the incoming image is WebP or another format, convert it to JPEG via sharp.
      if (
        contentType.includes('webp') ||
        (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('gif'))
      ) {
        try {
          const sharp = require('sharp');
          buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
          contentType = 'image/jpeg';
        } catch (sharpError) {
          console.warn('⚠️ Could not convert webp/unsupported image to jpeg via sharp:', sharpError.message);
        }
      }

      const extension = contentType.includes('png')
        ? 'png'
        : 'jpg';

      // Meta AdImages expects a file upload field. Sending the binary buffer
      // through the `bytes` field can be interpreted as an invalid tiny file.
      const formData = new FormData();
      formData.append('filename', buffer, {
        filename: `ad-image.${extension}`,
        contentType
      });
      formData.append('access_token', this.accessToken);

      const uploadResponse = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/adimages`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      const imagesPayload = uploadResponse.data.images;
      const firstImage = Array.isArray(imagesPayload)
        ? imagesPayload[0]
        : Object.values(imagesPayload || {})[0];
      const hash = firstImage?.hash;

      if (!hash) {
        return {
          success: false,
          error: 'Facebook did not return an image hash after upload',
          data: uploadResponse.data
        };
      }
      
      return {
        success: true,
        hash: hash,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading image to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع صورة موجودة بالفعل في الذاكرة إلى Meta.
   */
  async uploadImageBuffer(buffer, imageData = {}) {
    try {
      let fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
      let contentType = imageData.contentType || 'image/jpeg';

      if (!contentType.startsWith('image/') || fileBuffer.length < 64) {
        return {
          success: false,
          error: 'Uploaded file is not a valid image',
          data: {
            contentType,
            fileSize: fileBuffer.length
          }
        };
      }

      // Meta adimages endpoint only supports JPEG, PNG, GIF, BMP (not WebP).
      if (
        contentType.includes('webp') ||
        (!contentType.includes('jpeg') && !contentType.includes('jpg') && !contentType.includes('png') && !contentType.includes('gif'))
      ) {
        try {
          const sharp = require('sharp');
          fileBuffer = await sharp(fileBuffer).jpeg({ quality: 90 }).toBuffer();
          contentType = 'image/jpeg';
        } catch (sharpError) {
          console.warn('⚠️ Could not convert webp/unsupported image buffer to jpeg via sharp:', sharpError.message);
        }
      }

      const extension = contentType.includes('png') ? 'png' : 'jpg';
      const filename = imageData.filename || `ad-image.${extension}`;
      const formData = new FormData();
      formData.append('filename', fileBuffer, {
        filename,
        contentType
      });
      formData.append('access_token', this.accessToken);

      const uploadResponse = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/adimages`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      const imagesPayload = uploadResponse.data.images;
      const firstImage = Array.isArray(imagesPayload)
        ? imagesPayload[0]
        : Object.values(imagesPayload || {})[0];
      const hash = firstImage?.hash;

      if (!hash) {
        return {
          success: false,
          error: 'Facebook did not return an image hash after upload',
          data: uploadResponse.data
        };
      }

      return {
        success: true,
        hash,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading image buffer to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع فيديو إلى Facebook
   */
  async uploadVideo(videoUrl, videoData = {}) {
    try {
      let videoStream = null;
      let videoFileName = videoData.filename || `${videoData.name || "video"}.mp4`;
      let videoContentType = videoData.contentType || "video/mp4";

      // 1. If video is in local uploads folder, stream directly from disk
      if (typeof videoUrl === "string") {
        try {
          const urlObj = videoUrl.startsWith("http") ? new URL(videoUrl) : null;
          const relativePath = urlObj ? urlObj.pathname : videoUrl;
          if (relativePath.includes("/uploads/")) {
            const diskSubPath = relativePath.slice(
              relativePath.indexOf("/uploads/") + 1,
            );
            const possibleDiskPaths = [
              path.resolve(process.cwd(), diskSubPath),
              path.resolve(__dirname, "..", diskSubPath),
              path.resolve(__dirname, "../..", diskSubPath),
              path.resolve("/var/www/backend2", diskSubPath),
            ];
            for (const p of possibleDiskPaths) {
              if (fs.existsSync(p)) {
                videoStream = fs.createReadStream(p);
                videoFileName = path.basename(p);
                const ext = path.extname(p).toLowerCase();
                if (ext === ".mov") videoContentType = "video/quicktime";
                else if (ext === ".webm") videoContentType = "video/webm";
                else videoContentType = "video/mp4";
                break;
              }
            }
          }
        } catch (localReadErr) {
          // ignore and fall back to network fetch
        }
      }

      // 2. Otherwise download over network
      if (!videoStream) {
        const videoResponse = await fetchSafeRemoteMedia(videoUrl, {
          label: "Video",
          responseType: "stream",
          maxBytes: MAX_REMOTE_AD_VIDEO_BYTES,
        });
        videoStream = videoResponse.data;
      }

      const formData = new FormData();
      formData.append("name", videoData.name || "Video Ad");
      formData.append("video_file_chunk", videoStream, {
        filename: videoFileName,
        contentType: videoContentType,
      });
      formData.append("access_token", this.accessToken);

      if (videoData.description) {
        formData.append('description', videoData.description);
      }

      const uploadResponse = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/advideos`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          maxContentLength: MAX_REMOTE_AD_VIDEO_BYTES,
          maxBodyLength: MAX_REMOTE_AD_VIDEO_BYTES,
          timeout: 60000
        }
      );

      return {
        success: true,
        videoId: uploadResponse.data.id,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading video to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع فيديو موجود بالفعل في الذاكرة إلى Meta.
   */
  async uploadVideoBuffer(buffer, videoData = {}) {
    try {
      const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);

      if (fileBuffer.length < 64) {
        return {
          success: false,
          error: 'Uploaded file is not a valid video',
          data: {
            fileSize: fileBuffer.length
          }
        };
      }

      const formData = new FormData();
      formData.append('name', videoData.name || 'Video Ad');
      formData.append('video_file_chunk', fileBuffer, {
        filename: videoData.filename || 'video.mp4',
        contentType: videoData.contentType || 'video/mp4'
      });
      formData.append('access_token', this.accessToken);

      if (videoData.description) {
        formData.append('description', videoData.description);
      }

      const uploadResponse = await axios.post(
        `${this.baseUrl}/${this.getAccountId()}/advideos`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return {
        success: true,
        videoId: uploadResponse.data.id,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading video buffer to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع عدة صور (لـ Carousel Ads)
   */
  async uploadMultipleImages(imageUrls) {
    try {
      const uploadPromises = imageUrls.map(url => this.uploadImage(url));
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: failed.length === 0,
        hashes: successful.map(r => r.hash),
        failed: failed.length,
        results: results
      };
    } catch (error) {
      console.error('❌ Error uploading multiple images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * إنشاء Carousel Creative
   */
  async createCarouselCreative(data) {
    try {
      const {
        pageId,
        name,
        images, // Array of {imageHash, link}
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl
      } = data;

      if (!pageId || !images || images.length === 0) {
        throw new Error('Page ID and images are required');
      }

      const creativeData = {
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: linkUrl,
            message: primaryText,
            name: headline,
            description: description,
            call_to_action: {
              type: callToAction || 'LEARN_MORE'
            },
            child_attachments: images.map(img => ({
              link: img.link || linkUrl,
              image_hash: img.imageHash,
              name: img.headline || headline,
              description: img.description || description
            }))
          }
        }
      };

      const accountId = this.adAccountId?.startsWith('act_') 
        ? this.adAccountId 
        : `act_${this.adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating carousel creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Insights Methods
   * ============================================
   */

  /**
   * جلب إحصائيات إعلان
   */
  async getInsights(adId, dateRange = null, breakdowns = []) {
    try {
      const params = {
        access_token: this.accessToken,
        fields: [
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'action_values',
          'purchase_roas',
          'inline_link_clicks',
          'cost_per_inline_link_click'
        ].join(',')
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      }

      // إضافة Breakdowns إذا كانت موجودة
      if (breakdowns && breakdowns.length > 0) {
        params.breakdowns = breakdowns.join(',');
      }

      const response = await axios.get(
        `${this.baseUrl}/${adId}/insights`,
        { params }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook insights:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب ملخص أداء الحملات من حساب الإعلانات دفعة واحدة
   */
  async getCampaignInsightsSummary(adAccountId = null, dateRange = null, options = {}) {
    try {
      const accountId = adAccountId || this.getAccountId();

      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const params = {
        access_token: this.accessToken,
        level: options?.level || 'campaign',
        fields: [
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'action_values',
          'purchase_roas',
          'inline_link_clicks',
          'cost_per_inline_link_click'
        ].join(','),
        limit: 100
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      }

      // اختياري (backwards-compatible): تفصيل زمني مخصص، مثل time_increment=1 لسحب
      // إنفاق Agency OS يومًا بيوم. الافتراضي بدون time_increment = نفس السلوك القديم.
      const timeIncrement = options?.timeIncrement;
      if (timeIncrement !== undefined && timeIncrement !== null) {
        params.time_increment = timeIncrement;
        if (!params.fields.split(',').includes('date_start')) {
          params.fields = `date_start,date_stop,${params.fields}`;
        }
      }

      let nextUrl = `${this.baseUrl}/${normalizedAccountId}/insights`;
      let requestParams = params;
      let paging = null;
      const data = [];

      let pageCount = 0;
      const MAX_PAGES = 5;
      do {
        const response = await axios.get(nextUrl, {
          params: requestParams,
          timeout: 15000,
        });
        data.push(...(response.data.data || []));
        paging = response.data.paging || null;
        nextUrl = paging?.next || null;
        requestParams = undefined;
        pageCount++;
      } while (nextUrl && pageCount < MAX_PAGES);

      if (nextUrl) {
        console.warn('⚠️ [FacebookAdsService] Campaign insights pagination truncated at', MAX_PAGES, 'pages');
      }

      return {
        success: true,
        data,
        paging
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaign insights summary:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب أداء الحساب الإعلاني مقسماً جغرافياً
   */
  async getGeoPerformanceBreakdown(adAccountId = null, dateRange = null, breakdown = 'region') {
    try {
      const accountId = adAccountId || this.getAccountId();
      const normalizedBreakdown = ['country', 'region'].includes(breakdown)
        ? breakdown
        : 'region';

      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const params = {
        access_token: this.accessToken,
        level: 'campaign',
        fields: [
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'cpm',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'action_values',
          'purchase_roas',
          'inline_link_clicks',
          'cost_per_inline_link_click'
        ].join(','),
        breakdowns: normalizedBreakdown,
        limit: 500
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      } else {
        params.date_preset = 'last_30d';
      }

      const result = await this.fetchPagedData(
        `${this.baseUrl}/${normalizedAccountId}/insights`,
        params
      );

      return {
        success: true,
        data: result.data,
        paging: result.paging,
        breakdown: normalizedBreakdown
      };
    } catch (error) {
      console.error('❌ Error getting Facebook geo performance breakdown:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب أداء الحساب الإعلاني مقسماً لأبعاد قرار إعلامي.
   * Meta Insights يعيد الصفوف على مستوى الحملة حتى نقدر نحدد المشكلة لكل حملة.
   */
  async getPerformanceBreakdown(adAccountId = null, dateRange = null, breakdown = 'age_gender') {
    try {
      const accountId = adAccountId || this.getAccountId();
      const breakdownMap = {
        age_gender: ['age', 'gender'],
        placement: ['publisher_platform', 'platform_position'],
        platform: ['publisher_platform'],
        device: ['device_platform'],
        country: ['country'],
        region: ['region']
      };
      const normalizedBreakdown = breakdownMap[breakdown] ? breakdown : 'age_gender';

      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const normalizedAccountId = accountId.startsWith('act_')
        ? accountId
        : `act_${accountId}`;

      const params = {
        access_token: this.accessToken,
        level: 'campaign',
        fields: [
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'cpm',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'action_values',
          'purchase_roas',
          'inline_link_clicks',
          'cost_per_inline_link_click'
        ].join(','),
        breakdowns: breakdownMap[normalizedBreakdown].join(','),
        limit: 500
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      } else {
        params.date_preset = 'last_30d';
      }

      const result = await this.fetchPagedData(
        `${this.baseUrl}/${normalizedAccountId}/insights`,
        params
      );

      return {
        success: true,
        data: result.data,
        paging: result.paging,
        breakdown: normalizedBreakdown,
        dimensions: breakdownMap[normalizedBreakdown]
      };
    } catch (error) {
      console.error('❌ Error getting Facebook performance breakdown:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Insights مع Breakdown مفصل
   */
  async getInsightsWithBreakdown(adId, breakdownType, dateRange = null) {
    try {
      // Breakdown types: age, gender, placement, device_type, country, etc.
      const breakdowns = [breakdownType];
      return await this.getInsights(adId, dateRange, breakdowns);
    } catch (error) {
      console.error('❌ Error getting insights with breakdown:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ============================================
   * Helper Methods
   * ============================================
   */

  /**
   * التحقق من صحة Access Token
   */
  async validateAccessToken() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        userId: response.data.id,
        name: response.data.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب حسابات إنستغرام المرتبطة بـ Ad Account
   */
  async getInstagramAccounts(adAccountId = null) {
    try {
      const accountId = adAccountId || this.adAccountId;
      if (!accountId) {
        throw new Error("Ad Account ID is required");
      }
      const normalizedAccountId = accountId.startsWith("act_")
        ? accountId
        : `act_${accountId}`;

      const response = await axios.get(
        `${this.baseUrl}/${normalizedAccountId}/instagram_accounts`,
        {
          params: {
            access_token: this.accessToken,
            fields: "id,username,profile_pic,name",
            limit: 50,
          },
          timeout: 15000,
        },
      );

      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error) {
      console.error(
        "❌ Error getting Instagram accounts:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: [],
      };
    }
  }

  /**
   * جلب Ad Accounts المتاحة
   */
  async getAdAccounts() {
    try {
      let response;
      const richAccountFields = [
        'id',
        'name',
        'account_id',
        'account_status',
        'currency',
        'timezone_name',
        'business',
        'funding_source',
        'funding_source_details',
        'amount_spent',
        'balance',
        'spend_cap',
        'disable_reason'
      ].join(',');
      const minimalAccountFields = [
        'id',
        'name',
        'account_id',
        'account_status',
        'currency',
        'timezone_name',
        'amount_spent',
        'balance',
        'spend_cap'
      ].join(',');

      try {
        response = await axios.get(
          `${this.baseUrl}/me/adaccounts`,
          {
            params: {
              access_token: this.accessToken,
              fields: richAccountFields,
              limit: 100
            }
          }
        );
      } catch (error) {
        const graphMessage = error.response?.data?.error?.message || "";
        const needsMinimalFallback =
          /Requires business_management permission/i.test(graphMessage) ||
          /Missing Permission/i.test(graphMessage);

        if (!needsMinimalFallback) {
          throw error;
        }

        response = await axios.get(
          `${this.baseUrl}/me/adaccounts`,
          {
            params: {
              access_token: this.accessToken,
              // Some ads-only tokens can list accessible accounts but cannot
              // read Business Manager specific fields such as `business`.
              fields: minimalAccountFields,
              limit: 100
            }
          }
        );
      }

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Ad Accounts:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب بيانات حساب إعلاني محدد مباشرة من Meta
   */
  async getAdAccount(adAccountId) {
    try {
      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }
      const normalizedAccountId = adAccountId.startsWith('act_')
        ? adAccountId
        : `act_${adAccountId}`;

      const fields = [
        'id',
        'name',
        'account_id',
        'account_status',
        'currency',
        'timezone_name',
        'amount_spent',
        'balance',
        'spend_cap'
      ].join(',');

      const response = await axios.get(
        `${this.baseUrl}/${normalizedAccountId}`,
        {
          params: {
            access_token: this.accessToken,
            fields
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting single Ad Account from Meta:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v25.0 Features: Custom Audiences
   * ============================================
   */

  /**
   * إنشاء Custom Audience من قائمة عملاء
   */
  async createCustomAudience(data) {
    try {
      const {
        name,
        description,
        subtype = 'CUSTOM', // CUSTOM, WEBSITE, APP, OFFLINE_CONVERSION, ENGAGEMENT
        customerFileSource = 'USER_PROVIDED_ONLY'
      } = data;

      const accountId = this.getAccountId();

      const audienceData = {
        name,
        description,
        subtype,
        customer_file_source: customerFileSource
      };

      console.log('📤 Creating Custom Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Custom Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Custom Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إضافة مستخدمين لـ Custom Audience
   */
  async addUsersToCustomAudience(audienceId, users) {
    try {
      // users: array of { email, phone, firstName, lastName, etc. }
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN'];
      const data = users.map(user => [
        user.email ? this.hashValue(user.email.toLowerCase()) : '',
        user.phone ? this.hashValue(user.phone) : '',
        user.firstName ? this.hashValue(user.firstName.toLowerCase()) : '',
        user.lastName ? this.hashValue(user.lastName.toLowerCase()) : ''
      ]);

      const payload = {
        payload: {
          schema,
          data
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/${audienceId}/users`,
        payload,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error adding users to Custom Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Lookalike Audience
   */
  async createLookalikeAudience(data) {
    try {
      const {
        name,
        sourceAudienceId, // Custom Audience ID to base lookalike on
        country, // Target country code
        ratio = 0.01 // 1% = 0.01, 10% = 0.10
      } = data;

      const accountId = this.getAccountId();

      const audienceData = {
        name,
        subtype: 'LOOKALIKE',
        origin_audience_id: sourceAudienceId,
        lookalike_spec: JSON.stringify({
          type: 'similarity',
          country,
          ratio
        })
      };

      console.log('📤 Creating Lookalike Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Lookalike Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Lookalike Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Custom Audiences
   */
  async getCustomAudiences() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,delivery_status,operation_status',
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Custom Audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: A/B Testing
   * ============================================
   */

  /**
   * إنشاء A/B Test (Ad Study)
   */
  async createABTest(data) {
    try {
      const {
        name,
        description,
        startTime,
        endTime,
        type = 'SPLIT_TEST', // SPLIT_TEST, HOLDOUT
        objectiveType = 'CONVERSIONS',
        cells // Array of { name, campaignId } or { name, adSetId }
      } = data;

      const accountId = this.getAccountId();

      const studyData = {
        name,
        description,
        start_time: startTime,
        end_time: endTime,
        type,
        cells: cells.map(cell => ({
          name: cell.name,
          treatment_percentage: cell.percentage || Math.floor(100 / cells.length),
          adsets: cell.adSetId ? [cell.adSetId] : undefined,
          campaigns: cell.campaignId ? [cell.campaignId] : undefined
        }))
      };

      console.log('📤 Creating A/B Test:', JSON.stringify(studyData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/ad_studies`,
        studyData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ A/B Test created:', response.data.id);

      return {
        success: true,
        studyId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating A/B Test:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب نتائج A/B Test
   */
  async getABTestResults(studyId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${studyId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,start_time,end_time,type,cells{id,name,treatment_percentage,adsets,campaigns},results'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting A/B Test results:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: Lead Generation
   * ============================================
   */

  /**
   * إنشاء Lead Form
   */
  async createLeadForm(pageId, data) {
    try {
      const {
        name,
        questions, // Array of { type, key, label }
        privacyPolicyUrl,
        thankYouPage = {},
        followUpActionUrl
      } = data;

      const formData = {
        name,
        questions: questions.map(q => ({
          type: q.type || 'CUSTOM',
          key: q.key,
          label: q.label
        })),
        privacy_policy: {
          url: privacyPolicyUrl
        },
        thank_you_page: {
          title: thankYouPage.title || 'شكراً لك!',
          body: thankYouPage.body || 'سنتواصل معك قريباً',
          button_text: thankYouPage.buttonText || 'زيارة الموقع',
          button_type: thankYouPage.buttonType || 'VIEW_WEBSITE',
          website_url: thankYouPage.websiteUrl || followUpActionUrl
        }
      };

      console.log('📤 Creating Lead Form:', JSON.stringify(formData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pageId}/leadgen_forms`,
        formData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Lead Form created:', response.data.id);

      return {
        success: true,
        formId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Lead Form:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Leads من Form
   */
  async getLeads(formId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${formId}/leads`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name',
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Leads:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: Conversion API (CAPI)
   * ============================================
   */

  /**
   * إرسال Conversion Event عبر CAPI
   */
  async sendConversionEvent(pixelId, eventData) {
    try {
      const {
        eventName, // Purchase, Lead, AddToCart, etc.
        eventId,
        eventTime = Math.floor(Date.now() / 1000),
        testEventCode,
        eventSourceUrl,
        userData = {},
        customData = {},
        actionSource = 'website' // website, app, phone_call, chat, etc.
      } = eventData;

      const event = {
        event_name: eventName,
        event_id: eventId,
        event_time: eventTime,
        event_source_url: eventSourceUrl,
        action_source: actionSource,
        user_data: {
          em: userData.email ? [this.hashValue(userData.email.trim().toLowerCase())] : undefined,
          ph: userData.phone ? [this.hashValue(this.normalizePhoneE164(userData.phone, userData.country || 'EG'))] : undefined,
          fn: userData.firstName ? [this.hashValue(userData.firstName.trim().toLowerCase())] : undefined,
          ln: userData.lastName ? [this.hashValue(userData.lastName.trim().toLowerCase())] : undefined,
          ct: userData.city ? [this.hashValue(userData.city.trim().toLowerCase())] : undefined,
          st: userData.state ? [this.hashValue(userData.state.trim().toLowerCase())] : undefined,
          zp: userData.zipCode ? [this.hashValue(userData.zipCode.trim().toLowerCase())] : undefined,
          country: userData.country ? [this.hashValue(userData.country.trim().toLowerCase())] : undefined,
          external_id: userData.externalId ? [this.hashValue(userData.externalId.toString().trim())] : undefined,
          client_ip_address: userData.ipAddress,
          client_user_agent: userData.userAgent,
          fbc: userData.fbc, // Facebook Click ID
          fbp: userData.fbp  // Facebook Browser ID
        },
        custom_data: {
          value: customData.value,
          currency: customData.currency || 'EGP',
          content_ids: customData.contentIds,
          content_type: customData.contentType,
          content_name: customData.contentName,
          content_category: customData.contentCategory,
          num_items: customData.numItems,
          order_id: customData.orderId
        }
      };

      // إزالة القيم الفارغة
      Object.keys(event.user_data).forEach(key => {
        if (!event.user_data[key]) delete event.user_data[key];
      });
      Object.keys(event.custom_data).forEach(key => {
        if (event.custom_data[key] === undefined) delete event.custom_data[key];
      });

      if (!event.event_id) {
        delete event.event_id;
      }

      const payload = {
        data: [event]
      };
      if (testEventCode) {
        payload.test_event_code = testEventCode;
      }

      console.log('📤 Sending Conversion Event (CAPI):', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pixelId}/events`,
        payload,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Conversion Event sent:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error sending Conversion Event:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * تطبيع أرقام الهواتف بمعيار E.164 لرفع جودة مطابقة أحداث Meta (Event Match Quality - EMQ)
   */
  normalizePhoneE164(phone, defaultCountry = 'EG') {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/[^0-9+]/g, '');
    if (!cleaned) return null;

    // إزالة علامة + للاحتفاظ بالأرقام فقط
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // إزالة الأصفار البادئة إن وجدت
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    // تطبيع الأرقام المحلية حسب الدولة
    const country = (defaultCountry || 'EG').toUpperCase();
    if (country === 'EG') {
      if (cleaned.startsWith('01') && cleaned.length === 11) {
        cleaned = '2' + cleaned;
      } else if (cleaned.startsWith('1') && cleaned.length === 10) {
        cleaned = '20' + cleaned;
      }
    } else if (country === 'SA' || country === 'KSA') {
      if (cleaned.startsWith('05') && cleaned.length === 10) {
        cleaned = '966' + cleaned.substring(1);
      } else if (cleaned.startsWith('5') && cleaned.length === 9) {
        cleaned = '966' + cleaned;
      }
    } else if (country === 'AE' || country === 'UAE') {
      if (cleaned.startsWith('05') && cleaned.length === 10) {
        cleaned = '971' + cleaned.substring(1);
      } else if (cleaned.startsWith('5') && cleaned.length === 9) {
        cleaned = '971' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Hash value for CAPI (SHA256)
   */
  hashValue(value) {
    if (!value) return null;
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value.toString()).digest('hex');
  }

  /**
   * ============================================
   * v22.0: Ad Scheduling
   * ============================================
   */

  /**
   * تحديث Ad Set مع جدولة
   */
  async updateAdSetSchedule(adSetId, schedule) {
    try {
      // schedule: array of { days: [0-6], start_minute, end_minute, timezone_type }
      // days: 0 = Sunday, 6 = Saturday
      const scheduleData = {
        pacing_type: ['day_parting'],
        adset_schedule: schedule.map(s => ({
          days: s.days,
          start_minute: s.startMinute || 0,
          end_minute: s.endMinute || 1440, // 24 hours = 1440 minutes
          timezone_type: s.timezoneType || 'USER'
        }))
      };

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        scheduleData,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Ad Set schedule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Dynamic Creative Optimization (DCO)
   * ============================================
   */

  /**
   * إنشاء Dynamic Creative
   * يجمع عناصر إبداعية متعددة ويختبرها تلقائياً
   */
  async createDynamicCreative(data) {
    try {
      const {
        pageId,
        name,
        // Multiple assets
        images = [], // Array of image hashes
        videos = [], // Array of video IDs
        titles = [], // Array of headlines
        bodies = [], // Array of primary texts
        descriptions = [], // Array of descriptions
        callToActions = [], // Array of CTAs
        linkUrls = [], // Array of URLs
        // Settings
        optimizeCreativeForEachPerson = true
      } = data;

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      const accountId = this.getAccountId();

      // Build asset feed spec
      const assetFeedSpec = {
        optimization_type: 'DEGREES_OF_FREEDOM',
        images: images.map(hash => ({ hash })),
        videos: videos.map(id => ({ video_id: id })),
        titles: titles.map(text => ({ text })),
        bodies: bodies.map(text => ({ text })),
        descriptions: descriptions.map(text => ({ text })),
        call_to_action_types: callToActions.length > 0 ? callToActions : ['LEARN_MORE'],
        link_urls: linkUrls.map(url => ({ website_url: url })),
        ad_formats: ['SINGLE_IMAGE', 'SINGLE_VIDEO', 'CAROUSEL']
      };

      // Remove empty arrays
      Object.keys(assetFeedSpec).forEach(key => {
        if (Array.isArray(assetFeedSpec[key]) && assetFeedSpec[key].length === 0) {
          delete assetFeedSpec[key];
        }
      });

      const creativeData = {
        name: name || 'Dynamic Creative',
        object_story_spec: {
          page_id: pageId
        },
        asset_feed_spec: assetFeedSpec,
        degrees_of_freedom_spec: {
          creative_features_spec: {
            standard_enhancements: {
              enroll_status: optimizeCreativeForEachPerson ? 'OPT_IN' : 'OPT_OUT'
            }
          }
        }
      };

      console.log('📤 Creating Dynamic Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Dynamic Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Dynamic Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advantage+ Shopping Campaigns
   * ============================================
   */

  /**
   * إنشاء Advantage+ Shopping Campaign
   */
  async createAdvantagePlusShoppingCampaign(data) {
    try {
      const {
        name,
        status = 'PAUSED',
        budgetType = 'DAILY',
        budgetAmount,
        catalogId,
        pixelId,
        countryTargeting = [],
        existingCustomerBudgetPercentage = 0
      } = data;

      const accountId = this.getAccountId();

      // v25 no longer allows creating/updating legacy ASC/AAC campaign APIs.
      // Create an automation-first Sales campaign and keep Advantage audience
      // automation at ad set level instead of sending legacy ASC fields.
      const campaignData = {
        name,
        objective: 'OUTCOME_SALES',
        status,
        special_ad_categories: [],
        buying_type: 'AUCTION'
      };

      // Add budget
      if (budgetType === 'DAILY') {
        campaignData.daily_budget = Math.round(budgetAmount * 100);
      } else {
        campaignData.lifetime_budget = Math.round(budgetAmount * 100);
      }

      console.log('📤 Creating Advantage+ Shopping Campaign:', JSON.stringify(campaignData, null, 2));

      const campaignResponse = await axios.post(
        `${this.baseUrl}/${accountId}/campaigns`,
        campaignData,
        { params: { access_token: this.accessToken } }
      );

      const campaignId = campaignResponse.data.id;
      console.log('✅ Advantage+ Shopping Campaign created:', campaignId);

      // Create Ad Set with Advantage+ settings
      const adSetData = {
        name: `${name} - Ad Set`,
        campaign_id: campaignId,
        status,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        promoted_object: {
          pixel_id: pixelId,
          custom_event_type: 'PURCHASE'
        },
        targeting: {
          geo_locations: {
            countries: countryTargeting.length > 0 ? countryTargeting : ['EG']
          },
          targeting_automation: {
            advantage_audience: 1
          }
        }
      };

      if (catalogId) {
        adSetData.promoted_object.product_catalog_id = catalogId;
      }

      const adSetResponse = await axios.post(
        `${this.baseUrl}/${accountId}/adsets`,
        adSetData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Advantage+ Ad Set created:', adSetResponse.data.id);

      return {
        success: true,
        campaignId,
        adSetId: adSetResponse.data.id,
        migrationNotice: existingCustomerBudgetPercentage > 0
          ? 'Meta Marketing API v25 blocks legacy ASC/AAC ECBC creation. Existing customer budget caps were not sent; recreate ECBC campaigns in Ads Manager if needed.'
          : null,
        data: {
          campaign: campaignResponse.data,
          adSet: adSetResponse.data
        }
      };
    } catch (error) {
      console.error('❌ Error creating Advantage+ Shopping Campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advanced Reporting (Async Reports)
   * ============================================
   */

  /**
   * إنشاء Async Report
   */
  async createAsyncReport(data) {
    try {
      const {
        level = 'ad', // account, campaign, adset, ad
        fields = [],
        datePreset = 'last_30d',
        timeRange,
        breakdowns = [],
        filtering = [],
        sorting = []
      } = data;

      const accountId = this.getAccountId();

      const defaultFields = [
        'campaign_id', 'campaign_name',
        'adset_id', 'adset_name',
        'ad_id', 'ad_name',
        'impressions', 'clicks', 'spend',
        'ctr', 'cpc', 'cpm',
        'reach', 'frequency',
        'actions', 'conversions',
        'cost_per_action_type'
      ];

      const reportParams = {
        level,
        fields: fields.length > 0 ? fields : defaultFields,
        breakdowns: breakdowns.length > 0 ? breakdowns : undefined,
        filtering: filtering.length > 0 ? filtering : undefined,
        sorting: sorting.length > 0 ? sorting : undefined
      };

      if (timeRange) {
        reportParams.time_range = timeRange;
      } else {
        reportParams.date_preset = datePreset;
      }

      console.log('📤 Creating Async Report:', JSON.stringify(reportParams, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/insights`,
        reportParams,
        { 
          params: { 
            access_token: this.accessToken,
            // Request async report
            is_async: true
          } 
        }
      );

      console.log('✅ Async Report created:', response.data.report_run_id);

      return {
        success: true,
        reportRunId: response.data.report_run_id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Async Report:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب حالة Async Report
   */
  async getAsyncReportStatus(reportRunId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${reportRunId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,account_id,async_status,async_percent_completion,date_start,date_stop,error_code,error_message,error_subcode'
          }
        }
      );

      return {
        success: true,
        status: response.data.async_status,
        percentComplete: response.data.async_percent_completion,
        errorCode: response.data.error_code ?? null,
        errorMessage: response.data.error_message ?? null,
        errorSubcode: response.data.error_subcode ?? null,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Async Report status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب نتائج Async Report
   */
  async getAsyncReportResults(reportRunId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${reportRunId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            limit: 500
          }
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging
      };
    } catch (error) {
      console.error('❌ Error getting Async Report results:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Creative Formats (Collection, Stories, Reels)
   * ============================================
   */

  /**
   * إنشاء Collection Ad Creative
   */
  async createCollectionCreative(data) {
    try {
      const {
        pageId,
        name,
        instantExperienceId, // Canvas ID
        coverImageHash,
        coverVideoId,
        headline,
        primaryText,
        products = [], // Array of product IDs from catalog
        catalogId
      } = data;

      const accountId = this.getAccountId();

      const creativeData = {
        name: name || 'Collection Ad',
        object_story_spec: {
          page_id: pageId,
          template_data: {
            call_to_action: {
              type: 'LEARN_MORE'
            },
            description: primaryText,
            link: instantExperienceId ? undefined : data.linkUrl,
            message: headline,
            retailer_item_ids: products.slice(0, 4) // Max 4 products in collection
          }
        }
      };

      // Add cover media
      if (coverImageHash) {
        creativeData.object_story_spec.template_data.image_hash = coverImageHash;
      } else if (coverVideoId) {
        creativeData.object_story_spec.template_data.video_id = coverVideoId;
      }

      // Link to Instant Experience
      if (instantExperienceId) {
        creativeData.object_story_spec.template_data.canvas_id = instantExperienceId;
      }

      console.log('📤 Creating Collection Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Collection Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Collection Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Stories/Reels Creative
   */
  async createStoriesReelsCreative(data) {
    try {
      const {
        pageId,
        instagramAccountId,
        name,
        videoId, // Required for Stories/Reels
        primaryText,
        linkUrl,
        callToAction = 'LEARN_MORE',
        format = 'STORIES' // STORIES or REELS
      } = data;

      if (!videoId) {
        throw new Error('Video ID is required for Stories/Reels');
      }

      const accountId = this.getAccountId();

      const creativeData = {
        name: name || `${format} Ad`,
        object_story_spec: {
          page_id: pageId,
          instagram_actor_id: instagramAccountId,
          video_data: {
            video_id: videoId,
            message: primaryText,
            call_to_action: {
              type: callToAction,
              value: {
                link: linkUrl
              }
            }
          }
        },
        // Specify placement format
        platform_customizations: {
          instagram: {
            [format.toLowerCase()]: {
              video_id: videoId
            }
          }
        }
      };

      console.log('📤 Creating Stories/Reels Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Stories/Reels Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Stories/Reels Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Instant Experience (Canvas)
   */
  async createInstantExperience(pageId, data) {
    try {
      const {
        name,
        components = [] // Array of component objects
      } = data;

      const canvasData = {
        name: name || 'Instant Experience',
        body_element_ids: components.map(c => c.id).filter(Boolean)
      };

      console.log('📤 Creating Instant Experience:', JSON.stringify(canvasData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pageId}/canvas`,
        canvasData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Instant Experience created:', response.data.id);

      return {
        success: true,
        canvasId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Instant Experience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Automation Rules
   * ============================================
   */

  /**
   * إنشاء Automated Rule
   */
  async createAutomatedRule(data) {
    try {
      const {
        name,
        entityType = 'AD', // CAMPAIGN, ADSET, AD
        filterField,
        filterOperator,
        filterValue,
        actionType, // PAUSE, UNPAUSE, CHANGE_BUDGET, CHANGE_BID, NOTIFICATION
        actionValue,
        evaluationSpec = {},
        scheduleSpec = {}
      } = data;

      const accountId = this.getAccountId();

      // 1. Target entity
      const targetEntity = (data.entityType || entityType || 'AD').toUpperCase();

      // 2. Filters resolution
      let rawFilters = [];
      if (Array.isArray(evaluationSpec.filters) && evaluationSpec.filters.length > 0) {
        rawFilters = evaluationSpec.filters;
      } else if (Array.isArray(data.conditions) && data.conditions.length > 0) {
        rawFilters = data.conditions;
      } else if (filterField && filterOperator) {
        rawFilters = [{ field: filterField, operator: filterOperator, value: filterValue }];
      }

      // Format and normalize filter fields
      const formattedFilters = rawFilters
        .filter(f => f && f.field && f.operator)
        .map(f => {
          let field = f.field;
          if (field === 'cost_per_result') field = 'cost_per';
          if (field === 'spend') field = 'spent';
          if (field === 'roas') field = 'website_purchase_roas';
          if (field === 'conversions') field = 'results';

          let value = f.value;
          if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
            value = Number(value);
          }

          return {
            field,
            operator: f.operator,
            value
          };
        });

      // Ensure entity_type filter exists (Required by Meta Ad Rules)
      if (!formattedFilters.some(f => f.field === 'entity_type')) {
        formattedFilters.unshift({
          field: 'entity_type',
          operator: 'EQUAL',
          value: targetEntity
        });
      }

      // Ensure time_preset filter exists for metric evaluations
      if (!formattedFilters.some(f => f.field === 'time_preset')) {
        const timePreset = data.timePreset || evaluationSpec.time_preset || 'LAST_7D';
        formattedFilters.push({
          field: 'time_preset',
          operator: 'EQUAL',
          value: timePreset
        });
      }

      // 3. Evaluation spec (Strictly only valid Meta keys: evaluation_type, filters, trigger)
      const evalType = (
        evaluationSpec.evaluation_type ||
        evaluationSpec.type ||
        'SCHEDULE'
      ).toUpperCase();

      const evaluation_spec = {
        evaluation_type: evalType === 'TRIGGER' ? 'TRIGGER' : 'SCHEDULE',
        filters: formattedFilters
      };

      if (evaluationSpec.trigger) {
        evaluation_spec.trigger = evaluationSpec.trigger;
      }

      // 4. Execution spec
      let execType = (
        data.executionSpec?.execution_type ||
        data.executionSpec?.executionType ||
        actionType ||
        'PAUSE'
      ).toUpperCase();

      let execOptions = data.executionSpec?.execution_options || undefined;

      if (execType === 'SEND_NOTIFICATION') {
        execType = 'NOTIFICATION';
      } else if (execType === 'INCREASE_BUDGET') {
        execType = 'CHANGE_BUDGET';
        if (!execOptions) {
          execOptions = [{
            field: 'change_spec',
            value: {
              amount: Math.abs(Number(actionValue || data.actionValue) || 10),
              unit: 'PERCENT'
            }
          }];
        }
      } else if (execType === 'DECREASE_BUDGET') {
        execType = 'CHANGE_BUDGET';
        if (!execOptions) {
          execOptions = [{
            field: 'change_spec',
            value: {
              amount: -Math.abs(Number(actionValue || data.actionValue) || 10),
              unit: 'PERCENT'
            }
          }];
        }
      }

      const execution_spec = {
        execution_type: execType
      };
      if (execOptions && Array.isArray(execOptions) && execOptions.length > 0) {
        execution_spec.execution_options = execOptions;
      }

      // 5. Schedule spec
      let schedType = (
        scheduleSpec.schedule_type ||
        scheduleSpec.scheduleType ||
        scheduleSpec.type ||
        data.schedule ||
        evaluationSpec.evaluationType || // Handle legacy frontend key gracefully
        'DAILY'
      ).toUpperCase();

      if (schedType === 'WEEKLY') {
        schedType = 'DAILY';
      }
      if (!['DAILY', 'HOURLY', 'SEMI_HOURLY', 'CUSTOM'].includes(schedType)) {
        schedType = 'DAILY';
      }

      const schedule_spec = {
        schedule_type: schedType
      };
      if (Array.isArray(scheduleSpec.schedule) && scheduleSpec.schedule.length > 0) {
        schedule_spec.schedule = scheduleSpec.schedule;
      }

      const ruleData = {
        name,
        status: data.status || 'ENABLED',
        evaluation_spec,
        execution_spec,
        schedule_spec
      };

      console.log('📤 Creating Automated Rule on Meta:', JSON.stringify(ruleData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adrules_library`,
        ruleData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Automated Rule created:', response.data.id);

      return {
        success: true,
        ruleId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Automated Rules
   */
  async getAutomatedRules() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/adrules_library`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,status,evaluation_spec,execution_spec,schedule_spec,created_time'
          }
        }
      );

      const rawRules = response.data.data || [];
      const normalized = rawRules.map((rule) => {
        const filters = rule.evaluation_spec?.filters || [];
        const entityFilter = filters.find((f) => f.field === 'entity_type');
        const conditionFilters = filters.filter((f) => f.field !== 'entity_type' && f.field !== 'time_preset');

        return {
          id: rule.id,
          name: rule.name,
          status: rule.status === 'ENABLED' || rule.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
          entityType: entityFilter?.value || 'CAMPAIGN',
          actionType: rule.execution_spec?.execution_type || 'PAUSE',
          conditions: conditionFilters.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: typeof c.value === 'number' ? c.value : Number(c.value) || 0
          })),
          schedule: rule.schedule_spec?.schedule_type || 'DAILY',
          createdAt: rule.created_time,
          raw: rule
        };
      });

      return {
        success: true,
        data: normalized
      };
    } catch (error) {
      console.error('❌ Error getting Automated Rules:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * تحديث Automated Rule
   */
  async updateAutomatedRule(ruleId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${ruleId}`,
        data,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * حذف Automated Rule
   */
  async deleteAutomatedRule(ruleId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${ruleId}`,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Attribution Settings
   * ============================================
   */

  /**
   * تحديث Attribution Settings للـ Ad Set
   */
  async updateAttributionSettings(adSetId, settings) {
    try {
      const {
        attributionWindow = '7d_click_1d_view', // 1d_click, 7d_click, 1d_view, 7d_click_1d_view
        useUnifiedAttributionSetting = true
      } = settings;

      // Map to Facebook format
      const attributionSpec = [];
      
      if (attributionWindow.includes('click')) {
        const clickDays = attributionWindow.includes('7d_click') ? 7 : 1;
        attributionSpec.push({
          event_type: 'CLICK_THROUGH',
          window_days: clickDays
        });
      }
      
      if (attributionWindow.includes('view')) {
        const viewDays = attributionWindow.includes('1d_view') ? 1 : 7;
        attributionSpec.push({
          event_type: 'VIEW_THROUGH',
          window_days: viewDays
        });
      }

      const updateData = {
        attribution_spec: attributionSpec,
        use_new_app_click: useUnifiedAttributionSetting
      };

      console.log('📤 Updating Attribution Settings:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Attribution Settings updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Attribution Settings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Ad Set Management (Update, Frequency Cap)
   * ============================================
   */

  /**
   * تحديث Ad Set
   */
  async updateAdSet(adSetId, data) {
    try {
      const {
        name,
        status,
        budgetType,
        budgetAmount,
        optimizationGoal,
        bidAmount,
        targeting,
        startTime,
        endTime
      } = data;

      const updateData = {};

      if (name) updateData.name = name;
      if (status) updateData.status = status;
      if (optimizationGoal) updateData.optimization_goal = optimizationGoal;
      if (bidAmount) updateData.bid_amount = Math.round(bidAmount * 100);
      if (startTime) updateData.start_time = startTime;
      if (endTime) updateData.end_time = endTime;

      // Budget
      if (budgetType && budgetAmount) {
        if (budgetType === 'DAILY') {
          updateData.daily_budget = Math.round(budgetAmount * 100);
        } else {
          updateData.lifetime_budget = Math.round(budgetAmount * 100);
        }
      }

      // Targeting
      if (targeting) {
        updateData.targeting = this.buildAdvancedTargetingSpec(targeting);
      }

      console.log('📤 Updating Ad Set:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Ad Set updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Ad Set:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * تحديث Frequency Cap
   */
  async updateFrequencyCap(adSetId, frequencyCap) {
    try {
      const {
        maxFrequency = 2, // Max impressions per user
        intervalDays = 7 // Time window in days
      } = frequencyCap;

      const updateData = {
        frequency_control_specs: [
          {
            event: 'IMPRESSIONS',
            interval_days: intervalDays,
            max_frequency: maxFrequency
          }
        ]
      };

      console.log('📤 Updating Frequency Cap:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Frequency Cap updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Frequency Cap:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advanced Targeting
   * ============================================
   */

  /**
   * البحث عن Targeting Options
   */
  async searchTargetingOptions(query, type = 'adinterest', options = {}) {
    try {
      // Types: adinterest, adinterestsuggestion, adinterestvalid, 
      //        adTargetingCategory, adgeolocation, adlocale, etc.
      const params = {
        access_token: this.accessToken,
        type,
        q: query,
        limit: options.limit || 50
      };

      if (type === 'adgeolocation') {
        if (options.locationTypes && options.locationTypes.length > 0) {
          params.location_types = JSON.stringify(options.locationTypes);
        }
        if (options.countryCode) {
          params.country_code = options.countryCode;
        }
        if (options.regionId) {
          params.region_id = options.regionId;
        }
      }

      const response = await axios.get(
        `${this.baseUrl}/search`,
        { params }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error searching targeting options:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Targeting Suggestions
   */
  async getTargetingSuggestions(targetingList) {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/targetingsuggestions`,
        {
          params: {
            access_token: this.accessToken,
            targeting_list: JSON.stringify(targetingList)
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting targeting suggestions:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Reach Estimate
   */
  async getReachEstimate(targeting) {
    try {
      const accountId = this.getAccountId();
      const targetingSpec = this.buildAdvancedTargetingSpec(targeting);

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/reachestimate`,
        {
          params: {
            access_token: this.accessToken,
            targeting_spec: JSON.stringify(targetingSpec),
            optimize_for: 'OFFSITE_CONVERSIONS'
          }
        }
      );

      return {
        success: true,
        data: {
          users: response.data.users,
          usersLowerBound: response.data.users_lower_bound,
          usersUpperBound: response.data.users_upper_bound,
          estimate_ready: response.data.estimate_ready
        }
      };
    } catch (error) {
      console.error('❌ Error getting reach estimate:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * بناء Targeting Spec المتقدم (مع Language, Connection, Zip)
   */
  buildAdvancedTargetingSpec(targeting) {
    if (!targeting) {
      return {};
    }

    const spec = this.buildTargetingSpec(targeting);
    if (!targeting) {
      return spec;
    }

    // Language Targeting
    if (targeting.locales && targeting.locales.length > 0) {
      spec.locales = targeting.locales; // e.g., [6, 24] for Arabic, English
    }

    // Connection Targeting
    if (targeting.connections) {
      if (targeting.connections.pages && targeting.connections.pages.length > 0) {
        spec.connections = targeting.connections.pages.map(id => ({ id }));
      }
      if (targeting.connections.excludedPages && targeting.connections.excludedPages.length > 0) {
        spec.excluded_connections = targeting.connections.excludedPages.map(id => ({ id }));
      }
      if (targeting.connections.friendsOfConnections && targeting.connections.friendsOfConnections.length > 0) {
        spec.friends_of_connections = targeting.connections.friendsOfConnections.map(id => ({ id }));
      }
    }

    // Zip Code Targeting
    if (targeting.zipCodes && targeting.zipCodes.length > 0) {
      spec.geo_locations = spec.geo_locations || {};
      spec.geo_locations.zips = targeting.zipCodes.map(zip => ({
        key: zip.key || zip,
        name: zip.name,
        primary_city_id: zip.primaryCityId,
        region_id: zip.regionId,
        country: zip.country || 'US'
      }));
    }

    // Device Targeting
    if (targeting.devices) {
      if (targeting.devices.platforms && targeting.devices.platforms.length > 0) {
        spec.user_os = targeting.devices.platforms; // ['iOS', 'Android']
      }
      if (targeting.devices.deviceTypes && targeting.devices.deviceTypes.length > 0) {
        spec.user_device = targeting.devices.deviceTypes;
      }
    }

    // Education Targeting
    if (targeting.education) {
      if (targeting.education.schools && targeting.education.schools.length > 0) {
        spec.education_schools = targeting.education.schools.map(s => ({ id: s }));
      }
      if (targeting.education.majors && targeting.education.majors.length > 0) {
        spec.education_majors = targeting.education.majors.map(m => ({ id: m }));
      }
      if (targeting.education.statuses && targeting.education.statuses.length > 0) {
        spec.education_statuses = targeting.education.statuses;
      }
    }

    // Work Targeting
    if (targeting.work) {
      if (targeting.work.employers && targeting.work.employers.length > 0) {
        spec.work_employers = targeting.work.employers.map(e => ({ id: e }));
      }
      if (targeting.work.positions && targeting.work.positions.length > 0) {
        spec.work_positions = targeting.work.positions.map(p => ({ id: p }));
      }
    }

    // Life Events
    if (targeting.lifeEvents && targeting.lifeEvents.length > 0) {
      spec.life_events = targeting.lifeEvents.map(e => ({ id: e }));
    }

    // Relationship Status
    if (targeting.relationshipStatuses && targeting.relationshipStatuses.length > 0) {
      spec.relationship_statuses = targeting.relationshipStatuses;
    }

    // Device Platforms (Mobile / Desktop)
    if (targeting.devicePlatforms && targeting.devicePlatforms.length > 0) {
      spec.device_platforms = targeting.devicePlatforms;
    }

    // Wi-Fi Only Connection
    if (targeting.onlyWifi) {
      spec.wireless_carrier = ['Wifi'];
    }

    // Detailed Targeting Exclusions
    if (targeting.excludedInterests && targeting.excludedInterests.length > 0) {
      spec.exclusions = spec.exclusions || {};
      spec.exclusions.interests = targeting.excludedInterests.map(i =>
        typeof i === 'object' ? i : { id: i, name: i }
      );
    }

    return spec;
  }

  /**
   * ============================================
   * Ad Preview
   * ============================================
   */

  /**
   * جلب Ad Preview
   */
  async getAdPreview(adId, format = 'DESKTOP_FEED_STANDARD') {
    try {
      // Formats: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, 
      //          INSTAGRAM_STANDARD, INSTAGRAM_STORY, RIGHT_COLUMN_STANDARD, etc.
      
      const response = await axios.get(
        `${this.baseUrl}/${adId}/previews`,
        {
          params: {
            access_token: this.accessToken,
            ad_format: format
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Ad Preview:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Creative Preview
   */
  async getCreativePreview(creativeId, format = 'DESKTOP_FEED_STANDARD') {
    if (!creativeId) {
      return {
        success: false,
        error: 'Creative ID is required'
      };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/${creativeId}/previews`,
        {
          params: {
            access_token: this.accessToken,
            ad_format: format
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (previewError) {
      try {
        const accountId = this.getAccountId();

        const response = await axios.get(
          `${this.baseUrl}/${accountId}/generatepreviews`,
          {
            params: {
              access_token: this.accessToken,
              creative: JSON.stringify({ creative_id: creativeId }),
              ad_format: format
            }
          }
        );

        return {
          success: true,
          data: response.data.data || []
        };
      } catch (error) {
        console.error('❌ Error getting Creative Preview:', error.response?.data || previewError.response?.data || error.message);
        return {
          success: false,
          error:
            error.response?.data?.error?.message ||
            previewError.response?.data?.error?.message ||
            error.message
        };
      }
    }
  }

  /**
   * ============================================
   * Saved Audiences
   * ============================================
   */

  /**
   * إنشاء Saved Audience
   */
  async createSavedAudience(data) {
    try {
      const {
        name,
        description,
        targeting
      } = data;

      const accountId = this.getAccountId();
      const targetingSpec = this.buildAdvancedTargetingSpec(targeting);

      const audienceData = {
        name,
        description,
        targeting: targetingSpec
      };

      console.log('📤 Creating Saved Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/saved_audiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Saved Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Saved Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Saved Audiences
   */
  async getSavedAudiences() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/saved_audiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,targeting,approximate_count'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Saved Audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * حذف Saved Audience
   */
  async deleteSavedAudience(audienceId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${audienceId}`,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Saved Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Facebook Pages & Pixels
   * ============================================
   */

  /**
   * جلب Facebook Pages
   */
  async getFacebookPages() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/accounts`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,category,access_token'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Pages:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: []
      };
    }
  }

  /**
   * جلب الصلاحيات الممنوحة للـ User Access Token الحالي
   */
  async getUserPermissions() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/permissions`,
        {
          params: {
            access_token: this.accessToken,
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook permissions:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: []
      };
    }
  }

  /**
   * جلب Facebook Pixels
   */
  async getFacebookPixels() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/adspixels`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,code'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Pixels:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: []
      };
    }
  }

  /**
   * ============================================
   * Helper Functions للميزات الجديدة
   * ============================================
   */

  /**
   * بناء Attribution Spec
   */
  resolveAttributionWindow({ attributionWindow, optimizationGoal } = {}) {
    const normalizedOptimizationGoal = String(optimizationGoal || '')
      .trim()
      .toUpperCase();

    if (normalizedOptimizationGoal === 'LINK_CLICKS') {
      return '1d_click';
    }

    return attributionWindow || '7d_click_1d_view';
  }

  buildAttributionSpec(attributionWindow) {
    if (!attributionWindow) {
      return [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ];
    }

    const spec = [];

    // Parse attribution window
    // Formats: '7d_click_1d_view', '1d_click_1d_view', '7d_click', '1d_click'
    if (attributionWindow.includes('click')) {
      const clickDays = attributionWindow.includes('7d_click') ? 7 : 1;
      spec.push({
        event_type: 'CLICK_THROUGH',
        window_days: clickDays
      });
    }

    if (attributionWindow.includes('view')) {
      const viewDays = attributionWindow.includes('1d_view') ? 1 : 7;
      spec.push({
        event_type: 'VIEW_THROUGH',
        window_days: viewDays
      });
    }

    return spec.length > 0 ? spec : null;
  }

  /**
   * بناء Bid Strategy
   */
  normalizeBidStrategyInput(bidStrategy) {
    const normalized = String(bidStrategy || '').trim().toUpperCase();

    if (!normalized) {
      return '';
    }

    if (normalized === 'LOWEST_COST_WITHOUT_CAP') {
      return 'LOWEST_COST';
    }

    if (normalized === 'LOWEST_COST_WITH_BID_CAP') {
      return 'BID_CAP';
    }

    if (normalized === 'TARGET_COST') {
      return 'COST_CAP';
    }

    if (
      normalized === 'LOWEST_COST_WITH_MIN_ROAS' ||
      normalized === 'MIN_ROAS' ||
      normalized === 'MIN_ROAS_GOAL' ||
      normalized === 'TARGET_ROAS'
    ) {
      return 'ROAS';
    }

    return normalized;
  }

  buildBidStrategy(bidStrategy, bidValue) {
    const bidData = {};
    const normalizedBidStrategy = this.normalizeBidStrategyInput(bidStrategy);

    if (!normalizedBidStrategy || normalizedBidStrategy === 'LOWEST_COST') {
      return { bid_strategy: 'LOWEST_COST_WITHOUT_CAP' };
    }

    switch (normalizedBidStrategy) {

      case 'COST_CAP':
        if (bidValue) {
          bidData.bid_strategy = 'COST_CAP';
          bidData.bid_amount = Math.round(bidValue * 100); // Convert to cents
        } else {
          bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
        }
        break;

      case 'BID_CAP':
        if (bidValue) {
          bidData.bid_strategy = 'LOWEST_COST_WITH_BID_CAP';
          bidData.bid_amount = Math.round(bidValue * 100);
        } else {
          bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
        }
        break;

      case 'TARGET_COST':
        if (bidValue) {
          bidData.bid_strategy = 'COST_CAP';
          bidData.bid_amount = Math.round(bidValue * 100);
        } else {
          bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
        }
        break;

      case 'ROAS':
        if (bidValue) {
          bidData.bid_strategy = 'LOWEST_COST_WITH_MIN_ROAS';
          // Meta Marketing API expects integer multiplier * 10000 (e.g. 3.5x -> 35000)
          const roasGoal = Math.round(Number(bidValue) * 10000);
          bidData.min_roas_goal = roasGoal;
          bidData.bid_constraints = {
            roas_average_floor: roasGoal
          };
        } else {
          bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
        }
        break;

      default:
        bidData.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
        break;
    }

    return bidData;
  }

  /**
   * ============================================
   * v22.0: Ad Recommendations API
   * ============================================
   */

  /**
   * جلب توصيات الإعلان
   */
  async getAdRecommendations(adId) {
    try {
      const adResponse = await axios.get(
        `${this.baseUrl}/${adId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,status,adset_id,creative{id}'
          }
        }
      );

      const ad = adResponse.data || {};
      const creativeId = ad.creative?.id;

      if (!ad.adset_id || !creativeId) {
        return {
          success: false,
          error: 'Ad set ID and creative ID are required to validate recommendations.',
          recommendations: []
        };
      }

      const accountId = this.getAccountId();
      const response = await axios.post(
        `${this.baseUrl}/${accountId}/ads`,
        {
          name: ad.name || `Recommendation validation for ${adId}`,
          adset_id: ad.adset_id,
          creative: {
            creative_id: creativeId
          },
          status: ad.status || 'PAUSED',
          execution_options: ['validate_only', 'include_recommendations']
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        recommendations:
          response.data.recommendations ||
          response.data.data?.recommendations ||
          [],
        validation: {
          adId,
          adSetId: ad.adset_id,
          creativeId
        },
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Ad Recommendations:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        recommendations: []
      };
    }
  }

  /**
   * تطبيق توصية على الإعلان
   */
  async applyAdRecommendation(adId, recommendationId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${adId}/apply_recommendation`,
        {
          recommendation_id: recommendationId
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error applying Ad Recommendation:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: Instagram Reels Ads
   * ============================================
   */

  /**
   * إنشاء Instagram Reels Ad Creative
   */
  async createInstagramReelsCreative(data) {
    try {
      const {
        pageId,
        instagramAccountId,
        videoId, // Required for Reels
        primaryText,
        callToAction,
        linkUrl,
        // Reels-specific options
        coverImageHash,
        musicId,
        // Advantage+ Creative for Reels
        advantageCreative = true
      } = data;

      if (!videoId) {
        throw new Error('Video ID is required for Instagram Reels');
      }

      const accountId = this.getAccountId();

      const creativeData = {
        name: data.name || 'Instagram Reels Ad',
        object_story_spec: {
          page_id: pageId,
          instagram_actor_id: instagramAccountId,
          video_data: {
            video_id: videoId,
            image_url: coverImageHash ? undefined : data.imageUrl,
            image_hash: coverImageHash,
            message: primaryText,
            call_to_action: {
              type: callToAction || 'LEARN_MORE',
              value: {
                link: linkUrl
              }
            }
          }
        },
        product_set_id: data.productSetId,
        url_tags: data.urlTags
      };

      // ✅ v26.0: Advantage+ Creative for Reels
      if (advantageCreative) {
        creativeData.degrees_of_freedom_spec = {
          creative_features_spec: {
            video_highlight: {
              enroll_status: 'OPT_IN' // Auto-trim to best moments
            },
            visual_touchups: {
              enroll_status: 'OPT_IN' // Adaptive brightness and HDR on viewer screens
            },
            music: {
              enroll_status: 'OPT_IN' // Smart trending background music match
            }
          }
        };

        // Music for Reels
        if (musicId) {
          creativeData.object_story_spec.video_data.music_id = musicId;
        }
      }

      console.log('📤 Creating Instagram Reels Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Instagram Reels Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Instagram Reels Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: WhatsApp Ads Support
   * ============================================
   */

  /**
   * إنشاء WhatsApp Click-to-Message Ad
   */
  async createWhatsAppAd(data) {
    try {
      const {
        pageId,
        whatsappBusinessAccountId,
        creativeId,
        adSetId,
        name,
        status = 'PAUSED'
      } = data;

      if (!whatsappBusinessAccountId) {
        throw new Error('WhatsApp Business Account ID is required');
      }

      const accountId = this.getAccountId();

      const adData = {
        name: name || 'WhatsApp Click-to-Message Ad',
        status,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId
        },
        // WhatsApp-specific fields (Supports both native CTWA and wa.me fallback)
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: `https://wa.me/${whatsappBusinessAccountId}`,
            call_to_action: {
              type: 'WHATSAPP_MESSAGE'
            }
          }
        }
      };

      console.log('📤 Creating WhatsApp Ad:', JSON.stringify(adData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/ads`,
        adData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ WhatsApp Ad created:', response.data.id);

      return {
        success: true,
        adId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating WhatsApp Ad:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: Ad Quality & Relevance Metrics
   * ============================================
   */

  /**
   * جلب Ad Quality Metrics
   */
  async getAdQualityMetrics(adId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${adId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'ad_id,ad_name,impressions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking',
            date_preset: 'last_30d'
          }
        }
      );
      const row = response.data.data?.[0] || {};

      return {
        success: true,
        metrics: {
          qualityRanking: row.quality_ranking || null,
          engagementRateRanking: row.engagement_rate_ranking || null,
          conversionRateRanking: row.conversion_rate_ranking || null,
          impressions: Number(row.impressions || 0)
        },
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Ad Quality Metrics:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Export
module.exports = FacebookAdsService;
module.exports.OBJECTIVE_MAPPING = OBJECTIVE_MAPPING;


