/**
 * Facebook Audiences Service
 * 
 * Service للتعامل مع Facebook Custom Audiences و Lookalike Audiences
 */

const axios = require('axios');
const crypto = require('crypto');
const { getMetaGraphApiBaseUrl, getMetaGraphApiVersion } = require('../config/metaApi');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class FacebookAudiencesService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = getMetaGraphApiVersion();
    this.baseUrl = getMetaGraphApiBaseUrl();
  }

  /**
   * ============================================
   * Custom Audiences Methods
   * ============================================
   */

  /**
   * إنشاء Custom Audience من قائمة عملاء (Customer List)
   */
  async createCustomerListAudience(data) {
    try {
      const {
        name,
        description,
        customerList, // Array of {email, phone, firstName, lastName}
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }

      // تحضير البيانات للـ Facebook (Hash)
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN'];
      const formattedData = customerList.map(customer => [
        this.hashData(customer.email || ''),
        this.hashData(customer.phone || ''),
        this.hashData(customer.firstName || ''),
        this.hashData(customer.lastName || '')
      ]);

      // إنشاء Custom Audience
      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      
      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'CUSTOM',
          customer_file_source: 'USER_PROVIDED_ONLY'
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      const audienceId = response.data.id;

      // رفع بيانات العملاء
      await this.addUsersToAudience(audienceId, formattedData, schema);

      return {
        success: true,
        audienceId: audienceId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating customer list audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Website Custom Audience (Pixel-based)
   */
  /**
   * إنشاء Website Custom Audience (Pixel-based)
   */
  async createWebsiteAudience(data) {
    try {
      const {
        name,
        description,
        pixelId,
        eventType = 'ALL_VISITORS',
        urlContains,
        retentionDays = 30,
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !pixelId) {
        throw new Error('Ad Account ID and Pixel ID are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const retentionSeconds = Math.max(1, Math.min(180, Number(retentionDays) || 30)) * 86400;

      const eventMap = {
        'ALL_VISITORS': 'PageView',
        'PageView': 'PageView',
        'PURCHASE': 'Purchase',
        'Purchase': 'Purchase',
        'ADD_TO_CART': 'AddToCart',
        'AddToCart': 'AddToCart',
        'INITIATE_CHECKOUT': 'InitiateCheckout',
        'InitiateCheckout': 'InitiateCheckout',
        'VIEW_CONTENT': 'ViewContent',
        'ViewContent': 'ViewContent',
        'LEAD': 'Lead',
        'Lead': 'Lead',
        'SEARCH': 'Search',
        'Search': 'Search',
        'COMPLETE_REGISTRATION': 'CompleteRegistration',
        'CompleteRegistration': 'CompleteRegistration',
        'ADD_PAYMENT_INFO': 'AddPaymentInfo',
        'AddPaymentInfo': 'AddPaymentInfo',
      };

      const mappedEvent = eventMap[eventType] || eventType;
      const filters = [];

      if (!mappedEvent || mappedEvent === 'PageView' || eventType === 'ALL_VISITORS') {
        filters.push({ field: 'url', operator: 'i_contains', value: urlContains ? String(urlContains).trim() : '' });
      } else {
        filters.push({ field: 'event', operator: 'eq', value: mappedEvent });
        if (urlContains && String(urlContains).trim()) {
          filters.push({ field: 'url', operator: 'i_contains', value: String(urlContains).trim() });
        }
      }

      const filter = {
        operator: 'and',
        filters
      };

      const rule = {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ type: 'pixel', id: String(pixelId) }],
              retention_seconds: retentionSeconds,
              filter
            }
          ]
        }
      };

      const payload = {
        name,
        rule: JSON.stringify(rule),
        prefill: true,
        ...(description && { description })
      };

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        payload,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating website audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Engagement Custom Audience (Facebook Page - Meta v22+ Rule Mandated)
   */
  async createEngagementAudience(data) {
    try {
      const {
        name,
        description,
        pageId,
        engagementType = 'page_engaged',
        retentionDays = 365,
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }
      if (!pageId) {
        throw new Error('Facebook Page ID is required for page engagement audience');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const retentionSeconds = Math.max(1, Math.min(365, Number(retentionDays) || 365)) * 86400;

      const pageActionMap = {
        'PAGE_LIKES': 'page_engaged',
        'PAGE_ENGAGED': 'page_engaged',
        'page_engaged': 'page_engaged',
        'PAGE_VISITORS': 'page_visited',
        'PAGE_VISITED': 'page_visited',
        'page_visited': 'page_visited',
        'POST_ENGAGEMENT': 'post_engaged',
        'POST_ENGAGED': 'post_engaged',
        'post_engaged': 'post_engaged',
        'PAGE_CTA_CLICK': 'page_cta_clicked',
        'PAGE_CTA_CLICKED': 'page_cta_clicked',
        'page_cta_clicked': 'page_cta_clicked',
        'PAGE_MESSAGED': 'page_messaged',
        'page_messaged': 'page_messaged',
        'PAGE_SAVED': 'page_saved',
        'page_saved': 'page_saved',
      };

      const mappedAction = pageActionMap[engagementType] || 'page_engaged';

      const rule = {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ type: 'page', id: String(pageId) }],
              retention_seconds: retentionSeconds,
              filter: {
                operator: 'and',
                filters: [{ field: 'event', operator: 'eq', value: mappedAction }]
              }
            }
          ]
        }
      };

      const payload = {
        name,
        rule: JSON.stringify(rule),
        prefill: true,
        ...(description && { description })
      };

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        payload,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating page engagement audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Instagram Custom Audience (Meta v22+ Rule)
   */
  async createInstagramAudience(data) {
    try {
      const {
        name,
        description,
        igUserId,
        engagementType = 'ig_business_profile_engaged',
        retentionDays = 365,
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !igUserId) {
        throw new Error('Ad Account ID and Instagram User ID are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const retentionSeconds = Math.max(1, Math.min(365, Number(retentionDays) || 365)) * 86400;

      const igActionMap = {
        'IG_ALL_ENGAGEMENT': 'ig_business_profile_engaged',
        'ig_business_profile_engaged': 'ig_business_profile_engaged',
        'IG_PROFILE_VISIT': 'ig_business_profile_visited',
        'ig_business_profile_visited': 'ig_business_profile_visited',
        'IG_POST_ENGAGEMENT': 'ig_post_engaged',
        'ig_post_engaged': 'ig_post_engaged',
        'IG_MESSAGE_SENT': 'ig_direct_message_sent',
        'ig_direct_message_sent': 'ig_direct_message_sent',
        'IG_POST_SAVED': 'ig_post_saved',
        'ig_post_saved': 'ig_post_saved',
      };

      const mappedAction = igActionMap[engagementType] || 'ig_business_profile_engaged';

      const rule = {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ type: 'ig_business', id: String(igUserId) }],
              retention_seconds: retentionSeconds,
              filter: {
                operator: 'and',
                filters: [{ field: 'event', operator: 'eq', value: mappedAction }]
              }
            }
          ]
        }
      };

      const payload = {
        name,
        rule: JSON.stringify(rule),
        prefill: true,
        ...(description && { description })
      };

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        payload,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating instagram audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Video Views Custom Audience (Meta v22+ Rule)
   */
  async createVideoAudience(data) {
    try {
      const {
        name,
        description,
        pageId,
        videoViewDuration = 'video_watched_10s',
        retentionDays = 365,
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !pageId) {
        throw new Error('Ad Account ID and Facebook Page ID are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const retentionSeconds = Math.max(1, Math.min(365, Number(retentionDays) || 365)) * 86400;

      const videoActionMap = {
        '3_SECOND': 'video_watched_3s',
        'video_watched_3s': 'video_watched_3s',
        '10_SECOND': 'video_watched_10s',
        'THRUPLAY': 'video_watched_10s',
        'video_watched_10s': 'video_watched_10s',
        '25_PERCENT': 'video_watched_25_percent',
        'video_watched_25_percent': 'video_watched_25_percent',
        '50_PERCENT': 'video_watched_50_percent',
        'video_watched_50_percent': 'video_watched_50_percent',
        '75_PERCENT': 'video_watched_75_percent',
        'video_watched_75_percent': 'video_watched_75_percent',
        '95_PERCENT': 'video_watched_95_percent',
        'video_watched_95_percent': 'video_watched_95_percent',
      };

      const mappedAction = videoActionMap[videoViewDuration] || 'video_watched_10s';

      const rule = {
        inclusions: {
          operator: 'or',
          rules: [
            {
              event_sources: [{ type: 'page', id: String(pageId) }],
              retention_seconds: retentionSeconds,
              filter: {
                operator: 'and',
                filters: [{ field: 'event', operator: 'eq', value: mappedAction }]
              }
            }
          ]
        }
      };

      const payload = {
        name,
        rule: JSON.stringify(rule),
        prefill: true,
        ...(description && { description })
      };

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        payload,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating video audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع Custom Audiences
   */
  async getCustomAudiences(adAccountId = null) {
    try {
      const accountId = (adAccountId || this.adAccountId)?.startsWith('act_') 
        ? (adAccountId || this.adAccountId) 
        : `act_${adAccountId || this.adAccountId}`;

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,time_created,time_updated'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting custom audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب معلومات Custom Audience
   */
  async getCustomAudience(audienceId, fields = ['id', 'name', 'description', 'approximate_count']) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${audienceId}`,
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
      console.error('❌ Error getting custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث Custom Audience
   */
  async updateCustomAudience(audienceId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${audienceId}`,
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
      console.error('❌ Error updating custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف Custom Audience
   */
  async deleteCustomAudience(audienceId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${audienceId}`,
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
      console.error('❌ Error deleting custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إضافة مستخدمين إلى Custom Audience
   */
  async addUsersToAudience(audienceId, usersData, schema) {
    try {
      // Facebook يتطلب تقسيم البيانات إلى batches من 10000 سجل
      const batchSize = 10000;
      const batches = [];
      
      for (let i = 0; i < usersData.length; i += batchSize) {
        batches.push(usersData.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const payload = batch.map(row => row.join(',')).join('\n');
        
        const formData = new URLSearchParams();
        formData.append('payload', payload);
        formData.append('schema', schema.join(','));

        await axios.post(
          `${this.baseUrl}/${audienceId}/users`,
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
              access_token: this.accessToken
            }
          }
        );
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error adding users to audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Lookalike Audiences Methods
   * ============================================
   */

  /**
   * إنشاء Lookalike Audience
   */
  async createLookalikeAudience(data) {
    try {
      const {
        name,
        description,
        sourceAudienceId, // Facebook Custom Audience ID
        country,
        ratio = 1, // 1-10%
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !sourceAudienceId || !country) {
        throw new Error('Ad Account ID, Source Audience ID, and Country are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'LOOKALIKE',
          lookalike_spec: {
            origin_audience_id: sourceAudienceId,
            country,
            ratio
          }
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating lookalike audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع Lookalike Audiences
   */
  async getLookalikeAudiences(adAccountId = null) {
    try {
      const accountId = (adAccountId || this.adAccountId)?.startsWith('act_') 
        ? (adAccountId || this.adAccountId) 
        : `act_${adAccountId || this.adAccountId}`;

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,lookalike_spec',
            subtype: 'LOOKALIKE'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting lookalike audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Helper Methods
   * ============================================
   */

  /**
   * Hash البيانات حسب متطلبات Facebook
   */
  hashData(data) {
    if (!data) return '';
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  /**
   * جلب معلومات Audience Size
   */
  async getAudienceSize(audienceId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${audienceId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'approximate_count'
          }
        }
      );

      return {
        success: true,
        size: response.data.approximate_count || 0
      };
    } catch (error) {
      return {
        success: false,
        size: 0
      };
    }
  }
}

module.exports = FacebookAudiencesService;


