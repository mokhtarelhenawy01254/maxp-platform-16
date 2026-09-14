/**
 * Facebook Conversions API Service
 * 
 * هذا الـ Service مسؤول عن إرسال الأحداث لـ Facebook Conversions API
 * يدعم جميع الأحداث الرئيسية: PageView, ViewContent, AddToCart, Purchase, etc.
 * 
 * @requires facebook-nodejs-business-sdk
 * @requires crypto
 */

const crypto = require('crypto');
const { getMetaGraphApiBaseUrl, getMetaGraphApiVersion } = require('../config/metaApi');
const FACEBOOK_GRAPH_API_VERSION = getMetaGraphApiVersion();
const FACEBOOK_GRAPH_API_BASE_URL = getMetaGraphApiBaseUrl();

// Facebook Business SDK
let bizSdk;
try {
  bizSdk = require('facebook-nodejs-business-sdk');
} catch (error) {
  console.warn('⚠️ [Facebook CAPI] facebook-nodejs-business-sdk not installed. Run: npm install facebook-nodejs-business-sdk');
  bizSdk = null;
}

class FacebookConversionsService {
  constructor(pixelId, accessToken, testEventCode = null) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
    this.testEventCode = testEventCode;

    // Initialize Facebook SDK if available
    if (bizSdk) {
      try {
        bizSdk.FacebookAdsApi.init(accessToken);
        this.ServerEvent = bizSdk.ServerEvent;
        this.EventRequest = bizSdk.EventRequest;
        this.UserData = bizSdk.UserData;
        this.CustomData = bizSdk.CustomData;
        this.sdkAvailable = true;
        console.log('✅ [Facebook CAPI] SDK initialized successfully');
      } catch (error) {
        console.error('❌ [Facebook CAPI] Error initializing SDK:', error);
        this.sdkAvailable = false;
      }
    } else {
      this.sdkAvailable = false;
    }
  }

  /**
   * Hash user data using SHA256 (GDPR compliant)
   * @param {string} data - البيانات المراد تشفيرها
   * @returns {string|null} - البيانات المشفرة أو null
   */
  hashData(data) {
    if (!data) return null;

    try {
      // تنظيف البيانات: lowercase + trim
      const cleanData = data.toString().toLowerCase().trim();

      // تشفير SHA256
      return crypto
        .createHash('sha256')
        .update(cleanData)
        .digest('hex');
    } catch (error) {
      console.error('❌ Error hashing data:', error);
      return null;
    }
  }

  /**
   * تنظيف رقم الهاتف وتنسيقه وفق معايير Meta CAPI (E.164 بدون + وبدون أصفار بادئة)
   * @param {string} phone - رقم الهاتف
   * @returns {string} - رقم نظيف
   */
  cleanPhone(phone) {
    if (!phone) return '';
    let digits = phone.toString().replace(/\D/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    // معالجة الأرقام المصرية: 01xxxxxxxxx -> 201xxxxxxxxx
    if (digits.startsWith('01') && digits.length === 11) {
      digits = '20' + digits.slice(1);
    } else if (digits.startsWith('1') && digits.length === 10) {
      digits = '20' + digits;
    }
    return digits;
  }

  /**
   * بناء User Data من المعلومات المتاحة
   * @param {Object} userData - بيانات المستخدم
   * @returns {Object} - User Data object
   */
  buildUserData(userData) {
    const user = {};

    // Required fields (hashed)
    if (userData.email) {
      user.em = this.hashData(userData.email);
    }
    if (userData.phone) {
      const cleanPhone = this.cleanPhone(userData.phone);
      user.ph = this.hashData(cleanPhone);
    }

    // Optional but recommended (hashed)
    if (userData.firstName) {
      user.fn = this.hashData(userData.firstName);
    }
    if (userData.lastName) {
      user.ln = this.hashData(userData.lastName);
    }
    if (userData.city) {
      user.ct = this.hashData(userData.city);
    }
    if (userData.state || userData.governorate) {
      user.st = this.hashData(userData.state || userData.governorate);
    }
    if (userData.country) {
      user.country = this.hashData(userData.country || 'eg');
    }
    if (userData.zip) {
      user.zp = this.hashData(userData.zip);
    }

    // Technical data (not hashed)
    if (userData.ip) {
      user.client_ip_address = userData.ip;
    }
    if (userData.userAgent) {
      user.client_user_agent = userData.userAgent;
    }
    if (userData.fbc) {
      user.fbc = userData.fbc; // Facebook Click ID
    }
    if (userData.fbp) {
      user.fbp = userData.fbp; // Facebook Browser ID
    }

    return user;
  }

  /**
   * إرسال حدث PageView
   * @param {Object} userData - بيانات المستخدم
   * @param {string} pageUrl - رابط الصفحة
   * @param {string} eventId - معرف الحدث (للـ Deduplication)
   * @returns {Promise<Object>} - استجابة Facebook
   */
  async trackPageView(userData, pageUrl, eventId) {
    try {
      const event = {
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: pageUrl,
        action_source: 'website',
        user_data: this.buildUserData(userData),
        _raw_user_data: userData // Pass raw data for SDK usage
      };

      return await this.sendEvent(event);
    } catch (error) {
      console.error('❌ Error tracking PageView:', error);
      throw error;
    }
  }

  /**
   * إرسال حدث ViewContent
   * @param {Object} userData - بيانات المستخدم
   * @param {Object} product - بيانات المنتج
   * @param {string} eventId - معرف الحدث
   * @returns {Promise<Object>}
   */
  async trackViewContent(userData, product, eventId) {
    try {
      const event = {
        event_name: 'ViewContent',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: userData.pageUrl,
        action_source: 'website',
        user_data: this.buildUserData(userData),
        _raw_user_data: userData,
        custom_data: {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          content_category: product.category,
          value: parseFloat(product.price),
          currency: 'EGP'
        }
      };

      return await this.sendEvent(event);
    } catch (error) {
      console.error('❌ Error tracking ViewContent:', error);
      throw error;
    }
  }

  /**
   * إرسال حدث AddToCart
   * @param {Object} userData - بيانات المستخدم
   * @param {Object} product - بيانات المنتج
   * @param {string} eventId - معرف الحدث
   * @returns {Promise<Object>}
   */
  async trackAddToCart(userData, product, eventId) {
    try {
      const event = {
        event_name: 'AddToCart',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: userData.pageUrl,
        action_source: 'website',
        user_data: this.buildUserData(userData),
        _raw_user_data: userData,
        custom_data: {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          value: parseFloat(product.price),
          currency: 'EGP'
        }
      };

      return await this.sendEvent(event);
    } catch (error) {
      console.error('❌ Error tracking AddToCart:', error);
      throw error;
    }
  }

  /**
   * إرسال حدث InitiateCheckout
   * @param {Object} userData - بيانات المستخدم
   * @param {Object} cart - بيانات السلة
   * @param {string} eventId - معرف الحدث
   * @returns {Promise<Object>}
   */
  async trackInitiateCheckout(userData, cart, eventId) {
    try {
      const contentIds = cart.items.map(item => item.productId);
      const contents = cart.items.map(item => ({
        id: item.productId,
        quantity: item.quantity,
        item_price: parseFloat(item.price)
      }));

      const event = {
        event_name: 'InitiateCheckout',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: userData.pageUrl,
        action_source: 'website',
        user_data: this.buildUserData(userData),
        _raw_user_data: userData,
        custom_data: {
          content_ids: contentIds,
          contents: contents,
          content_type: 'product',
          value: parseFloat(cart.total),
          currency: 'EGP',
          num_items: cart.items.length
        }
      };

      return await this.sendEvent(event);
    } catch (error) {
      console.error('❌ Error tracking InitiateCheckout:', error);
      throw error;
    }
  }

  /**
   * إرسال حدث Purchase (الأهم!)
   * @param {Object} userData - بيانات المستخدم
   * @param {Object} order - بيانات الطلب
   * @param {string} eventId - معرف الحدث
   * @returns {Promise<Object>}
   */
  async trackPurchase(userData, order, eventId) {
    try {
      const contentIds = order.items.map(item => item.productId);
      const contents = order.items.map(item => ({
        id: item.productId,
        quantity: item.quantity,
        item_price: parseFloat(item.price)
      }));

      const event = {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: userData.pageUrl,
        action_source: 'website',
        user_data: this.buildUserData(userData),
        _raw_user_data: userData,
        custom_data: {
          content_ids: contentIds,
          contents: contents,
          content_type: 'product',
          value: parseFloat(order.total),
          currency: (order.currency || 'EGP').toUpperCase(),
          num_items: order.items.length,
          order_id: order.orderNumber
        }
      };

      return await this.sendEvent(event);
    } catch (error) {
      console.error('❌ Error tracking Purchase:', error);
      throw error;
    }
  }

  /**
   * إرسال الحدث لـ Facebook Conversions API
   * @param {Object} event - بيانات الحدث
   * @returns {Promise<Object>} - استجابة Facebook
   */
  async sendEvent(event) {
    try {
      console.log('📊 [Facebook CAPI] Sending event:', {
        pixelId: this.pixelId,
        eventName: event.event_name,
        eventId: event.event_id,
        testMode: !!this.testEventCode,
        url: `${FACEBOOK_GRAPH_API_BASE_URL}/${this.pixelId}/events`
      });

      // If SDK is not available, use direct HTTP call
      if (!this.sdkAvailable || !this.EventRequest) {
        console.warn('⚠️ [Facebook CAPI] SDK not available, using direct HTTP call');
        return await this.sendEventViaHTTP(event);
      }

      if (Array.isArray(event.custom_data?.contents)) {
        console.warn('⚠️ [Facebook CAPI] Product contents payload detected, using direct HTTP call to avoid SDK serialization failure');
        return await this.sendEventViaHTTP(event);
      }

      // Build ServerEvent using SDK
      const serverEvent = new this.ServerEvent()
        .setEventName(event.event_name)
        .setEventTime(event.event_time)
        .setEventId(event.event_id)
        .setEventSourceUrl(event.event_source_url)
        .setActionSource(event.action_source || 'website');

      // Add user data
      // Use raw data for SDK to avoid double hashing and ensure validation
      const rawUserData = event._raw_user_data || {};
      const userData = new this.UserData();

      // Validate and set email
      if (rawUserData.email && rawUserData.email.includes('@')) {
        userData.setEmail(rawUserData.email);
      } else if (rawUserData.email) {
        console.warn('⚠️ [Facebook CAPI] Skipping invalid email format:', rawUserData.email);
      }

      if (rawUserData.phone) {
        const cleanPhone = this.cleanPhone(rawUserData.phone);
        if (cleanPhone) userData.setPhone(cleanPhone);
      }
      if (rawUserData.firstName) userData.setFirstName(rawUserData.firstName);
      if (rawUserData.lastName) userData.setLastName(rawUserData.lastName);
      if (rawUserData.city) userData.setCity(rawUserData.city);
      if (rawUserData.state || rawUserData.governorate) userData.setState(rawUserData.state || rawUserData.governorate);
      if (rawUserData.country) userData.setCountry(rawUserData.country); // Corrected from setCountryCode
      if (rawUserData.zip) userData.setZip(rawUserData.zip); // Corrected from setZipCode
      if (rawUserData.ip) userData.setClientIpAddress(rawUserData.ip);
      if (rawUserData.userAgent) userData.setClientUserAgent(rawUserData.userAgent);
      if (rawUserData.fbc) userData.setFbc(rawUserData.fbc);
      if (rawUserData.fbp) userData.setFbp(rawUserData.fbp);

      serverEvent.setUserData(userData);

      // Add custom data
      if (event.custom_data) {
        const customData = new this.CustomData();
        if (event.custom_data.content_ids) customData.setContentIds(event.custom_data.content_ids);
        if (event.custom_data.content_name) customData.setContentName(event.custom_data.content_name);
        if (event.custom_data.content_type) customData.setContentType(event.custom_data.content_type);
        if (event.custom_data.content_category) customData.setContentCategory(event.custom_data.content_category);
        if (event.custom_data.value !== undefined) customData.setValue(event.custom_data.value);
        if (event.custom_data.currency) customData.setCurrency(event.custom_data.currency);
        if (event.custom_data.num_items !== undefined) customData.setNumItems(event.custom_data.num_items);
        if (event.custom_data.order_id) customData.setOrderId(event.custom_data.order_id);
        if (event.custom_data.contents) customData.setContents(event.custom_data.contents);
        if (event.custom_data.search_string) customData.setSearchString(event.custom_data.search_string);
        serverEvent.setCustomData(customData);
      }

      // Create EventRequest
      const eventRequest = new this.EventRequest(this.accessToken, this.pixelId)
        .setEvents([serverEvent]);

      if (this.testEventCode) {
        eventRequest.setTestEventCode(this.testEventCode);
      }

      // Execute request
      const response = await eventRequest.execute();

      // التحقق من نوع response: SDK object أو HTTP object
      let eventsReceived, messages, fbtraceId;

      if (typeof response.getEventsReceived === 'function') {
        // SDK response object - استخدم methods
        eventsReceived = response.getEventsReceived();
        messages = response.getMessages ? response.getMessages() : [];
        fbtraceId = response.getFbtraceId ? response.getFbtraceId() : null;
      } else {
        // HTTP response object - استخدم properties مباشرة
        eventsReceived = response.events_received || response.eventsReceived || 0;
        messages = response.messages || [];
        fbtraceId = response.fbtrace_id || response.fbtraceId || null;
      }

      console.log('✅ [Facebook CAPI] Event sent successfully:', {
        eventsReceived,
        messages,
        fbtraceId
      });

      return {
        success: true,
        events_received: eventsReceived,
        messages: messages,
        fbtrace_id: fbtraceId
      };
    } catch (error) {
      console.error('❌ [Facebook CAPI] Error sending event:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data || error.response
      });
      throw error;
    }
  }

  /**
   * إرسال الحدث عبر HTTP مباشرة (fallback إذا لم يكن SDK متاح)
   */
  async sendEventViaHTTP(event) {
    const axios = require('axios');
    const url = `${FACEBOOK_GRAPH_API_BASE_URL}/${this.pixelId}/events`;

    if (!this.accessToken) {
      throw new Error('Access Token is required for Facebook Conversions API');
    }

    // Strip _raw_user_data to prevent sending unhashed PII via HTTP payload
    const { _raw_user_data, ...cleanEvent } = event;

    const payload = {
      data: [cleanEvent],
      access_token: this.accessToken
    };

    if (this.testEventCode) {
      payload.test_event_code = this.testEventCode;
    }

    try {
      console.log('📤 [Facebook CAPI] Sending event via HTTP with Access Token:', {
        pixelId: this.pixelId,
        eventName: event.event_name,
        accessTokenLength: this.accessToken?.length || 0,
        accessTokenStarts: this.accessToken?.substring(0, 10) + '...'
      });

      const response = await axios.post(url, payload);
      console.log('✅ [Facebook CAPI] Event sent via HTTP with Access Token:', {
        eventsReceived: response.data.events_received,
        fbtraceId: response.data.fbtrace_id,
        eventName: event.event_name
      });

      // إرجاع بنفس structure مثل SDK response
      return {
        success: true,
        events_received: response.data.events_received || 0,
        messages: response.data.messages || [],
        fbtrace_id: response.data.fbtrace_id || null
      };
    } catch (error) {
      console.error('❌ [Facebook CAPI] HTTP request failed:', {
        message: error.message,
        response: error.response?.data,
        accessTokenUsed: !!this.accessToken
      });
      throw error;
    }
  }

  /**
   * اختبار الاتصال مع Facebook
   * @returns {Promise<Object>}
   */
  async testConnection() {
    try {
      const testEvent = {
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `test_${Date.now()}`,
        event_source_url: 'https://maxp.online/facebook-capi-test',
        action_source: 'website',
        user_data: {
          client_ip_address: '1.1.1.1',
          client_user_agent: 'Test User Agent'
        },
        _raw_user_data: {
          ip: '1.1.1.1',
          userAgent: 'Test User Agent'
        }
      };

      const response = await this.sendEvent(testEvent);

      // التحقق من أن response يحتوي على success
      if (response && response.success) {
        return {
          success: true,
          message: `✅ الاتصال ناجح! تم استقبال ${response.events_received || 0} حدث`,
          events_received: response.events_received || 0,
          messages: response.messages || [],
          fbtrace_id: response.fbtrace_id || null
        };
      } else {
        return {
          success: false,
          message: 'فشل الاتصال: استجابة غير متوقعة من Facebook',
          response
        };
      }
    } catch (error) {
      console.error('❌ [Facebook CAPI] Test connection error:', error);
      return {
        success: false,
        message: error.message || 'فشل الاتصال مع Facebook Conversions API',
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = FacebookConversionsService;
